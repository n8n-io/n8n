// ---------------------------------------------------------------------------
// Agent scenario execution
//
// The agent-artifact counterpart of scenario-execution.ts: executes one
// scenario against a built first-class Agent (real model, mocked tool HTTP)
// and assembles the agent verification artifact.
// ---------------------------------------------------------------------------

import type { InstanceAiEvalAgentExecutionResult } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { setTimeout as delay } from 'node:timers/promises';

import { agentHandler } from './artifacts/agent-handler';
import { type EvalLogger } from './logger';
import { writeScenarioVerificationSnapshot, type VerificationArtifact } from './scenario-execution';
import { isTransientExecutionAbort, MAX_EXEC_ATTEMPTS } from './transient-error';
import { verifyChecklist } from '../checklist/verifier';
import type { N8nClient } from '../clients/n8n-client';
import type {
	ArtifactRef,
	BuildTrace,
	ChecklistItem,
	ExecutionScenarioResult,
	ExecutionScenario,
} from '../types';

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
export async function fetchAgentScenarioContext(
	client: N8nClient,
	ref: ArtifactRef,
	logger: EvalLogger,
): Promise<string> {
	try {
		const agentArtifact = await agentHandler.fetch(ref, client);
		return agentHandler.renderArtifact(agentArtifact);
	} catch (error: unknown) {
		logger.warn(
			`  Agent config fetch failed — verifying scenarios without it: ${error instanceof Error ? error.message : String(error)}`,
		);
		return '(agent configuration could not be fetched)';
	}
}

/**
 * Execute one scenario against a built first-class Agent and verify the
 * result — the agent-artifact counterpart of runScenario. The agent reasons
 * with its real model; its tools' outbound HTTP is served by the mock layer.
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
): Promise<ExecutionScenarioResult> {
	const execStart = Date.now();
	const projectId = await client.getPersonalProjectId();
	let evalResult = await client.executeAgentWithLlmMock(
		agentId,
		projectId,
		scenario.dataSetup,
		timeoutMs,
	);
	// Same in-band transient-abort retry as the workflow path.
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
		evalResult = await client.executeAgentWithLlmMock(
			agentId,
			projectId,
			scenario.dataSetup,
			timeoutMs,
		);
	}
	const execMs = Date.now() - execStart;

	logger.info(
		`    [${scenario.name}] agent exec=${String(Math.round(execMs / 1000))}s (${String(evalResult.toolCalls.length)} tool calls, ${String(evalResult.modelTurns.length)} model turns)`,
	);

	const verifyStart = Date.now();
	const artifact = buildAgentVerificationArtifact(scenario, agentContext, evalResult);

	const scenarioChecklist: ChecklistItem[] = [
		{
			id: 1,
			description: scenario.successCriteria,
			category: 'execution',
			strategy: 'llm',
		},
	];

	const verification = await verifyChecklist(scenarioChecklist, artifact);
	const verificationResults = verification.results;

	const verifyMs = Date.now() - verifyStart;
	const passed = verificationResults.length > 0 && verificationResults[0].pass;
	const result = verificationResults[0];
	await writeScenarioVerificationSnapshot({
		testCaseName: testCaseName ?? `agent-${agentId}`,
		scenarioName: scenario.name,
		workflowId: `agent:${agentId}`,
		passed,
		result,
		verificationResults,
		verifierAttempts: verification.attempts,
		buildTrace,
		logger,
	});
	const incomplete = verificationResults.length === 0;
	const attemptErrors = verification.attempts
		.map((a) => a.error)
		.filter((e): e is string => e !== null);
	const reasoning =
		result?.reasoning ??
		`No verification result — verifier exhausted all attempts${attemptErrors.length > 0 ? ` (${attemptErrors.join('; ')})` : ''}`;
	const failureCategory = result?.failureCategory ?? (result ? undefined : 'verification_failure');
	const rootCause = result?.rootCause;

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
		rootCause,
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
