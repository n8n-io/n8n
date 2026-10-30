import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import type { AgentTestIdea } from '../agentEvals.types';
import AgentTestChatIdeas from '../components/AgentTestChatIdeas.vue';

configure({ testIdAttribute: 'data-testid' });

const { suggestTestIdeasMock, trackAskedMock, trackPickedMock } = vi.hoisted(() => ({
	suggestTestIdeasMock: vi.fn(),
	trackAskedMock: vi.fn(),
	trackPickedMock: vi.fn(),
}));
vi.mock('../agentEvals.api', () => ({ suggestTestIdeas: suggestTestIdeasMock }));
vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({
		trackAskedForTestIdeas: trackAskedMock,
		trackPickedTestIdea: trackPickedMock,
	}),
}));

const ideas: AgentTestIdea[] = [
	{ kind: 'everyday', prompt: 'Where is my latest order?', why: 'The most common request.' },
	{
		kind: 'rule',
		prompt: 'When will my parcel arrive?',
		why: 'Tests the rule about delivery dates.',
		source: { field: 'instructions', quote: 'Never promise a delivery date.' },
	},
];

const renderComponent = createComponentRenderer(AgentTestChatIdeas, {
	props: { projectId: 'project-1', agentId: 'agent-1' },
});

const render = () => renderComponent({ pinia: createTestingPinia() });

const ask = async (rendered: ReturnType<typeof render>) => {
	await userEvent.click(rendered.getByTestId('agent-test-ideas-ask'));
	await flushPromises();
};

describe('AgentTestChatIdeas', () => {
	beforeEach(() => {
		suggestTestIdeasMock.mockReset();
		trackAskedMock.mockReset();
		trackPickedMock.mockReset();
	});

	it('asks for nothing until the person clicks, since ideas cost a model call', () => {
		const { getByTestId, queryAllByTestId } = render();

		expect(getByTestId('agent-test-ideas-ask')).toBeInTheDocument();
		expect(queryAllByTestId('agent-test-idea')).toHaveLength(0);
		expect(suggestTestIdeasMock).not.toHaveBeenCalled();
	});

	it('shows each idea as a chip after the click', async () => {
		suggestTestIdeasMock.mockResolvedValue({ ideas });
		const rendered = render();

		await ask(rendered);

		expect(suggestTestIdeasMock).toHaveBeenCalledWith(expect.anything(), 'project-1', 'agent-1');
		const chips = rendered.getAllByTestId('agent-test-idea');
		expect(chips.map((chip) => chip.textContent?.trim())).toEqual([
			'Where is my latest order?',
			'When will my parcel arrive?',
		]);
		expect(rendered.queryByTestId('agent-test-ideas-ask')).not.toBeInTheDocument();
		expect(trackAskedMock).toHaveBeenCalledWith({ agentId: 'agent-1', ideaCount: 2 });
	});

	it('sends the prompt of the chip the person picks', async () => {
		suggestTestIdeasMock.mockResolvedValue({ ideas });
		const rendered = render();
		await ask(rendered);

		await userEvent.click(rendered.getAllByTestId('agent-test-idea')[1]);

		expect(rendered.emitted('select')).toEqual([['When will my parcel arrive?']]);
		expect(trackPickedMock).toHaveBeenCalledWith({ agentId: 'agent-1', kind: 'rule' });
	});

	it('says so when there are no ideas', async () => {
		suggestTestIdeasMock.mockResolvedValue({ ideas: [] });
		const rendered = render();

		await ask(rendered);

		expect(rendered.getByTestId('agent-test-ideas-empty')).toBeInTheDocument();
	});

	it('offers to try again when the request fails', async () => {
		suggestTestIdeasMock.mockRejectedValueOnce(new Error('This agent needs a model'));
		const rendered = render();

		await ask(rendered);

		expect(rendered.getByTestId('agent-test-ideas-error')).toHaveTextContent(
			'This agent needs a model',
		);
		suggestTestIdeasMock.mockResolvedValue({ ideas });
		await ask(rendered);
		expect(rendered.getAllByTestId('agent-test-idea')).toHaveLength(2);
	});
});
