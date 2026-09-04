vi.mock('@n8n/instance-ai', () => ({
	extractText: vi.fn(),
}));

const { generateMock } = vi.hoisted(() => ({ generateMock: vi.fn() }));

// A plain class (not vi.fn().mockImplementation) so a global mock reset
// between tests cannot strip the chainable implementation.
vi.mock('@n8n/agents', () => ({
	Agent: class {
		model() {
			return this;
		}

		instructions() {
			return this;
		}

		async generate(...args: unknown[]) {
			return await generateMock(...args);
		}
	},
}));

vi.mock('@/modules/instance-ai/instance-ai-model.service', () => ({
	InstanceAiModelService: class {},
}));

import type { AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { extractText } from '@n8n/instance-ai';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { InstanceAiModelService } from '@/modules/instance-ai/instance-ai-model.service';

import type { AgentConfigService } from '../agent-config.service';
import { AgentToolMockService } from '../agent-tool-mock.service';

const extractTextMock = vi.mocked(extractText);
const resolveAgentModelConfigMock = vi.fn();

function respondWith(text: string) {
	generateMock.mockResolvedValue({});
	extractTextMock.mockReturnValue(text);
}

const agentId = 'agent-1';
const projectId = 'project-1';
const user = { id: 'user-1' } as never;

function makeAgentConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Support Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help users with their orders',
		tools: [
			{
				type: 'node',
				name: 'Gmail',
				description: 'Send email via Gmail',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 2,
					nodeParameters: { resource: 'message', operation: 'send' },
				},
			},
		],
		...overrides,
	} as AgentJsonConfig;
}

function makeService() {
	const agentConfigService = mock<AgentConfigService>();
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
	loadNodesAndCredentials.createOutputSchemaLookup.mockReturnValue(() => undefined);
	agentConfigService.updateConfig.mockImplementation(async (_id, _project, config) => ({
		config: config as AgentJsonConfig,
		updatedAt: '2026-01-01T00:00:00.000Z',
		versionId: 'version-2',
	}));

	const service = new AgentToolMockService(
		mockLogger(),
		agentConfigService,
		loadNodesAndCredentials,
	);
	return { service, agentConfigService, loadNodesAndCredentials };
}

beforeEach(() => {
	vi.clearAllMocks();
	Container.set(InstanceAiModelService, {
		resolveAgentModelConfig: resolveAgentModelConfigMock,
	} as unknown as InstanceAiModelService);
	resolveAgentModelConfigMock.mockResolvedValue({ id: 'anthropic/claude-sonnet-4-5' });
});

describe('AgentToolMockService', () => {
	it('generates mock items via the LLM and persists them through AgentConfigService', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeAgentConfig());
		respondWith(JSON.stringify({ Gmail: [{ json: { id: 'abc123', threadId: 'thread-1' } }] }));

		const result = await service.generateAndPersist(agentId, projectId, 'Gmail', user, 'user');

		expect(result.fallbackUsed).toBe(false);
		expect(result.toolName).toBe('Gmail');
		expect(result.mock).toEqual(
			expect.objectContaining({
				enabled: true,
				source: 'user',
				items: [{ id: 'abc123', threadId: 'thread-1' }],
			}),
		);
		expect(agentConfigService.updateConfig).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.objectContaining({
				tools: [
					expect.objectContaining({
						name: 'Gmail',
						mock: expect.objectContaining({ enabled: true, source: 'user' }),
					}),
				],
			}),
			user,
			{ modifiedBy: 'user' },
		);
	});

	it('falls back to a single empty item when the LLM call fails, without hard-failing', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeAgentConfig());
		generateMock.mockRejectedValue(new Error('model overloaded'));

		const result = await service.generateAndPersist(agentId, projectId, 'Gmail', user, 'builder');

		expect(result.fallbackUsed).toBe(true);
		expect(result.mock.items).toEqual([{}]);
		expect(result.mock.source).toBe('builder');
		expect(agentConfigService.updateConfig).toHaveBeenCalled();
	});

	it('derives placeholder fields from the resolved output schema on fallback', async () => {
		const { service, agentConfigService, loadNodesAndCredentials } = makeService();
		loadNodesAndCredentials.createOutputSchemaLookup.mockReturnValue(() => ({
			type: 'object',
			properties: { id: { type: 'integer' }, msg: { type: 'string' } },
		}));
		agentConfigService.getConfig.mockResolvedValue(makeAgentConfig());
		generateMock.mockRejectedValue(new Error('no api key configured'));

		const result = await service.generateAndPersist(agentId, projectId, 'Gmail', user, 'user');

		expect(result.fallbackUsed).toBe(true);
		expect(result.mock.items).toEqual([{ id: 0, msg: '' }]);
	});

	it('falls back when the LLM returns no items for the tool', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeAgentConfig());
		respondWith(JSON.stringify({ Gmail: [] }));

		const result = await service.generateAndPersist(agentId, projectId, 'Gmail', user, 'user');

		expect(result.fallbackUsed).toBe(true);
		expect(result.mock.items).toEqual([{}]);
	});

	it('resolves the generator model via the instance AI connection', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeAgentConfig());
		respondWith(JSON.stringify({ Gmail: [{ json: { id: 'abc123' } }] }));

		const result = await service.generateAndPersist(agentId, projectId, 'Gmail', user, 'user');

		expect(result.fallbackUsed).toBe(false);
		expect(resolveAgentModelConfigMock).toHaveBeenCalledWith(user);
	});

	it('falls back to placeholder items when the instance AI model cannot resolve', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeAgentConfig());
		resolveAgentModelConfigMock.mockRejectedValue(new Error('AI assistant proxy not configured'));

		const result = await service.generateAndPersist(agentId, projectId, 'Gmail', user, 'user');

		expect(result.fallbackUsed).toBe(true);
		expect(result.mock.items).toEqual([{}]);
		expect(generateMock).not.toHaveBeenCalled();
	});

	it('throws NotFoundError for an unknown tool name', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeAgentConfig());

		await expect(
			service.generateAndPersist(agentId, projectId, 'Missing Tool', user, 'user'),
		).rejects.toThrow(NotFoundError);
		expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
	});

	it('throws UserError when the generated items exceed the size cap, without persisting', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeAgentConfig());
		const hugeValue = 'x'.repeat(300 * 1024);
		respondWith(JSON.stringify({ Gmail: [{ json: { blob: hugeValue } }] }));

		await expect(
			service.generateAndPersist(agentId, projectId, 'Gmail', user, 'user'),
		).rejects.toThrow(UserError);
		expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
	});
});
