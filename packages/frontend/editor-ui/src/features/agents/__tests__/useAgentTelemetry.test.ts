import { AGENTS_N8N_CHAT_FLAG } from '@n8n/api-types';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { usePostHog } from '@/app/stores/posthog.store';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';

const trackMock = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ pushRef: 'session-xyz' }),
}));

describe('useAgentTelemetry', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		trackMock.mockReset();
	});

	it.each(['build', 'sessions', 'knowledge', 'settings'] as const)(
		'tracks the %s tab with editor context',
		(name) => {
			useAgentTelemetry().trackClickedAgentsTab({ agentId: 'ag-1', name });
			expect(trackMock).toHaveBeenCalledExactlyOnceWith(
				TELEMETRY_EVENT.AGENTS.USER_CLICKED_AGENTS_TAB,
				{ agent_id: 'ag-1', session_id: 'session-xyz', name },
			);
		},
	);

	it('tracks knowledge upload with only editor context', () => {
		useAgentTelemetry().trackClickedKnowledgeUpload({ agentId: 'ag-1' });
		expect(trackMock).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_KNOWLEDGE_UPLOAD,
			{ agent_id: 'ag-1', session_id: 'session-xyz' },
		);
	});

	it.each([
		'user',
		'agent',
		'skill',
		'tool',
		'node',
		'workflow',
		'execution-error',
		'suspension',
		'hitl-response',
		'background-task-signal',
	] as const)('tracks %s trace selection without trace content', (itemType) => {
		useAgentTelemetry().trackClickedTraceItem({ agentId: 'ag-1', itemType });
		expect(trackMock).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_TRACE_ITEM,
			{ agent_id: 'ag-1', session_id: 'session-xyz', item_type: itemType },
		);
	});

	it('tracks changed filter names without values', () => {
		useAgentTelemetry().trackAppliedSessionFilter({
			agentId: 'ag-1',
			filterNames: ['status', 'origin', 'start_date', 'end_date'],
		});
		expect(trackMock).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_APPLIED_SESSION_FILTER,
			{
				agent_id: 'ag-1',
				session_id: 'session-xyz',
				filter_names: ['status', 'origin', 'start_date', 'end_date'],
			},
		);
	});

	it.each(['test-panel', 'shortcut', 'standalone'] as const)(
		'tracks a new test chat from %s',
		(source) => {
			useAgentTelemetry().trackClickedNewTestChat({ agentId: 'ag-1', source });
			expect(trackMock).toHaveBeenCalledExactlyOnceWith(
				TELEMETRY_EVENT.AGENTS.USER_CLICKED_NEW_TEST_CHAT_ICON_FROM_TEST_PANEL,
				{ agent_id: 'ag-1', session_id: 'session-xyz', source },
			);
		},
	);

	it('tracks opening the preview More menu', () => {
		useAgentTelemetry().trackClickedPreviewMoreOptions({ agentId: 'ag-1' });
		expect(trackMock).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_MORE_OPTIONS_FROM_TEST_PANEL,
			{ agent_id: 'ag-1', session_id: 'session-xyz' },
		);
	});

	it.each([
		'copy-link',
		'copy-conversation',
		'open-in-new-tab',
		'toggle-full-width',
		'export-session',
		'delete-session',
	] as const)('tracks the %s preview More action', (option) => {
		useAgentTelemetry().trackClickedPreviewMoreOption({ agentId: 'ag-1', option });
		expect(trackMock).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_AN_OPTION_FROM_MORE_LIST,
			{ agent_id: 'ag-1', session_id: 'session-xyz', option },
		);
	});

	it('trackClickedNewAgent fires event with source, minted agent_id and session_id', () => {
		useAgentTelemetry().trackClickedNewAgent('button', 'aBcDeFgHiJkLmNoP');
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_CLICKED_NEW_AGENT, {
			source: 'button',
			agent_id: 'aBcDeFgHiJkLmNoP',
			session_id: 'session-xyz',
		});
	});

	it.each([
		{
			method: 'trackRevertedChangesOnAgent',
			event: TELEMETRY_EVENT.AGENTS.USER_REVERTED_CHANGES_ON_AGENT,
		},
		{
			method: 'trackClickedTraceDetailsFromTestPanel',
			event: TELEMETRY_EVENT.AGENTS.USER_CLICKED_TRACE_DETAILS_FROM_TEST_PANEL,
		},
	] as const)(
		'$method sends only agent and editor session ids and stays best-effort',
		({ method, event }) => {
			const track = useAgentTelemetry()[method];
			track({ agentId: 'agent-1' });

			expect(trackMock).toHaveBeenCalledExactlyOnceWith(event, {
				agent_id: 'agent-1',
				session_id: 'session-xyz',
			});
			trackMock.mockImplementationOnce(() => {
				throw new Error('telemetry unavailable');
			});
			expect(() => track({ agentId: 'agent-1' })).not.toThrow();
		},
	);

	it('trackClickedNewAgent tracks card source', () => {
		useAgentTelemetry().trackClickedNewAgent('card', 'aBcDeFgHiJkLmNoP');
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_CLICKED_NEW_AGENT, {
			source: 'card',
			agent_id: 'aBcDeFgHiJkLmNoP',
			session_id: 'session-xyz',
		});
	});

	it('trackClickedNewAgent records an empty-state template id', () => {
		useAgentTelemetry().trackClickedNewAgent(
			'empty_state_template',
			'aBcDeFgHiJkLmNoP',
			'morning-news-brief',
		);
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_CLICKED_NEW_AGENT, {
			source: 'empty_state_template',
			agent_id: 'aBcDeFgHiJkLmNoP',
			template_id: 'morning-news-brief',
			session_id: 'session-xyz',
		});
	});

	it('trackClickedNewAgent records create blank without a template id', () => {
		useAgentTelemetry().trackClickedNewAgent('empty_state_blank', 'aBcDeFgHiJkLmNoP');
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_CLICKED_NEW_AGENT, {
			source: 'empty_state_blank',
			agent_id: 'aBcDeFgHiJkLmNoP',
			session_id: 'session-xyz',
		});
	});

	it('trackSubmittedMessage includes mode, status, agent_config (no raw message)', () => {
		const fingerprint = {
			instructions: 'hello',
			tools: ['a'],
			skills: [],
			tasks: [],
			triggers: [],
			vector_stores: [],
			memory: null,
			model: 'gpt-4',
			config_version: 'v1',
		};
		useAgentTelemetry().trackSubmittedMessage({
			agentId: 'ag-1',
			status: 'draft',
			agentConfig: fingerprint,
		});
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_SUBMITTED_MESSAGE_TO_AGENT, {
			agent_id: 'ag-1',
			mode: 'test',
			status: 'draft',
			agent_config: fingerprint,
			session_id: 'session-xyz',
		});
	});

	it('trackAddedTrigger fires with trigger_type, triggers list, config_version and status', () => {
		useAgentTelemetry().trackAddedTrigger({
			agentId: 'ag-1',
			triggerType: 'slack',
			triggers: ['slack', 'telegram'],
			configVersion: 'v4',
			status: 'draft',
		});
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_ADDED_TRIGGER_TO_AGENT, {
			agent_id: 'ag-1',
			trigger_type: 'slack',
			triggers: ['slack', 'telegram'],
			config_version: 'v4',
			status: 'draft',
			session_id: 'session-xyz',
		});
	});

	it('trackOpenedToolFromList fires with agent_id and tool_type', () => {
		useAgentTelemetry().trackOpenedToolFromList({ agentId: 'ag-1', toolType: 'node' });
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_OPENED_AGENT_TOOL, {
			agent_id: 'ag-1',
			tool_type: 'node',
			session_id: 'session-xyz',
		});
	});

	it('trackOpenedSkillFromList fires with agent_id and skill_id', () => {
		useAgentTelemetry().trackOpenedSkillFromList({ agentId: 'ag-1', skillId: 'skill-42' });
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_OPENED_AGENT_SKILL, {
			agent_id: 'ag-1',
			skill_id: 'skill-42',
			session_id: 'session-xyz',
		});
	});

	it('trackOpenedAddSkillModal fires with agent_id', () => {
		useAgentTelemetry().trackOpenedAddSkillModal({ agentId: 'ag-1' });
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_OPENED_ADD_SKILL_MODAL, {
			agent_id: 'ag-1',
			session_id: 'session-xyz',
		});
	});

	it('trackDuplicatedAgent fires "User duplicated agent" with source, new and project ids', () => {
		useAgentTelemetry().trackDuplicatedAgent({
			sourceAgentId: 'agent-1',
			agentId: 'agent-2',
			projectId: 'project-1',
		});
		expect(trackMock).toHaveBeenCalledWith('User duplicated agent', {
			source_agent_id: 'agent-1',
			agent_id: 'agent-2',
			project_id: 'project-1',
			session_id: 'session-xyz',
		});
	});

	it('trackDuplicatedAgent swallows a telemetry failure so it never breaks the duplicate path', () => {
		// A RudderStack failure surfaced to the duplicate-confirm critical path
		// would misreport a successful duplicate as failed. The wrapper must
		// swallow, mirroring `safeTrack` for the registered events.
		trackMock.mockImplementation(() => {
			throw new Error('rudderstack down');
		});
		expect(() =>
			useAgentTelemetry().trackDuplicatedAgent({
				sourceAgentId: 'agent-1',
				agentId: 'agent-2',
				projectId: 'project-1',
			}),
		).not.toThrow();
	});

	it('trackSelectedN8nChatAgent fires with agent_id, source, and the current flag variant', () => {
		usePostHog().overrides = { [AGENTS_N8N_CHAT_FLAG]: { value: 'variant-a' } };

		useAgentTelemetry().trackSelectedN8nChatAgent({ agentId: 'agent-1', source: 'library' });

		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_SELECTED_N8N_CHAT_AGENT, {
			agent_id: 'agent-1',
			source: 'library',
			variant: 'variant-a',
			session_id: 'session-xyz',
		});
	});

	it('trackSelectedN8nChatAgent reports a null variant when the user has no flag value', () => {
		useAgentTelemetry().trackSelectedN8nChatAgent({ agentId: 'agent-1', source: 'card' });

		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_SELECTED_N8N_CHAT_AGENT, {
			agent_id: 'agent-1',
			source: 'card',
			variant: null,
			session_id: 'session-xyz',
		});
	});

	it('trackSentMessageToN8nChatAgent fires with agent_id, thread_id, is_new_thread, and variant', () => {
		usePostHog().overrides = { [AGENTS_N8N_CHAT_FLAG]: { value: 'variant-b' } };

		useAgentTelemetry().trackSentMessageToN8nChatAgent({
			agentId: 'agent-1',
			threadId: 'thread-1',
			isNewThread: true,
		});

		expect(trackMock).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_SENT_MESSAGE_TO_N8N_CHAT_AGENT,
			{
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				is_new_thread: true,
				variant: 'variant-b',
				session_id: 'session-xyz',
			},
		);
	});

	it('trackClickedSidebarItem fires "new_chat" with no chat_type and the current variant', () => {
		usePostHog().overrides = { [AGENTS_N8N_CHAT_FLAG]: { value: 'variant-a' } };

		useAgentTelemetry().trackClickedSidebarItem({ item: 'new_chat' });

		expect(trackMock).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_N8N_CHAT_SIDEBAR_ITEM,
			{
				item: 'new_chat',
				variant: 'variant-a',
				session_id: 'session-xyz',
			},
		);
	});

	it('trackClickedSidebarItem fires "chat" with chat_type and the current variant', () => {
		usePostHog().overrides = { [AGENTS_N8N_CHAT_FLAG]: { value: 'variant-a' } };

		useAgentTelemetry().trackClickedSidebarItem({ item: 'chat', chatType: 'agent' });

		expect(trackMock).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_N8N_CHAT_SIDEBAR_ITEM,
			{
				item: 'chat',
				chat_type: 'agent',
				variant: 'variant-a',
				session_id: 'session-xyz',
			},
		);
	});

	it('trackClickedSidebarItem is a no-op with the flag off, so callers need not check it', () => {
		useAgentTelemetry().trackClickedSidebarItem({ item: 'new_chat' });

		expect(trackMock).not.toHaveBeenCalled();
	});
});
