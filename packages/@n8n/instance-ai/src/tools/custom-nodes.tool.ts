/**
 * Custom nodes tool — scaffold, pack, test, and publish code actions that the agent writes
 * with @n8n/node-sdk in the sandbox. Packing runs in the sandbox. The host gets the bundle as
 * text and runs it only in its wasm sandbox.
 */
import { Tool, wrapUntrustedData } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import {
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext, PackedCustomAction } from '../types';
import { runInSandbox } from '../workspace/sandbox-fs';
import { joinWorkspacePath } from '../workspace/workspace-paths';
import { approvalSummarySchema, formatApprovalMessage } from './approval-copy';
import { DOMAIN_TOOL_IDS } from './tool-ids';

// `--no-install` stops npx from fetching a package with this name from the registry.
const CLI = 'npx --no-install n8n-node-next';
const COMMAND_TIMEOUT_MS = 180_000;
const OUTPUT_TAIL = 4_000;
const MAX_ITEMS = 5;
const MAX_FIXTURES = 100;

// ── Input ───────────────────────────────────────────────────────────────────

const slugField = z
	.string()
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
	.describe('Node project folder under `nodes/`, in kebab case, e.g. "acme-tasks"');
const actionIdField = z
	.string()
	.describe('Action id from the pack result, e.g. "acme.task.create"');

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [
		z.object({
			action: z
				.literal('scaffold')
				.describe('Create a node project at `nodes/<slug>`. Do not run npm or pnpm install in it'),
			slug: slugField,
		}),
		z.object({
			action: z
				.literal('pack')
				.describe('Check and pack the project. Returns the action ids, semvers, and errors'),
			slug: slugField,
		}),
		z.object({
			action: z
				.literal('test')
				.describe('Pack the project and run one action once on n8n with real parameters'),
			slug: slugField,
			actionId: actionIdField,
			params: z.record(z.unknown()).describe('Node parameters of the action'),
			credentialId: z.string().optional().describe('Credential ID for the action, if it has one'),
			summary: approvalSummarySchema,
		}),
		z.object({
			action: z
				.literal('publish')
				.describe(
					'Publish the packed action as a private custom node. Test the same code successfully first',
				),
			slug: slugField,
			actionId: actionIdField,
			summary: approvalSummarySchema,
		}),
	]),
);

type Input = z.infer<typeof inputSchema>;

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	resourceName: z.string().optional(),
	severity: instanceAiConfirmationSeveritySchema,
});

const resumeSchema = instanceAiApprovalResumeSchema;

// The private continuation of a suspended call: the bundle that the user approved.
const approvedBundleSchema = z.object({ bundleHash: z.string() });

interface CustomNodesToolContext {
	resumeData: z.infer<typeof resumeSchema> | undefined;
	suspend: (
		payload: z.infer<typeof suspendSchema>,
		options?: { continuation?: z.infer<typeof approvedBundleSchema> },
	) => Promise<never>;
	continuation?: unknown;
	abortSignal?: AbortSignal;
}

// ── Pack ────────────────────────────────────────────────────────────────────

const packOutputSchema = z.object({
	actions: z.array(
		z.object({
			manifest: z
				.object({
					id: z.string(),
					semver: z.string(),
					contract: z
						.object({
							credentials: z.array(z.string()).optional(),
							egress: z
								.object({ hosts: z.array(z.string()).optional(), fromInput: z.string().optional() })
								.optional(),
						})
						.passthrough()
						.optional(),
				})
				.passthrough(),
			bundle: z.string(),
			sdk: z.string().optional(),
		}),
	),
	errors: z.array(z.object({ actionId: z.string(), message: z.string() })).optional(),
});

interface PackedProjectAction {
	id: string;
	semver: string;
	/** sha256 of the bundle, computed here: the manifest's own hash is not trusted. */
	bundleHash: string;
	/** Egress hosts, credential types, and short bundle hash, for the approval message. */
	access: string;
	packed: PackedCustomAction;
}

type PackOutcome =
	| { actions: PackedProjectAction[]; errors: Array<{ actionId: string; message: string }> }
	| { error: string };

const tail = (text: string) => text.trim().slice(-OUTPUT_TAIL);

async function runCli(
	context: InstanceAiContext,
	slug: string | undefined,
	args: string,
	abortSignal?: AbortSignal,
) {
	const workspace = context.workspace;
	if (!workspace) return undefined;
	const root = await getWorkspaceRoot(workspace);
	const cwd = slug === undefined ? root : joinWorkspacePath(root, `nodes/${slug}`);
	return await runInSandbox(workspace, `${CLI} ${args}`, {
		cwd,
		abortSignal,
		timeout: COMMAND_TIMEOUT_MS,
	});
}

/** The last stdout line of `pack --json`: the CLI may print other lines before it. */
function parsePackOutput(stdout: string) {
	const lastLine = stdout.trim().split('\n').pop() ?? '';
	try {
		const parsed = packOutputSchema.safeParse(JSON.parse(lastLine));
		return parsed.success ? parsed.data : undefined;
	} catch {
		return undefined;
	}
}

async function packProject(
	context: InstanceAiContext,
	slug: string,
	abortSignal?: AbortSignal,
): Promise<PackOutcome> {
	const check = await runCli(context, slug, 'check', abortSignal);
	if (!check) return { error: 'Custom nodes need the sandbox workspace.' };
	if (check.exitCode !== 0) {
		return { error: `check failed:\n${tail(`${check.stdout}\n${check.stderr}`)}` };
	}
	const pack = await runCli(context, slug, 'pack --json', abortSignal);
	const output = pack && parsePackOutput(pack.stdout);
	if (!output) {
		return { error: `pack failed:\n${tail(pack ? `${pack.stderr}\n${pack.stdout}` : '')}` };
	}
	return {
		actions: output.actions.map(({ manifest, bundle, sdk }) => {
			const bundleHash = createHash('sha256').update(bundle).digest('hex');
			const egress = manifest.contract?.egress;
			const hosts = [
				...(egress?.hosts ?? []),
				...(egress?.fromInput !== undefined ? [`host from input ${egress.fromInput}`] : []),
			];
			return {
				id: manifest.id,
				semver: manifest.semver,
				bundleHash,
				access:
					`Hosts: ${hosts.join(', ') || 'none'}. ` +
					`Credential types: ${manifest.contract?.credentials?.join(', ') || 'none'}. ` +
					`Bundle: ${bundleHash.slice(0, 12)}.`,
				packed: { manifest, bundle, ...(sdk !== undefined ? { sdk } : {}) },
			};
		}),
		errors: output.errors ?? [],
	};
}

function pickAction(
	outcome: PackOutcome,
	actionId: string,
): PackedProjectAction | { error: string } {
	if ('error' in outcome) return outcome;
	const found = outcome.actions.find(({ id }) => id === actionId);
	if (found) return found;
	const failed = outcome.errors.find((error) => error.actionId === actionId);
	if (failed) return { error: `${actionId} did not pack: ${failed.message}` };
	return {
		error: `No action ${actionId}. Packed actions: ${outcome.actions.map(({ id }) => id).join(', ') || 'none'}`,
	};
}

// ── Test fixtures ───────────────────────────────────────────────────────────

// Publish needs the fixture of a successful test of the same bundle. The map lives in this
// process only, so a publish that another main handles must test again.
const testedFixtures = new Map<string, unknown>();

const fixtureKey = (context: InstanceAiContext, threadId: string, bundleHash: string) =>
	`${context.userId}:${threadId}:${bundleHash}`;

const NO_THREAD = { error: 'Custom node test and publish need a conversation thread.' };

/**
 * Suspends for approval of this exact bundle. On resume, refuses a bundle that is not the
 * approved one: the agent can change the code between approval and resume.
 * Returns undefined when the call can run.
 */
async function approveBundle(
	ctx: CustomNodesToolContext,
	needsApproval: boolean,
	action: PackedProjectAction,
	message: string,
	severity: 'warning' | 'destructive',
) {
	if (ctx.resumeData !== undefined && ctx.resumeData !== null) {
		const approved = approvedBundleSchema.safeParse(ctx.continuation);
		if (approved.success && approved.data.bundleHash === action.bundleHash) return undefined;
		return {
			success: false,
			error: `The code of ${action.id} changed after approval. Call this action again to ask for a new approval.`,
		};
	}
	if (!needsApproval) return undefined;
	return await ctx.suspend(
		{
			requestId: nanoid(),
			message: `${message} ${action.access}`,
			resourceName: action.id,
			severity,
		},
		{ continuation: { bundleHash: action.bundleHash } },
	);
}

function rememberFixture(key: string, fixture: unknown) {
	testedFixtures.delete(key);
	testedFixtures.set(key, fixture);
	const oldest = testedFixtures.keys().next().value;
	if (testedFixtures.size > MAX_FIXTURES && oldest !== undefined) testedFixtures.delete(oldest);
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleScaffold(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'scaffold' }>,
	abortSignal?: AbortSignal,
) {
	const result = await runCli(
		context,
		undefined,
		`new ${input.slug} --dir nodes/${input.slug}`,
		abortSignal,
	);
	if (!result) return { error: 'Custom nodes need the sandbox workspace.' };
	if (result.exitCode !== 0) {
		return { error: `new failed:\n${tail(`${result.stdout}\n${result.stderr}`)}` };
	}
	return { created: `nodes/${input.slug}` };
}

async function handlePack(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'pack' }>,
	abortSignal?: AbortSignal,
) {
	const outcome = await packProject(context, input.slug, abortSignal);
	if ('error' in outcome) return outcome;
	return {
		actions: outcome.actions.map(({ id, semver, bundleHash }) => ({ id, semver, bundleHash })),
		...(outcome.errors.length > 0 ? { errors: outcome.errors } : {}),
	};
}

async function handleTest(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'test' }>,
	ctx: CustomNodesToolContext,
) {
	// A test runs agent code with the user's credential against live APIs: it uses the
	// executeNode permission, and the same approval rule as a node run (nodes.tool.ts handleExecute).
	const mode = context.permissions?.executeNode;
	if (mode === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}
	if (ctx.resumeData !== undefined && ctx.resumeData !== null && !ctx.resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}
	const { threadId } = context;
	if (threadId === undefined) return NO_THREAD;

	const action = pickAction(
		await packProject(context, input.slug, ctx.abortSignal),
		input.actionId,
	);
	if ('error' in action) return action;
	const allowedByScope =
		context.requireRunWorkflowApproval !== true &&
		context.allowedRunWorkflowIds === undefined &&
		context.allowedRunWorkflowNames === undefined &&
		mode === 'always_allow';
	const refused = await approveBundle(
		ctx,
		!allowedByScope,
		action,
		formatApprovalMessage(
			`Run ${action.id}@${action.semver} once against live APIs` +
				(input.credentialId !== undefined ? ` with credential ${input.credentialId}.` : '.'),
			input.summary,
		),
		'warning',
	);
	if (refused) return refused;

	const result = await context.customNodeService!.test(
		action.packed,
		input.params,
		input.credentialId,
	);
	if (result.status === 'success' && result.fixture !== undefined) {
		rememberFixture(fixtureKey(context, threadId, action.bundleHash), result.fixture);
	}
	return {
		status: result.status,
		semver: action.semver,
		bundleHash: action.bundleHash,
		totalItems: result.items.length,
		items: wrapUntrustedData(
			JSON.stringify(result.items.slice(0, MAX_ITEMS)),
			'custom-node-test',
			action.id,
		),
		...(result.error !== undefined ? { error: result.error } : {}),
	};
}

async function handlePublish(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'publish' }>,
	ctx: CustomNodesToolContext,
) {
	const mode = context.permissions?.publishCustomNode;
	if (mode === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}
	if (ctx.resumeData !== undefined && ctx.resumeData !== null && !ctx.resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}
	const { threadId } = context;
	if (threadId === undefined) return NO_THREAD;

	const action = pickAction(
		await packProject(context, input.slug, ctx.abortSignal),
		input.actionId,
	);
	if ('error' in action) return action;
	const fixture = testedFixtures.get(fixtureKey(context, threadId, action.bundleHash));
	if (fixture === undefined) {
		return {
			success: false,
			error: `Test ${action.id} with this exact code first: no successful test matches bundle ${action.bundleHash}.`,
		};
	}

	const refused = await approveBundle(
		ctx,
		mode !== 'always_allow',
		action,
		formatApprovalMessage(
			`Publish ${action.id}@${action.semver} as a private custom node.`,
			input.summary,
		),
		'destructive',
	);
	if (refused) return refused;

	const published = await context.customNodeService!.publish(action.packed, {
		executions: [fixture],
	});
	return { success: true, id: published.id, semver: published.semver };
}

// ── Tool factory ────────────────────────────────────────────────────────────

export function createCustomNodesTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.CUSTOM_NODES)
		.description(
			'Build custom n8n actions with @n8n/node-sdk in the sandbox. Projects live at `nodes/<slug>`; ' +
				'edit them with the workspace file tools. Flow: scaffold → edit → pack → test → publish. ' +
				'Publish needs a successful test of the same code and a semver bump that the publish check accepts.',
		)
		.input(inputSchema)
		.suspend(suspendSchema)
		.resume(resumeSchema)
		.handler(async (rawInput, ctx) => {
			const input = inputSchema.parse(rawInput);
			try {
				switch (input.action) {
					case 'scaffold':
						return await handleScaffold(context, input, ctx.abortSignal);
					case 'pack':
						return await handlePack(context, input, ctx.abortSignal);
					case 'test':
						return await handleTest(context, input, ctx);
					case 'publish':
						return await handlePublish(context, input, ctx);
				}
			} catch (error) {
				if (ctx.abortSignal?.aborted) throw error;
				// Publish refusals are UserErrors that tell the agent what to change.
				context.logger.warn('custom-nodes tool call failed', { action: input.action, error });
				return { error: error instanceof Error ? error.message : String(error) };
			}
		})
		.build();
}
