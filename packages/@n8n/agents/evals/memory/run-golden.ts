import { generateText } from 'ai';
import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import {
	createMemoryJudge,
	memoryGoldenScenarios,
	runMemoryGoldenSuite,
	writeMemoryEvalArtifacts,
} from './index';
import type { MemoryEvalScenario } from './types';
import {
	Agent,
	createModel,
	createObservationLogThreadScopeId,
	Memory,
	type ModelConfig,
} from '../../src';
import { InMemoryMemory } from '../../src/runtime/memory-store';
import type { AgentMessage, MessageContent } from '../../src/types/sdk/message';

type CliConfig = {
	model: ModelConfig;
	modelId: string;
	judgeModel: ModelConfig | undefined;
	judgeModelId: string | undefined;
	judgeEnabled: boolean;
	scenarios: MemoryEvalScenario[];
	outputDir: string;
	concurrency: number;
	lastMessages: number;
	observerThresholdTokens: number;
	reflectorThresholdTokens: number;
	renderTokenBudget: number;
	observationLogTailLimit: number;
};

function loadEnvFile(path: string): void {
	try {
		const text = readFileSync(path, 'utf8');
		for (const line of text.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const separatorIndex = trimmed.indexOf('=');
			if (separatorIndex <= 0) continue;
			const key = trimmed.slice(0, separatorIndex).trim();
			const value = trimmed
				.slice(separatorIndex + 1)
				.trim()
				.replace(/^['"]|['"]$/g, '');
			process.env[key] ??= value;
		}
	} catch {
		// Optional local env file.
	}
}

function loadLocalEnvFiles(): void {
	loadEnvFile(join(process.cwd(), '.env'));
	loadEnvFile(join(process.cwd(), '../../..', '.env'));
}

function readNumberEnv(name: string, fallback: number): number {
	const rawValue = process.env[name];
	if (!rawValue) return fallback;
	const value = Number(rawValue);
	return Number.isFinite(value) ? value : fallback;
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
	const rawValue = process.env[name]?.trim().toLowerCase();
	if (!rawValue) return fallback;
	return !['0', 'false', 'no', 'off'].includes(rawValue);
}

function withProviderCredentials(modelId: string): ModelConfig {
	if (modelId.startsWith('openai/')) {
		const apiKey = process.env.OPENAI_API_KEY ?? process.env.N8N_AI_OPENAI_API_KEY;
		return apiKey ? { id: modelId, apiKey } : { id: modelId };
	}

	if (modelId.startsWith('anthropic/')) {
		const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.N8N_AI_ANTHROPIC_KEY;
		return apiKey ? { id: modelId, apiKey } : { id: modelId };
	}

	return modelId;
}

function modelIdFromConfig(model: ModelConfig): string {
	return typeof model === 'string' ? model : 'id' in model ? model.id : 'custom-model';
}

function selectScenarios(): MemoryEvalScenario[] {
	const requestedIds = process.env.OM_GOLDEN_SCENARIOS?.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	if (!requestedIds?.length) return memoryGoldenScenarios;

	const scenariosById = new Map(memoryGoldenScenarios.map((scenario) => [scenario.id, scenario]));
	return requestedIds.map((id) => {
		const scenario = scenariosById.get(id);
		if (!scenario) {
			throw new Error(
				`Unknown scenario "${id}". Available scenarios: ${memoryGoldenScenarios
					.map((availableScenario) => availableScenario.id)
					.join(', ')}`,
			);
		}
		return scenario;
	});
}

function textFromMessages(messages: AgentMessage[]): string {
	return messages
		.flatMap((message) => (message.type === 'custom' ? [] : message.content))
		.filter(
			(content: MessageContent): content is { type: 'text'; text: string } =>
				content.type === 'text',
		)
		.map((content) => content.text)
		.join('\n');
}

function readConfig(): CliConfig {
	loadLocalEnvFiles();

	const model = withProviderCredentials(process.env.OM_GOLDEN_MODEL ?? 'openai/gpt-5.5');
	const modelId = modelIdFromConfig(model);
	const judgeEnabled = readBooleanEnv('OM_GOLDEN_JUDGE', true);
	const judgeModel = judgeEnabled
		? withProviderCredentials(process.env.OM_GOLDEN_JUDGE_MODEL ?? modelId)
		: undefined;
	const startedAt = new Date();

	return {
		model,
		modelId,
		judgeModel,
		judgeModelId: judgeModel ? modelIdFromConfig(judgeModel) : undefined,
		judgeEnabled,
		scenarios: selectScenarios(),
		outputDir:
			process.env.OM_GOLDEN_OUTPUT_DIR ??
			join('/private/tmp', `om-golden-${startedAt.toISOString().replace(/[:.]/g, '-')}`),
		concurrency: Math.max(1, Math.floor(readNumberEnv('OM_GOLDEN_CONCURRENCY', 1))),
		lastMessages: Math.max(1, Math.floor(readNumberEnv('OM_GOLDEN_LAST_MESSAGES', 12))),
		observerThresholdTokens: Math.max(
			1,
			Math.floor(readNumberEnv('OM_GOLDEN_OBSERVER_THRESHOLD_TOKENS', 600)),
		),
		reflectorThresholdTokens: Math.max(
			1,
			Math.floor(readNumberEnv('OM_GOLDEN_REFLECTOR_THRESHOLD_TOKENS', 8_000)),
		),
		renderTokenBudget: Math.max(
			1,
			Math.floor(readNumberEnv('OM_GOLDEN_RENDER_TOKEN_BUDGET', 4_000)),
		),
		observationLogTailLimit: Math.max(
			0,
			Math.floor(readNumberEnv('OM_GOLDEN_OBSERVATION_LOG_TAIL_LIMIT', 20)),
		),
	};
}

async function main(): Promise<void> {
	const config = readConfig();
	await mkdir(config.outputDir, { recursive: true });

	const judge =
		config.judgeModel === undefined
			? undefined
			: createMemoryJudge(async (prompt) => {
					const result = await generateText({
						model: createModel(config.judgeModel ?? config.model),
						prompt,
					});
					return result.text;
				});

	console.log('OM golden eval starting');
	console.log(`model=${config.modelId}`);
	console.log(`judgeModel=${config.judgeModelId ?? 'disabled'}`);
	console.log(`concurrency=${config.concurrency}`);
	console.log(`scenarios=${config.scenarios.map((scenario) => scenario.id).join(',')}`);
	console.log(
		`turns=${config.scenarios.reduce((sum, scenario) => sum + scenario.turns.length, 0)}`,
	);
	console.log(`outputDir=${config.outputDir}`);

	const suite = await runMemoryGoldenSuite({
		runId: `om-golden-${new Date().toISOString()}`,
		scenarios: config.scenarios,
		concurrency: config.concurrency,
		async createRuntime(scenario) {
			await Promise.resolve();
			const memory = new InMemoryMemory();
			const agent = new Agent(`om-golden-${scenario.id}`)
				.model(config.model)
				.instructions(
					[
						'You are a helpful, careful assistant participating in a memory quality evaluation.',
						'Answer naturally and use the conversation memory available in the system prompt.',
						'Be concise, but preserve exact names, identifiers, statuses, and decisions when asked.',
					].join(' '),
				)
				.memory(
					new Memory().storage(memory).lastMessages(config.lastMessages).observationalMemory({
						observerThresholdTokens: config.observerThresholdTokens,
						reflectorThresholdTokens: config.reflectorThresholdTokens,
						renderTokenBudget: config.renderTokenBudget,
						observationLogTailLimit: config.observationLogTailLimit,
					}),
				);

			const persistence = {
				threadId: `om-golden:${scenario.id}`,
				resourceId: `om-golden-resource:${scenario.id}`,
			};
			const scope = {
				scopeKind: 'thread' as const,
				scopeId: createObservationLogThreadScopeId(persistence.threadId, persistence.resourceId),
			};
			let turnCounter = 0;

			console.log(
				`scenario=${scenario.id} turns=${scenario.turns.length} starting at ${new Date().toISOString()}`,
			);

			return {
				judge,
				runtime: {
					async runUserTurn(input, context) {
						if (context.phase === 'conversation') {
							turnCounter += 1;
							if (
								turnCounter === 1 ||
								turnCounter % 5 === 0 ||
								turnCounter === scenario.turns.length
							) {
								console.log(`scenario=${scenario.id} turn=${turnCounter}/${scenario.turns.length}`);
							}
						} else {
							console.log(`scenario=${scenario.id} audit=${context.question?.id ?? 'question'}`);
						}

						const result = await agent.generate(input, { persistence });
						return textFromMessages(result.messages);
					},
					async flush() {
						console.log(`scenario=${scenario.id} flushing background memory jobs`);
						await agent.close();
					},
					async readObservations() {
						const observations = await memory.getObservationLog(scope);
						console.log(`scenario=${scenario.id} observations=${observations.length}`);
						return observations.map((observation) => ({
							id: observation.id,
							marker: observation.marker,
							text: observation.text,
							status: observation.status,
							parentId: observation.parentId,
							supersededBy: observation.supersededBy,
							createdAt: observation.createdAt.toISOString(),
						}));
					},
				},
			};
		},
	});

	await writeMemoryEvalArtifacts(suite, config.outputDir);

	console.log('OM golden eval finished');
	console.log(`overall=${suite.scorecard.overall.toFixed(4)}`);
	for (const score of suite.scorecard.scenarios) {
		console.log(`${score.scenarioId}=${score.overall.toFixed(4)}`);
	}
	console.log(`outputDir=${config.outputDir}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
