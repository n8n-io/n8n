import { createTestingPinia } from '@pinia/testing';
import { configure } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalsSection from '../components/AgentEvalsSection.vue';

configure({ testIdAttribute: 'data-testid' });
vi.mock('../components/AgentOnlineReplayPanel.vue', () => ({
	default: {
		props: ['projectId', 'agentId', 'disabled', 'openData'],
		template:
			'<div data-testid="replay-panel">{{ projectId }} {{ agentId }} {{ openData ? "open" : "closed" }}</div>',
	},
}));

const renderComponent = createComponentRenderer(AgentEvalsSection, {
	props: { projectId: 'project-1', agentId: 'agent-1' },
	pinia: createTestingPinia(),
});

describe('AgentEvalsSection', () => {
	it('lands on the evals for the agent', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('replay-panel')).toHaveTextContent('project-1 agent-1 closed');
	});

	it('opens the data panel when the publish warning asked for it', async () => {
		const { useAgentEvalsStore } = await import('../agentEvals.store');
		const pinia = createTestingPinia();
		useAgentEvalsStore(pinia).replaySetupAgentId = 'agent-1';
		const { getByTestId } = renderComponent({ pinia });
		expect(getByTestId('replay-panel')).toHaveTextContent('open');
	});

	it('does not load evals for an unsaved agent', () => {
		const { queryByTestId } = renderComponent({ props: { agentUnsaved: true } });
		expect(queryByTestId('replay-panel')).not.toBeInTheDocument();
	});
});
