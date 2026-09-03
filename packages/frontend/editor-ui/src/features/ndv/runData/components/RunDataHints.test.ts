import userEvent from '@testing-library/user-event';
import type { NodeHint } from 'n8n-workflow';

import { createComponentRenderer } from '@/__tests__/render';
import RunDataHints from './RunDataHints.vue';

const FIELD_NOT_FOUND_GROUP = {
	key: 'fieldNotFound',
	summary: "{count} fields weren't found in your input items",
};

const fieldNotFoundHint = (field: string): NodeHint => ({
	message: `The field '${field}' wasn't found in any input item`,
	location: 'outputPane',
	group: { ...FIELD_NOT_FOUND_GROUP, label: field },
});

const renderComponent = createComponentRenderer(RunDataHints);

describe('RunDataHints', () => {
	it('should render one callout per ungrouped hint', () => {
		const { getAllByTestId, getByText, queryByTestId } = renderComponent({
			props: {
				hints: [{ message: 'First hint' }, { message: 'Second hint' }] satisfies NodeHint[],
			},
		});

		expect(getAllByTestId('node-hint')).toHaveLength(2);
		expect(getByText('First hint')).toBeInTheDocument();
		expect(getByText('Second hint')).toBeInTheDocument();
		expect(queryByTestId('node-hint-toggle')).not.toBeInTheDocument();
	});

	it('should render exact duplicate hints only once', () => {
		const { getAllByTestId, getByTestId, getByText } = renderComponent({
			props: {
				hints: Array.from({ length: 40 }, () => ({
					message: 'Unable to optimize bulk insert due to expression in Data table ID',
					location: 'outputPane',
				})) satisfies NodeHint[],
			},
		});

		expect(getAllByTestId('node-hint')).toHaveLength(1);
		expect(
			getByText('Unable to optimize bulk insert due to expression in Data table ID'),
		).toBeInTheDocument();
		expect(getByTestId('node-hint-repeated-count')).toHaveTextContent('Occurred 40 times');
	});

	it('should keep hints with the same message but different themes separate', () => {
		const { getAllByTestId } = renderComponent({
			props: {
				hints: [
					{ message: 'Shared message', type: 'info' },
					{ message: 'Shared message', type: 'warning' },
				] satisfies NodeHint[],
			},
		});

		expect(getAllByTestId('node-hint')).toHaveLength(2);
	});

	it('should collapse hints sharing a group into a single callout with the count', () => {
		const { getAllByTestId, getByTestId, queryByText } = renderComponent({
			props: {
				hints: [
					fieldNotFoundHint('customerEmail'),
					fieldNotFoundHint('billingCity'),
					fieldNotFoundHint('orderTotal'),
				],
			},
		});

		expect(getAllByTestId('node-hint')).toHaveLength(1);
		expect(getByTestId('node-hint-summary')).toHaveTextContent(
			"3 fields weren't found in your input items",
		);
		expect(
			queryByText("The field 'customerEmail' wasn't found in any input item"),
		).not.toBeInTheDocument();
	});

	it('should use the most severe theme for grouped hints', () => {
		const { getByTestId } = renderComponent({
			props: {
				hints: [
					{
						message: 'Minor issue',
						type: 'info',
						group: { key: 'mixedSeverity', summary: '{count} issues' },
					},
					{
						message: 'Critical issue',
						type: 'danger',
						group: { key: 'mixedSeverity', summary: '{count} issues' },
					},
				] satisfies NodeHint[],
			},
		});

		expect(getByTestId('node-hint')).toHaveClass('danger');
	});

	it('should replace every count placeholder in a grouped summary', () => {
		const { getByTestId } = renderComponent({
			props: {
				hints: [
					{
						message: 'First issue',
						group: { key: 'shared', summary: '{count} of {count} issues' },
					},
					{
						message: 'Second issue',
						group: { key: 'shared', summary: '{count} of {count} issues' },
					},
				] satisfies NodeHint[],
			},
		});

		expect(getByTestId('node-hint-summary')).toHaveTextContent('2 of 2 issues');
	});

	it('should list just the labels when an expanded group provides them', async () => {
		const { getByTestId, getAllByTestId, queryAllByTestId } = renderComponent({
			props: {
				hints: [fieldNotFoundHint('customerEmail'), fieldNotFoundHint('billingCity')],
			},
		});

		expect(queryAllByTestId('node-hint-message')).toHaveLength(0);

		await userEvent.click(getByTestId('node-hint-toggle'));

		const messages = getAllByTestId('node-hint-message');
		expect(messages).toHaveLength(2);
		expect(messages[0]).toHaveTextContent('customerEmail');
		expect(messages[1]).toHaveTextContent('billingCity');
		// The summary already carries the sentence, so it isn't repeated per field
		expect(getByTestId('node-hint-details')).not.toHaveTextContent("wasn't found");
		expect(getByTestId('node-hint-toggle')).toHaveAttribute('aria-expanded', 'true');

		await userEvent.click(getByTestId('node-hint-toggle'));

		expect(queryAllByTestId('node-hint-message')).toHaveLength(0);
	});

	it('should expand and collapse grouped hints from the keyboard', async () => {
		const { getByRole, getAllByTestId, queryAllByTestId } = renderComponent({
			props: {
				hints: [fieldNotFoundHint('customerEmail'), fieldNotFoundHint('billingCity')],
			},
		});

		const toggle = getByRole('button', {
			name: "2 fields weren't found in your input items",
		});

		toggle.focus();
		await userEvent.keyboard('{Enter}');

		expect(getAllByTestId('node-hint-message')).toHaveLength(2);
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(toggle).toHaveFocus();

		await userEvent.keyboard('{Enter}');

		expect(queryAllByTestId('node-hint-message')).toHaveLength(0);
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(toggle).toHaveFocus();
	});

	it('should fall back to the full messages when a group has no labels', async () => {
		const { getByTestId, getAllByTestId } = renderComponent({
			props: {
				hints: [
					{ message: 'First problem', group: { key: 'shared', summary: '{count} problems' } },
					{ message: 'Second problem', group: { key: 'shared', summary: '{count} problems' } },
				] satisfies NodeHint[],
			},
		});

		await userEvent.click(getByTestId('node-hint-toggle'));

		const messages = getAllByTestId('node-hint-message');
		expect(messages[0]).toHaveTextContent('First problem');
		expect(messages[1]).toHaveTextContent('Second problem');
	});

	it('should render a single grouped hint as a plain callout, without a toggle', () => {
		const { getByText, queryByTestId } = renderComponent({
			props: { hints: [fieldNotFoundHint('customerEmail')] },
		});

		expect(
			getByText("The field 'customerEmail' wasn't found in any input item"),
		).toBeInTheDocument();
		expect(queryByTestId('node-hint-toggle')).not.toBeInTheDocument();
	});

	it('should render every hint separately when a group has an empty summary', () => {
		const { getAllByTestId, getByText, queryByTestId } = renderComponent({
			props: {
				hints: [
					{ message: 'Problem A', group: { key: 'shared', summary: '' } },
					{ message: 'Problem B', group: { key: 'shared', summary: '' } },
				] satisfies NodeHint[],
			},
		});

		expect(getAllByTestId('node-hint')).toHaveLength(2);
		expect(getByText('Problem A')).toBeInTheDocument();
		expect(getByText('Problem B')).toBeInTheDocument();
		expect(queryByTestId('node-hint-toggle')).not.toBeInTheDocument();
	});

	it('should keep ungrouped hints separate from grouped ones and preserve order', () => {
		const { getAllByTestId } = renderComponent({
			props: {
				hints: [
					{ message: 'Standalone warning' },
					fieldNotFoundHint('customerEmail'),
					fieldNotFoundHint('billingCity'),
					{ message: 'Another standalone warning' },
				],
			},
		});

		const callouts = getAllByTestId('node-hint');
		expect(callouts).toHaveLength(3);
		expect(callouts[0]).toHaveTextContent('Standalone warning');
		expect(callouts[1]).toHaveTextContent("2 fields weren't found in your input items");
		expect(callouts[2]).toHaveTextContent('Another standalone warning');
	});

	it('should collapse hints of different groups independently', async () => {
		const { getAllByTestId, getAllByText } = renderComponent({
			props: {
				hints: [
					fieldNotFoundHint('customerEmail'),
					fieldNotFoundHint('billingCity'),
					{
						message: "The branch starting with 'Edit Fields' must be connected back",
						group: {
							key: 'loopBranchNotConnectedBack',
							summary: "{count} branches aren't connected back",
						},
					},
					{
						message: "The branch starting with 'Code' must be connected back",
						group: {
							key: 'loopBranchNotConnectedBack',
							summary: "{count} branches aren't connected back",
						},
					},
				] satisfies NodeHint[],
			},
		});

		const toggles = getAllByTestId('node-hint-toggle');
		expect(toggles).toHaveLength(2);

		await userEvent.click(toggles[1]);

		expect(getAllByTestId('node-hint-message')).toHaveLength(2);
		expect(getAllByText(/must be connected back/)).toHaveLength(2);
	});
});
