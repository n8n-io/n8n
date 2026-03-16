// ---------------------------------------------------------------------------
// Generate golden reference outputs for LangSmith datasets.
//
// Runs each prompt in a dataset against the live instance-ai agent,
// captures the full output (workflows, tool calls, agent response),
// and uploads it as the `outputs` field of each LangSmith example.
//
// Usage:
//   LANGSMITH_API_KEY=... N8N_EVAL_PASSWORD=... \
//     pnpm eval:checklist generate-references --dataset <name> --n8n-url http://localhost:5678
// ---------------------------------------------------------------------------

import { Client } from 'langsmith/client';
import type { Example } from 'langsmith/schemas';

import { N8nClient } from './n8n-client';
import { extractChecklist } from './checklist';
import { runSingleExample, type RunnerConfig } from './runner';
import { cleanupEvalArtifacts } from './verification';
import type {
	PromptConfig,
	ChecklistResult,
	ChecklistItem,
	WorkflowSummary,
	ExecutionSummary,
} from './types';

// ---------------------------------------------------------------------------
// Reference output shape (stored in LangSmith example.outputs)
// ---------------------------------------------------------------------------

interface ReferenceOutput {
	workflowsCreated: WorkflowSummary[];
	executionsRun: ExecutionSummary[];
	dataTablesCreated: string[];
	agentResponse: string;
	workflowJsons: Record<string, unknown>[];
	checklistScore: number;
	checklistResults: ChecklistResult[];
	checklist: ChecklistItem[];
	totalToolCalls: number;
	subAgentsSpawned: number;
	totalTimeMs: number;
	toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>;
	success: boolean;
	error?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface GenerateRefsConfig {
	datasetName: string;
	n8nBaseUrl: string;
	timeoutMs: number;
	verbose: boolean;
	overwrite: boolean;
	maxExamples?: number;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function generateReferences(config: GenerateRefsConfig): Promise<void> {
	const lsClient = new Client();

	// Authenticate with n8n
	console.log(`Authenticating with n8n at ${config.n8nBaseUrl}...`);
	const n8nClient = new N8nClient(config.n8nBaseUrl);
	await n8nClient.login();
	console.log('Authenticated successfully.\n');

	// Load examples from dataset
	const dataset = await lsClient.readDataset({ datasetName: config.datasetName });
	const allExamples: Example[] = [];
	for await (const example of lsClient.listExamples({ datasetId: dataset.id })) {
		allExamples.push(example);
	}

	let examples = allExamples;

	// Skip examples that already have outputs (unless --overwrite)
	if (!config.overwrite) {
		const before = examples.length;
		examples = examples.filter((e) => !e.outputs || Object.keys(e.outputs).length === 0);
		const skipped = before - examples.length;
		if (skipped > 0) {
			console.log(
				`Skipping ${String(skipped)} example(s) that already have outputs (use --overwrite to regenerate)`,
			);
		}
	}

	if (config.maxExamples && config.maxExamples > 0) {
		examples = examples.slice(0, config.maxExamples);
	}

	console.log(
		`Dataset: ${config.datasetName} (${String(allExamples.length)} total, ${String(examples.length)} to process)\n`,
	);

	if (examples.length === 0) {
		console.log('Nothing to do.');
		return;
	}

	const runnerConfig: RunnerConfig = {
		n8nClient,
		timeoutMs: config.timeoutMs,
		verbose: config.verbose,
		autoApprove: true,
		skipCleanup: true, // We need to fetch workflow JSON before cleanup
	};

	let processed = 0;
	let succeeded = 0;

	for (const example of examples) {
		processed++;
		const inputs = (example.inputs ?? {}) as Record<string, unknown>;
		const prompt = typeof inputs.prompt === 'string' ? inputs.prompt : '';
		const complexity = typeof inputs.complexity === 'string' ? inputs.complexity : 'medium';
		const tags = Array.isArray(inputs.tags) ? (inputs.tags as string[]) : [];

		const label = prompt.length > 70 ? prompt.slice(0, 70) + '...' : prompt;
		console.log(`[${String(processed)}/${String(examples.length)}] ${label}`);

		const promptConfig: PromptConfig = {
			text: prompt,
			complexity: complexity as PromptConfig['complexity'],
			source: 'synthetic',
			tags,
		};

		try {
			const checklist = await extractChecklist(prompt);
			const result = await runSingleExample(runnerConfig, promptConfig, checklist);

			// Workflow JSONs are already captured in the outcome by the runner
			const { workflowJsons } = result.outcome;

			// Now cleanup
			await cleanupEvalArtifacts(n8nClient, result.outcome).catch(() => {});

			// Build reference output
			const reference: ReferenceOutput = {
				workflowsCreated: result.outcome.workflowsCreated,
				executionsRun: result.outcome.executionsRun,
				dataTablesCreated: result.outcome.dataTablesCreated,
				agentResponse: result.outcome.finalText,
				workflowJsons,
				checklistScore: result.checklistScore,
				checklistResults: result.checklistResults,
				checklist: result.checklist,
				totalToolCalls: result.metrics.totalToolCalls,
				subAgentsSpawned: result.metrics.subAgentsSpawned,
				totalTimeMs: result.metrics.totalTimeMs,
				toolCalls: result.metrics.agentActivities.flatMap((a) =>
					a.toolCalls.map((tc) => ({ toolName: tc.toolName, args: tc.args })),
				),
				success: result.success,
				error: result.error,
			};

			// Upload to LangSmith
			await lsClient.updateExamples([
				{
					id: example.id,
					outputs: reference as unknown as Record<string, unknown>,
				},
			]);

			const scoreStr = `${(result.checklistScore * 100).toFixed(0)}%`;
			const wfCount = String(result.outcome.workflowsCreated.length);
			console.log(
				`  -> ${result.success ? 'OK' : 'FAIL'}, Score: ${scoreStr}, Workflows: ${wfCount}, Tools: ${String(result.metrics.totalToolCalls)}, Time: ${(result.metrics.totalTimeMs / 1000).toFixed(1)}s — uploaded\n`,
			);
			succeeded++;
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			console.error(`  -> ERROR: ${msg}\n`);
		}
	}

	console.log(`\n=== Done ===`);
	console.log(
		`Processed: ${String(processed)}, Succeeded: ${String(succeeded)}, Failed: ${String(processed - succeeded)}`,
	);
}
