/**
 * Verify Built Workflow Tool
 *
 * Runs a built workflow using sidecar verification pin data from the build outcome.
 * The verification pin data is never persisted to the workflow; it only exists
 * for this execution.
 */

import { Tool } from '@n8n/agents';
import { isTriggerNodeType } from 'n8n-workflow';
import { z } from 'zod';

import {
	describePathCoverage,
	enumerateExecutionPaths,
	pathCoverage,
} from '../../workflow-compiler/paths/enumerate-paths';

import type { InstanceAiWorkflowService, OrchestrationContext } from '../../types';
import { analyzeVerificationResult, buildNodePreviews } from './verification/analyze-result';
import { deriveVerificationClaim } from './verification/claim';
import type { VerificationPublishState } from './verification/claim';
import {
	handleMissingSimulationPlan,
	handleBlockedVerification,
	persistVerificationOutcome,
} from './verification/finalize-result';
import { prepareVerificationRun } from './verification/prepare-run';
import { reconcileStaleCredentialPlan } from './verification/reconcile-plan';
import { resolveVerificationTarget } from './verification/resolve-target';
import {
	buildResolvedParameterNote,
	collectResolvedParameterWarnings,
	resolvedParameterWarningSchema,
	skippedParameterCheckSchema,
} from './verification/resolved-parameter-warnings';
import { runVerificationScenarios } from './verification/run-scenarios';
import { runScriptedGateVerification } from './verification/scripted-gate-run';
import { checkToolSimulationSupport } from './verification/tool-simulation-preflight';
import { createVerificationGraph, getTriggerMainFlowScope } from '../workflows/verification-graph';
import { describeClaimLiveState } from '../../workflow-loop/render-claim';
import type { VerificationClaim } from '../../workflow-loop/workflow-loop-state';
import {
	executionNodeErrorSchema,
	verificationClaimSchema,
} from '../../workflow-loop/workflow-loop-state';
import { collectChatModelRecoveryContext } from '../workflows/chat-model-validation';

const DEFAULT_NODE_PREVIEW_CHARS = 600;

/**
 * The publish sentence for the tool result. A passing run on a stale published
 * workflow is the case a model reports as "live and working" — say what is
 * live before it does.
 */
function formatLiveStateNote(claim: VerificationClaim | undefined): string | undefined {
	// A scoped multi-trigger pass can settle without a workflow-level claim.
	if (claim === undefined) return undefined;

	const liveState = describeClaimLiveState(claim);
	if (liveState === undefined) return undefined;

	const fact =
		`${liveState} Do NOT describe the workflow as live, running, or working in production ` +
		'until it is published.';

	// Only a verified draft is worth publishing. Below `verified` the coverage
	// rules already refuse a publish offer, so the prompt would contradict them.
	return claim.level === 'verified'
		? `${fact} Publishing is what makes this change live — ask the user whether to do it.`
		: fact;
}

/**
 * Version pair behind `claim.liveState`. The executed version has to come from
 * the execution record: the workflow head moves when anybody saves, so
 * substituting it would let the claim describe a version this run never ran.
 * Without that record there is no publish state — an unknown run version must
 * not become `live-current`, which reads as "production is proven".
 */
async function resolvePublishState(args: {
	workflowService: InstanceAiWorkflowService;
	workflowId: string;
	executedVersionId: string | null | undefined;
	logger: OrchestrationContext['logger'];
}): Promise<VerificationPublishState | undefined> {
	const { workflowService, workflowId, executedVersionId, logger } = args;

	if (!executedVersionId) return undefined;

	try {
		const head = await workflowService.getWorkflowHead(workflowId);
		return { activeVersionId: head.activeVersionId, draftVersionId: executedVersionId };
	} catch (error) {
		logger.warn('Failed to read publish state for the verification claim', {
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}

const singleVerificationInputSchema = z.object({
	workItemId: z
		.string()
		.optional()
		.describe(
			'The work item ID from the build (wi_XXXXXXXX). Optional for follow-up verification; when omitted, the latest build outcome for workflowId in this thread is used.',
		),
	workflowId: z.string().describe('The workflow ID to verify'),
	inputData: z
		.record(z.unknown())
		.optional()
		.describe(
			"Input data for the workflow trigger. Shape MUST match the trigger's real-world output: " +
				'Form Trigger -> flat field map like {name: "Alice", email: "a@b.c"} (do NOT wrap in formFields); ' +
				'Webhook -> a flat payload like {event: "signup", userId: "..."} is placed under `body` and leaves ' +
				'`query`, `headers` and `params` EMPTY. When any expression reads $json.query.*, $json.headers.* or ' +
				'$json.params.*, pass the request envelope instead: {body: {...}, query: {caller: "+1555..."}, ' +
				'headers: {"x-github-event": "issues"}, params: {...}}. A flat payload cannot exercise those fields, they resolve ' +
				'empty, and a simulated downstream node still looks green; ' +
				'Chat Trigger -> {chatInput: "user message"}; ' +
				'Schedule Trigger -> omit inputData. ' +
				"If you wrap a form payload in {formFields: {...}} the adapter will reject the call; the builder's " +
				'downstream expressions reference $json.<field>, matching the flat production shape.',
		),
	triggerNodeName: z
		.string()
		.min(1)
		.optional()
		.describe(
			'Name of the trigger node to start verification from. REQUIRED when the workflow has ' +
				'more than one trigger: without it a single trigger is auto-detected and the other ' +
				"triggers' branches are never verified. To cover every branch, use one named scenario per " +
				"trigger. Trigger names come from build-workflow's `triggerNodes` or " +
				'workflows(action="get-as-code"). Never disable, delete, reorder, or re-save a workflow — ' +
				'and never build a throwaway copy — to reach a branch; use this instead.',
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
	fixtureOverrides: z
		.record(z.array(z.record(z.unknown())))
		.optional()
		.describe(
			'Optional per-run output fixtures keyed by node name. Only nodes already classified as simulated in the build outcome may be overridden. Use this for alternate deterministic scenarios, not raw trigger input. ' +
				'An empty array is rejected unless the node is also listed in `allowZeroItemFixtures`.',
		),
	fixTargetNodeNames: z
		.array(z.string())
		.optional()
		.describe(
			'Node names this change is about — the node the user reported as failing, or the node ' +
				'you just repaired. The verdict shown to the user is downgraded to "changed but ' +
				'unverified" when any of these was never reached or had simulated output, so a green ' +
				'run elsewhere cannot pass as proof for them. Pass these whenever you are fixing a ' +
				'specific node rather than building from scratch.',
		),
	allowZeroItemFixtures: z
		.array(z.string())
		.optional()
		.describe(
			'Node names whose `fixtureOverrides` entry may be an empty array. Zero items stop every node below, so the run reports success while verifying nothing. ' +
				'List a node here only when the empty branch is what you are verifying, and say so in your report.',
		),
});

const verificationScenarioSchema = singleVerificationInputSchema
	.pick({
		inputData: true,
		triggerNodeName: true,
		fixtureOverrides: true,
		allowZeroItemFixtures: true,
	})
	.extend({ name: z.string().trim().min(1).max(100) })
	.strict();

export const verifyBuiltWorkflowInputSchema = singleVerificationInputSchema
	.extend({
		scenarios: z
			.array(verificationScenarioSchema)
			.min(1)
			.max(10)
			.optional()
			.describe(
				'Run named branch or trigger scenarios in one call. Each scenario uses the same verifier and attempt budget. ' +
					'Runs are sequential. Stop on a failed, blocked, waiting, or running result. ' +
					'Put inputData, fixtureOverrides, and allowZeroItemFixtures inside each scenario. ' +
					'The top-level triggerNodeName is a shared default. Keep fixTargetNodeNames at the top level for every scenario.',
			),
	})
	.superRefine((input, ctx) => {
		if (!input.scenarios) return;
		const names = new Set<string>();
		for (const [index, scenario] of input.scenarios.entries()) {
			if (names.has(scenario.name)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['scenarios', index, 'name'],
					message: 'Use a unique scenario name.',
				});
			}
			names.add(scenario.name);
		}
		for (const field of ['inputData', 'fixtureOverrides', 'allowZeroItemFixtures'] as const) {
			if (input[field] !== undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: [field],
					message: `Put ${field} inside each scenario.`,
				});
			}
		}
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

const singleVerificationOutputSchema = z.object({
	resolvedWorkItemId: z.string().optional(),
	executionId: z.string().optional(),
	workflowVersionId: z.string().optional(),
	success: z.boolean(),
	status: z.enum(['running', 'success', 'error', 'waiting', 'unknown']).optional(),
	nodesExecuted: z.array(z.string()).optional(),
	nodePreviews: z
		.array(
			z.object({
				nodeName: z.string(),
				itemCount: z.number().optional(),
				outputs: z
					.array(
						z.object({
							index: z.number(),
							name: z.string().optional(),
							itemCount: z.number().optional(),
						}),
					)
					.optional(),
				preview: z.string(),
				truncated: z.boolean(),
				chars: z.number(),
				simulated: z.boolean().optional(),
			}),
		)
		.optional(),
	simulatedNodes: z.array(z.object({ nodeName: z.string(), reason: z.string() })).optional(),
	simulationNote: z.string().optional(),
	resolvedParameterWarnings: z.array(resolvedParameterWarningSchema).optional(),
	skippedParameterChecks: z.array(skippedParameterCheckSchema).optional(),
	skippedParameterCheckCount: z.number().int().nonnegative().optional(),
	lastNodeExecuted: z.string().optional(),
	nodeErrors: z.array(executionNodeErrorSchema).optional(),
	nodesNotReached: z.array(z.string()).optional(),
	coverageNote: z.string().optional(),
	/** Branch paths from the verified trigger, and which of them this run exercised. */
	executionPathCoverage: z
		.object({
			total: z.number().int().nonnegative(),
			covered: z.number().int().nonnegative(),
			uncovered: z
				.array(
					z.object({
						id: z.string(),
						decisions: z.array(z.object({ node: z.string(), label: z.string() })),
						firstMissingNode: z.string(),
					}),
				)
				.optional(),
		})
		.optional(),
	/**
	 * Present only while the published version is older than the verified
	 * draft. The claim carries the same fact as `liveState`; this is the
	 * sentence to relay, because a passing run reads as "production works".
	 */
	liveStateNote: z.string().optional(),
	claim: verificationClaimSchema.optional(),
	data: z.record(z.unknown()).optional(),
	error: z.string().optional(),
	remediation: remediationOutputSchema,
	guidance: z.string().optional(),
});

const verifyBuiltWorkflowOutputSchema = singleVerificationOutputSchema.extend({
	scenarioResults: z
		.array(z.object({ name: z.string(), result: singleVerificationOutputSchema }))
		.optional(),
	scenariosNotRun: z.array(z.string()).optional(),
});

export type VerifyInput = z.infer<typeof verifyBuiltWorkflowInputSchema>;
export type VerifyScenarioOutput = z.infer<typeof singleVerificationOutputSchema>;

export function createVerifyBuiltWorkflowTool(context: OrchestrationContext) {
	return new Tool('verify-built-workflow')
		.description(
			'Standard post-build verifier: runs a built workflow with sidecar verification context from the build outcome ' +
				'(pin data, mocked credentials, trigger-shaped inputData; all trigger types supported). ' +
				'Use `scenarios` to check multiple branches in one call. Results keep separate evidence and claims. ' +
				'Use `executions(action="run")` only for ad hoc runs outside build verification. ' +
				'CRITICAL: `inputData` shape depends on the trigger type (see the field description) — a wrong shape produces ' +
				'null downstream values that look like an expression bug; re-run verify with the correct shape instead of patching the workflow.',
		)
		.input(verifyBuiltWorkflowInputSchema)
		.output(verifyBuiltWorkflowOutputSchema)
		.handler(async (input: VerifyInput) => {
			if (input.scenarios) {
				return await runVerificationScenarios(
					input,
					context,
					async (scenario) => await verifyWorkflowScenario(scenario, context),
				);
			}
			return await verifyWorkflowScenario(input, context);
		})
		.build();
}

async function verifyWorkflowScenario(
	input: z.infer<typeof singleVerificationInputSchema>,
	context: OrchestrationContext,
): Promise<VerifyScenarioOutput> {
	const targetResult = await resolveVerificationTarget(input, context);
	if (targetResult.kind === 'blocked') return targetResult.result;
	const { target } = targetResult;
	const { input: resolvedInput, workflowId, workflowTaskService } = target;

	// Credentials assigned after the build never rebuild the plan, so
	// refresh stale mocked-credential verdicts before pinning.
	const buildOutcome = await reconcileStaleCredentialPlan({
		buildOutcome: target.buildOutcome,
		workflowId,
		domainContext: target.domainContext,
		workflowTaskService,
		logger: context.logger,
		fallbackModelConfig: context.modelId,
	});

	if (buildOutcome.nodeSimulationPlan === undefined) {
		return await handleMissingSimulationPlan({
			input: resolvedInput,
			context,
			workflowTaskService,
			workflowId,
		});
	}

	const preparedResult = prepareVerificationRun(buildOutcome, resolvedInput);
	if (preparedResult.kind === 'blocked') {
		return {
			...preparedResult.result,
			resolvedWorkItemId: resolvedInput.workItemId,
		};
	}
	const { prepared } = preparedResult;

	const workflow = await target.domainContext.workflowService
		.getAsWorkflowJSON(workflowId)
		.catch(() => undefined);
	if (
		workflow &&
		Array.isArray(workflow.nodes) &&
		resolvedInput.triggerNodeName !== undefined &&
		!workflow.nodes.some(
			(node) => node.name === resolvedInput.triggerNodeName && isTriggerNodeType(node.type),
		)
	) {
		return {
			success: false,
			resolvedWorkItemId: resolvedInput.workItemId,
			error: `Could not find trigger "${resolvedInput.triggerNodeName}" in this workflow. Read the workflow. Select an existing trigger.`,
		};
	}
	// WorkflowJSON omits saved pins. The summary supplies names without their payloads.
	let workflowPinnedNodeNames: string[] | undefined;
	try {
		const workflowPins = workflow
			? await target.domainContext.workflowService.getPinnedDataSummary?.(workflowId)
			: undefined;
		workflowPinnedNodeNames = workflowPins?.map(({ nodeName }) => nodeName);
	} catch {
		return await handleBlockedVerification({
			input: resolvedInput,
			context,
			workflowTaskService,
			workflowId,
			reason: 'verification_pin_summary_unavailable',
			guidance:
				'Verification was not run because saved pinned data could not be inspected. Retry verification.',
		});
	}
	const blocker = checkToolSimulationSupport({
		workflow,
		workflowPinnedNodeNames,
		plan: buildOutcome.nodeSimulationPlan,
		prepared,
		triggerNodeName: resolvedInput.triggerNodeName,
	});
	if (blocker) {
		return await handleBlockedVerification({
			input: resolvedInput,
			context,
			workflowTaskService,
			workflowId,
			...blocker,
		});
	}
	const chatModelRecovery = workflow
		? await collectChatModelRecoveryContext(
				target.domainContext,
				workflow.nodes ?? [],
				workflow.connections,
			).catch(() => undefined)
		: undefined;
	const chatModelRelatedNodeNames = chatModelRecovery?.relatedNodeNames;
	const selectedTriggerNodeName = buildOutcome.triggerNodes?.some(
		(trigger) => trigger.nodeName === resolvedInput.triggerNodeName,
	)
		? resolvedInput.triggerNodeName
		: undefined;
	const verificationScope =
		buildOutcome.verificationProgress && selectedTriggerNodeName && workflow
			? createVerificationGraph(workflow).withTools(
					getTriggerMainFlowScope(workflow.connections, selectedTriggerNodeName),
				)
			: undefined;
	const previousProgress = await workflowTaskService.startVerification(
		resolvedInput.workItemId,
		verificationScope ? selectedTriggerNodeName : undefined,
	);

	// A scripted gate replaces the halt with one loop-safe pass per decision;
	// otherwise run the single standard pass (halted gates pin zero items).
	const { result, analysis, parameterCheckRuns } = prepared.gateScript
		? await runScriptedGateVerification({
				script: prepared.gateScript,
				prepared,
				executionService: target.domainContext.executionService,
				workflowId,
				inputData: resolvedInput.inputData,
				triggerNodeName: resolvedInput.triggerNodeName,
				timeout: resolvedInput.timeout,
				abortSignal: context.abortSignal,
				buildOutcome,
				stateBefore: target.stateBefore,
				runId: context.runId,
				chatModelRelatedNodeNames,
				chatModelRecovery,
				verificationScope,
			})
		: await (async () => {
				const runResult = await target.domainContext.executionService.run(
					workflowId,
					resolvedInput.inputData,
					{
						timeout: resolvedInput.timeout,
						triggerNodeName: resolvedInput.triggerNodeName,
						verificationPinData: prepared.verificationPinData,
						isVerificationRun: true,
						abortSignal: context.abortSignal,
					},
				);
				const analysis = analyzeVerificationResult({
					result: runResult,
					buildOutcome,
					simulatedNodes: prepared.simulatedNodes,
					haltedGateNames: prepared.haltedGateNames,
					triggerNodeName: resolvedInput.triggerNodeName,
					stateBefore: target.stateBefore,
					runId: context.runId,
					chatModelRelatedNodeNames,
					chatModelRecovery,
					verificationScope,
				});
				return {
					result: runResult,
					analysis,
					parameterCheckRuns: [
						{
							executionId: runResult.executionId,
							nodeNames: analysis.reachedSimulatedNodes.map((node) => node.nodeName),
						},
					],
				};
			})();

	// Enumerate the branch paths behind this trigger and score which ones the run took.
	const coverage = pathCoverage(
		workflow
			? enumerateExecutionPaths(workflow, {
					triggerNodeName: selectedTriggerNodeName ?? resolvedInput.triggerNodeName,
				})
			: [],
		[analysis.reachedNames],
	);
	const executionPathCoverage =
		coverage.total > 0
			? {
					total: coverage.total,
					covered: coverage.covered,
					...(coverage.uncovered.length > 0
						? {
								uncovered: coverage.uncovered.map(({ path, firstMissingNode }) => ({
									id: path.id,
									decisions: path.decisions.map(({ node, label }) => ({ node, label })),
									firstMissingNode,
								})),
							}
						: {}),
				}
			: undefined;
	const pathCoverageNote =
		coverage.uncovered.length > 0 ? describePathCoverage(coverage) : undefined;

	// The repair target from an earlier verdict counts even when the model
	// omits it here — that is exactly the turn where it stops mentioning it.
	const fixTargetNodeNames = [
		...new Set(
			[...(resolvedInput.fixTargetNodeNames ?? []), target.stateBefore?.lastFailedNodeName].filter(
				(name): name is string => name !== undefined,
			),
		),
	];
	// Which version passed, and is that version the one production serves?
	// The executed version comes from the execution record, so a save
	// landing mid-run cannot make the claim name a version this run never
	// ran. The published version is read after the run, so a publish
	// landing mid-run is reflected rather than reported as stale.
	const publishState = await resolvePublishState({
		workflowService: target.domainContext.workflowService,
		workflowId,
		executedVersionId: result.workflowVersionId,
		logger: context.logger,
	});

	const runClaim = deriveVerificationClaim({
		analysis: {
			...analysis,
			nodesNotReached: buildOutcome.nodeSimulationPlan
				.map((node) => node.nodeName)
				.filter((name) => !analysis.reachedNames.has(name)),
		},
		plannedNodeCount: buildOutcome.nodeSimulationPlan?.length ?? 0,
		fixTargetNodeNames,
		publishState,
	});

	const claim = await persistVerificationOutcome({
		input: resolvedInput,
		context,
		workflowTaskService,
		workflowId,
		result,
		analysis,
		scopedTriggerNodeName: verificationScope ? selectedTriggerNodeName : undefined,
		previousProgress,
		claim: runClaim,
	});

	// A simulated node's preview is fixture data, so an expression that resolved
	// to empty (e.g. `$json.query.x` on a body-only input) leaves no trace in the
	// run. Replay the parameters of every reached simulated node and surface it.
	const {
		warnings: resolvedParameterWarnings,
		skipped: skippedParameterChecks,
		skippedCount: skippedParameterCheckCount,
	} = await collectResolvedParameterWarnings({
		executionService: target.domainContext.executionService,
		runs: parameterCheckRuns,
		logger: context.logger,
	});
	const simulationNote = [
		analysis.simulationNote,
		buildResolvedParameterNote(
			resolvedParameterWarnings,
			skippedParameterChecks,
			skippedParameterCheckCount,
		),
	]
		.filter((note): note is string => note !== undefined)
		.join(' ');

	const maxDataChars = resolvedInput.maxDataChars ?? DEFAULT_NODE_PREVIEW_CHARS;
	const simulatedNames = new Set(analysis.reachedSimulatedNodes.map((n) => n.nodeName));
	return {
		resolvedWorkItemId: resolvedInput.workItemId,
		executionId: result.executionId || undefined,
		workflowVersionId: result.workflowVersionId ?? undefined,
		success: analysis.success,
		claim,
		status: result.status,
		nodesExecuted: analysis.nodesExecuted,
		lastNodeExecuted: result.lastNodeExecuted,
		nodePreviews: buildNodePreviews(result.data, maxDataChars, simulatedNames),
		simulatedNodes:
			analysis.reachedSimulatedNodes.length > 0 ? analysis.reachedSimulatedNodes : undefined,
		simulationNote: simulationNote.length > 0 ? simulationNote : undefined,
		resolvedParameterWarnings:
			resolvedParameterWarnings.length > 0 ? resolvedParameterWarnings : undefined,
		skippedParameterChecks: skippedParameterChecks.length > 0 ? skippedParameterChecks : undefined,
		skippedParameterCheckCount:
			skippedParameterCheckCount > 0 ? skippedParameterCheckCount : undefined,
		nodeErrors: analysis.nodeErrors.length > 0 ? analysis.nodeErrors : undefined,
		nodesNotReached: analysis.nodesNotReached.length > 0 ? analysis.nodesNotReached : undefined,
		coverageNote: [analysis.coverageNote, pathCoverageNote].filter(Boolean).join(' ') || undefined,
		...(executionPathCoverage ? { executionPathCoverage } : {}),
		liveStateNote: formatLiveStateNote(claim),
		...(resolvedInput.includeData ? { data: result.data } : {}),
		error: analysis.errorMessage,
		remediation: analysis.remediation,
		guidance: analysis.remediation?.guidance,
	};
}
