import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
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

	it('trackClickedNewAgent fires event with source, minted agent_id and session_id', () => {
		useAgentTelemetry().trackClickedNewAgent('button', 'aBcDeFgHiJkLmNoP');
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_CLICKED_NEW_AGENT, {
			source: 'button',
			agent_id: 'aBcDeFgHiJkLmNoP',
			session_id: 'session-xyz',
		});
	});

	it('trackClickedNewAgent tracks card source', () => {
		useAgentTelemetry().trackClickedNewAgent('card', 'aBcDeFgHiJkLmNoP');
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_CLICKED_NEW_AGENT, {
			source: 'card',
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
});
