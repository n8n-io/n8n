import type { CredentialProvider, ResolvedCredential } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { CredentialsFinderService, OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { OauthService } from '@/oauth/oauth.service';
import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type { AiService } from '@/services/ai.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentKnowledgeMirrorService } from '../agent-knowledge-mirror.service';
import type { AgentRuntimeReconstructionService as AgentRuntimeReconstructionServiceType } from '../agent-runtime-reconstruction.service';
import { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import type { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
import type { AgentSecureRuntime } from '../agent-secure-runtime.service';
import type { AgentWorkspaceService } from '../agent-workspace.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { EphemeralNodeExecutor } from '../../../services/ephemeral-node-executor.service';
import type { N8nMemory } from '../../../services/memory.service';
import type { WorkflowRepository } from '@n8n/db';

function makeConfig(credential: string): AgentJsonConfig {
	return {
		name: 'Test agent',
		model: 'openai/gpt-5',
		instructions: 'You are a test agent.',
		credential,
		skills: [],
	} as AgentJsonConfig;
}

function makeService() {
	const secureRuntime = mock<AgentSecureRuntime>();
	secureRuntime.createToolExecutor.mockReturnValue({
		executeTool: vi.fn(),
		executeToMessage: vi.fn(),
	});
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue({
		asCustomFetch: () => vi.fn(),
	} as unknown as ReturnType<OutboundHttp['transport']>);
	const service = new AgentRuntimeReconstructionService(
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
		mock<McpRegistryService>(),
		mock<AgentSandboxRuntimeService>({ isEnabled: () => false }),
		mock<AiService>(),
		outboundHttp,
		mock<AgentWorkspaceService>(),
		mock<AgentKnowledgeMirrorService>(),
		mock<CredentialsFinderService>(),
		mock<WorkflowFinderService>(),
		mock<AgentChatAttachmentService>(),
		mock<CredentialsService>(),
	);
	return { service };
}

type CredentialProviderWithProbes = CredentialProvider & {
	isFreeAiCreditsCredential?: (id: string) => Promise<boolean>;
	resolveAiGatewayModelCredential?: (provider: string) => Promise<ResolvedCredential>;
};

function makeCredentialProvider(overrides?: {
	isFreeAiCreditsCredential?: (id: string) => Promise<boolean>;
}): CredentialProviderWithProbes {
	return {
		resolve: vi.fn().mockResolvedValue({ apiKey: 'real-key', url: 'https://api.openai.com/v1' }),
		list: vi.fn().mockResolvedValue([]),
		resolveAiGatewayModelCredential: vi
			.fn()
			.mockResolvedValue({ apiKey: 'jwt', url: 'https://gw.example/openai/v1' }),
		...overrides,
	};
}

describe('AgentRuntimeReconstructionService credential probes', () => {
	afterEach(() => {
		Container.reset();
	});

	async function reconstruct(
		service: AgentRuntimeReconstructionServiceType,
		config: AgentJsonConfig,
		credentialProvider: CredentialProviderWithProbes,
	) {
		return await service.reconstructFromResolvedSource({
			config,
			memoryOwnerAgentId: 'agent-1',
			projectId: 'project-1',
			credentialProvider,
			toolDescriptors: {},
			toolCodeByName: {},
			skills: {},
			runtimeProfile: 'inline',
			runType: 'test',
		});
	}

	it('marks the runtime when the model credential is the free-credits credential', async () => {
		const { service } = makeService();
		const credentialProvider = makeCredentialProvider({
			isFreeAiCreditsCredential: vi.fn().mockResolvedValue(true),
		});

		const runtime = await reconstruct(service, makeConfig('cred-1'), credentialProvider);

		expect(runtime.modelCredentialFreeAiCredits).toBe(true);
		expect(runtime.modelCredentialGatewayManaged).toBeUndefined();
		expect(credentialProvider.isFreeAiCreditsCredential).toHaveBeenCalledWith('cred-1');
	});

	it('does not mark an own-key runtime', async () => {
		const { service } = makeService();
		const credentialProvider = makeCredentialProvider({
			isFreeAiCreditsCredential: vi.fn().mockResolvedValue(false),
		});

		const runtime = await reconstruct(service, makeConfig('cred-1'), credentialProvider);

		expect(runtime.modelCredentialFreeAiCredits).toBeUndefined();
		expect(runtime.modelCredentialGatewayManaged).toBeUndefined();
	});

	it('fails open when the free-credits probe throws', async () => {
		const { service } = makeService();
		const credentialProvider = makeCredentialProvider({
			isFreeAiCreditsCredential: vi.fn().mockRejectedValue(new Error('db down')),
		});

		const runtime = await reconstruct(service, makeConfig('cred-1'), credentialProvider);

		expect(runtime.modelCredentialFreeAiCredits).toBeUndefined();
	});

	it('marks a gateway-managed runtime without consulting the free-credits probe', async () => {
		const { service } = makeService();
		const probe = vi.fn();
		const credentialProvider = makeCredentialProvider({
			isFreeAiCreditsCredential: probe,
		});

		const runtime = await reconstruct(
			service,
			makeConfig(AI_GATEWAY_MANAGED_TAG),
			credentialProvider,
		);

		expect(runtime.modelCredentialGatewayManaged).toBe(true);
		expect(runtime.modelCredentialFreeAiCredits).toBeUndefined();
		expect(probe).not.toHaveBeenCalled();
	});
});
