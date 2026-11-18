import type { AgentProposalEdit, AgentProposalEvalCase } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';

import AgentProposalChanges from './AgentProposalChanges.vue';

const renderComponent = createComponentRenderer(AgentProposalChanges);

const edits: AgentProposalEdit[] = [
	{ kind: 'instructions', before: 'Answer in English.', after: 'Answer in German.' },
	{
		kind: 'toolDescription',
		toolType: 'workflow',
		toolName: 'lookup_order',
		before: null,
		after: 'Finds one order by its number.',
	},
	{
		kind: 'skill',
		skillId: 'skill-1',
		skillName: 'Refunds',
		field: 'instructions',
		before: 'Refund all orders.',
		after: 'Refund paid orders.',
	},
];

const addedCase: AgentProposalEvalCase = {
	caseKey: 'new-1',
	change: 'added',
	caseId: null,
	before: null,
	motivating: true,
	input: 'Where is order 42?',
	criteria: 'The answer gives the order status.',
	expectedTools: ['lookup_order', '!search_web'],
};

const updatedCase: AgentProposalEvalCase = {
	caseKey: 'suite-1',
	change: 'updated',
	caseId: 'dataset:1',
	before: {
		input: 'Cancel order 7',
		criteria: 'The agent cancels the order.',
		expectedTools: [],
	},
	motivating: false,
	input: 'Cancel order 7',
	criteria: 'The agent asks for a confirmation.',
	expectedTools: [],
};

describe('AgentProposalChanges', () => {
	it('should show one collapsed row for each edit and each eval case', () => {
		const { getAllByTestId, queryByTestId } = renderComponent({
			props: { edits, evalCases: [addedCase, updatedCase] },
		});

		const toggles = getAllByTestId('agent-proposal-change-toggle');
		expect(toggles).toHaveLength(5);
		for (const toggle of toggles) expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(toggles[0]).toHaveTextContent('Agent instructions');
		expect(toggles[1]).toHaveTextContent('lookup_order');
		expect(toggles[1]).toHaveTextContent('Tool description');
		expect(toggles[2]).toHaveTextContent('Refunds');
		expect(toggles[2]).toHaveTextContent('Skill instructions');
		expect(toggles[3]).toHaveTextContent('Where is order 42?');
		expect(toggles[3]).toHaveTextContent('New eval case');
		expect(toggles[4]).toHaveTextContent('Updated eval case');
		expect(queryByTestId('agent-proposal-change-before')).not.toBeInTheDocument();
	});

	it('should show the text before and after the edit when the row opens', async () => {
		const { getAllByTestId } = renderComponent({ props: { edits, evalCases: [] } });

		await userEvent.click(getAllByTestId('agent-proposal-change-toggle')[0]);

		const card = within(getAllByTestId('agent-proposal-change')[0]);
		expect(card.getByTestId('agent-proposal-change-before')).toHaveTextContent(
			'Answer in English.',
		);
		expect(card.getByTestId('agent-proposal-change-after')).toHaveTextContent('Answer in German.');
	});

	it('should mark only the changed words on each side', async () => {
		const { getAllByTestId } = renderComponent({ props: { edits, evalCases: [] } });

		await userEvent.click(getAllByTestId('agent-proposal-change-toggle')[0]);

		const card = within(getAllByTestId('agent-proposal-change')[0]);
		const marked = (side: 'before' | 'after') =>
			Array.from(card.getByTestId(`agent-proposal-change-${side}`).querySelectorAll('span'))
				.filter((segment) => segment.className.includes('changedWord'))
				.map((segment) => segment.textContent);
		expect(marked('before')).toEqual(['English.']);
		expect(marked('after')).toEqual(['German.']);
	});

	it('should close an open row', async () => {
		const { getAllByTestId, queryByTestId } = renderComponent({
			props: { edits, evalCases: [] },
		});
		const toggle = getAllByTestId('agent-proposal-change-toggle')[0];

		await userEvent.click(toggle);
		await userEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(queryByTestId('agent-proposal-change-before')).not.toBeInTheDocument();
	});

	it('should show an empty before side for a tool that had no description', async () => {
		const { getAllByTestId } = renderComponent({ props: { edits, evalCases: [] } });

		await userEvent.click(getAllByTestId('agent-proposal-change-toggle')[1]);

		const card = within(getAllByTestId('agent-proposal-change')[1]);
		expect(card.getByTestId('agent-proposal-change-before')).toHaveTextContent('None');
		expect(card.getByTestId('agent-proposal-change-after')).toHaveTextContent(
			'Finds one order by its number.',
		);
	});

	it('should show the input, the rule and the expected tools of a new eval case', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { edits: [], evalCases: [addedCase] },
		});

		await userEvent.click(getByTestId('agent-proposal-change-toggle'));

		expect(getByTestId('agent-proposal-change-field-input')).toHaveTextContent(
			'Where is order 42?',
		);
		expect(getByTestId('agent-proposal-change-field-criteria')).toHaveTextContent(
			'The answer gives the order status.',
		);
		const tools = getByTestId('agent-proposal-change-field-expectedTools');
		expect(tools).toHaveTextContent('Must call: lookup_order');
		expect(tools).toHaveTextContent('Must not call: search_web');
		expect(queryByTestId('agent-proposal-change-before')).not.toBeInTheDocument();
	});

	it('should show only the changed fields of an updated eval case', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { edits: [], evalCases: [updatedCase] },
		});

		await userEvent.click(getByTestId('agent-proposal-change-toggle'));

		expect(queryByTestId('agent-proposal-change-field-input')).not.toBeInTheDocument();
		expect(getByTestId('agent-proposal-change-before')).toHaveTextContent(
			'The agent cancels the order.',
		);
		expect(getByTestId('agent-proposal-change-after')).toHaveTextContent(
			'The agent asks for a confirmation.',
		);
	});

	it('should show a text when the proposal has no changes', () => {
		const { getByTestId } = renderComponent({ props: { edits: [], evalCases: [] } });

		expect(getByTestId('agent-proposal-changes-empty')).toBeInTheDocument();
	});
});
