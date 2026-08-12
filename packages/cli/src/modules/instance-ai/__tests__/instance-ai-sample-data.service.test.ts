import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'vitest-mock-extended';

vi.mock('../pin-data-generator', async (importOriginal) => ({
	// Keep PinDataDriftError real so the service's `instanceof` check is exercised
	// rather than mocked away — that check is the whole graceful-degradation path.
	...(await importOriginal<typeof import('../pin-data-generator')>()),
	generatePinData: vi.fn(),
}));

vi.mock('@n8n/instance-ai', () => ({
	createAgentFromModel: vi.fn(),
	extractText: vi.fn(),
	tokenUsageToBuilderUsageItems: vi.fn(),
}));

import { createAgentFromModel, extractText, tokenUsageToBuilderUsageItems } from '@n8n/instance-ai';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import type { InstanceAiCreditService } from '../instance-ai-credit.service';
import type { InstanceAiModelService } from '../instance-ai-model.service';
import { InstanceAiSampleDataService } from '../instance-ai-sample-data.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { generatePinData, PinDataDriftError } from '../pin-data-generator';

const generatePinDataMock = vi.mocked(generatePinData);
const createAgentFromModelMock = vi.mocked(createAgentFromModel);
const extractTextMock = vi.mocked(extractText);
const toUsageItemsMock = vi.mocked(tokenUsageToBuilderUsageItems);

const user = mock<User>({ id: 'user-1' });
const modelConfig = { id: 'anthropic/claude-sonnet-4-6' as const, url: '', apiKey: 'proxy-token' };
const outputSchemaLookup = vi.fn();

const workflow = {
	name: 'My workflow',
	nodes: [{ name: 'Slack Trigger', type: 'n8n-nodes-base.slackTrigger', typeVersion: 1 }],
	connections: {},
} as unknown as WorkflowJSON;

const pinData = { 'Slack Trigger': [{ json: { text: 'hello' } }] };

let modelService: InstanceAiModelService;
let settingsService: InstanceAiSettingsService;
let loadNodesAndCredentials: LoadNodesAndCredentials;
let creditService: InstanceAiCreditService;
let service: InstanceAiSampleDataService;
let agentGenerate: ReturnType<typeof vi.fn>;

function request(overrides: Partial<Parameters<typeof service.generateForNodes>[1]> = {}) {
	return { workflow, nodeNames: ['Slack Trigger'], ...overrides };
}

beforeEach(() => {
	vi.clearAllMocks();

	modelService = mock<InstanceAiModelService>();
	settingsService = mock<InstanceAiSettingsService>();
	loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
	creditService = mock<InstanceAiCreditService>();

	vi.mocked(settingsService.isModelConfigured).mockResolvedValue(true);
	vi.mocked(modelService.resolveAgentModelConfig).mockResolvedValue(modelConfig);
	vi.mocked(loadNodesAndCredentials.createOutputSchemaLookup).mockReturnValue(outputSchemaLookup);

	agentGenerate = vi.fn().mockResolvedValue({ usage: { promptTokens: 10 }, model: 'sonnet' });
	// Agent is a large concrete class; only `generate` is exercised here.
	createAgentFromModelMock.mockReturnValue({
		generate: agentGenerate,
	} as unknown as ReturnType<typeof createAgentFromModel>);
	extractTextMock.mockReturnValue('{}');
	toUsageItemsMock.mockReturnValue([
		{
			type: 'llmTokens',
			model: 'sonnet',
			uncachedInput: 10,
			cacheRead: 0,
			cacheWrite: 0,
			output: 5,
		},
	]);
	generatePinDataMock.mockResolvedValue(pinData);

	service = new InstanceAiSampleDataService(
		modelService,
		settingsService,
		loadNodesAndCredentials,
		creditService,
		mock<Logger>(),
	);
});

describe('InstanceAiSampleDataService', () => {
	it('returns the generated pin data', async () => {
		await expect(service.generateForNodes(user, request())).resolves.toEqual({ pinData });
	});

	it('runs on the model the instance resolves, not one from the environment', async () => {
		await service.generateForNodes(user, request());

		expect(createAgentFromModelMock).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ modelConfig }),
		);
	});

	it('passes the node output schema lookup to the generator', async () => {
		await service.generateForNodes(user, request());

		expect(generatePinDataMock).toHaveBeenCalledWith(
			expect.objectContaining({ workflow, nodeNames: ['Slack Trigger'], outputSchemaLookup }),
		);
	});

	// Not `testScenario`: that field is authoritative eval state the model must
	// reproduce exactly, which would fight a user steering the data's flavour.
	it('sends a hint as a data generation instruction', async () => {
		await service.generateForNodes(user, request({ hint: 'failed payment' }));

		expect(generatePinDataMock).toHaveBeenCalledWith(
			expect.objectContaining({ instructions: { dataDescription: 'failed payment' } }),
		);
	});

	it('omits instructions entirely when no hint is given', async () => {
		await service.generateForNodes(user, request());

		expect(generatePinDataMock).toHaveBeenCalledWith(
			expect.objectContaining({ instructions: undefined }),
		);
	});

	describe('field-name drift', () => {
		it('serves the drifted data with a warning rather than failing the request', async () => {
			generatePinDataMock.mockRejectedValue(
				new PinDataDriftError('drifted', pinData, [
					{ nodeName: 'Slack Trigger', unknownKeys: ['txt'], missingKeys: [], declaredKeys: [] },
				]),
			);

			await expect(service.generateForNodes(user, request())).resolves.toEqual({
				pinData,
				warning: 'field-drift',
			});
		});

		it('still propagates every other generation failure', async () => {
			generatePinDataMock.mockRejectedValue(new Error('model overloaded'));

			await expect(service.generateForNodes(user, request())).rejects.toThrow('model overloaded');
		});
	});

	describe('credit metering', () => {
		it('claims usage accumulated across every LLM call the generator makes', async () => {
			// The generator retries once on drift, so both calls must be billed.
			generatePinDataMock.mockImplementation(async (options) => {
				await options.generate?.('first prompt', {});
				await options.generate?.('retry prompt', {});
				return pinData;
			});

			await service.generateForNodes(user, request());

			expect(agentGenerate).toHaveBeenCalledTimes(2);
			expect(creditService.claimRunUsage).toHaveBeenCalledWith(
				user,
				expect.any(String),
				expect.any(String),
				expect.arrayContaining([expect.objectContaining({ type: 'llmTokens' })]),
				'completed',
			);
			expect(vi.mocked(creditService.claimRunUsage).mock.calls[0][3]).toHaveLength(2);
		});

		it('bills what was burned even when generation fails', async () => {
			generatePinDataMock.mockImplementation(async (options) => {
				await options.generate?.('first prompt', {});
				throw new Error('model overloaded');
			});

			await expect(service.generateForNodes(user, request())).rejects.toThrow('model overloaded');

			expect(creditService.claimRunUsage).toHaveBeenCalledWith(
				user,
				expect.any(String),
				expect.any(String),
				expect.any(Array),
				'errored',
			);
		});

		it('does not fail the request when the credit claim fails', async () => {
			vi.mocked(creditService.claimRunUsage).mockRejectedValue(new Error('billing down'));

			await expect(service.generateForNodes(user, request())).resolves.toEqual({ pinData });
		});
	});

	describe('when no model is configured', () => {
		beforeEach(() => {
			vi.mocked(settingsService.isModelConfigured).mockResolvedValue(false);
		});

		it('fails with a clear message instead of a provider auth error', async () => {
			await expect(service.generateForNodes(user, request())).rejects.toThrow(/not configured/i);
		});

		it('never reaches the generator', async () => {
			await expect(service.generateForNodes(user, request())).rejects.toThrow();

			expect(generatePinDataMock).not.toHaveBeenCalled();
		});
	});
});
