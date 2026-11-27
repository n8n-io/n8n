// ---------------------------------------------------------------------------
// Agent scenario execution
//
// The agent-artifact counterpart of scenario-execution.ts: executes one
// scenario against a built first-class Agent (real model, mocked tool HTTP)
// and assembles the agent verification artifact.
// ---------------------------------------------------------------------------

import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import {
	getAgentModelProviderCredentialTypes,
	type InstanceAiEvalAgentExecutionResult,
	type InstanceAiEvalAgentMemoryState,
	type InstanceAiEvalAgentRunOptions,
	type InstanceAiEvalAgentThreadTurn,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { setTimeout as delay } from 'node:timers/promises';

import {
	agentSessionPlans,
	conversationTranscript,
	conversationTurnCount,
	mergeConversationResult,
	runAgentConversation,
	singleTurnTranscript,
	withTurnCount,
} from './agent-conversation';
import { agentExpectationUnits, type AgentExpectationUnit } from './agent-run-schema';
import { agentHandler } from './artifacts/agent-handler';
import {
	attributionForExpectation,
	attributionForScenario,
	type EvalAttribution,
} from './attribution';
import type { EvalLogger } from './logger';
import { writeScenarioVerificationSnapshot, type VerificationArtifact } from './scenario-execution';
import { reseedScenarioTables, type ScenarioSeedContext } from './seed-tables';
import {
	throwIfFrameworkIssue,
	throwIfServerBudgetStop,
	isTransientExecutionAbort,
	MAX_EXEC_ATTEMPTS,
} from './transient-error';
import { verifyBuildExpectations } from '../build-expectations/verifier';
import { verifyChecklist, type VerifierAttemptDebug } from '../checklist/verifier';
import type { N8nClient } from '../clients/n8n-client';
import type {
	AgentArtifact,
	ArtifactRef,
	BuildExpectationResult,
	BuildTrace,
	ChecklistItem,
	ChecklistResult,
	ExecutionScenarioResult,
	ExecutionScenario,
	TestCaseCredential,
	TranscriptTurn,
} from '../types';
import { createAgentUserProxy } from '../utils/user-proxy/agent-user';
import type { CaseSeed } from './schema';
import { agentModelSlots, AgentModelSlotsViewSchema } from '../credentials/agent-model-slots';
import type { AgentModelResolution } from '../credentials/model-resolver';
import { credentialGetsRealKey } from '../credentials/seeder';

/** LLM credential types the eval seeder can create (credentials/seeder.ts). */
const LLM_CREDENTIAL_TYPES = new Set(['openAiApi', 'googlePalmApi']);

/** The seed's config for the Agent under test, when the seed restored that Agent.
 *  `createdAgentIds` is positional to `seed.agents`; an Agent the live turn
 *  created is not in it. */
export function seededAgentConfig(
	seed: CaseSeed | undefined,
	createdAgentIds: string[] | undefined,
	agentId: string,
): unknown {
	if (seed?.mode !== 'inline') return undefined;
	return seed.agents[seededAgentIndex(createdAgentIds, agentId)]?.config;
}

/** The own-model resolution of the Agent under test, when the seed restored it.
 *  `resolutions` is positional to `seed.agents`, as `createdAgentIds` is. */
export function seededAgentResolution(
	resolutions: AgentModelResolution[] | undefined,
	createdAgentIds: string[] | undefined,
	agentId: string,
): AgentModelResolution | undefined {
	return resolutions?.[seededAgentIndex(createdAgentIds, agentId)];
}

function seededAgentIndex(createdAgentIds: string[] | undefined, agentId: string): number {
	return (createdAgentIds ?? []).indexOf(agentId);
}

/** Every model an Agent config names, by slot: main, sub-agent tiers, and
 *  memory workers. A config that doesn't parse names none. */
function modelSlots(config: unknown): Map<string, string> {
	const parsed = AgentModelSlotsViewSchema.safeParse(config);
	if (!parsed.success) return new Map();
	return new Map(agentModelSlots(parsed.data).map(({ slot, target }) => [slot, target.model]));
}

export interface DraftAgentVerdict {
	attribution: EvalAttribution;
	reasoning: string;
	execError: string;
	/** Not run and not counted: the eval had no way to run the Agent. */
	incomplete?: true;
}

/**
 * Decide, before running, a scenario whose Agent cannot run. A built Agent with
 * no model: who owns that depends on what the case offered the builder. With no
 * LLM credential declared, leaving the model for setup is the builder's
 * documented behaviour, so the eval is what cannot proceed. With one declared,
 * an empty model is the builder's miss.
 *
 * A seeded Agent the own-model resolver could not map is skipped, not failed.
 * A seeded Agent with a model slot still on the seed's model, when the case
 * declares no credential of that model's provider, or only one with a
 * placeholder key: the provider would reject the call, so the eval cannot run
 * it. A slot the builder changed is the builder's. The captured config redacts
 * `credential`, so the rule reads the inputs, not the credential.
 */
export function draftAgentVerdict(
	artifact: AgentArtifact | undefined,
	credentials: TestCaseCredential[] | undefined,
	seededConfig?: unknown,
	modelResolution?: AgentModelResolution,
): DraftAgentVerdict | undefined {
	if (!artifact || !isRecord(artifact.config)) return undefined;
	if (modelResolution?.skip) return skippedVerdict(modelResolution.skip);
	const model = artifact.config.model;
	if (typeof model === 'string' && model.trim() !== '') {
		return seededModelVerdict(artifact.config, credentials ?? [], seededConfig);
	}
	return noModelVerdict(credentials ?? []);
}

const SKIP_VERDICTS = {
	'no-model-mapping': {
		execError: 'Skipped: no model mapping',
		note: ' The eval has no route to run this Agent on its own model or a comparable one.',
	},
	'no-embedding-key': { execError: 'Skipped: no embedding key', note: '' },
} as const;

function skippedVerdict(skip: NonNullable<AgentModelResolution['skip']>): DraftAgentVerdict {
	const { execError, note } = SKIP_VERDICTS[skip.kind];
	return {
		attribution: 'framework_issue',
		reasoning: `Skipped: ${skip.reason}.${note}`,
		execError,
		incomplete: true,
	};
}

function seededModelVerdict(
	config: unknown,
	credentials: TestCaseCredential[],
	seededConfig: unknown,
): DraftAgentVerdict | undefined {
	const seeded = modelSlots(seededConfig);
	for (const [slot, slotModel] of modelSlots(config)) {
		if (seeded.get(slot) !== slotModel) continue;
		const verdict = slotCredentialVerdict(slotModel, credentials);
		if (verdict) return verdict;
	}
	return undefined;
}

function slotCredentialVerdict(
	slotModel: string,
	credentials: TestCaseCredential[],
): DraftAgentVerdict | undefined {
	const types = getAgentModelProviderCredentialTypes(getProviderPrefix(slotModel));
	if (types.length === 0) return undefined;
	const declared = credentials.filter((c) => types.includes(c.type));
	if (declared.length === 0) {
		return {
			attribution: 'framework_issue',
			reasoning: `The seeded Agent's model ${slotModel} needs a ${types.join(' or ')} credential, and the case declares none, so the eval has no credential to run the Agent with.`,
			execError: 'Seeded Agent model has no declared credential',
		};
	}
	if (declared.some(credentialGetsRealKey)) return undefined;
	const type = declared[0].type;
	return {
		attribution: 'framework_issue',
		reasoning: `The seeded Agent's model ${slotModel} needs a real ${type} key, and the eval has none, so its credential holds a placeholder that the provider would reject.`,
		execError: `No real key for ${type}`,
	};
}

function noModelVerdict(credentials: TestCaseCredential[]): DraftAgentVerdict {
	return credentials.some((c) => LLM_CREDENTIAL_TYPES.has(c.type))
		? {
				attribution: 'builder_issue',
				reasoning:
					'The built Agent has no model although the case declared an LLM credential the builder could have used, so the scenario cannot run.',
				execError: 'Agent has no model configured',
			}
		: {
				attribution: 'framework_issue',
				reasoning:
					'The built Agent has no model. The case declared no LLM credential, so the builder left model selection to setup by design; the eval has no credential to run the Agent with.',
				execError: 'Agent has no model configured',
			};
}

/** Shared routing rule for both eval paths: an agent ref marks the case
 *  agent-anchored — the agent, not any co-built helper workflow, is the target. */
export function findAgentArtifactRef(
	artifactRefs: ArtifactRef[] | undefined,
): ArtifactRef | undefined {
	return (artifactRefs ?? []).find((ref) => ref.type === 'agent');
}

/**
 * Fetch + render the agent's config and skills — the stable verification
 * context every scenario of the build shares (the agent-artifact analog of
 * the workflow JSON block). Falls back to a marker string so a fetch failure
 * degrades verification instead of failing the scenario.
 */
export interface AgentScenarioContext {
	rendered: string;
	artifact?: AgentArtifact;
}

export async function fetchAgentScenarioContext(
	client: N8nClient,
	ref: ArtifactRef,
	logger: EvalLogger,
): Promise<AgentScenarioContext> {
	try {
		const artifact = await agentHandler.fetch(ref, client);
		return { rendered: agentHandler.renderArtifact(artifact), artifact };
	} catch (error: unknown) {
		logger.warn(
			`  Agent config fetch failed — verifying scenarios without it: ${error instanceof Error ? error.message : String(error)}`,
		);
		return { rendered: '(agent configuration could not be fetched)' };
	}
}

/** What one Agent scenario run needs to reach the server. */
interface AgentTurnTarget {
	agentId: string;
	projectId: string;
	scenario: ExecutionScenario;
	timeoutMs?: number;
	logger: EvalLogger;
	/** The case's memory and config options, sent on every turn. */
	agentRun?: InstanceAiEvalAgentRunOptions;
}

/** One request to the agent eval endpoint, with the in-band transient-abort
 *  retry the workflow path uses. `thread` makes it a turn of a thread. */
async function executeAgentTurn(
	client: N8nClient,
	target: AgentTurnTarget,
	thread?: InstanceAiEvalAgentThreadTurn,
	awaitMemory = false,
): Promise<InstanceAiEvalAgentExecutionResult> {
	const { agentId, projectId, scenario, timeoutMs, logger, agentRun } = target;
	const send = async () =>
		await client.executeAgentWithLlmMock(
			agentId,
			projectId,
			scenario.dataSetup,
			timeoutMs,
			thread,
			{
				agentRun,
				awaitMemory,
			},
		);
	let evalResult = await send();
	for (
		let attempt = 1;
		!evalResult.success &&
		isTransientExecutionAbort(evalResult.errors) &&
		attempt < MAX_EXEC_ATTEMPTS;
		attempt++
	) {
		logger.warn(
			`    [${scenario.name}] agent execution aborted by transient DB error (attempt ${String(attempt)}/${String(MAX_EXEC_ATTEMPTS)}: ${evalResult.errors.join('; ')}); retrying`,
		);
		await delay(500 * attempt);
		evalResult = await send();
	}
	return evalResult;
}

/** The scenario's run: one request, or a conversation of turns and sessions. */
async function runAgentScenarioTurns(
	client: N8nClient,
	target: AgentTurnTarget,
): Promise<{
	evalResult: InstanceAiEvalAgentExecutionResult;
	transcript?: TranscriptTurn[];
	turnCount: number;
}> {
	const plans = agentSessionPlans(target.scenario);
	if (!plans) return { evalResult: await executeAgentTurn(client, target), turnCount: 1 };
	const conversation = await runAgentConversation({
		plans,
		dataSetup: target.scenario.dataSetup,
		user: createAgentUserProxy({ logger: target.logger }),
		executeTurn: async (thread, { awaitMemory }) =>
			await executeAgentTurn(client, target, thread, awaitMemory),
	});
	return {
		evalResult: mergeConversationResult(conversation),
		transcript: conversationTranscript(conversation),
		turnCount: conversationTurnCount(conversation),
	};
}

/** How a scenario was graded, and what the verifier snapshot records. */
interface AgentScenarioVerdict {
	passed: boolean;
	incomplete: boolean;
	reasoning: string;
	failureCategory?: string;
	rootCause?: string;
	expectationResults?: BuildExpectationResult[];
	snapshot: {
		result: ChecklistResult | undefined;
		verificationResults: ChecklistResult[];
		verifierAttempts: VerifierAttemptDebug[];
		verifierInput: { checklist: ChecklistItem[]; artifact: VerificationArtifact };
	};
}

/** A scenario without expectations (an assistant-built Agent) is graded on its
 *  `successCriteria` by the checklist verifier, as before. */
async function verifyAgentChecklist(
	scenario: ExecutionScenario,
	artifact: VerificationArtifact,
): Promise<AgentScenarioVerdict> {
	const checklist: ChecklistItem[] = [
		{ id: 1, description: scenario.successCriteria, category: 'execution', strategy: 'llm' },
	];
	const verification = await verifyChecklist(checklist, artifact);
	const [result] = verification.results;
	const attemptErrors = verification.attempts
		.map((a) => a.error)
		.filter((e): e is string => e !== null);
	return {
		passed: result?.pass ?? false,
		incomplete: result === undefined,
		reasoning:
			result?.reasoning ??
			`No verification result — verifier exhausted all attempts${attemptErrors.length > 0 ? ` (${attemptErrors.join('; ')})` : ''}`,
		failureCategory: result?.failureCategory ?? (result ? undefined : 'verification_failure'),
		rootCause: result?.rootCause,
		snapshot: {
			result,
			verificationResults: verification.results,
			verifierAttempts: verification.attempts,
			verifierInput: { checklist, artifact },
		},
	};
}

function keyedVerdict(
	unit: AgentExpectationUnit,
	verdict: BuildExpectationResult | undefined,
): BuildExpectationResult {
	const graded = verdict ?? { pass: false, reason: 'No verdict from the judge', incomplete: true };
	const attribution = attributionForExpectation(graded);
	return {
		...graded,
		expectation: unit.key,
		...(attribution ? { attribution } : {}),
	};
}

/** All expectations hold: pass. One fails: fail. Otherwise any without a verdict: ungraded. */
function scenarioOutcome(results: BuildExpectationResult[]) {
	const failed = results.filter((r) => !r.pass && !r.incomplete);
	const ungraded = results.filter((r) => r.incomplete);
	if (failed.length > 0) {
		const reasons = failed.map((r) => `${r.expectation}: ${r.reason}`).join('; ');
		return { passed: false, incomplete: false, reasoning: `Failed expectations — ${reasons}` };
	}
	if (ungraded.length > 0) {
		const names = ungraded.map((r) => r.expectation).join('; ');
		return { passed: false, incomplete: true, reasoning: `No verdict for: ${names}` };
	}
	return {
		passed: true,
		incomplete: false,
		reasoning: `All ${String(results.length)} expectations hold.`,
	};
}

/**
 * Grade each expectation as its own unit with the shared expectations judge,
 * against the whole transcript (every session) and the run's tool calls.
 */
async function gradeAgentExpectations(
	units: AgentExpectationUnit[],
	transcript: TranscriptTurn[],
	artifact: VerificationArtifact,
): Promise<AgentScenarioVerdict> {
	const artifactContext = [artifact.workflowContext, artifact.scenarioContext].join('\n\n');
	const verdicts = await verifyBuildExpectations(
		units.map((unit) => unit.text),
		{ transcript, artifactContext, subject: 'agent-runtime' },
	);
	const results = units.map((unit, index) => keyedVerdict(unit, verdicts[index]));
	const checklist = units.map(
		(unit, id): ChecklistItem => ({
			id,
			description: unit.key,
			category: 'execution',
			strategy: 'llm',
		}),
	);
	return {
		...scenarioOutcome(results),
		expectationResults: results,
		snapshot: {
			result: undefined,
			verificationResults: results.map((r, id) => ({
				id,
				pass: r.pass,
				reasoning: r.reason,
				strategy: 'llm',
			})),
			verifierAttempts: [],
			verifierInput: { checklist, artifact },
		},
	};
}

/**
 * Execute one scenario against a built first-class Agent and verify the
 * result — the agent-artifact counterpart of runScenario. The agent reasons
 * with its real model; its tools' outbound HTTP is served by the mock layer and
 * its Data Table tools read the real table, seeded with the scenario's rows first.
 * A scenario with `userTurns` or `sessions` runs as a conversation; one with
 * `expectations` is graded per expectation and passes only if all of them hold.
 */
export async function executeAgentScenario(
	client: N8nClient,
	agentId: string,
	scenario: ExecutionScenario,
	agentContext: string,
	logger: EvalLogger,
	timeoutMs?: number,
	testCaseName?: string,
	buildTrace?: BuildTrace,
	outputDir?: string,
	seedContext?: ScenarioSeedContext,
	/** The build's project. Absent: the client's personal project. */
	projectId?: string,
	/** A direct run's memory and config options (AGENT-1666). */
	agentRun?: InstanceAiEvalAgentRunOptions,
): Promise<ExecutionScenarioResult> {
	if (seedContext) {
		await reseedScenarioTables(
			client,
			scenario,
			seedContext.threadId,
			seedContext.tableIdsByName,
			logger,
		);
	}

	const execStart = Date.now();
	const agentProjectId = projectId ?? (await client.getPersonalProjectId());
	const target = { agentId, projectId: agentProjectId, scenario, timeoutMs, logger, agentRun };
	const run = await runAgentScenarioTurns(client, target);
	const evalResult = run.evalResult;
	try {
		// Killed for time, not by the builder — throw so the timeout path classifies it.
		throwIfServerBudgetStop(evalResult);
		throwIfFrameworkIssue(evalResult);
	} catch (error) {
		throw withTurnCount(error, run.turnCount);
	}
	const transcript = run.transcript ?? singleTurnTranscript(evalResult);

	const execMs = Date.now() - execStart;

	logger.info(
		`    [${scenario.name}] agent exec=${String(Math.round(execMs / 1000))}s (${String(transcript.length)} user turn(s), ${String(evalResult.toolCalls.length)} tool calls, ${String(evalResult.modelTurns.length)} model turns)`,
	);

	const verifyStart = Date.now();
	const artifact = buildAgentVerificationArtifact(scenario, agentContext, evalResult);
	const units = agentExpectationUnits(scenario);
	const verdict =
		units.length > 0
			? await gradeAgentExpectations(units, transcript, artifact)
			: await verifyAgentChecklist(scenario, artifact);
	const verifyMs = Date.now() - verifyStart;
	const { passed, incomplete, reasoning, failureCategory, rootCause } = verdict;

	await writeScenarioVerificationSnapshot({
		testCaseName: testCaseName ?? `agent-${agentId}`,
		scenarioName: scenario.name,
		workflowId: `agent:${agentId}`,
		passed,
		...verdict.snapshot,
		buildTrace,
		logger,
		outputDir,
	});
	const attribution = attributionForScenario({ passed, incomplete, failureCategory });

	const categoryLabel = failureCategory ? ` [${failureCategory}]` : '';
	const statusLabel = incomplete ? 'INCOMPLETE (excluded from scoring)' : passed ? 'PASS' : 'FAIL';
	logger.info(
		`    [${scenario.name}] ${statusLabel}${categoryLabel} verify=${String(Math.round(verifyMs / 1000))}s`,
	);
	if (!passed) {
		logger.info(`    [${scenario.name}] ${reasoning}`);
	}

	return {
		scenario,
		success: passed,
		agentEvalResult: evalResult,
		agentId,
		score: passed ? 1 : 0,
		reasoning,
		failureCategory,
		attribution,
		rootCause,
		...(verdict.expectationResults ? { expectationResults: verdict.expectationResults } : {}),
		agentTurnCount: run.turnCount,
		agentTranscript: transcript,
		...(incomplete ? { incomplete: true } : {}),
	};
}

/** Agent-artifact counterpart of buildVerificationArtifact: the agent's
 *  config + skills play the workflow-JSON role (stable across scenarios of
 *  the same build), the recorded agent run plays the execution trace. */
export function buildAgentVerificationArtifact(
	scenario: ExecutionScenario,
	agentContext: string,
	evalResult: InstanceAiEvalAgentExecutionResult,
): VerificationArtifact {
	return {
		workflowContext: [
			'## Agent under test',
			'',
			'This scenario ran against a first-class n8n Agent, not a workflow. The agent reasoned with its real configured model; every outbound HTTP request its tools made was intercepted and served by the eval mock layer.',
			'',
			agentContext,
		].join('\n'),
		scenarioContext: buildAgentScenarioContextBlock(scenario, evalResult),
	};
}

function agentJsonBlock(value: unknown, cap = 2_000): string {
	let serialized: string;
	try {
		serialized = JSON.stringify(value, null, 1) ?? 'null';
	} catch {
		return '[unserializable]';
	}
	if (serialized.length > cap) return `${serialized.slice(0, cap)}… [truncated]`;
	return serialized;
}

function buildAgentScenarioContextBlock(
	scenario: ExecutionScenario,
	evalResult: InstanceAiEvalAgentExecutionResult,
): string {
	const sections: string[] = [];

	sections.push(
		'## Scenario',
		'',
		`**Name:** ${scenario.name} — ${scenario.description}`,
		`**Data setup:** ${scenario.dataSetup}`,
		'',
	);

	// Pre-analysis: programmatic flags
	const preAnalysis: string[] = [];
	for (const warning of evalResult.seed.warnings) {
		preAnalysis.push(`⚠ FRAMEWORK ISSUE: ${warning}`);
	}
	for (const skipped of evalResult.skippedFeatures) {
		preAnalysis.push(
			`⚠ HARNESS LIMITATION: agent feature "${skipped.feature}" was disabled for this run (${skipped.reason}) — do not fail the scenario for behaviour that would require it.`,
		);
	}
	for (const call of evalResult.toolCalls) {
		for (const req of call.interceptedRequests) {
			if (isRecord(req.mockResponse) && '_evalMockError' in req.mockResponse) {
				const msg = req.mockResponse.message;
				preAnalysis.push(
					`⚠ MOCK ISSUE: tool "${call.tool}" ${req.method} ${req.url} → mock generation failed: ${typeof msg === 'string' ? msg : 'unknown'}`,
				);
			}
		}
	}
	if (preAnalysis.length > 0) {
		sections.push('## Pre-analysis (automated flags)', '', ...preAnalysis, '');
	}

	sections.push(
		'## Agent run',
		'',
		`**Opening user message (generated from the data setup):** ${evalResult.seed.openingMessage}`,
		`**Run status:** ${evalResult.success ? 'completed' : 'FAILED'}${evalResult.finishReason ? ` (finishReason: ${evalResult.finishReason})` : ''}${evalResult.model ? ` — model: ${evalResult.model}` : ''}`,
		'',
	);
	if (evalResult.errors.length > 0) {
		sections.push('**Run errors:**', ...evalResult.errors.map((error) => `- ${error}`), '');
	}

	// Looping agents can rack up dozens of calls — elide the middle so the
	// verifier prompt stays bounded (start + end carry the decisive activity).
	const MAX_RENDERED_CALLS = 30;
	const TAIL_CALLS = 8;
	const MAX_RENDERED_REQUESTS_PER_CALL = 5;
	const allCalls = evalResult.toolCalls.map((call, index) => ({ call, ordinal: index + 1 }));
	const renderedCalls =
		allCalls.length <= MAX_RENDERED_CALLS
			? allCalls
			: [...allCalls.slice(0, MAX_RENDERED_CALLS - TAIL_CALLS), ...allCalls.slice(-TAIL_CALLS)];
	const elidedCallCount = allCalls.length - renderedCalls.length;
	if (evalResult.toolCalls.length === 0) {
		sections.push('**Tool calls:** none — the agent made no tool calls in this run.', '');
	} else {
		sections.push(`## Tool calls (${String(evalResult.toolCalls.length)})`, '');
		if (elidedCallCount > 0) {
			sections.push(
				`_Showing the first ${String(MAX_RENDERED_CALLS - TAIL_CALLS)} and last ${String(TAIL_CALLS)} calls; ${String(elidedCallCount)} middle calls elided._`,
				'',
			);
		}
		renderedCalls.forEach(({ call, ordinal }) => {
			sections.push(
				`### ${String(ordinal)}. ${call.tool} (${call.kind})${call.error ? ' — ERRORED' : ''}${call.autoApproved ? ' [approval auto-granted by the harness]' : ''}`,
				'',
			);
			if (call.input !== undefined) {
				sections.push('**Input:**', '```json', agentJsonBlock(call.input), '```', '');
			}
			if (call.error) {
				sections.push(`**Error:** ${call.error}`, '');
			}
			if (call.output !== undefined) {
				sections.push('**Output:**', '```json', agentJsonBlock(call.output), '```', '');
			}
			const requests = call.interceptedRequests ?? [];
			for (const req of requests.slice(0, MAX_RENDERED_REQUESTS_PER_CALL)) {
				sections.push(`**Intercepted request:** ${req.method} ${req.url} (${req.nodeType})`);
				if (req.requestBody !== undefined) {
					sections.push('Request body:', '```json', agentJsonBlock(req.requestBody, 1_000), '```');
				}
				sections.push(
					'Mock response:',
					'```json',
					agentJsonBlock(req.mockResponse, 1_500),
					'```',
					'',
				);
			}
			if (requests.length > MAX_RENDERED_REQUESTS_PER_CALL) {
				sections.push(
					`_${String(requests.length - MAX_RENDERED_REQUESTS_PER_CALL)} further intercepted request(s) for this call elided._`,
					'',
				);
			}
		});
	}

	if (evalResult.memory) sections.push(...agentMemorySection(evalResult.memory));

	sections.push(
		'## Agent final reply',
		'',
		evalResult.finalText.length > 0 ? evalResult.finalText : '(no final text)',
		'',
	);

	sections.push(
		`**Model turns:** ${String(evalResult.modelTurns.length)} real call(s) to ${evalResult.model ?? 'the configured model'}${evalResult.usage ? ` — ~${String(evalResult.usage.inputTokens ?? 0)} input / ${String(evalResult.usage.outputTokens ?? 0)} output tokens` : ''}.`,
		'',
		'Verify the checklist against how the agent actually behaved in this run — its tool calls, the intercepted requests and mock responses, and its final reply.',
	);

	return sections.join('\n');
}

/** What the Agent's memory held for the simulated user after the run, so memory
 *  expectations are graded against what was stored, not only what was said. */
function agentMemorySection(memory: InstanceAiEvalAgentMemoryState): string[] {
	const entries = memory.episodicEntries.map((entry) => `- ${entry.content}`);
	const observations = memory.observations.map(
		(observation) => `- [${observation.marker.toUpperCase()}] ${observation.text}`,
	);
	const tasks = memory.tasks.map(
		(task) => `- ${task.taskKind}: ${task.outcome}${task.error ? ` (${task.error})` : ''}`,
	);
	return [
		'## Agent memory after the run (ground truth — read from the memory store)',
		'',
		'**Episodic memory entries stored for this user:**',
		...(entries.length > 0 ? entries : ['(none)']),
		'',
		'**Observations (compacted summaries of the threads):**',
		...(observations.length > 0 ? observations : ['(none)']),
		'',
		'**Background memory tasks that ran:**',
		...(tasks.length > 0 ? tasks : ['(none)']),
		`**Flagged memories still pending:** ${String(memory.pendingCandidates)}`,
		'',
	];
}
