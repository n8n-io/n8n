import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';

import AiTraceChips from './AiTraceChips.vue';
import type { AiTraceChipItem } from './types';

const global = {
	stubs: {
		CollapsibleRoot: { template: '<div><slot :open="true" /></div>' },
		CollapsibleContent: { template: '<div><slot /></div>' },
		N8nTooltip: { template: '<div><slot /></div>' },
		N8nIcon: { template: '<span class="n8n-icon" />' },
	},
};

const items: AiTraceChipItem[] = [
	{ id: 'a', icon: 'book-open', label: 'Opening skill' },
	{ id: 'b', icon: 'table', label: 'Listing data tables' },
	{ id: 'c', icon: 'workflow', label: 'Loading node schema', loading: true },
];

describe('N8nAiTraceChips', () => {
	it('should render one chip per item', () => {
		const { getAllByTestId } = render(AiTraceChips, { props: { items }, global });

		expect(getAllByTestId('ai-trace-chip')).toHaveLength(3);
	});

	it('should include each label for accessibility and hover states', () => {
		const { getByText } = render(AiTraceChips, { props: { items }, global });

		expect(getByText('Opening skill')).toBeInTheDocument();
		expect(getByText('Listing data tables')).toBeInTheDocument();
	});

	it('should expand the clicked chip and render its panel content', async () => {
		const { getAllByTestId, getByTestId, emitted } = render(AiTraceChips, {
			props: { items },
			global,
			slots: { panel: '<div data-test-id="panel-content">details</div>' },
		});

		const chips = getAllByTestId('ai-trace-chip');
		expect(chips[0].getAttribute('aria-expanded')).toBe('false');

		await userEvent.click(chips[0]);

		expect(emitted('update:expandedId')?.[0]).toEqual(['a']);
		expect(chips[0].getAttribute('aria-expanded')).toBe('true');
		expect(getByTestId('panel-content')).toBeInTheDocument();
	});

	it('should keep only one chip expanded at a time', async () => {
		const { getAllByTestId } = render(AiTraceChips, { props: { items }, global });

		const chips = getAllByTestId('ai-trace-chip');
		await userEvent.click(chips[0]);
		await userEvent.click(chips[1]);

		expect(chips[0].getAttribute('aria-expanded')).toBe('false');
		expect(chips[1].getAttribute('aria-expanded')).toBe('true');
	});

	it('should collapse when the expanded chip is clicked again', async () => {
		const { getAllByTestId, emitted } = render(AiTraceChips, { props: { items }, global });

		const chips = getAllByTestId('ai-trace-chip');
		await userEvent.click(chips[0]);
		await userEvent.click(chips[0]);

		expect(chips[0].getAttribute('aria-expanded')).toBe('false');
		expect(emitted('update:expandedId')?.at(-1)).toEqual([null]);
	});

	it('should mark loading chips', () => {
		const { getAllByTestId } = render(AiTraceChips, { props: { items }, global });

		expect(getAllByTestId('ai-trace-chip')[2].className).toContain('loading');
	});

	it('should mark errored chips', () => {
		const erroredItems: AiTraceChipItem[] = [
			{ id: 'x', icon: 'wrench', label: 'Broken tool', error: 'It failed' },
		];
		const { getAllByTestId } = render(AiTraceChips, { props: { items: erroredItems }, global });

		expect(getAllByTestId('ai-trace-chip')[0].className).toContain('errored');
	});
});
