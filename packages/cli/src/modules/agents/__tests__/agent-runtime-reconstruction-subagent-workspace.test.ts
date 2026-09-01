import type * as agents from '@n8n/agents';
import type { CredentialProvider } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { CustomFetch, HttpTransport, OutboundHttp } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { EphemeralNodeExecutor } from '@/node-execution';
import type { OauthService } from '@/oauth/oauth.service';
import type { AiService } from '@/services/ai.service';
import type { UrlService } from '@/services/url.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowRepository } from '@n8n/db';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentKnowledgeMirrorService } from '../agent-knowledge-mirror.service';
import { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import type {
	AgentSandboxRuntime,
	AgentSandboxRuntimeService,
} from '../agent-sandbox-runtime.service';
import type { AgentWorkspaceService } from '../agent-workspace.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import type * as FromJsonConfig from '../json-config/from-json-config';
import type { ToolExecutor } from '../json-config/from-json-config';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

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

const config: AgentJsonConfig = {
	name: 'Child Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help with delegated work.',
};

function makeService() {
	const secureRuntime = mock<AgentSecureRuntime>();
	secureRuntime.createToolExecutor.mockReturnValue(mock<ToolExecutor>());
	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(vi.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);

	const sandboxRuntimeService = mock<AgentSandboxRuntimeService>();
	sandboxRuntimeService.isEnabled.mockReturnValue(true);
	const workspaceService = mock<AgentWorkspaceService>();
	const fileRepository = mock<AgentFileRepository>();
	fileRepository.hasFilesForAgent.mockResolvedValue(false);

	const service = new AgentRuntimeReconstructionService(
		mock<Logger>(),
		mock<AgentRepository>(),
		fileRepository,
		mock<ActiveExecutions>(),
		mock<WorkflowRepository>(),
		mock<UrlService>(),
		mock<N8NCheckpointStorage>(),
		secureRuntime,
		mock<EphemeralNodeExecutor>(),
		mock<N8nMemory>(),
		mock<OauthService>(),
		mock(),
		sandboxRuntimeService,
		mock<AiService>(),
		outboundHttp,
		workspaceService,
		mock<AgentKnowledgeMirrorService>(),
		mock<CredentialsFinderService>(),
		mock<WorkflowFinderService>(),
		mock<AgentChatAttachmentService>(),
	);

	return { service, workspaceService };
}

async function reconstructSubAgent(
	service: AgentRuntimeReconstructionService,
	parentWorkspace?: { handle: AgentSandboxRuntime; delegationThreadId: string },
) {
	return await service.reconstructFromResolvedSource({
		config,
		memoryOwnerAgentId: 'child-agent-1',
		projectId: 'project-1',
		credentialProvider: mock<CredentialProvider>(),
		toolDescriptors: {},
		toolCodeByName: {},
		skills: {},
		runtimeProfile: 'sub-agent',
		runType: 'production',
		...(parentWorkspace !== undefined ? { parentWorkspace } : {}),
	});
}

describe('AgentRuntimeReconstructionService — sub-agent workspace', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
	});

	it('attaches the parent-scoped workspace for sub-agent runs instead of acquiring a sandbox', async () => {
		const { service, workspaceService } = makeService();
		const handle = mock<AgentSandboxRuntime>();
		const delegatedWorkspace = mock<agents.Workspace>();
		workspaceService.getDelegatedAgentWorkspace.mockReturnValue(delegatedWorkspace);

		await reconstructSubAgent(service, { handle, delegationThreadId: 'thread-1' });

		expect(workspaceService.getDelegatedAgentWorkspace).toHaveBeenCalledWith(handle, 'thread-1');
		expect(workspaceService.getAgentWorkspace).not.toHaveBeenCalled();
		expect(builtAgent.workspace).toHaveBeenCalledWith(delegatedWorkspace);
	});

	it('attaches no workspace for sub-agent runs without a parent handle', async () => {
		const { service, workspaceService } = makeService();

		await reconstructSubAgent(service);

		expect(workspaceService.getDelegatedAgentWorkspace).not.toHaveBeenCalled();
		expect(workspaceService.getAgentWorkspace).not.toHaveBeenCalled();
		expect(builtAgent.workspace).not.toHaveBeenCalled();
	});
});
