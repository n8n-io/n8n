import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import type { User } from '@n8n/db';
import type { InstanceAiCredentialService } from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { AgentContextService } from '@/modules/agents/agent-context.service';
import type { AgentDraftService } from '@/modules/agents/agent-draft.service';
import type { AgentsBuilderService } from '@/modules/agents/builder/agents-builder.service';
import { builderTelemetrySessionProperties } from '@/modules/agents/builder/builder-session';
import type { Telemetry } from '@/telemetry';

import { InstanceAiBuilderDelegateAdapterService } from '../instance-ai-builder-delegate.adapter';

vi.mock('@/modules/agents/builder/agents-builder.service', () => ({
	AgentsBuilderService: class AgentsBuilderService {},
}));
vi.mock('@/modules/agents/agent-draft.service', () => ({
	AgentDraftService: class AgentDraftService {},
}));
vi.mock('@/modules/agents/agent-context.service', () => ({
	AgentContextService: class AgentContextService {},
}));

function setup(options: { useEvalModelCatalog?: boolean } = {}) {
	const builder = mock<AgentsBuilderService>();
	const drafts = mock<AgentDraftService>();
	const context = mock<AgentContextService>();
	const telemetry = mock<Telemetry>();
	const user = mock<User>({ id: 'user-1' });
	const providerFor = vi.fn(() => mock<CredentialProvider>());
	const credentials = mock<InstanceAiCredentialService>();
	const service = new InstanceAiBuilderDelegateAdapterService(builder, drafts, context, telemetry);
	const delegate = service.createDelegate(user, 'project-1', providerFor, credentials, options);
	return { builder, drafts, context, telemetry, user, providerFor, credentials, service, delegate };
}

describe('InstanceAiBuilderDelegateAdapterService', () => {
	it('passes direct tools and host telemetry to the Agent-owned builder', () => {
		const { builder, telemetry, delegate, user, providerFor, credentials } = setup({
			useEvalModelCatalog: true,
		});
		const tools = [mock<BuiltTool>({ name: 'agent_builder_write_config' })];
		builder.getTools.mockReturnValue(tools);
		const resolve = vi.fn(async () => 'agent-1');

		expect(delegate.getBuilderTools(resolve, { threadId: 'thread-1', runId: 'run-1' })).toBe(tools);
		expect(builder.getTools).toHaveBeenCalledWith(
			user,
			'project-1',
			resolve,
			providerFor,
			credentials,
			{
				useEvalModelCatalog: true,
				session: { threadId: 'thread-1', runId: 'run-1' },
				track: expect.any(Function),
			},
		);
		const options = builder.getTools.mock.calls[0][5];
		options?.track?.(TELEMETRY_EVENT.AGENTS.BUILDER_REQUESTED_CREDENTIAL, {
			agent_id: 'agent-1',
			user_id: 'user-1',
		});
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.BUILDER_REQUESTED_CREDENTIAL,
			{ agent_id: 'agent-1', user_id: 'user-1', thread_id: 'thread-1', run_id: 'run-1' },
		);
	});

	it.each([undefined, { id: 'agent-1', adoptOnCollision: true }])(
		'forwards creation attribution, draft attestation, and the persisted name: %j',
		async (createOptions) => {
			const { delegate, drafts, user } = setup();
			const saved = {
				agentId: 'agent-1',
				projectId: 'project-1',
				name: 'Saved name',
				adopted: createOptions?.adoptOnCollision ?? false,
			};
			drafts.createDraft.mockResolvedValue(saved);

			await expect(delegate.createAgent('Draft name', createOptions)).resolves.toEqual(saved);
			expect(drafts.createDraft).toHaveBeenCalledWith(user, 'project-1', 'Draft name', {
				...createOptions,
				createdBy: 'builder',
			});
		},
	);

	it('creates the agent inside the Assistant session, so the creation event carries it', async () => {
		const { delegate, drafts, user } = setup();
		let sessionDuringCreate: ReturnType<typeof builderTelemetrySessionProperties> = {};
		drafts.createDraft.mockImplementation(async () => {
			sessionDuringCreate = builderTelemetrySessionProperties();
			return { agentId: 'agent-1', projectId: 'project-1', name: 'Draft name', adopted: false };
		});

		await delegate.createAgent('Draft name', {
			session: { threadId: 'thread-1', runId: 'run-1' },
		});

		expect(drafts.createDraft).toHaveBeenCalledWith(user, 'project-1', 'Draft name', {
			createdBy: 'builder',
		});
		expect(sessionDuringCreate).toEqual({ thread_id: 'thread-1', run_id: 'run-1' });
		expect(builderTelemetrySessionProperties()).toEqual({});
	});

	it('keeps the Assistant thread prefix out of the Agent-owned cleanup operation', async () => {
		const { builder, service } = setup();

		await service.deleteBuilderSessions('thread-1');

		expect(builder.deleteBuilderSessions).toHaveBeenCalledWith('ia-builder:thread-1:');
	});
});
