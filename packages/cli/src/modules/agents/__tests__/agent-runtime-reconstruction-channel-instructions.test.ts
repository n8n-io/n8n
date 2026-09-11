import type * as agents from '@n8n/agents';
import type { CredentialProvider } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import type { Logger, LockService } from '@n8n/backend-common';
import type {
	CustomFetch,
	HttpRequestClient,
	HttpTransport,
	OutboundHttp,
} from '@n8n/backend-network';
import type { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { EphemeralNodeExecutor } from '@/node-execution';
import type { OauthService } from '@/oauth/oauth.service';
import type { AiService } from '@/services/ai.service';
import type { CacheService } from '@/services/cache/cache.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentKnowledgeMirrorService } from '../agent-knowledge-mirror.service';
import { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import type { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
import type { AgentWorkspaceService } from '../agent-workspace.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentChatIntegration } from '../integrations/agent-chat-integration';
import { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import { TwilioVoiceIntegration } from '../integrations/platforms/twilio-voice-integration';
import type * as FromJsonConfig from '../json-config/from-json-config';
import type { ToolExecutor } from '../json-config/from-json-config';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';
import { SubAgentRunner } from '../sub-agents/sub-agent-runner';

const AGENT_INSTRUCTIONS = 'Be helpful';

// Mock buildFromJson so reconstruction doesn't try to actually build an agent;
// capture the config it receives so tests can assert on the instructions it was given.
const builtAgent = mock<agents.Agent>();
const buildFromJsonMock = vi.fn().mockImplementation(async () => builtAgent);
vi.mock('../json-config/from-json-config', async () => {
	const actual = await vi.importActual<typeof FromJsonConfig>('../json-config/from-json-config');
	return {
		...actual,
		buildFromJson: (...args: unknown[]) => buildFromJsonMock(...args),
	};
});

function makeAgentEntity(): Agent {
	const schema: AgentJsonConfig = {
		name: 'Test Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: AGENT_INSTRUCTIONS,
	};
	return { id: 'agent-1', projectId: 'project-1', schema } as unknown as Agent;
}

function makeService(): AgentRuntimeReconstructionService {
	const secureRuntime = mock<AgentSecureRuntime>();
	secureRuntime.createToolExecutor.mockReturnValue(mock<ToolExecutor>());
	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(vi.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);

	return new AgentRuntimeReconstructionService(
		mock<Logger>(),
		mock<AgentRepository>(),
		mock<AgentFileRepository>(),
		mock<ActiveExecutions>(),
		mock<WorkflowRepository>(),
		mock<N8NCheckpointStorage>(),
		secureRuntime,
		mock<EphemeralNodeExecutor>(),
		mock<N8nMemory>(),
		mock<OauthService>(),
		mock(),
		mock<AgentSandboxRuntimeService>(),
		mock<AiService>(),
		outboundHttp,
		mock<AgentWorkspaceService>(),
		mock<AgentKnowledgeMirrorService>(),
		mock<CredentialsFinderService>(),
		mock<WorkflowFinderService>(),
		mock<AgentChatAttachmentService>(),
	);
}

function makeTwilioVoiceIntegration(): TwilioVoiceIntegration {
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.requests.mockReturnValue(mock<HttpRequestClient>());
	return new TwilioVoiceIntegration(
		outboundHttp,
		mock<AgentRepository>(),
		mock<CacheService>(),
		mock<LockService>(),
		mock<Logger>(),
	);
}

function registerIntegration(integration: AgentChatIntegration): void {
	const registry = new ChatIntegrationRegistry();
	registry.register(integration);
	Container.set(ChatIntegrationRegistry, registry);
}

function instructionsPassedToBuildFromJson(): string {
	const [config] = buildFromJsonMock.mock.calls.at(-1) as [AgentJsonConfig];
	return config.instructions;
}

describe('AgentRuntimeReconstructionService — channel instructions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(SubAgentRunner, mock<SubAgentRunner>());
	});

	afterEach(() => {
		Container.reset();
	});

	it("appends the channel instructions of the run's integration to the system prompt", async () => {
		const twilio = makeTwilioVoiceIntegration();
		registerIntegration(twilio);

		await makeService().reconstructFromAgentEntity(
			makeAgentEntity(),
			mock<CredentialProvider>(),
			'production',
			'twilioVoice',
		);

		expect(instructionsPassedToBuildFromJson()).toBe(
			`${AGENT_INSTRUCTIONS}\n\n${twilio.channelInstructions}`,
		);
	});

	it('leaves the system prompt untouched for an integration that declares none', async () => {
		registerIntegration(
			mock<AgentChatIntegration>({ type: 'slack', channelInstructions: undefined }),
		);

		await makeService().reconstructFromAgentEntity(
			makeAgentEntity(),
			mock<CredentialProvider>(),
			'production',
			'slack',
		);

		expect(instructionsPassedToBuildFromJson()).toBe(AGENT_INSTRUCTIONS);
	});

	it('leaves the system prompt untouched for a run with no integration (in-app chat)', async () => {
		registerIntegration(makeTwilioVoiceIntegration());

		await makeService().reconstructFromAgentEntity(
			makeAgentEntity(),
			mock<CredentialProvider>(),
			'production',
		);

		expect(instructionsPassedToBuildFromJson()).toBe(AGENT_INSTRUCTIONS);
	});
});
