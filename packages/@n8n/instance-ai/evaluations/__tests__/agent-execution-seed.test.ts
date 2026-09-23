import type { InstanceAiEvalAgentExecutionResult } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { executeAgentScenario } from '../harness/agent-execution';
import type { EvalLogger } from '../harness/logger';
import { reseedScenarioTables } from '../harness/seed-tables';

vi.mock('../harness/seed-tables', async (importOriginal) => ({
	...(await importOriginal<typeof import('../harness/seed-tables')>()),
	reseedScenarioTables: vi.fn(),
}));
vi.mock('../harness/scenario-execution', async (importOriginal) => ({
	...(await importOriginal<typeof import('../harness/scenario-execution')>()),
	writeScenarioVerificationSnapshot: vi.fn(),
}));
vi.mock('../checklist/verifier', () => ({
	verifyChecklist: vi.fn().mockResolvedValue({
		results: [{ id: 1, pass: true, reasoning: 'ok' }],
		attempts: [],
	}),
}));

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

const scenario = {
	name: 'known-customer',
	description: 'A known customer is looked up.',
	dataSetup: 'The Customers table contains Ada.',
	successCriteria: 'The agent finds Ada.',
	seedDataTables: [
		{
			id: 'seed-table-1',
			name: 'Customers',
			columns: [{ name: 'email', type: 'string' as const }],
			rows: [{ email: 'ada@example.com' }],
		},
	],
};

const agentRun = {
	runId: 'run-1',
	success: true,
	errors: [],
	finalText: 'Found Ada.',
	model: 'openai/gpt-5-mini',
	finishReason: 'stop',
	toolCalls: [],
	modelTurns: [],
	seed: {
		openingMessage: 'From ada@example.com: help',
		globalContext: '',
		toolHints: {},
		warnings: [],
	},
	skippedFeatures: [],
} as unknown as InstanceAiEvalAgentExecutionResult;

function clientRecording(calls: string[]): N8nClient {
	return {
		getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
		executeAgentWithLlmMock: vi.fn().mockImplementation(async () => {
			calls.push('execute');
			return agentRun;
		}),
	} as unknown as N8nClient;
}

describe('executeAgentScenario', () => {
	beforeEach(() => {
		vi.mocked(reseedScenarioTables).mockReset();
	});

	it('seeds the scenario rows before the agent runs when a seed context is given', async () => {
		const calls: string[] = [];
		vi.mocked(reseedScenarioTables).mockImplementation(async () => {
			calls.push('reseed');
		});
		const client = clientRecording(calls);
		const seedContext = { threadId: 'thread-1', tableIdsByName: { Customers: 'dt-real-1' } };

		const result = await executeAgentScenario(
			client,
			'agent-1',
			scenario,
			'AGENT CONTEXT',
			silentLogger,
			10_000,
			'case-a',
			undefined,
			undefined,
			seedContext,
		);

		expect(reseedScenarioTables).toHaveBeenCalledWith(
			client,
			scenario,
			'thread-1',
			{ Customers: 'dt-real-1' },
			silentLogger,
		);
		expect(calls).toEqual(['reseed', 'execute']);
		expect(result.success).toBe(true);
	});

	it('leaves the tables alone when no seed context is given', async () => {
		const calls: string[] = [];
		const client = clientRecording(calls);

		await executeAgentScenario(client, 'agent-1', scenario, 'AGENT CONTEXT', silentLogger, 10_000);

		expect(reseedScenarioTables).not.toHaveBeenCalled();
		expect(calls).toEqual(['execute']);
	});
});
