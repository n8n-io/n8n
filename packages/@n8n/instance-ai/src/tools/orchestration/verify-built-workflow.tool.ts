/**
 * Verify Built Workflow Tool
 *
 * Runs a built workflow using sidecar verification pin data from the build outcome.
 * The verification pin data is never persisted to the workflow — it only exists
 * for this execution.
 */

import { Tool } from '@n8n/agents';
import { isRecord } from '@n8n/utils';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';
import { createRemediation, terminalRemediationFromState } from '../../workflow-loop/remediation';
import type {
	RemediationMetadata,
	WorkflowBuildOutcome,
} from '../../workflow-loop/workflow-loop-state';

const DEFAULT_NODE_PREVIEW_CHARS = 600;

function stringifyForToolOutput(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}

function unwrapUntrustedData(value: string): unknown {
	const match = /^<untrusted_data\b[^>]*>\n([\s\S]*)\n<\/untrusted_data>$/i.exec(value);
	if (!match) return value;
	const content = match[1];
	if (content === undefined) return value;

	try {
		const parsed: unknown = JSON.parse(content);
		return parsed;
	} catch {
		return value;
	}
}

function outputForInspection(nodeOutput: unknown): unknown {
	return typeof nodeOutput === 'string' ? unwrapUntrustedData(nodeOutput) : nodeOutput;
}

function getCountFromMetadata(value: unknown): number | undefined {
	if (!isRecord(value)) return undefined;

	for (const key of ['totalItems', '_itemCount']) {
		const count = value[key];
		if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
			return count;
		}
	}

	return undefined;
}

function countOutputItems(nodeOutput: unknown): number | undefined {
	const output = outputForInspection(nodeOutput);
	if (Array.isArray(output)) return output.length;
	const metadataCount = getCountFromMetadata(output);
	if (metadataCount !== undefined) return metadataCount;
	if (output === undefined || output === null) return 0;
	return 1;
}

function previewValue(value: unknown, maxChars: number): { preview: string; truncated: boolean } {
	const serialized = stringifyForToolOutput(value);
	if (maxChars <= 0) {
		return { preview: '', truncated: serialized.length > 0 };
	}
	if (serialized.length <= maxChars) {
		return { preview: serialized, truncated: false };
	}
	return { preview: `${serialized.slice(0, maxChars)}...`, truncated: true };
}

function buildNodePreviews(
	resultData: Record<string, unknown> | undefined,
	maxChars: number,
	simulatedNodeNames?: ReadonlySet<string>,
): Array<{
	nodeName: string;
	itemCount?: number;
	preview: string;
	truncated: boolean;
	chars: number;
	simulated?: boolean;
}> {
	if (!resultData) return [];

	return Object.entries(resultData).map(([nodeName, nodeOutput]) => {
		const serialized = stringifyForToolOutput(nodeOutput);
		const preview = previewValue(nodeOutput, maxChars);
		return {
			nodeName,
			itemCount: countOutputItems(nodeOutput),
			preview: preview.preview,
			truncated: preview.truncated,
			chars: serialized.length,
			...(simulatedNodeNames?.has(nodeName) ? { simulated: true } : {}),
		};
	});
}

/**
 * Per-execution pin data for the verification run, assembled from the build
 * outcome sidecar. Fixture items take precedence over the legacy
 * `{_mockedCredential}` markers (still read for build outcomes stored before
 * the marker channel was retired). A `simulate`-verdict node without a
 * fixture is still pinned (with an empty item) — losing output realism is
 * acceptable, executing a destructive operation is not.
 */
function buildVerificationPinData(buildOutcome: WorkflowBuildOutcome): {
	pinData: Record<string, unknown[]> | undefined;
	simulatedNodes: Array<{ nodeName: string; reason: string }>;
} {
	const merged: Record<string, unknown[]> = { ...(buildOutcome.verificationPinData ?? {}) };
	const fixtures = buildOutcome.simulationFixtures ?? {};
	const simulatedNodes: Array<{ nodeName: string; reason: string }> = [];

	for (const verdict of buildOutcome.nodeSimulationPlan ?? []) {
		if (verdict.verdict !== 'simulate') continue;
		simulatedNodes.push({ nodeName: verdict.nodeName, reason: verdict.reason });
		const items = fixtures[verdict.nodeName];
		merged[verdict.nodeName] = items?.length ? items : [{}];
	}

	return {
		pinData: Object.keys(merged).length > 0 ? merged : undefined,
		simulatedNodes,
	};
}

function countProducedOutputRows(
	resultData: Record<string, unknown> | undefined,
): number | undefined {
	if (!resultData) return undefined;
	let count = 0;
	for (const nodeOutput of Object.values(resultData)) {
		const itemCount = countOutputItems(nodeOutput);
		if (itemCount !== undefined) count += itemCount;
	}
	return count;
}

export const verifyBuiltWorkflowInputSchema = z.object({
	workItemId: z.string().describe('The work item ID from the build (wi_XXXXXXXX)'),
	workflowId: z.string().describe('The workflow ID to verify'),
	inputData: z
		.record(z.unknown())
		.optional()
		.describe(
			"Input data for the workflow trigger. Shape MUST match the trigger's real-world output: " +
				'Form Trigger → flat field map like {name: "Alice", email: "a@b.c"} (do NOT wrap in formFields); ' +
				'Webhook → the body payload like {event: "signup", userId: "..."} (adapter wraps it under body); ' +
				'Chat Trigger → {chatInput: "user message"}; ' +
				'Schedule Trigger → omit inputData. ' +
				"If you wrap a form payload in {formFields: {...}} the adapter will reject the call — the builder's " +
				'downstream expressions reference $json.<field>, matching the flat production shape.',
		),
	timeout: z
		.number()
		.int()
		.min(1000)
		.max(600_000)
		.optional()
		.describe('Max wait time in milliseconds (default 300000)'),
	includeData: z
		.boolean()
		.optional()
		.describe('Set true only when you need the full execution data payload. Default false.'),
	maxDataChars: z
		.number()
		.int()
		.min(0)
		.max(20_000)
		.optional()
		.describe('Max characters per node preview in the compact response (default 600).'),
});

const remediationOutputSchema = z
	.object({
		category: z.enum(['code_fixable', 'needs_setup', 'blocked']),
		shouldEdit: z.boolean(),
		guidance: z.string(),
		reason: z.string().optional(),
		remainingSubmitFixes: z.number().int().min(0).optional(),
		attemptCount: z.number().int().min(0).optional(),
	})
	.optional();

const CREDENTIAL_FAILURE_KEYWORDS = [
	'credential',
	'unauthorized',
	'forbidden',
	'401',
	'403',
	'free tier',
	'quota',
];
const TRANSIENT_FAILURE_KEYWORDS = ['429', 'rate limit', '502', 'bad gateway', 'timed out'];

function messageMatchesAny(normalized: string, keywords: readonly string[]): boolean {
	return keywords.some((keyword) => normalized.includes(keyword));
}

function classifyVerificationFailure(
	error: string | undefined,
	status: string | undefined,
	buildOutcome: WorkflowBuildOutcome,
): RemediationMetadata {
	if (buildOutcome.hasUnresolvedPlaceholders) {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'mocked_credentials_or_placeholders',
			guidance:
				'Workflow submitted successfully, but verification is blocked by unresolved setup values. Stop code edits and route to workflows(action="setup").',
		});
	}

	if (status === 'waiting') {
		const hasSimulationPlan = (buildOutcome.nodeSimulationPlan?.length ?? 0) > 0;
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: hasSimulationPlan ? 'unsimulated_user_action_node' : 'execution_waiting',
			guidance: hasSimulationPlan
				? 'Verification paused on a node that waits for user action and was not simulated — ' +
					'nodes downstream of it were not verified. This is not a workflow bug: do not edit ' +
					'the code. Report to the user which node paused and that the rest of the workflow ' +
					'needs a manual test.'
				: 'Workflow verification is waiting for user action or setup. Stop code edits and ask the user to complete setup.',
		});
	}

	const normalized = (error ?? '').toLowerCase();
	const mockedCredentialTypeCount = buildOutcome.mockedCredentialTypes?.length ?? 0;
	const mockedNodeCount = buildOutcome.mockedNodeNames?.length ?? 0;
	const hasMockedCredentialContext = Boolean(mockedCredentialTypeCount > 0 || mockedNodeCount > 0);
	if (messageMatchesAny(normalized, CREDENTIAL_FAILURE_KEYWORDS)) {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: hasMockedCredentialContext
				? 'mocked_credentials_or_placeholders'
				: 'credential_or_setup_failure',
			guidance: hasMockedCredentialContext
				? 'Workflow submitted successfully, but verification is blocked by mocked credentials. Stop code edits and route to workflows(action="setup").'
				: 'Workflow submitted successfully, but verification requires credential or account setup. Stop code edits and route to workflows(action="setup").',
		});
	}

	if (messageMatchesAny(normalized, TRANSIENT_FAILURE_KEYWORDS)) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'external_service_or_timeout',
			guidance:
				'Workflow submitted successfully, but verification is blocked by an external service or timeout. Stop code edits and explain the blocker to the user.',
		});
	}

	return createRemediation({
		category: 'code_fixable',
		shouldEdit: true,
		reason: 'runtime_failure',
		guidance:
			'Verification found a workflow runtime failure. Diagnose it and apply one batched workflow-code repair if the guard allows it.',
	});
}

const verifyBuiltWorkflowOutputSchema = z.object({
	executionId: z.string().optional(),
	success: z.boolean(),
	status: z.enum(['running', 'success', 'error', 'waiting', 'unknown']).optional(),
	nodesExecuted: z.array(z.string()).optional(),
	nodePreviews: z
		.array(
			z.object({
				nodeName: z.string(),
				itemCount: z.number().optional(),
				preview: z.string(),
				truncated: z.boolean(),
				chars: z.number(),
				simulated: z.boolean().optional(),
			}),
		)
		.optional(),
	simulatedNodes: z.array(z.object({ nodeName: z.string(), reason: z.string() })).optional(),
	simulationNote: z.string().optional(),
	lastNodeExecuted: z.string().optional(),
	nodesNotReached: z.array(z.string()).optional(),
	coverageNote: z.string().optional(),
	data: z.record(z.unknown()).optional(),
	error: z.string().optional(),
	remediation: remediationOutputSchema,
	guidance: z.string().optional(),
});

type VerifyBuiltWorkflowOutput = z.infer<typeof verifyBuiltWorkflowOutputSchema>;
type VerifyInput = z.infer<typeof verifyBuiltWorkflowInputSchema>;
type WorkflowTaskService = NonNullable<OrchestrationContext['workflowTaskService']>;
type ExecutionRunResult = Awaited<
	ReturnType<NonNullable<OrchestrationContext['domainContext']>['executionService']['run']>
>;

/** Names that actually ran, falling back to data keys for hosts that don't report executedNodeNames. */
function namesOrDataKeys(
	reachedNames: Set<string>,
	data: Record<string, unknown> | undefined,
): string[] | undefined {
	if (reachedNames.size > 0) return [...reachedNames];
	return data ? Object.keys(data) : undefined;
}

/**
 * Validate the verify request and load the build outcome. Returns an early result
 * to short-circuit the handler, or the resolved build outcome + prior loop state.
 */
async function resolveVerifyPreconditions(
	input: VerifyInput,
	context: OrchestrationContext,
): Promise<
	| { result: VerifyBuiltWorkflowOutput }
	| {
			buildOutcome: WorkflowBuildOutcome;
			workflowId: string;
			stateBefore: Awaited<ReturnType<WorkflowTaskService['getWorkflowLoopState']>> | undefined;
			workflowTaskService: WorkflowTaskService;
			domainContext: NonNullable<OrchestrationContext['domainContext']>;
	  }
> {
	if (!context.workflowTaskService || !context.domainContext) {
		const remediation = createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'verification_support_unavailable',
			guidance: 'Verification support is not available. Stop code edits and explain the blocker.',
		});
		return {
			result: { success: false, error: 'Verification support not available.', remediation },
		};
	}

	const stateBefore = await context.workflowTaskService.getWorkflowLoopState(input.workItemId);
	const terminalRemediation =
		stateBefore?.lastRemediation && !stateBefore.lastRemediation.shouldEdit
			? terminalRemediationFromState(stateBefore, context.runId)
			: undefined;
	if (terminalRemediation) {
		return {
			result: {
				success: false,
				error: terminalRemediation.guidance,
				remediation: terminalRemediation,
				guidance: terminalRemediation.guidance,
			},
		};
	}

	const buildOutcome = await context.workflowTaskService.getBuildOutcome(input.workItemId);
	if (!buildOutcome) {
		const remediation = createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'missing_build_outcome',
			guidance: `No build outcome found for work item ${input.workItemId}. Stop code edits and explain the blocker.`,
		});
		return {
			result: {
				success: false,
				error: `No build outcome found for work item ${input.workItemId}.`,
				remediation,
				guidance: remediation.guidance,
			},
		};
	}

	if (!buildOutcome.workflowId) {
		return {
			result: {
				success: false,
				error: `Build outcome ${input.workItemId} does not include a workflow ID.`,
			},
		};
	}

	if (buildOutcome.workflowId !== input.workflowId) {
		return {
			result: {
				success: false,
				error:
					`Build outcome ${input.workItemId} belongs to workflow ${buildOutcome.workflowId}, ` +
					`but verification was requested for workflow ${input.workflowId}.`,
			},
		};
	}

	return {
		buildOutcome,
		workflowId: buildOutcome.workflowId,
		stateBefore,
		workflowTaskService: context.workflowTaskService,
		domainContext: context.domainContext,
	};
}

/**
 * Handle the no-simulation-plan case: refuse to run (no safeguards for destructive
 * nodes), persist the terminal verdict best-effort, and return a blocked result.
 */
async function handleMissingSimulationPlan(
	input: VerifyInput,
	context: OrchestrationContext,
	workflowTaskService: WorkflowTaskService,
	workflowId: string,
): Promise<VerifyBuiltWorkflowOutput> {
	const guidance =
		'Verification was not run because the build outcome has no simulation plan. ' +
		'Rebuild or resubmit the workflow so destructive nodes can be classified before verification.';
	const remediation = createRemediation({
		category: 'blocked',
		shouldEdit: false,
		reason: 'missing_simulation_plan',
		guidance,
	});
	context.logger.warn(
		'verify-built-workflow: build outcome has no simulation plan — refusing to run without simulation safeguards',
		{ workItemId: input.workItemId, workflowId },
	);
	try {
		await workflowTaskService.updateBuildOutcome(input.workItemId, {
			remediation,
			verification: {
				attempted: true,
				success: false,
				status: 'unknown',
				failureSignature: 'missing_simulation_plan',
				evidence: { errorMessage: guidance },
				verifiedAt: new Date().toISOString(),
			},
		});
	} catch {
		// intentional: verification record persistence is advisory
	}
	try {
		await workflowTaskService.reportVerificationVerdict({
			workItemId: input.workItemId,
			runId: context.runId,
			workflowId,
			verdict: 'failed_terminal',
			failureSignature: 'missing_simulation_plan',
			diagnosis: guidance,
			remediation,
			summary: guidance,
		});
	} catch (error) {
		context.logger.warn('verify-built-workflow: failed to persist terminal verdict', {
			workItemId: input.workItemId,
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
	return { success: false, status: 'unknown', error: guidance, remediation, guidance };
}

/** Persist a structured verification record onto the build outcome (best-effort). */
async function persistVerificationRecord(
	input: VerifyInput,
	workflowTaskService: WorkflowTaskService,
	args: {
		success: boolean;
		result: ExecutionRunResult;
		reachedNames: Set<string>;
		nodesNotReached: string[];
	},
): Promise<void> {
	const { success, result, reachedNames, nodesNotReached } = args;
	try {
		const executedForEvidence = namesOrDataKeys(reachedNames, result.data);
		await workflowTaskService.updateBuildOutcome(input.workItemId, {
			verification: {
				attempted: true,
				success,
				executionId: result.executionId || undefined,
				status: result.status,
				failureSignature: success ? undefined : result.error,
				evidence: {
					nodesExecuted:
						executedForEvidence && executedForEvidence.length > 0 ? executedForEvidence : undefined,
					nodesNotReached: nodesNotReached.length > 0 ? nodesNotReached : undefined,
					producedOutputRows: countProducedOutputRows(result.data),
					errorMessage: success ? undefined : result.error,
				},
				verifiedAt: new Date().toISOString(),
			},
		});
	} catch {
		// intentional: verification record persistence is advisory
	}
}

/** Report a terminal (non-editable) remediation verdict and emit guard telemetry (best-effort). */
async function reportTerminalRemediation(
	input: VerifyInput,
	context: OrchestrationContext,
	workflowTaskService: WorkflowTaskService,
	args: { remediation: RemediationMetadata; workflowId: string; executionId: string | undefined },
): Promise<void> {
	const { remediation, workflowId, executionId } = args;
	try {
		await workflowTaskService.reportVerificationVerdict({
			workItemId: input.workItemId,
			runId: context.runId,
			workflowId,
			executionId,
			verdict: remediation.category === 'needs_setup' ? 'needs_user_input' : 'failed_terminal',
			failureSignature: remediation.reason,
			diagnosis: remediation.guidance,
			remediation,
			summary: remediation.guidance,
		});
	} catch (error) {
		context.logger.warn('verify-built-workflow: failed to persist terminal verdict', {
			workItemId: input.workItemId,
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
	try {
		context.trackTelemetry?.('Builder remediation guard fired', {
			thread_id: context.threadId,
			run_id: context.runId,
			work_item_id: input.workItemId,
			workflow_id: workflowId,
			category: remediation.category,
			attempt_count: remediation.attemptCount,
			reason: remediation.reason,
		});
	} catch (error) {
		context.logger.warn('verify-built-workflow: failed to emit remediation telemetry', {
			workItemId: input.workItemId,
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

function buildSimulationNote(
	reachedSimulatedNodes: Array<{ nodeName: string; reason: string }>,
	planMissing: boolean,
): string | undefined {
	if (reachedSimulatedNodes.length > 0) {
		return (
			`Simulated ${reachedSimulatedNodes.length} node(s) during verification — no real external writes happened: ` +
			reachedSimulatedNodes.map((n) => `${n.nodeName} (${n.reason})`).join('; ') +
			'. Relay this to the user when presenting the result.'
		);
	}
	if (planMissing) {
		return (
			'No simulation plan was available for this verification run — nodes were NOT ' +
			'simulated and may have performed real external writes (sent messages, created or ' +
			'modified records). Relay this to the user when presenting the result.'
		);
	}
	return undefined;
}

function buildCoverageNote(
	nodesNotReached: string[],
	result: ExecutionRunResult,
	success: boolean,
): string | undefined {
	if (nodesNotReached.length === 0) return undefined;
	const ending = result.lastNodeExecuted
		? `. Execution ended at "${result.lastNodeExecuted}"${success ? ' because it produced no output items (empty item lists stop downstream nodes)' : ''}.`
		: '.';
	const guidance = success
		? ' This usually means a lookup or query returned nothing. Seed matching test data and re-run verification, or tell the user the unreached part needs a manual test. Do NOT report the workflow as fully verified.'
		: '';
	return (
		`Partial coverage: ${nodesNotReached.length} node(s) were never reached and remain UNVERIFIED: ` +
		nodesNotReached.join(', ') +
		ending +
		guidance
	);
}

export function createVerifyBuiltWorkflowTool(context: OrchestrationContext) {
	return new Tool('verify-built-workflow')
		.description(
			'Run a built workflow using sidecar verification context from the build outcome. ' +
				'Call when the current turn is responsible for post-build verification. ' +
				'Use this as the standard verifier for workflows produced by the workflow-builder. ' +
				'It supports manual, schedule, form, webhook, chat, and other event triggers with build-outcome pin data, mocked credential context, or trigger-shaped inputData. ' +
				'Use `executions(action="run")` only for ad hoc runs outside build verification. ' +
				'CRITICAL: `inputData` shape depends on the trigger type — see the per-trigger guidance on the inputData field. ' +
				'Passing the wrong shape (e.g. wrapping form fields under `formFields`) produces null downstream values that ' +
				'look like an expression bug but are not — do not patch the workflow, re-run verify with the correct shape.',
		)
		.input(verifyBuiltWorkflowInputSchema)
		.output(verifyBuiltWorkflowOutputSchema)
		.handler(async (input: VerifyInput) => {
			const preconditions = await resolveVerifyPreconditions(input, context);
			if ('result' in preconditions) return preconditions.result;
			const { buildOutcome, workflowId, stateBefore, workflowTaskService, domainContext } =
				preconditions;

			// Destructive nodes (including dataTable writes) are simulated via the
			// build outcome's node simulation plan, so verification creates no
			// external side effects and needs no post-run cleanup.
			//
			// An undefined plan (as opposed to an empty one) means the outcome
			// predates classification or classification failed entirely — nothing
			// shields destructive nodes in that run, so flag it instead of
			// silently executing everything for real.
			const planMissing = buildOutcome.nodeSimulationPlan === undefined;
			if (planMissing) {
				return await handleMissingSimulationPlan(input, context, workflowTaskService, workflowId);
			}
			const { pinData: verificationPinData, simulatedNodes } =
				buildVerificationPinData(buildOutcome);
			const simulationMap =
				simulatedNodes.length > 0
					? Object.fromEntries(simulatedNodes.map((n) => [n.nodeName, { reason: n.reason }]))
					: undefined;

			const result = await domainContext.executionService.run(workflowId, input.inputData, {
				timeout: input.timeout,
				pinData: verificationPinData,
				simulation: simulationMap,
			});

			// Coverage: partition the simulation plan against the nodes that
			// actually ran. A read node returning zero items legitimately ends the
			// execution early (empty item list → downstream never runs), which
			// would otherwise look like a clean success while most of the workflow
			// — including its planned simulations — was never exercised.
			// `executedNodeNames` includes zero-output nodes that `result.data`
			// omits; fall back to data keys for hosts that don't report it (e.g.
			// the eval-harness execution stub).
			const reachedNames = new Set(
				result.executedNodeNames ?? (result.data ? Object.keys(result.data) : []),
			);
			const reachedSimulatedNodes = simulatedNodes.filter((n) => reachedNames.has(n.nodeName));
			const nodesNotReached = (buildOutcome.nodeSimulationPlan ?? [])
				.map((verdict) => verdict.nodeName)
				.filter((name) => !reachedNames.has(name));

			// `waiting` handling depends on whether this build has a simulation plan.
			//
			// With a plan, every legitimate user-action pause (Form pages, Wait,
			// sendAndWait) was classified and pinned, so execution should never park
			// in `waiting` — when it does, a user-action node slipped past
			// classification (e.g. a community node that waits) and everything
			// downstream of it went unverified. That is a failure, not a success.
			//
			// Without a plan (build outcomes from before classification, or a total
			// classification failure), keep the legacy fallback: `waiting` with
			// output and no error counts as success — Form Trigger workflows ending
			// on a completion page legitimately finish in `waiting`, and failing
			// them caused builders to falsely retry verified workflows.
			const hasSimulationPlan = (buildOutcome.nodeSimulationPlan?.length ?? 0) > 0;
			const hasOutput = result.data ? Object.keys(result.data).length > 0 : false;
			const success =
				result.status === 'success' ||
				(!hasSimulationPlan && result.status === 'waiting' && !result.error && hasOutput);

			const failureRemediation = success
				? undefined
				: classifyVerificationFailure(result.error, result.status, buildOutcome);
			const budgetRemediation =
				failureRemediation?.shouldEdit === true
					? terminalRemediationFromState(stateBefore, context.runId)
					: undefined;
			const remediation = budgetRemediation ?? failureRemediation;

			// Persist a structured verification record (best-effort) so the checkpoint
			// follow-up turn can reuse it instead of re-running verify.
			await persistVerificationRecord(input, workflowTaskService, {
				success,
				result,
				reachedNames,
				nodesNotReached,
			});

			if (remediation && !remediation.shouldEdit) {
				await reportTerminalRemediation(input, context, workflowTaskService, {
					remediation,
					workflowId,
					executionId: result.executionId || undefined,
				});
			}

			const maxDataChars = input.maxDataChars ?? DEFAULT_NODE_PREVIEW_CHARS;
			const nodesExecuted = namesOrDataKeys(reachedNames, result.data);
			const simulatedNames = new Set(reachedSimulatedNodes.map((n) => n.nodeName));
			const simulationNote = buildSimulationNote(reachedSimulatedNodes, planMissing);
			const coverageNote = buildCoverageNote(nodesNotReached, result, success);
			return {
				executionId: result.executionId || undefined,
				success,
				status: result.status,
				nodesExecuted,
				lastNodeExecuted: result.lastNodeExecuted,
				nodePreviews: buildNodePreviews(result.data, maxDataChars, simulatedNames),
				simulatedNodes: reachedSimulatedNodes.length > 0 ? reachedSimulatedNodes : undefined,
				simulationNote,
				nodesNotReached: nodesNotReached.length > 0 ? nodesNotReached : undefined,
				coverageNote,
				...(input.includeData ? { data: result.data } : {}),
				error: result.error,
				remediation,
				guidance: remediation?.guidance,
			};
		})
		.build();
}
