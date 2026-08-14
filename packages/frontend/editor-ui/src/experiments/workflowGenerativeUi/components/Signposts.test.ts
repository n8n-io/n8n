import { fireEvent, within } from '@testing-library/vue';
import { StateProvider } from '@json-render/vue';
import { defineComponent, h } from 'vue';
import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { signpostLabels, signpostRoles, type SignpostRole } from '../signposts';
import Accordion from './Accordion.vue';
import Chapter from './Chapter.vue';
import Ends from './Ends.vue';
import Lane from './Lane.vue';
import Reveal from './Reveal.vue';

describe('Lane', () => {
	it.each(signpostRoles)('renders the %s role label', (role: SignpostRole) => {
		const renderLane = createComponentRenderer(Lane, {
			props: { role },
		});
		const { getByTestId } = renderLane();

		const lane = getByTestId('flow-lane');
		expect(lane).toHaveAttribute('data-role', role);
		expect(within(lane).getByTestId('lane-signpost')).toHaveTextContent(signpostLabels[role]);
	});
});

describe('Ends', () => {
	it('places the first child inbound and the rest outbound', () => {
		const renderEnds = createComponentRenderer(Ends, {
			slots: {
				default: () => [
					h('p', { 'data-test-id': 'inbound-child' }, 'Form arrives'),
					h('p', { 'data-test-id': 'outbound-a' }, 'Slack alert'),
					h('p', { 'data-test-id': 'outbound-b' }, 'Sheet row'),
				],
			},
		});
		const { getByTestId } = renderEnds();

		const inbound = getByTestId('ends-inbound');
		const outbound = getByTestId('ends-outbound');

		expect(within(inbound).getByTestId('inbound-child')).toBeInTheDocument();
		expect(within(inbound).queryByTestId('outbound-a')).not.toBeInTheDocument();
		expect(within(outbound).getByTestId('outbound-a')).toBeInTheDocument();
		expect(within(outbound).getByTestId('outbound-b')).toBeInTheDocument();
	});
});

describe('Reveal', () => {
	it('starts closed and expands on toggle', async () => {
		const Harness = defineComponent({
			setup() {
				return () =>
					h(
						StateProvider,
						{ initialState: {} },
						{
							default: () =>
								h(
									Reveal,
									{ label: 'Full prompt' },
									{ default: () => h('p', { 'data-test-id': 'reveal-body' }, 'secret prompt') },
								),
						},
					);
			},
		});

		const renderHarness = createComponentRenderer(Harness);
		const { getByTestId, queryByTestId } = renderHarness();

		expect(queryByTestId('reveal-content')).not.toBeInTheDocument();
		expect(queryByTestId('reveal-body')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('reveal-toggle'));
		expect(getByTestId('reveal-content')).toBeInTheDocument();
		expect(getByTestId('reveal-body')).toHaveTextContent('secret prompt');

		await fireEvent.click(getByTestId('reveal-toggle'));
		expect(queryByTestId('reveal-content')).not.toBeInTheDocument();
	});
});

describe('Chapter', () => {
	it('shows a signpost when set', () => {
		const renderChapter = createComponentRenderer(Chapter, {
			props: { title: 'Ticket arrives', signpost: 'comesIn' },
		});
		const { getByTestId, getByText } = renderChapter();

		const signpost = getByTestId('chapter-signpost');
		expect(signpost).toHaveAttribute('data-role', 'comesIn');
		expect(signpost).toHaveTextContent(signpostLabels.comesIn);
		expect(getByText('Ticket arrives')).toBeInTheDocument();
	});

	it('hides the signpost when unset', () => {
		const renderChapter = createComponentRenderer(Chapter, {
			props: { title: 'Ticket arrives' },
		});
		const { queryByTestId } = renderChapter();

		expect(queryByTestId('chapter-signpost')).not.toBeInTheDocument();
	});
});

describe('Accordion', () => {
	it('keeps the details element closed by default', () => {
		const renderAccordion = createComponentRenderer(Accordion, {
			props: { title: 'Extra detail' },
			slots: {
				default: () => h('p', { 'data-test-id': 'accordion-body' }, 'hidden until open'),
			},
		});
		const { container, getByText } = renderAccordion();

		const details = container.querySelector('details');
		expect(details).not.toBeNull();
		expect(details).not.toHaveAttribute('open');
		expect((details as HTMLDetailsElement).open).toBe(false);
		expect(getByText('Extra detail')).toBeInTheDocument();
	});
});
