vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: vi.fn(),
	extractText: vi.fn(),
}));

const { agentModelGenerateMock } = vi.hoisted(() => ({ agentModelGenerateMock: vi.fn() }));

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
			return await agentModelGenerateMock(...args);
		}
	},
}));

vi.mock('../json-config/model-config', () => ({
	resolveCredentialAwareModelConfig: vi.fn(),
}));

vi.mock('../utils/agent-credential-provider', () => ({
	createAgentCredentialProvider: vi.fn(),
}));

import type { AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { createEvalAgent, extractText } from '@n8n/instance-ai';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import type { AgentConfigService } from '../agent-config.service';
import { AgentToolMockService } from '../agent-tool-mock.service';
import { resolveCredentialAwareModelConfig } from '../json-config/model-config';

const createEvalAgentMock = vi.mocked(createEvalAgent);
const extractTextMock = vi.mocked(extractText);
const resolveCredentialAwareModelConfigMock = vi.mocked(resolveCredentialAwareModelConfig);
const generateMock = vi.fn();

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
		mock<CredentialsService>(),
	);
	return { service, agentConfigService, loadNodesAndCredentials };
}

beforeEach(() => {
	vi.clearAllMocks();
	createEvalAgentMock.mockReturnValue({ generate: generateMock } as unknown as ReturnType<
		typeof createEvalAgent
	>);
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

	it("generates with the agent's own model when a credential is configured (gateway deployments)", async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(
			makeAgentConfig({ credential: '__AI_GATEWAY_MANAGED__' }),
		);
		const modelConfig = { id: 'anthropic/claude-sonnet-4-5', apiKey: 'gateway-token' };
		resolveCredentialAwareModelConfigMock.mockResolvedValue(modelConfig as never);
		agentModelGenerateMock.mockResolvedValue({});
		extractTextMock.mockReturnValue(JSON.stringify({ Gmail: [{ json: { id: 'abc123' } }] }));

		const result = await service.generateAndPersist(agentId, projectId, 'Gmail', user, 'user');

		expect(result.fallbackUsed).toBe(false);
		expect(result.mock.items).toEqual([{ id: 'abc123' }]);
		expect(resolveCredentialAwareModelConfigMock).toHaveBeenCalledWith(
			'anthropic/claude-sonnet-4-5',
			'__AI_GATEWAY_MANAGED__',
			undefined,
			undefined,
		);
		expect(agentModelGenerateMock).toHaveBeenCalled();
		expect(createEvalAgentMock).not.toHaveBeenCalled();
	});

	it('falls back to the instance AI lane when the agent model cannot resolve', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig.mockResolvedValue(makeAgentConfig({ credential: 'credential-1' }));
		resolveCredentialAwareModelConfigMock.mockRejectedValue(new Error('credential not found'));
		respondWith(JSON.stringify({ Gmail: [{ json: { id: 'env-lane' } }] }));

		const result = await service.generateAndPersist(agentId, projectId, 'Gmail', user, 'user');

		expect(result.fallbackUsed).toBe(false);
		expect(result.mock.items).toEqual([{ id: 'env-lane' }]);
		expect(createEvalAgentMock).toHaveBeenCalled();
		expect(agentModelGenerateMock).not.toHaveBeenCalled();
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
