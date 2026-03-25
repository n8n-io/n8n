// ---------------------------------------------------------------------------
// Main evaluation orchestrator
//
// Manages the full lifecycle of an evaluation run: authentication,
// credential seeding, prompt iteration with concurrency, SSE capture,
// checklist verification, and result aggregation.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';

import { N8nClient } from '../clients/n8n-client';
import { consumeSseStream } from '../clients/sse-client';
import { extractBuildChecklist } from '../checklist/extractor';
import { extractExecutionChecklist } from '../checklist/execution-extractor';
import { verifyChecklist } from '../checklist/verifier';
import { seedCredentials, cleanupCredentials } from '../credentials/seeder';
import { extractOutcomeFromEvents, buildMetrics } from '../outcome/event-parser';
import {
	snapshotWorkflowIds,
	buildAgentOutcome,
	extractWorkflowIdsFromMessages,
} from '../outcome/workflow-discovery';
import {
	buildVerificationArtifactFromMessages,
	extractChatMessages,
} from '../outcome/artifact-builder';
import { cleanupAll } from '../outcome/cleanup';
import { runPostBuildExecutions, executeWithFullPinData } from '../execution/tester';
import { saveRun } from '../report/storage';
import { writeReport } from '../report/generator';
import { generatePinData } from '../support/pin-data-generator';
import { identifyServiceNodes } from '../support/service-node-classifier';
import { createLogger, type EvalLogger } from './logger';
import type {
	PromptConfig,
	ChecklistItem,
	ChecklistResult,
	InstanceAiResult,
	CapturedEvent,
	ExecutionChecklist,
	PinData,
	Run,
	WorkflowTestCase,
	WorkflowTestCaseResult,
} from '../types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RunConfig {
	mode: 'local' | 'langsmith';
	n8nBaseUrl: string;
	email?: string;
	password?: string;
	timeoutMs: number;
	concurrency: number;
	verbose: boolean;
	skipExecution: boolean;
	// Local mode
	prompts?: PromptConfig[];
	singlePrompt?: string;
	// LangSmith mode
	datasetName?: string;
	experimentName?: string;
	maxExamples?: number;
	filters?: { tags?: string[]; complexity?: string; triggerType?: string };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 600_000;
const SSE_SETTLE_DELAY_MS = 200;
const POLL_INTERVAL_MS = 500;
const BACKGROUND_TASK_POLL_INTERVAL_MS = 2_000;
const MAX_CONFIRMATION_RETRIES = 5;

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runEvaluation(config: RunConfig): Promise<Run> {
	const logger = createLogger(config.verbose);

	// 1. Create and authenticate client
	const client = new N8nClient(config.n8nBaseUrl);
	logger.info(`Authenticating with ${config.n8nBaseUrl}...`);
	await client.login(config.email, config.password);
	logger.success('Authenticated');

	// 2. Resolve prompts
	const prompts = resolvePrompts(config);
	if (prompts.length === 0) {
		logger.warn('No prompts to evaluate');
		return buildEmptyRun(config, prompts);
	}

	logger.info(
		`Evaluating ${String(prompts.length)} prompt(s) with concurrency ${String(config.concurrency)}`,
	);

	// 3. Seed credentials
	logger.info('Seeding credentials...');
	const seedResult = await seedCredentials(client);
	logger.info(`Seeded ${String(seedResult.credentialIds.length)} credential(s)`);

	// 4. Take workflow snapshot (shared across all examples in this run)
	const preRunWorkflowIds = await snapshotWorkflowIds(client);
	logger.verbose(`Pre-run snapshot: ${String(preRunWorkflowIds.size)} existing workflow(s)`);

	// 5. Build run record
	const run: Run = {
		id: crypto.randomUUID(),
		createdAt: new Date().toISOString(),
		status: 'running',
		config: { prompts, n8nBaseUrl: config.n8nBaseUrl },
		results: [],
	};

	try {
		// 6. Extract checklists for all prompts
		logger.info('Phase 1: Extracting checklists...');
		const checklistMap = new Map<string, ChecklistItem[]>();
		for (const prompt of prompts) {
			const label = truncate(prompt.text, 60);
			logger.verbose(`Extracting checklist: "${label}"`);
			const checklist = await extractBuildChecklist(prompt.text);
			checklistMap.set(prompt.text, checklist);
			logger.verbose(`  ${String(checklist.length)} items`);
		}

		// 7. Run examples in batches with concurrency
		logger.info(`Phase 2: Running ${String(prompts.length)} example(s)...`);

		const tasks = prompts.map((prompt) => ({
			prompt,
			checklist: checklistMap.get(prompt.text) ?? [],
		}));

		const results: InstanceAiResult[] = [];
		const claimedWorkflowIds = new Set<string>();

		for (let i = 0; i < tasks.length; i += config.concurrency) {
			const batch = tasks.slice(i, i + config.concurrency);
			const batchNum = Math.floor(i / config.concurrency) + 1;
			const totalBatches = Math.ceil(tasks.length / config.concurrency);
			logger.info(`Batch ${String(batchNum)}/${String(totalBatches)}:`);

			const batchResults = await Promise.allSettled(
				batch.map(async ({ prompt, checklist }) => {
					const label = truncate(prompt.text, 50);
					logger.info(`  Starting: "${label}"`);

					const result = await runSingleExample({
						client,
						prompt,
						checklist,
						timeoutMs: config.timeoutMs,
						verbose: config.verbose,
						skipExecution: config.skipExecution,
						seededCredentialTypes: seedResult.seededTypes,
						preRunWorkflowIds,
						claimedWorkflowIds,
						logger,
					});

					const scoreStr = `${(result.checklistScore * 100).toFixed(0)}%`;
					const successStr = result.success ? 'PASS' : 'FAIL';
					logger.info(
						`  Done: "${label}" -- ${successStr}, Score: ${scoreStr}, Tools: ${String(result.metrics.totalToolCalls)}`,
					);

					return result;
				}),
			);

			for (const r of batchResults) {
				if (r.status === 'fulfilled') {
					results.push(r.value);
				} else {
					logger.error(`  Failed: ${String(r.reason)}`);
				}
			}

			run.results = results;
			// Save progress after each batch
			saveRun(run);
		}

		run.results = results;
		run.status = 'completed';
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.error(`Pipeline error: ${msg}`);
		run.status = 'failed';
	} finally {
		// 8. Cleanup credentials
		await cleanupCredentials(client, seedResult.credentialIds).catch(() => {});
	}

	// 9. Save final run and generate report
	saveRun(run);
	try {
		const { listRuns } = await import('../report/storage');
		writeReport(listRuns());
		logger.info('Report generated: evaluations/.data/instance-ai-report.html');
	} catch {
		// Report generation failure is non-fatal
	}

	// 10. Print summary
	printSummary(run, logger);

	return run;
}

// ---------------------------------------------------------------------------
// Single example runner
// ---------------------------------------------------------------------------

interface SingleExampleConfig {
	client: N8nClient;
	prompt: PromptConfig;
	checklist: ChecklistItem[];
	timeoutMs: number;
	verbose: boolean;
	skipExecution: boolean;
	seededCredentialTypes: string[];
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
	logger: EvalLogger;
}

async function runSingleExample(config: SingleExampleConfig): Promise<InstanceAiResult> {
	const { client, prompt, checklist, logger } = config;
	const threadId = `eval-${crypto.randomUUID()}`;
	const startTime = Date.now();
	const timeoutMs = config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS;

	const abortController = new AbortController();
	const events: CapturedEvent[] = [];
	const approvedRequests = new Set<string>();

	let runId = '';

	try {
		// 1. Start SSE connection in the background
		logger.verbose(`[${threadId}] Starting SSE connection`);
		let sseError: Error | undefined;
		const ssePromise = startSseConnection(client, threadId, events, abortController.signal).catch(
			(err: unknown) => {
				// Capture SSE errors instead of letting them become unhandled rejections.
				// The error will surface when we check sseError or await ssePromise.
				sseError = err instanceof Error ? err : new Error(String(err));
			},
		);

		// 2. Small delay to let SSE connect
		await delay(SSE_SETTLE_DELAY_MS);

		// If SSE failed to connect, throw immediately
		if (sseError) {
			throw sseError;
		}

		// 3. Send the message
		logger.verbose(`[${threadId}] Sending message: ${truncate(prompt.text, 100)}`);
		const sendResult = await client.sendMessage(threadId, prompt.text);
		runId = sendResult.runId;

		// 4. Wait for all activity (run-finish + background tasks)
		await waitForAllActivity({
			client,
			threadId,
			events,
			approvedRequests,
			startTime,
			timeoutMs,
			logger,
		});

		// 5. Abort SSE connection
		abortController.abort();
		await ssePromise.catch(() => {
			// SSE promise rejects on abort -- expected
		});

		// 6. Fetch thread messages and build metrics/outcome
		logger.verbose(`[${threadId}] Fetching thread messages...`);
		const threadMessages = await client.getThreadMessages(threadId);
		const messageWorkflowIds = extractWorkflowIdsFromMessages(threadMessages.messages);

		const metrics = buildMetrics(events, startTime);
		const eventOutcome = extractOutcomeFromEvents(events);
		const outcome = await buildAgentOutcome(
			client,
			eventOutcome,
			config.preRunWorkflowIds,
			config.claimedWorkflowIds,
		);

		// Filter outcome to only include workflows referenced in thread messages
		if (messageWorkflowIds.length > 0) {
			const messageWfSet = new Set(messageWorkflowIds);
			outcome.workflowsCreated = outcome.workflowsCreated.filter((wf) => messageWfSet.has(wf.id));
			outcome.workflowJsons = outcome.workflowJsons.filter(
				(wf) => typeof wf.id === 'string' && messageWfSet.has(wf.id),
			);
		} else if (eventOutcome.workflowIds.length === 0) {
			outcome.workflowsCreated = [];
			outcome.workflowJsons = [];
		}

		if (outcome.workflowsCreated.length > 0) {
			logger.verbose(
				`[${threadId}] Captured ${String(outcome.workflowsCreated.length)} workflow(s): ${outcome.workflowsCreated.map((w) => w.name).join(', ')}`,
			);

			// 6b. Force-execute created workflows that weren't already run
			logger.verbose(`[${threadId}] Running post-build executions...`);
			await runPostBuildExecutions(client, outcome);
		}

		// 7. Extract execution checklist and verify
		const emptyExecChecklist: ExecutionChecklist = { items: [], testInputs: [] };
		let executionChecklist = emptyExecChecklist;

		if (
			!config.skipExecution &&
			outcome.workflowsCreated.length > 0 &&
			outcome.workflowJsons.length > 0
		) {
			logger.verbose(`[${threadId}] Extracting execution checklist...`);
			// Pass existing execution output so the LLM knows what data is already available
			const existingExecOutput = outcome.executionsRun
				.filter((e) => e.outputData && e.outputData.length > 0)
				.flatMap((e) => e.outputData ?? []);
			executionChecklist = await extractExecutionChecklist(
				prompt.text,
				outcome.workflowJsons[0],
				config.seededCredentialTypes,
				existingExecOutput,
			);
			logger.verbose(
				`[${threadId}] Execution checklist: ${String(executionChecklist.items.length)} items, ${String(executionChecklist.testInputs.length)} test inputs`,
			);

			// 8b. Re-run execution with test inputs + service pin data
			if (executionChecklist.testInputs.length > 0) {
				logger.verbose(`[${threadId}] Running execution eval with test data...`);
				await runPostBuildExecutions(client, outcome, executionChecklist.testInputs);
			}
		}

		// 8. Build verification artifact from rich messages
		const verificationArtifact = buildVerificationArtifactFromMessages(
			threadMessages.messages,
			outcome,
		);

		// 9. Verify build checklist (hybrid: programmatic + LLM)
		const checklistResults = await verifyChecklist(
			checklist,
			verificationArtifact,
			outcome.workflowJsons,
		);
		const checklistScore = calculateScore(checklistResults.map((r) => r.pass));

		logger.verbose(
			`[${threadId}] Checklist score: ${formatPercent(checklistScore)} (${String(checklistResults.filter((r) => r.pass).length)}/${String(checklist.length)} passed)`,
		);

		// 10. Verify execution checklist
		const evalExecutions = outcome.executionsRun.filter((e) => e.triggeredByEval);
		const allEvalExecutionsFailed =
			evalExecutions.length > 0 &&
			evalExecutions.every((e) => e.status === 'error' || e.status === 'failed');

		let executionChecklistResults: ChecklistResult[];
		if (allEvalExecutionsFailed && executionChecklist.items.length > 0) {
			const failureReasons = evalExecutions
				.filter((e) => e.error)
				.map((e) => e.error)
				.join('; ');
			executionChecklistResults = executionChecklist.items.map((item) => ({
				id: item.id,
				pass: false,
				reasoning: `All executions failed: ${failureReasons || 'unknown error'}`,
				strategy: 'programmatic' as const,
			}));
		} else {
			executionChecklistResults =
				executionChecklist.items.length > 0
					? await verifyChecklist(
							executionChecklist.items,
							verificationArtifact,
							outcome.workflowJsons,
						)
					: [];
		}
		const executionChecklistScore = calculateScore(executionChecklistResults.map((r) => r.pass));

		if (executionChecklist.items.length > 0) {
			logger.verbose(
				`[${threadId}] Execution score: ${formatPercent(executionChecklistScore)} (${String(executionChecklistResults.filter((r) => r.pass).length)}/${String(executionChecklist.items.length)} passed)`,
			);
		}

		// 11. Cleanup
		await cleanupAll(client, outcome, []).catch(() => {
			// Best-effort cleanup
		});

		return {
			prompt: prompt.text,
			complexity: prompt.complexity,
			tags: prompt.tags,
			success: true,
			runId,
			threadId,
			metrics,
			outcome,
			chatMessages: extractChatMessages(threadMessages.messages),
			checklist,
			checklistResults,
			checklistScore,
			executionChecklist: executionChecklist.items,
			executionChecklistResults,
			executionChecklistScore,
		};
	} catch (error: unknown) {
		abortController.abort();

		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.verbose(`[${threadId}] Error: ${errorMessage}`);

		return buildErrorResult(prompt, threadId, runId, events, startTime, checklist, errorMessage);
	}
}

// ---------------------------------------------------------------------------
// Workflow test case runner — build once, run scenarios against it
// ---------------------------------------------------------------------------

const SCENARIO_BG_TASK_TIMEOUT_MS = 60_000;

interface WorkflowTestCaseConfig {
	client: N8nClient;
	testCase: WorkflowTestCase;
	timeoutMs: number;
	seededCredentialTypes: string[];
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
	logger: EvalLogger;
}

export async function runWorkflowTestCase(
	config: WorkflowTestCaseConfig,
): Promise<WorkflowTestCaseResult> {
	const { client, testCase, logger } = config;
	const threadId = `eval-${crypto.randomUUID()}`;
	const startTime = Date.now();
	const timeoutMs = config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS;

	const result: WorkflowTestCaseResult = {
		testCase,
		workflowBuildSuccess: false,
		scenarioResults: [],
	};

	const abortController = new AbortController();
	const events: CapturedEvent[] = [];
	const approvedRequests = new Set<string>();

	try {
		// 1. Send prompt to Instance AI and wait for workflow to be built (ONCE)
		logger.info(`  Building workflow: "${truncate(testCase.prompt, 60)}"`);

		const ssePromise = startSseConnection(client, threadId, events, abortController.signal).catch(
			(err: unknown) => {
				if (err instanceof Error) throw err;
				throw new Error(String(err));
			},
		);

		await delay(SSE_SETTLE_DELAY_MS);

		await client.sendMessage(threadId, testCase.prompt);

		// Wait with shorter timeout for scenario mode
		await waitForAllActivity({
			client,
			threadId,
			events,
			approvedRequests,
			startTime,
			timeoutMs: Math.min(timeoutMs, SCENARIO_BG_TASK_TIMEOUT_MS),
			logger,
		});

		abortController.abort();
		await ssePromise.catch(() => {});

		// 2. Capture the built workflow
		const threadMessages = await client.getThreadMessages(threadId);
		const messageWorkflowIds = extractWorkflowIdsFromMessages(threadMessages.messages);
		const eventOutcome = extractOutcomeFromEvents(events);
		const outcome = await buildAgentOutcome(
			client,
			eventOutcome,
			config.preRunWorkflowIds,
			config.claimedWorkflowIds,
		);

		if (messageWorkflowIds.length > 0) {
			const messageWfSet = new Set(messageWorkflowIds);
			outcome.workflowsCreated = outcome.workflowsCreated.filter((wf) => messageWfSet.has(wf.id));
			outcome.workflowJsons = outcome.workflowJsons.filter(
				(wf) => typeof wf.id === 'string' && messageWfSet.has(wf.id),
			);
		}

		if (outcome.workflowsCreated.length === 0) {
			// Extract error information from SSE events and thread messages
			const toolErrors = events
				.filter((e) => e.type === 'tool-error')
				.map((e) => {
					const payload =
						typeof e.data.payload === 'object' && e.data.payload !== null
							? (e.data.payload as Record<string, unknown>)
							: e.data;
					return String(payload.error ?? payload.message ?? 'unknown tool error');
				});

			const agentText = events
				.filter((e) => e.type === 'text-delta')
				.map((e) => {
					const text =
						typeof e.data.text === 'string'
							? e.data.text
							: typeof e.data.payload === 'object' &&
									e.data.payload !== null &&
									'text' in (e.data.payload as Record<string, unknown>)
								? String((e.data.payload as Record<string, unknown>).text)
								: '';
					return text;
				})
				.join('');

			const buildError =
				toolErrors.length > 0
					? `Tool errors: ${toolErrors.join('; ')}`
					: agentText.length > 0
						? `Agent response: ${agentText.slice(0, 500)}`
						: 'No workflow produced — no error details captured';

			result.buildError = buildError;
			logger.warn(`  No workflow created for: "${truncate(testCase.prompt, 60)}"`);
			logger.warn(`  ${buildError.slice(0, 200)}`);
			return result;
		}

		result.workflowBuildSuccess = true;
		result.workflowId = outcome.workflowsCreated[0].id;
		const workflowJson = outcome.workflowJsons[0] as unknown as WorkflowJSON;

		logger.info(
			`  Workflow built: ${outcome.workflowsCreated[0].name} (${String(outcome.workflowsCreated[0].nodeCount)} nodes)`,
		);

		// 3. Identify service nodes that need pin data
		const serviceNodes = identifyServiceNodes(workflowJson);
		const nodeNames = serviceNodes.map((n) => n.name).filter(Boolean) as string[];
		logger.verbose(`  Service nodes needing pin data: ${nodeNames.join(', ') || 'none'}`);

		// 4. Run each scenario against the same workflow
		const runnableScenarios = testCase.scenarios.filter((s) => s.requires !== 'mock-server');

		for (const scenario of runnableScenarios) {
			logger.info(`    Scenario: ${scenario.name}`);

			try {
				// Generate pin data for all nodes (trigger + service) in one call
				let pinData: PinData = {};
				if (nodeNames.length > 0) {
					pinData = await generatePinData({
						workflow: workflowJson,
						nodeNames,
						instructions: { dataDescription: scenario.dataSetup },
					});
					logger.verbose(
						`    Pin data generated for ${String(Object.keys(pinData).length)} node(s)`,
					);
				}

				// Execute with the generated pin data
				const executionSummary = await executeWithFullPinData(
					client,
					outcome.workflowsCreated[0].id,
					pinData,
					outcome.workflowJsons,
				);

				// Evaluate using scenario.successCriteria via LLM
				const baseArtifact = buildVerificationArtifactFromMessages(threadMessages.messages, {
					...outcome,
					executionsRun: [executionSummary],
				});

				// Enrich artifact with scenario context so the verifier understands
				// which nodes had mock data vs which ran for real
				const pinnedNodesList = Object.keys(pinData).join(', ') || 'none';
				const scenarioContext = [
					'### Evaluation Context',
					'',
					`**Scenario:** ${scenario.name} — ${scenario.description}`,
					'',
					`**Data setup:** ${scenario.dataSetup}`,
					'',
					`**Pinned nodes (mock data):** ${pinnedNodesList}`,
					'These nodes had mock data injected and did not call real services.',
					'All other nodes executed for real with the mock data flowing through them.',
					'',
					'**What to verify:** Given the mock data was injected as described above,',
					'did the workflow logic (routing, transformations, merging) process it correctly?',
					'Focus on whether the non-pinned nodes produced correct output based on their inputs.',
				].join('\n');

				const verificationArtifact = `${scenarioContext}\n\n---\n\n${baseArtifact}`;

				const scenarioChecklist: ChecklistItem[] = [
					{
						id: 1,
						description: scenario.successCriteria,
						category: 'execution',
						strategy: 'llm',
					},
				];

				const verificationResults = await verifyChecklist(
					scenarioChecklist,
					verificationArtifact,
					outcome.workflowJsons,
				);

				const passed = verificationResults.length > 0 && verificationResults[0].pass;
				const reasoning =
					verificationResults.length > 0
						? verificationResults[0].reasoning
						: 'No verification result';

				result.scenarioResults.push({
					scenario,
					success: passed,
					executionSummary,
					score: passed ? 1 : 0,
					reasoning,
				});

				logger.info(`    ${passed ? 'PASS' : 'FAIL'}: ${reasoning.slice(0, 100)}`);
			} catch (err: unknown) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				result.scenarioResults.push({
					scenario,
					success: false,
					score: 0,
					reasoning: `Error: ${errorMessage}`,
				});
				logger.error(`    ERROR: ${errorMessage}`);
			}
		}

		// 5. Cleanup — workflows, credentials, and data tables
		await cleanupAll(client, outcome, []).catch(() => {});

		// Clean up data tables created during this run
		if (outcome.dataTablesCreated.length > 0) {
			try {
				const projectId = await client.getPersonalProjectId();
				for (const dtId of outcome.dataTablesCreated) {
					try {
						await client.deleteDataTable(projectId, dtId);
					} catch {
						// Best-effort cleanup
					}
				}
				logger.verbose(`  Cleaned up ${String(outcome.dataTablesCreated.length)} data table(s)`);
			} catch {
				// Non-fatal — project ID lookup may fail
			}
		}
	} catch (error: unknown) {
		abortController.abort();
		const errorMessage = error instanceof Error ? error.message : String(error);
		result.buildError = errorMessage;
		logger.error(`  Build failed: ${errorMessage}`);
	}

	return result;
}

// ---------------------------------------------------------------------------
// SSE connection
// ---------------------------------------------------------------------------

function startSseConnection(
	client: N8nClient,
	threadId: string,
	events: CapturedEvent[],
	signal: AbortSignal,
): Promise<void> {
	const url = client.getEventsUrl(threadId);
	const cookie = client.cookie;

	return consumeSseStream(
		url,
		cookie,
		(sseEvent) => {
			try {
				const parsed = JSON.parse(sseEvent.data) as Record<string, unknown>;
				events.push({
					timestamp: Date.now(),
					type: typeof parsed.type === 'string' ? parsed.type : 'unknown',
					data: parsed,
				});
			} catch {
				// Ignore malformed events
			}
		},
		signal,
	);
}

// ---------------------------------------------------------------------------
// Wait for all activity: run-finish -> background tasks -> possible new run
// ---------------------------------------------------------------------------

interface WaitConfig {
	client: N8nClient;
	threadId: string;
	events: CapturedEvent[];
	approvedRequests: Set<string>;
	startTime: number;
	timeoutMs: number;
	logger: EvalLogger;
}

async function waitForAllActivity(config: WaitConfig): Promise<void> {
	let runFinishCount = 0;

	while (true) {
		await waitForRunFinish(config, runFinishCount);
		runFinishCount = countEvents(config.events, 'run-finish');

		config.logger.verbose(
			`[${config.threadId}] Run #${String(runFinishCount)} finished -- time: ${String(Date.now() - config.startTime)}ms`,
		);

		// Wait for background tasks (sub-agents) to complete
		const remainingMs = Math.max(0, config.timeoutMs - (Date.now() - config.startTime));
		await waitForBackgroundTasks(config, remainingMs);

		// Check if the main agent started a new run after background tasks completed
		await delay(SSE_SETTLE_DELAY_MS);
		const newRunStarts = countEvents(config.events, 'run-start');
		const currentRunFinishes = countEvents(config.events, 'run-finish');
		if (newRunStarts <= currentRunFinishes) {
			break;
		}

		config.logger.verbose(
			`[${config.threadId}] Main agent resumed (run-start #${String(newRunStarts)}) -- waiting for completion`,
		);

		if (Date.now() - config.startTime > config.timeoutMs) {
			throw new Error(`Run timed out after ${String(config.timeoutMs)}ms`);
		}
	}
}

async function waitForRunFinish(config: WaitConfig, expectedFinishCount: number): Promise<void> {
	while (countEvents(config.events, 'run-finish') <= expectedFinishCount) {
		const elapsed = Date.now() - config.startTime;
		if (elapsed > config.timeoutMs) {
			await config.client.cancelRun(config.threadId).catch(() => {});
			throw new Error(`Run timed out after ${String(config.timeoutMs)}ms`);
		}

		await processConfirmationRequests(config);
		await delay(POLL_INTERVAL_MS);
	}
}

async function waitForBackgroundTasks(config: WaitConfig, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;

	const hasSpawnedAgents = config.events.some((e) => e.type === 'agent-spawned');
	if (!hasSpawnedAgents) {
		config.logger.verbose('No sub-agents spawned -- skipping background task wait');
		return;
	}

	config.logger.verbose('Sub-agent(s) detected -- waiting for background tasks...');

	while (Date.now() < deadline) {
		await processConfirmationRequests(config);

		// Check REST API for background task status
		const status = await config.client.getThreadStatus(config.threadId);
		const tasks = status.backgroundTasks ?? [];
		const restRunning = tasks.filter((t) => t.status === 'running');

		// Check SSE events for unmatched agent-spawned / agent-completed
		const ssePending = getPendingAgentIds(config.events);

		if (restRunning.length === 0 && ssePending.length === 0) {
			config.logger.verbose('All background tasks completed');
			await delay(1000);
			return;
		}

		config.logger.verbose(
			`Waiting for ${String(restRunning.length)} REST task(s), ${String(ssePending.length)} SSE agent(s)`,
		);

		await delay(BACKGROUND_TASK_POLL_INTERVAL_MS);
	}

	config.logger.verbose(
		`Background task wait timed out after ${String(timeoutMs)}ms -- continuing`,
	);
}

// ---------------------------------------------------------------------------
// Confirmation auto-approval
// ---------------------------------------------------------------------------

const confirmationRetries = new Map<string, number>();

async function processConfirmationRequests(config: WaitConfig): Promise<void> {
	const confirmationEvents = config.events.filter((e) => e.type === 'confirmation-request');

	for (const event of confirmationEvents) {
		const requestId = extractConfirmationRequestId(event);
		if (!requestId || config.approvedRequests.has(requestId)) {
			continue;
		}

		const retryCount = confirmationRetries.get(requestId) ?? 0;
		if (retryCount >= MAX_CONFIRMATION_RETRIES) {
			continue;
		}

		if (retryCount === 0) {
			config.logger.verbose(`[auto-approve] Approving confirmation: ${requestId}`);
		}

		try {
			// Always offer mock credentials — the eval runner doesn't have real
			// credentials for most services, so tell Instance AI to use mock data
			await config.client.confirmAction(requestId, true, { mockCredentials: true });
			config.approvedRequests.add(requestId);
			confirmationRetries.delete(requestId);
		} catch (error: unknown) {
			confirmationRetries.set(requestId, retryCount + 1);
			const msg = error instanceof Error ? error.message : String(error);
			config.logger.verbose(
				`[auto-approve] Failed to approve ${requestId} (attempt ${String(retryCount + 1)}/${String(MAX_CONFIRMATION_RETRIES)}): ${msg}`,
			);
		}
	}
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

function countEvents(events: CapturedEvent[], type: string): number {
	return events.filter((e) => e.type === type).length;
}

function getPendingAgentIds(events: CapturedEvent[]): string[] {
	const spawned = new Set<string>();
	const completed = new Set<string>();

	for (const event of events) {
		const agentId = extractAgentId(event);
		if (!agentId) continue;

		if (event.type === 'agent-spawned') spawned.add(agentId);
		if (event.type === 'agent-completed') completed.add(agentId);
	}

	return [...spawned].filter((id) => !completed.has(id));
}

function extractConfirmationRequestId(event: CapturedEvent): string | undefined {
	const payload = getNestedRecord(event.data, 'payload');
	if (payload && typeof payload.requestId === 'string') {
		return payload.requestId;
	}
	if (typeof event.data.requestId === 'string') {
		return event.data.requestId;
	}
	return undefined;
}

function extractAgentId(event: CapturedEvent): string | undefined {
	if (typeof event.data.agentId === 'string') return event.data.agentId;

	const payload = getNestedRecord(event.data, 'payload');
	if (payload && typeof payload.agentId === 'string') return payload.agentId;

	return undefined;
}

function getNestedRecord(
	obj: Record<string, unknown>,
	key: string,
): Record<string, unknown> | undefined {
	const value = obj[key];
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function calculateScore(passes: boolean[]): number {
	if (passes.length === 0) return 0;
	const passed = passes.filter(Boolean).length;
	return passed / passes.length;
}

// ---------------------------------------------------------------------------
// Error result builder
// ---------------------------------------------------------------------------

function buildErrorResult(
	prompt: PromptConfig,
	threadId: string,
	runId: string,
	events: CapturedEvent[],
	startTime: number,
	checklist: ChecklistItem[],
	errorMessage: string,
): InstanceAiResult {
	const metrics = buildMetrics(events, startTime);

	return {
		prompt: prompt.text,
		complexity: prompt.complexity,
		tags: prompt.tags,
		success: false,
		runId,
		threadId,
		metrics,
		outcome: {
			workflowsCreated: [],
			executionsRun: [],
			dataTablesCreated: [],
			finalText: '',
			workflowJsons: [],
		},
		checklist,
		checklistResults: [],
		checklistScore: 0,
		executionChecklist: [],
		executionChecklistResults: [],
		executionChecklistScore: 0,
		error: errorMessage,
	};
}

// ---------------------------------------------------------------------------
// Prompt resolution
// ---------------------------------------------------------------------------

function resolvePrompts(config: RunConfig): PromptConfig[] {
	if (config.singlePrompt) {
		return [
			{
				text: config.singlePrompt,
				complexity: 'medium',
				tags: ['ad-hoc'],
			},
		];
	}
	return config.prompts ?? [];
}

function buildEmptyRun(config: RunConfig, prompts: PromptConfig[]): Run {
	return {
		id: crypto.randomUUID(),
		createdAt: new Date().toISOString(),
		status: 'completed',
		config: { prompts, n8nBaseUrl: config.n8nBaseUrl },
		results: [],
	};
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function printSummary(run: Run, logger: EvalLogger): void {
	logger.info('=== Summary ===');
	logger.info(`Status: ${run.status}`);
	logger.info(`Results: ${String(run.results.length)}`);

	if (run.results.length === 0) return;

	const successRate = run.results.filter((r) => r.success).length / run.results.length;
	const avgScore = run.results.reduce((s, r) => s + r.checklistScore, 0) / run.results.length;
	const avgToolCalls =
		run.results.reduce((s, r) => s + r.metrics.totalToolCalls, 0) / run.results.length;
	const avgSubAgents =
		run.results.reduce((s, r) => s + r.metrics.subAgentsSpawned, 0) / run.results.length;
	const avgTime = run.results.reduce((s, r) => s + r.metrics.totalTimeMs, 0) / run.results.length;

	logger.info(`Success Rate: ${formatPercent(successRate)}`);
	logger.info(`Avg Build Score: ${formatPercent(avgScore)}`);
	logger.info(`Avg Tool Calls: ${avgToolCalls.toFixed(1)}`);
	logger.info(`Avg Sub-Agents: ${avgSubAgents.toFixed(1)}`);
	logger.info(`Avg Time: ${(avgTime / 1000).toFixed(1)}s`);

	// Per-complexity breakdown
	const complexities = ['simple', 'medium', 'complex'] as const;
	for (const c of complexities) {
		const cResults = run.results.filter((r) => r.complexity === c);
		if (cResults.length === 0) continue;
		const cSuccess = cResults.filter((r) => r.success).length / cResults.length;
		const cScore = cResults.reduce((s, r) => s + r.checklistScore, 0) / cResults.length;
		logger.info(
			`  ${c.toUpperCase()}: Success ${formatPercent(cSuccess)}, Score ${formatPercent(cScore)} (${String(cResults.length)} examples)`,
		);
	}
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength) + '...';
}

function formatPercent(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}
