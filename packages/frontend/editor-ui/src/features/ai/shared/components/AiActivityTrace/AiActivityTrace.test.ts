import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import AiActivityTrace from './AiActivityTrace.vue';
import type { AiActivityItem, AiActivityToolItem } from './types';

const renderComponent = createComponentRenderer(AiActivityTrace, {
	global: {
		stubs: {
			ToolResultJson: {
				props: ['value'],
				template: '<pre data-test-id="tool-input">{{ JSON.stringify(value) }}</pre>',
			},
			ToolResultRenderer: {
				props: ['result', 'toolName'],
				template: '<pre data-test-id="tool-output">{{ toolName }}: {{ result }}</pre>',
			},
		},
	},
});

function tool(id: string, overrides: Partial<AiActivityToolItem<string>> = {}) {
	return { kind: 'tool', id, label: id, toolName: id, payload: id, ...overrides } as const;
}

function render(items: Array<AiActivityItem<string>>) {
	return renderComponent({
		props: { items },
		slots: {
			'before-tool':
				'<template #before-tool="{ item }"><span data-test-id="before-tool">{{ item.id }}</span></template>',
		},
	});
}

describe('AiActivityTrace', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('renders thinking as its own row, apart from the tool calls', () => {
		const { getByTestId, getAllByTestId } = render([
			{
				kind: 'thinking',
				id: 't',
				segments: [{ content: 'Done.' }],
				active: false,
				durationSec: 3,
			},
			tool('a'),
		]);

		expect(getByTestId('ai-thinking-step')).toHaveTextContent('Thought for 3s');
		expect(getAllByTestId('ai-activity-tool')).toHaveLength(1);
	});

	it('groups adjacent tool calls under a count', async () => {
		const { getByText, getAllByTestId } = render([tool('a'), tool('b')]);

		await userEvent.click(getByText('2 tool calls'));

		expect(getAllByTestId('before-tool').map((node) => node.textContent)).toEqual(['a', 'b']);
	});

	it('does not group a single tool call', () => {
		const { queryByText, getByText } = render([tool('a', { label: 'Search nodes' })]);

		expect(queryByText(/tool calls/)).toBeNull();
		expect(getByText('Search nodes')).toBeInTheDocument();
	});

	it('shows the input and the output of a tool call when expanded', async () => {
		const { getByText, getByTestId } = render([
			tool('search', { label: 'Search nodes', input: { query: 'gmail' }, output: 'found' }),
		]);

		await userEvent.click(getByText('Search nodes'));

		expect(getByTestId('tool-input')).toHaveTextContent('{"query":"gmail"}');
		expect(getByTestId('tool-output')).toHaveTextContent('search: found');
	});

	it('uses the output view of the feature instead of the default view', async () => {
		const OutputView = defineComponent({
			props: { text: { type: String, required: true } },
			template: '<div data-test-id="custom-output">{{ text }}</div>',
		});
		const { getByText, getByTestId, queryByTestId } = render([
			tool('a', {
				label: 'Run code',
				output: 'raw',
				outputView: { component: OutputView, props: { text: 'Rendered' } },
			}),
		]);

		await userEvent.click(getByText('Run code'));

		expect(getByTestId('custom-output')).toHaveTextContent('Rendered');
		expect(queryByTestId('tool-output')).toBeNull();
	});

	it('shows the details and the child steps of a delegated call', async () => {
		const { getByText, getByTestId } = render([
			tool('delegate', {
				label: 'Delegate',
				details: 'The **answer**',
				children: [tool('child', { label: 'Child step' })],
			}),
		]);

		await userEvent.click(getByText('Delegate'));

		expect(getByTestId('ai-activity-tool-details')).toHaveTextContent('The answer');
		expect(getByTestId('ai-activity-tool-children')).toHaveTextContent('Child step');
	});

	it('does not expand a tool call without a body', () => {
		const { getByText } = render([tool('a', { label: 'Noted' })]);

		expect(getByText('Noted').closest('button')).not.toHaveAttribute('aria-expanded');
	});

	it('shows the description of a step when expanded', async () => {
		const { getByText } = render([
			{ kind: 'step', id: 's', label: 'Skill updated', description: 'Loads the new version.' },
		]);

		await userEvent.click(getByText('Skill updated'));

		expect(getByText('Loads the new version.')).toBeVisible();
	});
});
