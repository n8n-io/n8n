import type { BuiltTool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';
import { z } from 'zod';

import { declaredShapeNote, shapeWarningsBlock } from './declared-shapes';
import { resolvedCredentialSchema } from './resolved-credential.schema';
import { resolvedValuesBlock } from './resolved-values';
import { REVERIFY_DESCRIPTION, reverifyInputSchema } from './reverify-description';
import type { NodeOutputResult, ResolvedNodeParametersResult } from '../../types';
import type { WorkflowBuildOutcome } from '../../workflow-loop/workflow-loop-state';

interface ReadyBuild {
	success: true;
	workItemId: string;
	workflowId: string;
}

/** A saved build that needs no setup first, so verification can run right away. */
function isReadyBuild(result: unknown): result is ReadyBuild & Record<string, unknown> {
	return (
		isRecord(result) &&
		result.success === true &&
		typeof result.workItemId === 'string' &&
		typeof result.workflowId === 'string' &&
		isRecord(result.verificationReadiness) &&
		result.verificationReadiness.status === 'ready' &&
		!(isRecord(result.setupRequirement) && result.setupRequirement.status === 'required')
	);
}

const credentialsByNodeSchema = z.record(z.array(resolvedCredentialSchema));

const VERIFIED_NOTE =
	'Verification already ran for this build; its result is in `verification`. Do not call verify-built-workflow again unless you change the workflow.';

const VERIFIED_BY_TRIGGER_NOTE =
	'Verification already ran once for each trigger; the results are in `verificationByTrigger`, and coverage is the union of those runs. Do not call verify-built-workflow again for a verified trigger unless you change the workflow.';

/** Triggers that deliver what a run gets as input, so a run without it reads nothing. */
const INPUT_TRIGGER_TYPES = new Set([
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
]);

const triggerNodesSchema = z.array(z.object({ nodeName: z.string(), nodeType: z.string() }));

/** What the build-time verification reads besides the build result. */
export interface BuildVerificationSources {
	getWorkflow(workflowId: string): Promise<WorkflowJSON | undefined>;
	getBuildOutcome(workItemId: string): Promise<WorkflowBuildOutcome | undefined>;
	getResolvedNodeParameters?(
		executionId: string,
		nodeName: string,
	): Promise<ResolvedNodeParametersResult>;
	getNodeOutput?(executionId: string, nodeName: string): Promise<NodeOutputResult>;
}

const allStrings = (value: unknown): string[] => {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap(allStrings);
	return isRecord(value) ? Object.values(value).flatMap(allStrings) : [];
};

/** `$('Name')` or `$("Name")` in an expression. */
const readsByName = (text: string, name: string) =>
	["'", '"', '`'].some((quote) => text.includes(`$(${quote}${name}${quote})`));

/** True when a node reads the trigger output: `$('Trigger')` anywhere, or `$json` right after it. */
function readsTriggerOutput(workflow: WorkflowJSON, triggerName: string): boolean {
	const children = new Set(
		(workflow.connections?.[triggerName]?.main ?? []).flatMap((targets) =>
			(targets ?? []).map(({ node }) => node),
		),
	);
	return workflow.nodes.some((node) =>
		allStrings(node.parameters).some(
			(text) =>
				text.startsWith('=') &&
				(readsByName(text, triggerName) ||
					(node.name !== undefined && children.has(node.name) && text.includes('$json'))),
		),
	);
}

interface TriggerRun {
	readonly triggerNodeName: string;
	/** The nodes read the trigger output, and no sample stands in for it. */
	readonly needsInput: boolean;
}

/** One entry per trigger of the build. A trigger with a declared sample runs on that sample. */
function triggerRunsOf(
	build: ReadyBuild & Record<string, unknown>,
	workflow: WorkflowJSON | undefined,
	outcome: WorkflowBuildOutcome | undefined,
): TriggerRun[] {
	const parsed = triggerNodesSchema.safeParse(build.triggerNodes);
	const triggers = parsed.success ? parsed.data : [];
	return triggers.map(({ nodeName, nodeType }) => ({
		triggerNodeName: nodeName,
		needsInput:
			workflow !== undefined &&
			INPUT_TRIGGER_TYPES.has(nodeType) &&
			!outcome?.simulationFixtures?.[nodeName]?.length &&
			readsTriggerOutput(workflow, nodeName),
	}));
}

/** The result for a trigger that verification skipped because it has no input. */
const needsInputResult = (triggerNodeName: string) => ({
	skipped: 'needs_input',
	guidance: `Verification did not run: the workflow reads the output of trigger "${triggerNodeName}", and it has no sample. This is not a workflow error. Call verify-built-workflow with triggerNodeName "${triggerNodeName}" and inputData shaped like its output, or add a \`sample\` to the trigger and build again.`,
});

/** The nodes that the run reached, when the verification lists them. */
const reachedOf = (verification: Record<string, unknown>) =>
	Array.isArray(verification.nodesExecuted)
		? verification.nodesExecuted.filter((name): name is string => typeof name === 'string')
		: undefined;

/** `shapeWarnings` for a run with an execution, when the sources can read node output. */
async function shapeWarningsOf(
	verification: Record<string, unknown>,
	workflow: WorkflowJSON,
	sources: BuildVerificationSources | undefined,
): Promise<string | undefined> {
	const read = sources?.getNodeOutput?.bind(sources);
	const { executionId } = verification;
	if (!read || typeof executionId !== 'string') return undefined;
	return await shapeWarningsBlock({
		workflow,
		reached: reachedOf(verification),
		readOutput: async (nodeName) => await read(executionId, nodeName),
	});
}

/**
 * Adds to a verification that ran: `resolvedValues`, the value of each mapped field of the write
 * and condition nodes, with its source field and origin; `shapeWarnings`, where an output differs
 * from its declared shape; and `declaredShapeNote`, the nodes pinned with a declared fixture.
 */
async function withReadback(
	verification: unknown,
	ids: { workItemId: string },
	workflow: WorkflowJSON | undefined,
	sources: BuildVerificationSources | undefined,
): Promise<unknown> {
	if (!sources || !workflow || !isRecord(verification)) return verification;
	const { executionId } = verification;
	if (typeof executionId !== 'string') return verification;
	// Verification can update the plan, so read the outcome after the run.
	const outcome = await sources.getBuildOutcome(ids.workItemId).catch(() => undefined);
	const reached = reachedOf(verification);
	const resolve = sources.getResolvedNodeParameters?.bind(sources);
	const [resolvedValues, shapeWarnings] = await Promise.all([
		resolve && outcome
			? resolvedValuesBlock({
					workflow,
					outcome,
					reached,
					resolve: async (nodeName) => await resolve(executionId, nodeName),
				}).catch(() => undefined)
			: undefined,
		shapeWarningsOf(verification, workflow, sources),
	]);
	const note = outcome && declaredShapeNote(workflow, outcome, reached);
	return {
		...verification,
		...(resolvedValues ? { resolvedValues } : {}),
		...(shapeWarnings ? { shapeWarnings } : {}),
		...(note ? { declaredShapeNote: note } : {}),
	};
}

/**
 * Node contracts: the build already verifies, so the verify tool only describes a re-run. With
 * `sources`, a re-run also gets `shapeWarnings`.
 */
export function asReverifyTool(verify: BuiltTool, sources?: BuildVerificationSources): BuiltTool {
	const handler = verify.handler;
	const described = {
		...verify,
		description: REVERIFY_DESCRIPTION,
		inputSchema: reverifyInputSchema(verify.inputSchema),
	};
	if (!handler || !sources?.getNodeOutput) return described;
	return {
		...described,
		handler: async (input, ctx) => {
			const result: unknown = await handler(input, ctx);
			if (!isRecord(input) || typeof input.workflowId !== 'string' || !isRecord(result)) {
				return result;
			}
			const workflow = await sources.getWorkflow(input.workflowId).catch(() => undefined);
			const shapeWarnings = workflow && (await shapeWarningsOf(result, workflow, sources));
			return shapeWarnings ? { ...result, shapeWarnings } : result;
		},
	};
}

function withoutNulls(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(withoutNulls);
	if (!isRecord(value)) return value;
	return Object.fromEntries(
		Object.entries(value)
			.filter(([, field]) => field !== null && field !== undefined)
			.map(([key, field]) => [key, withoutNulls(field)]),
	);
}

/** True when the preview holds only empty items, e.g. `[{}]`. */
function isEmptyPreview(preview: unknown): boolean {
	if (!isRecord(preview) || preview.truncated === true || typeof preview.preview !== 'string') {
		return false;
	}
	const body = /^<untrusted_data\b[^>]*>\n([\s\S]*)\n<\/untrusted_data>$/.exec(
		preview.preview,
	)?.[1];
	try {
		const items: unknown = JSON.parse(body ?? preview.preview);
		return (
			Array.isArray(items) && items.every((item) => isRecord(item) && !Object.keys(item).length)
		);
	} catch {
		return false;
	}
}

function compactVerification(verification: unknown, workItemId: unknown): unknown {
	if (!isRecord(verification)) return verification;
	const claimHasSimulatedNodes =
		isRecord(verification.claim) && Array.isArray(verification.claim.simulatedNodes);
	return Object.fromEntries(
		Object.entries(verification).flatMap(([key, field]): Array<[string, unknown]> => {
			if (key === 'simulatedNodes' && claimHasSimulatedNodes) return [];
			if (key === 'resolvedWorkItemId' && field === workItemId) return [];
			// Keep empty outputs of a failed run; they can explain the failure.
			if (key === 'nodePreviews' && verification.success === true && Array.isArray(field)) {
				return [[key, field.filter((preview) => !isEmptyPreview(preview))]];
			}
			return [[key, field]];
		}),
	);
}

/** One sentence for stored credentials only; other notes carry setup steps, so they stay. */
function compactCredentialNote(note: unknown, credentialsByNode: unknown): unknown {
	const parsed = credentialsByNodeSchema.safeParse(credentialsByNode);
	if (
		typeof note !== 'string' ||
		!note.startsWith('Connected existing credential(s) automatically:') ||
		!parsed.success
	) {
		return note;
	}
	const entries = Object.entries(parsed.data);
	if (entries.some(([, credentials]) => credentials.some(({ id }) => id === null))) return note;
	const attached = entries.flatMap(([nodeName, credentials]) =>
		credentials.map(({ name }) => `"${name}" on "${nodeName}"`),
	);
	return `Already set up, do not route to setup: ${attached.join('; ')}.`;
}

function compactSuccessField(
	key: string,
	field: unknown,
	result: Record<string, unknown>,
): Array<[string, unknown]> {
	switch (key) {
		case 'sourceHash':
			return [];
		case 'verificationNote':
			// Each per-trigger run asks to verify the other triggers; this note says they already ran.
			return result.verificationByTrigger === undefined ? [] : [[key, field]];
		case 'grouping':
			return isRecord(field) && field.decision === 'under_ceiling' ? [] : [[key, field]];
		case 'postBuildFlow':
			// The anchored skill carries the rules, so the guidance text only repeats them.
			return isRecord(field) &&
				typeof field.skillId === 'string' &&
				field.instructions === `Follow the active ${field.skillId} skill instructions.`
				? [[key, { required: field.required, skillId: field.skillId }]]
				: [[key, field]];
		case 'publishState': {
			if (!isRecord(field) || typeof field.live !== 'string') return [[key, field]];
			const note = result.publishStateNote;
			return [
				[
					'live',
					field.live === 'unpublished' || typeof note !== 'string'
						? field.live
						: `${field.live}: ${note}`,
				],
			];
		}
		case 'publishStateNote':
			return isRecord(result.publishState) && typeof result.publishState.live === 'string'
				? []
				: [[key, field]];
		case 'credentialResolutionNote':
			return [[key, compactCredentialNote(field, result.resolvedCredentialsByNode)]];
		case 'verification':
			return [[key, compactVerification(field, result.workItemId)]];
		case 'verificationByTrigger':
			return isRecord(field)
				? [
						[
							key,
							Object.fromEntries(
								Object.entries(field).map(([trigger, verification]) => [
									trigger,
									compactVerification(verification, result.workItemId),
								]),
							),
						],
					]
				: [[key, field]];
		default:
			return [[key, field]];
	}
}

/** Model view of a build result. The stored result keeps every field. */
export function toBuildModelOutput(output: unknown): unknown {
	const result = withoutNulls(output);
	if (!isRecord(result) || result.success !== true) return result;
	return Object.fromEntries(
		Object.entries(result).flatMap(([key, field]) => compactSuccessField(key, field, result)),
	);
}

/**
 * Node contracts: a successful build also runs verification, so the response carries the next
 * state and the agent saves a round trip. Each trigger runs once. A trigger whose output the
 * nodes read and that has no sample does not run: the run would read nothing and report a
 * failure that the workflow does not have. The verify tool stays available for later runs.
 */
export function withBuildVerification(
	build: BuiltTool,
	verify: BuiltTool | undefined,
	sources?: BuildVerificationSources,
): BuiltTool {
	const buildHandler = build.handler;
	const verifyHandler = verify?.handler;
	if (!buildHandler || !verifyHandler) return build;
	const outputSchema =
		build.outputSchema instanceof z.ZodObject
			? build.outputSchema.extend({
					verification: z.unknown().optional(),
					verificationByTrigger: z.record(z.unknown()).optional(),
					verificationNote: z.string().optional(),
				})
			: build.outputSchema;
	return {
		...build,
		description: `${build.description} A successful build also runs verification and returns it in \`verification\` (\`verificationByTrigger\` for several triggers); verify again only after a change.`,
		outputSchema,
		toModelOutput: (output) =>
			toBuildModelOutput(build.toModelOutput ? build.toModelOutput(output) : output),
		handler: async (input, ctx) => {
			const result = await buildHandler(input, ctx);
			if (!isReadyBuild(result)) return result;
			const ids = { workItemId: result.workItemId, workflowId: result.workflowId };
			const [workflow, outcome] = sources
				? await Promise.all([
						sources.getWorkflow(result.workflowId).catch(() => undefined),
						sources.getBuildOutcome(result.workItemId).catch(() => undefined),
					])
				: [undefined, undefined];
			const runs = triggerRunsOf(result, workflow, outcome);
			if (runs.length <= 1) {
				const [only] = runs;
				const verification = only?.needsInput
					? needsInputResult(only.triggerNodeName)
					: await withReadback(await verifyHandler(ids, ctx), ids, workflow, sources);
				return { ...result, verification, verificationNote: VERIFIED_NOTE };
			}
			// One run at a time: each run records its trigger in the same build outcome.
			const verificationByTrigger = await runs.reduce<Promise<Record<string, unknown>>>(
				async (previous, { triggerNodeName, needsInput }) => ({
					...(await previous),
					[triggerNodeName]: needsInput
						? needsInputResult(triggerNodeName)
						: await withReadback(
								await verifyHandler({ ...ids, triggerNodeName }, ctx),
								ids,
								workflow,
								sources,
							),
				}),
				Promise.resolve({}),
			);
			return { ...result, verificationByTrigger, verificationNote: VERIFIED_BY_TRIGGER_NOTE };
		},
	};
}
