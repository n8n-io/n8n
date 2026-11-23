import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import WouldHaveHappenedCard from '../components/testRun/WouldHaveHappenedCard.vue';
import WouldHaveHappenedField from '../components/testRun/WouldHaveHappenedField.vue';
import WouldHaveHappenedList from '../components/testRun/WouldHaveHappenedList.vue';
import WouldHaveHappenedSummary from '../components/testRun/WouldHaveHappenedSummary.vue';
import WouldHaveHappenedText from '../components/testRun/WouldHaveHappenedText.vue';

const renderCard = createComponentRenderer(WouldHaveHappenedCard);
const renderField = createComponentRenderer(WouldHaveHappenedField);
const renderList = createComponentRenderer(WouldHaveHappenedList);
const renderSummary = createComponentRenderer(WouldHaveHappenedSummary);
const renderText = createComponentRenderer(WouldHaveHappenedText);

const cardProps = {
	preview: { kind: 'generic', toolName: 'update_record', app: { name: 'Example app' } },
	heading: 'Action preview',
	icon: 'wrench',
} as const;

describe('WouldHaveHappenedCard', () => {
	it('shows the shell, app, tool, marker, and body', () => {
		const { getByRole, getByTestId, getByText } = renderCard({
			props: cardProps,
			pinia: createTestingPinia(),
			slots: { default: 'Captured details' },
		});

		expect(getByRole('article', { name: 'Action preview' })).toHaveAttribute(
			'data-preview-kind',
			'generic',
		);
		expect(getByTestId('would-have-happened-meta')).toHaveTextContent(
			'Example app · update_record',
		);
		expect(getByTestId('would-have-happened-not-sent')).toHaveTextContent(
			'Not sent in this test run',
		);
		expect(getByText('Captured details')).toBeInTheDocument();
	});

	it('replaces the body with an empty message', () => {
		const { getByTestId, queryByText } = renderCard({
			props: { ...cardProps, empty: true, emptyText: 'No captured input' },
			pinia: createTestingPinia(),
			slots: { default: 'Captured details' },
		});

		expect(getByTestId('would-have-happened-empty')).toHaveTextContent('No captured input');
		expect(queryByText('Captured details')).toBeNull();
	});

	it('does not repeat a tool name that is already the heading', () => {
		const { queryByTestId } = renderCard({
			props: {
				...cardProps,
				heading: 'update_record',
				preview: { kind: 'generic', toolName: 'update_record' },
			},
			pinia: createTestingPinia(),
		});

		expect(queryByTestId('would-have-happened-meta')).toBeNull();
	});
});

describe('WouldHaveHappenedField', () => {
	it('renders a description term and its value', () => {
		const { container } = renderField({ props: { label: 'Assignee' }, slots: { default: 'null' } });

		expect(container.querySelector('dt')).toHaveTextContent('Assignee');
		expect(container.querySelector('dd')).toHaveTextContent('null');
	});
});

describe('WouldHaveHappenedList', () => {
	it('keeps comma-containing items distinct', () => {
		const { getByTestId, queryByRole } = renderList({ props: { items: ['Doe, Ana', 'Bob'] } });

		expect(getByTestId('would-have-happened-list')).toHaveTextContent('["Doe, Ana","Bob"]');
		expect(queryByRole('button')).toBeNull();
	});

	it('keeps one format when a hidden item contains a comma', async () => {
		const { getByTestId } = renderList({
			props: { items: ['Ana', 'Bob', 'Doe, Chris'], maxVisible: 2 },
		});
		const content = getByTestId('would-have-happened-list');

		expect(content.textContent).toBe('["Ana","Bob"]');
		await userEvent.click(getByTestId('would-have-happened-list-toggle'));
		expect(content.textContent).toBe('["Ana","Bob","Doe, Chris"]');
	});

	it('expands and collapses the list with an associated control', async () => {
		const { getByTestId } = renderList({
			props: { items: ['Ana', 'Bob', 'Chris'], maxVisible: 1 },
		});
		const content = getByTestId('would-have-happened-list');
		const toggle = getByTestId('would-have-happened-list-toggle');

		expect(content.textContent).toBe('Ana');
		expect(toggle).toHaveAttribute('aria-controls', content.id);
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(toggle).toHaveTextContent('+2 more');
		await userEvent.click(toggle);
		expect(content.textContent).toBe('Ana, Bob, Chris');
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await userEvent.click(toggle);
		expect(content.textContent).toBe('Ana');
	});
});

describe('WouldHaveHappenedText', () => {
	it('shows HTML and markdown as plain text', () => {
		const text = '<img src=x onerror=alert(1)><script>alert(1)</script> **text**';
		const { container, getByTestId, queryByRole } = renderText({ props: { text } });

		expect(getByTestId('would-have-happened-text').textContent).toBe(text);
		expect(container.querySelector('img, script, strong')).toBeNull();
		expect(queryByRole('button')).toBeNull();
	});

	it('clamps Unicode text and restores the full text on expansion', async () => {
		const { getByTestId } = renderText({ props: { text: 'a😀b\nnext line', maxChars: 2 } });
		const content = getByTestId('would-have-happened-text');
		const toggle = getByTestId('would-have-happened-text-toggle');

		expect(content.textContent).toBe('a😀…');
		expect(toggle).toHaveAttribute('aria-controls', content.id);
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await userEvent.click(toggle);
		expect(content.textContent).toBe('a😀b\nnext line');
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await userEvent.click(toggle);
		expect(content.textContent).toBe('a😀…');
	});
});

describe('WouldHaveHappenedSummary', () => {
	it.each([
		[1, '1 action, nothing was sent'],
		[3, '3 actions, nothing was sent'],
	])('summarizes %i actions', (count, text) => {
		const { getByTestId } = renderSummary({ props: { count } });

		expect(getByTestId('would-have-happened-summary')).toHaveTextContent(text);
	});

	it('renders nothing without actions', () => {
		const { queryByTestId } = renderSummary({ props: { count: 0 } });

		expect(queryByTestId('would-have-happened-summary')).toBeNull();
	});
});
