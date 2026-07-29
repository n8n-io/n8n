import type * as agents from '@n8n/agents';
import type { CredentialProvider } from '@n8n/agents';
import type { AgentJsonConfig, AgentJsonToolConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type {
	CustomFetch,
	HttpTransport,
	OutboundHttp,
	SsrfProtectionService,
} from '@n8n/backend-network';
import type { AgentsConfig, SsrfProtectionConfig } from '@n8n/config';
import type { CredentialsEntity, User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { EphemeralNodeExecutor } from '@/node-execution';
import type { OauthService } from '@/oauth/oauth.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { AiService } from '@/services/ai.service';
import type { UrlService } from '@/services/url.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import type { AgentKnowledgeSandboxService } from '../agent-knowledge-sandbox.service';
import type { Agent } from '../entities/agent.entity';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import type * as FromJsonConfig from '../json-config/from-json-config';
import type { ToolExecutor } from '../json-config/from-json-config';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';
import { SubAgentForegroundRunner } from '../sub-agents/sub-agent-foreground-runner';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

const projectId = 'project-1';
const userId = 'user-1';
const testUser = mock<User>({ id: userId });

const nodeToolWithCredential: Extract<AgentJsonToolConfig, { type: 'node' }> = {
	type: 'node',
	name: 'Send Slack message',
	node: {
		nodeType: 'n8n-nodes-base.slack',
		nodeTypeVersion: 1,
		nodeParameters: {},
		credentials: { slackApi: { id: 'cred-1', name: 'Prod Slack' } },
	},
};

const nodeToolWithoutCredential: Extract<AgentJsonToolConfig, { type: 'node' }> = {
	type: 'node',
	name: 'Get date',
	node: {
		nodeType: 'n8n-nodes-base.dateTime',
		nodeTypeVersion: 1,
		nodeParameters: {},
	},
};

const workflowTool: Extract<AgentJsonToolConfig, { type: 'workflow' }> = {
	type: 'workflow',
	workflow: 'Lookup customer',
};

const customTool: Extract<AgentJsonToolConfig, { type: 'custom' }> = {
	type: 'custom',
	id: 'custom_tool',
};

// Mock buildFromJson so reconstruction doesn't try to actually build an agent;
// capture the config it receives so tests can assert on which tool refs survived filtering.
const builtAgent = mock<agents.Agent>();
builtAgent.hasCheckpointStorage.mockReturnValue(true);
const buildFromJsonMock = vi.fn().mockImplementation(async () => builtAgent);
vi.mock('../json-config/from-json-config', async () => {
	const actual = await vi.importActual<typeof FromJsonConfig>('../json-config/from-json-config');
	return {
		...actual,
		buildFromJson: (...args: unknown[]) => buildFromJsonMock(...args),
	};
});

function makeAgentEntity(tools: AgentJsonToolConfig[]): Agent {
	const schema: AgentJsonConfig = {
		name: 'Test Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Be helpful',
		tools,
	};
	return {
		id: 'agent-1',
		projectId,
		schema,
		tools: { custom_tool: { descriptor: { name: 'custom_tool' }, code: '' } },
	} as unknown as Agent;
}

function makeService(overrides: {
	credentialsFinderService?: ReturnType<typeof mock<CredentialsFinderService>>;
	workflowFinderService?: ReturnType<typeof mock<WorkflowFinderService>>;
	workflowRepository?: ReturnType<typeof mock<WorkflowRepository>>;
}) {
	const secureRuntime = mock<AgentSecureRuntime>();
	secureRuntime.createToolExecutor.mockReturnValue(mock<ToolExecutor>());
	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(vi.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);

	const credentialsFinderService =
		overrides.credentialsFinderService ?? mock<CredentialsFinderService>();
	const workflowFinderService = overrides.workflowFinderService ?? mock<WorkflowFinderService>();
	const workflowRepository = overrides.workflowRepository ?? mock<WorkflowRepository>();

	const service = new AgentRuntimeReconstructionService(
		mock<Logger>(),
		mock<AgentRepository>(),
		mock<AgentFileRepository>(),
		mock<ActiveExecutions>(),
		workflowRepository,
		mock<UrlService>(),
		mock<N8NCheckpointStorage>(),
		secureRuntime,
		mock<EphemeralNodeExecutor>(),
		mock<N8nMemory>(),
		mock<OauthService>(),
		{ modules: [] } as unknown as AgentsConfig,
		mock<AiService>(),
		outboundHttp,
		mock<AgentKnowledgeSandboxService>(),
		mock<SsrfProtectionConfig>({ enabled: true }),
		mock<SsrfProtectionService>(),
		credentialsFinderService,
		workflowFinderService,
	);

	return { service, credentialsFinderService, workflowFinderService, workflowRepository };
}

function toolNamesPassedToBuildFromJson(): string[] {
	const [config] = buildFromJsonMock.mock.calls.at(-1) as [AgentJsonConfig];
	return (config.tools ?? []).map((ref) =>
		ref.type === 'custom' ? ref.id : ref.type === 'workflow' ? ref.workflow : ref.name,
	);
}

describe('AgentRuntimeReconstructionService — per-user tool filtering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
		Container.set(SubAgentForegroundRunner, mock<SubAgentForegroundRunner>());
	});

	afterEach(() => {
		Container.reset();
	});

	it('does not filter tools when no user is supplied (published/integration runs)', async () => {
		const { service } = makeService({});
		const entity = makeAgentEntity([nodeToolWithCredential, workflowTool, customTool]);
		const credentialProvider = mock<CredentialProvider>();

		await service.reconstructFromAgentEntity(entity, credentialProvider);

		expect(userHasScopes).not.toHaveBeenCalled();
		expect(toolNamesPassedToBuildFromJson()).toEqual(
			expect.arrayContaining(['Send Slack message', 'Lookup customer', 'custom_tool']),
		);
	});

	it('drops node and workflow tools for a user without workflow:execute, keeps custom tools', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(false);
		const { service } = makeService({});
		const entity = makeAgentEntity([nodeToolWithCredential, workflowTool, customTool]);
		const credentialProvider = mock<CredentialProvider>();

		await service.reconstructFromAgentEntity(entity, credentialProvider, undefined, testUser);

		expect(userHasScopes).toHaveBeenCalledWith(testUser, ['workflow:execute'], false, {
			projectId,
		});
		expect(toolNamesPassedToBuildFromJson()).toEqual(['custom_tool']);
	});

	it('drops a node tool when the user lacks credential:read on a baked credential', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(true);
		const credentialsFinderService = mock<CredentialsFinderService>();
		credentialsFinderService.findCredentialForUser.mockResolvedValue(null);
		const { service } = makeService({ credentialsFinderService });
		const entity = makeAgentEntity([nodeToolWithCredential, nodeToolWithoutCredential]);
		const credentialProvider = mock<CredentialProvider>();

		await service.reconstructFromAgentEntity(entity, credentialProvider, undefined, testUser);

		expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
			'cred-1',
			testUser,
			['credential:read'],
		);
		expect(toolNamesPassedToBuildFromJson()).toEqual(['Get date']);
	});

	it('drops a workflow tool the user cannot access, keeps one they can', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(true);
		const workflowRepository = mock<WorkflowRepository>();
		workflowRepository.findOne.mockResolvedValue(mock<WorkflowEntity>({ id: 'wf-1' }));
		const workflowFinderService = mock<WorkflowFinderService>();
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);
		const { service } = makeService({ workflowRepository, workflowFinderService });
		const entity = makeAgentEntity([workflowTool]);
		const credentialProvider = mock<CredentialProvider>();

		await service.reconstructFromAgentEntity(entity, credentialProvider, undefined, testUser);

		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', testUser, [
			'workflow:execute',
		]);
		expect(toolNamesPassedToBuildFromJson()).toEqual([]);
	});

	it('keeps node and workflow tools for a fully-privileged user', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(true);
		const credentialsFinderService = mock<CredentialsFinderService>();
		credentialsFinderService.findCredentialForUser.mockResolvedValue(
			mock<CredentialsEntity>({ id: 'cred-1' }),
		);
		const workflowRepository = mock<WorkflowRepository>();
		workflowRepository.findOne.mockResolvedValue(mock<WorkflowEntity>({ id: 'wf-1' }));
		const workflowFinderService = mock<WorkflowFinderService>();
		workflowFinderService.findWorkflowForUser.mockResolvedValue(
			mock<Awaited<ReturnType<WorkflowFinderService['findWorkflowForUser']>>>({ id: 'wf-1' }),
		);
		const { service } = makeService({
			credentialsFinderService,
			workflowFinderService,
			workflowRepository,
		});
		const entity = makeAgentEntity([nodeToolWithCredential, workflowTool, customTool]);
		const credentialProvider = mock<CredentialProvider>();

		await service.reconstructFromAgentEntity(entity, credentialProvider, undefined, testUser);

		expect(toolNamesPassedToBuildFromJson()).toEqual(
			expect.arrayContaining(['Send Slack message', 'Lookup customer', 'custom_tool']),
		);
	});
});

describe('AgentRuntimeReconstructionService.reconstructFromResolvedSource — per-user tool filtering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
		Container.set(SubAgentForegroundRunner, mock<SubAgentForegroundRunner>());
	});

	afterEach(() => {
		Container.reset();
	});

	function makeResolvedSourceConfig(tools: AgentJsonToolConfig[]): AgentJsonConfig {
		return {
			name: 'Child Agent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Be helpful',
			tools,
		};
	}

	it('filters sub-agent tools by the delegating user access when a user is present', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(false);
		const { service } = makeService({});
		const config = makeResolvedSourceConfig([nodeToolWithCredential, workflowTool, customTool]);

		await service.reconstructFromResolvedSource({
			config,
			memoryOwnerAgentId: 'child-1',
			projectId,
			credentialProvider: mock<CredentialProvider>(),
			toolDescriptors: {},
			toolCodeByName: {},
			skills: {},
			runtimeProfile: 'sub-agent',
			user: testUser,
		});

		expect(userHasScopes).toHaveBeenCalledWith(testUser, ['workflow:execute'], false, {
			projectId,
		});
		expect(toolNamesPassedToBuildFromJson()).toEqual(['custom_tool']);
	});

	it('does not filter sub-agent tools when no user is present (published/integration parents)', async () => {
		const { service } = makeService({});
		const config = makeResolvedSourceConfig([nodeToolWithCredential, workflowTool, customTool]);

		await service.reconstructFromResolvedSource({
			config,
			memoryOwnerAgentId: 'child-1',
			projectId,
			credentialProvider: mock<CredentialProvider>(),
			toolDescriptors: {},
			toolCodeByName: {},
			skills: {},
			runtimeProfile: 'sub-agent',
		});

		expect(userHasScopes).not.toHaveBeenCalled();
		expect(toolNamesPassedToBuildFromJson()).toEqual(
			expect.arrayContaining(['Send Slack message', 'Lookup customer', 'custom_tool']),
		);
	});
});
