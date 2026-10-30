import { createTestingPinia } from '@pinia/testing';
import { configure } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalsSection from '../components/AgentEvalsSection.vue';

configure({ testIdAttribute: 'data-testid' });
vi.mock('../components/AgentMonitoringPanel.vue', () => ({
	default: {
		props: ['projectId', 'agentId', 'disabled'],
		template: '<div data-testid="monitoring-panel">{{ projectId }} {{ agentId }}</div>',
	},
}));
vi.mock('../components/AgentOnlineReplayPanel.vue', () => ({
	default: { template: '<div data-testid="replay-panel" />' },
}));

const renderComponent = createComponentRenderer(AgentEvalsSection, {
	props: { projectId: 'project-1', agentId: 'agent-1' },
	pinia: createTestingPinia(),
});

describe('AgentEvalsSection', () => {
	it('lands on live monitoring for the agent', () => {
		const { getByTestId, queryByTestId } = renderComponent();
		expect(getByTestId('monitoring-panel')).toHaveTextContent('project-1 agent-1');
		expect(queryByTestId('replay-panel')).not.toBeInTheDocument();
	});

	it('shows the replay of a change when the publish warning asked for it', async () => {
		const { useAgentEvalsStore } = await import('../agentEvals.store');
		const pinia = createTestingPinia();
		useAgentEvalsStore(pinia).replaySetupAgentId = 'agent-1';
		const { getByTestId, queryByTestId } = renderComponent({ pinia });
		expect(getByTestId('replay-panel')).toBeInTheDocument();
		expect(queryByTestId('monitoring-panel')).not.toBeInTheDocument();
	});

	it('does not load evals for an unsaved agent', () => {
		const { queryByTestId } = renderComponent({ props: { agentUnsaved: true } });
		expect(queryByTestId('monitoring-panel')).not.toBeInTheDocument();
	});
});
