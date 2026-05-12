import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';

const trackMock = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
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

	it('trackClickedNewAgent fires event with source and session_id', () => {
		useAgentTelemetry().trackClickedNewAgent('button');
		expect(trackMock).toHaveBeenCalledWith('User clicked new agent', {
			source: 'button',
			session_id: 'session-xyz',
		});
	});

	it('trackSubmittedMessage includes mode, status, agent_config (no raw message)', () => {
		const fingerprint = {
			instructions: 'hello',
			tools: ['a'],
			skills: [],
			triggers: [],
			memory: null,
			model: 'gpt-4',
			config_version: 'v1',
		};
		useAgentTelemetry().trackSubmittedMessage({
			agentId: 'ag-1',
			mode: 'test',
			status: 'draft',
			agentConfig: fingerprint,
		});
		expect(trackMock).toHaveBeenCalledWith('User submitted message to agent', {
			agent_id: 'ag-1',
			mode: 'test',
			status: 'draft',
			agent_config: fingerprint,
			session_id: 'session-xyz',
		});
	});

	it('trackEditedConfig fires with part, config_version and status', () => {
		useAgentTelemetry().trackEditedConfig({
			agentId: 'ag-1',
			part: 'instructions',
			configVersion: 'v2',
			status: 'production',
		});
		expect(trackMock).toHaveBeenCalledWith('User edited agent config', {
			agent_id: 'ag-1',
			part: 'instructions',
			config_version: 'v2',
			status: 'production',
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
		expect(trackMock).toHaveBeenCalledWith('User added trigger to agent', {
			agent_id: 'ag-1',
			trigger_type: 'slack',
			triggers: ['slack', 'telegram'],
			config_version: 'v4',
			status: 'draft',
			session_id: 'session-xyz',
		});
	});

	it('trackAddedTools fires with tool_added, tools list, config_version and status', () => {
		useAgentTelemetry().trackAddedTools({
			agentId: 'ag-1',
			toolAdded: 'search',
			tools: ['search', 'summarize'],
			configVersion: 'v5',
			status: 'draft',
		});
		expect(trackMock).toHaveBeenCalledWith('User added tools to agent', {
			agent_id: 'ag-1',
			tool_added: 'search',
			tools: ['search', 'summarize'],
			config_version: 'v5',
			status: 'draft',
			session_id: 'session-xyz',
		});
	});

	it('trackAddedSkills fires with skill_added, skills list, config_version and status', () => {
		useAgentTelemetry().trackAddedSkills({
			agentId: 'ag-1',
			skillAdded: 'triage',
			skills: ['outreach', 'triage'],
			configVersion: 'v6',
			status: 'production',
		});
		expect(trackMock).toHaveBeenCalledWith('User added skills to agent', {
			agent_id: 'ag-1',
			skill_added: 'triage',
			skills: ['outreach', 'triage'],
			config_version: 'v6',
			status: 'production',
			session_id: 'session-xyz',
		});
	});

	it('trackPublishedAgent fires with config_version and status=production', () => {
		useAgentTelemetry().trackPublishedAgent({ agentId: 'ag-1', configVersion: 'v3' });
		expect(trackMock).toHaveBeenCalledWith('User published agent', {
			agent_id: 'ag-1',
			config_version: 'v3',
			status: 'production',
			session_id: 'session-xyz',
		});
	});

	it('trackUnpublishedAgent fires with status=draft', () => {
		useAgentTelemetry().trackUnpublishedAgent({ agentId: 'ag-1' });
		expect(trackMock).toHaveBeenCalledWith('User unpublished agent', {
			agent_id: 'ag-1',
			status: 'draft',
			session_id: 'session-xyz',
		});
	});
});
