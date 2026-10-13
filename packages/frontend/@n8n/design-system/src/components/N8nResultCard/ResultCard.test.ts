import { fireEvent, render, waitFor } from '@testing-library/vue';
import { nextTick, ref } from 'vue';

import ResultCard from './ResultCard.vue';
import type { ResultCardData, ResultCardProps } from './ResultCard.types';
import { DEMO_CARDS } from './demoCards';
import { resolveResultCardService, resolveResultCardTone } from './tones';
import { useResultCardVariants } from './useResultCardVariants';
import { isSafeCoverSrc, isSafeHref, stagger } from './utils';

/** Motion is off by default so bodies render their final state synchronously. */
const renderCard = (props: ResultCardProps) =>
	render(ResultCard, { props: { animated: false, ...props } });

/** Lets the text swaps / morphs settle (longest token + 40 ms slack). */
const settle = async () => {
	vi.advanceTimersByTime(700);
	await nextTick();
};

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

describe('resolveResultCardTone', () => {
	it('prefers an explicit tone, then the service, then the archetype', () => {
		expect(resolveResultCardTone({ type: 'list', tone: 'mint' }).id).toBe('mint');
		expect(resolveResultCardTone({ type: 'list', nodeType: 'n8n-nodes-base.slackTool' }).id).toBe(
			'aubergine',
		);
		expect(
			resolveResultCardTone({ type: 'records', nodeType: 'n8n-nodes-base.googleSheetsTrigger' }).id,
		).toBe('forest');
		expect(resolveResultCardTone({ type: 'metric' }).id).toBe('terracotta');
		expect(resolveResultCardTone({ type: 'message' }).id).toBe('graphite');
		expect(resolveResultCardTone({ type: 'chart' }).id).toBe('sky');
		expect(resolveResultCardTone({ type: 'list', nodeType: 'n8n-nodes-community.foo' }).id).toBe(
			'lavender',
		);
	});
});

describe('resolveResultCardService', () => {
	it('derives the service grammar from the node type', () => {
		expect(resolveResultCardService('n8n-nodes-base.gmailTool')).toBe('gmail');
		expect(resolveResultCardService('n8n-nodes-base.slack')).toBe('slack');
		expect(resolveResultCardService('n8n-nodes-base.telegramTrigger')).toBe('telegram');
		expect(resolveResultCardService('n8n-nodes-base.googleSheets')).toBe('googleSheets');
		expect(resolveResultCardService('n8n-nodes-base.code')).toBe('generic');
		expect(resolveResultCardService(undefined)).toBe('generic');
	});
});

describe('utils', () => {
	it('only trusts https hrefs', () => {
		expect(isSafeHref('https://example.com')).toBe(true);
		expect(isSafeHref('http://example.com')).toBe(false);
		expect(isSafeHref('javascript:alert(1)')).toBe(false);
		expect(isSafeHref(undefined)).toBe(false);
	});

	it('allow-lists cover images to unsplash', () => {
		expect(isSafeCoverSrc('https://images.unsplash.com/photo-1?w=800')).toBe(true);
		expect(isSafeCoverSrc('https://evil.example/x.jpg')).toBe(false);
		expect(isSafeCoverSrc('http://images.unsplash.com/photo-1')).toBe(false);
		expect(isSafeCoverSrc(undefined)).toBe(false);
	});

	it('staggers delays in seconds', () => {
		expect(stagger(0, 0.5)).toBe('0.50s');
		expect(stagger(2, 0.5)).toBe('0.66s');
		expect(stagger(1, 0.3, 0.09)).toBe('0.39s');
	});
});

describe('useResultCardVariants', () => {
	it('reads options from the switcher, defaults to the declared key and merges the variant', () => {
		const { options, control, placement, hasSwitcher, activeKey, merged, select } =
			useResultCardVariants(() => DEMO_CARDS.chart);
		expect(hasSwitcher.value).toBe(true);
		expect(control.value).toBe('segmented');
		expect(placement.value).toBe('top');
		expect(options.value.map((option) => option.key)).toEqual(['week', 'month', 'year']);
		expect(activeKey.value).toBe('week');
		expect(merged.value.type === 'chart' && merged.value.range).toBe('Jul 1 – 7');

		select('year');
		expect(activeKey.value).toBe('year');
		expect(merged.value.type === 'chart' && merged.value.range).toBe('2025');
		// untouched fields fall through from the base card
		expect(merged.value.type === 'chart' && merged.value.series).toBe(DEMO_CARDS.chart.series);

		select('nope');
		expect(activeKey.value).toBe('year');
	});

	it('turns bare variant keys into tabs when there is no switcher', () => {
		const card = ref<ResultCardData>({
			type: 'metric',
			title: 'x',
			value: '1',
			label: 'a',
			variants: { today: { value: '1' }, yesterday: { value: '2' } },
		});
		const { options, control, placement, hasSwitcher } = useResultCardVariants(card);
		expect(hasSwitcher.value).toBe(true);
		expect(control.value).toBe('tabs');
		expect(placement.value).toBe('bottom');
		expect(options.value).toEqual([
			{ key: 'today', label: 'today' },
			{ key: 'yesterday', label: 'yesterday' },
		]);
	});

	it('has no switcher with a single option', () => {
		const { hasSwitcher } = useResultCardVariants(() => DEMO_CARDS.email);
		expect(hasSwitcher.value).toBe(false);
	});
});

describe('N8nResultCard shell', () => {
	it('shows the workflow name as the top line and falls back to the eyebrow', () => {
		const withFooter = renderCard({
			card: DEMO_CARDS.email,
			footer: { workflowName: 'Inbox assistant', time: '12:04' },
		});
		expect(withFooter.getByTestId('result-card-top')).toHaveTextContent('Inbox assistant');
		expect(withFooter.getByText('12:04')).toBeInTheDocument();
		withFooter.unmount();

		const withoutFooter = renderCard({ card: DEMO_CARDS.email });
		expect(withoutFooter.getByTestId('result-card-top')).toHaveTextContent('Gmail · Email sent');
	});

	it('weather: no header row — the card opens with the place; provenance sits in the footer', () => {
		// on the canvas (no footer) the card is the reference card plus the node icons
		const onCanvas = renderCard({ card: DEMO_CARDS.weather });
		expect(onCanvas.container.querySelector('header')).toBeNull();
		expect(onCanvas.queryByTestId('result-card-top')).not.toBeInTheDocument();
		expect(onCanvas.getAllByText('Monday')).toHaveLength(1);
		expect(onCanvas.getByTestId('result-card-weather-day')).toHaveTextContent('Monday');
		onCanvas.unmount();

		// the status badge is drawn by the body beside the place, not by a header
		const withStatus = renderCard({ card: DEMO_CARDS.weatherSources });
		expect(withStatus.container.querySelector('header')).toBeNull();
		expect(withStatus.getByTestId('result-card-status')).toHaveTextContent('Live');
		expect(withStatus.getAllByText('Now · Fri 12:40')).toHaveLength(1);
		withStatus.unmount();

		// in chat the footer carries the workflow name and the time, next to Details
		const inChat = renderCard({
			card: DEMO_CARDS.weather,
			footer: { workflowName: 'Weather check', time: '12:40' },
		});
		expect(inChat.container.querySelector('header')).toBeNull();
		const footer = inChat.container.querySelector('footer');
		expect(footer).toContainElement(inChat.getByTestId('result-card-top'));
		expect(inChat.getByTestId('result-card-top')).toHaveTextContent('Weather check');
		expect(footer).toHaveTextContent('12:40');
		expect(footer).toContainElement(inChat.getByTestId('result-card-toggle'));
		expect(inChat.getAllByText('Monday')).toHaveLength(1);
	});

	it('resolves the tone from the explicit tone, the service or the archetype', () => {
		const cases: Array<[ResultCardData, string]> = [
			[DEMO_CARDS.email, 'paper'],
			[DEMO_CARDS.slack, 'aubergine'],
			[DEMO_CARDS.telegram, 'sky'],
			[DEMO_CARDS.recordsMany, 'forest'],
			[{ ...DEMO_CARDS.metric, nodeType: undefined }, 'terracotta'],
			[DEMO_CARDS.list, 'lavender'],
			[{ ...DEMO_CARDS.slack, tone: 'mint' }, 'mint'],
		];
		for (const [card, tone] of cases) {
			const view = renderCard({ card });
			expect(view.getByTestId('result-card')).toHaveAttribute('data-tone', tone);
			view.unmount();
		}
	});

	it('marks the service and the archetype on the shell', () => {
		const { getByTestId } = renderCard({ card: DEMO_CARDS.slack });
		expect(getByTestId('result-card')).toHaveAttribute('data-service', 'slack');
		expect(getByTestId('result-card')).toHaveAttribute('data-archetype', 'message');
	});

	it('colours the status dot and shows the status badge', () => {
		const { container, getByTestId } = renderCard({ card: DEMO_CARDS.email });
		const dot = container.querySelector('header span[aria-hidden="true"]');
		expect(dot).toHaveClass('dot-success');
		expect(getByTestId('result-card-status')).toHaveTextContent('Sent');
		expect(getByTestId('result-card-status')).toHaveClass('badge-ok');
	});

	it('renders actions as pills at the bottom: links, toggles and events', async () => {
		const { getAllByTestId, emitted } = renderCard({ card: DEMO_CARDS.event });
		const [join, decline] = getAllByTestId('result-card-action');
		expect(join.tagName).toBe('BUTTON');
		expect(join).toHaveClass('primary');
		expect(join).toHaveTextContent('Join call');
		expect(decline).toHaveClass('secondary');

		await fireEvent.click(decline);
		expect(decline).toHaveAttribute('aria-pressed', 'true');
		expect(decline).toHaveAttribute('data-state', 'on');
		expect(decline).toHaveClass('destructive');
		expect(emitted().action).toHaveLength(1);
		expect(emitted().action[0]).toEqual([
			{ action: DEMO_CARDS.event.actions![1], index: 1, state: 'on' },
		]);

		await fireEvent.click(join);
		expect(join).toHaveAttribute('data-state', 'pending');
		expect(join).toHaveAttribute('aria-disabled', 'true');
		await settle();
		expect(join).toHaveTextContent('Connecting…');
		vi.advanceTimersByTime(2000);
		await nextTick();
		expect(join).toHaveAttribute('data-state', 'idle');
	});

	it('keeps an event action done when it has a done label', async () => {
		const { getByTestId } = renderCard({ card: DEMO_CARDS.ticket });
		const checkIn = getByTestId('result-card-action');
		await fireEvent.click(checkIn);
		expect(checkIn).toHaveAttribute('data-state', 'pending');
		vi.advanceTimersByTime(2000);
		await nextTick();
		expect(checkIn).toHaveAttribute('data-state', 'done');
		await settle();
		expect(checkIn).toHaveTextContent('Checked in');
	});

	it('opens the output data in a dialog and emits openExecution', async () => {
		vi.useRealTimers(); // the dialog mounts through a portal; waitFor needs real timers
		const { getByTestId, queryByTestId, getByRole, getByText, emitted } = renderCard({
			card: DEMO_CARDS.metric,
			executionLink: true,
		});
		expect(queryByTestId('result-card-details')).toBeNull();
		expect(getByTestId('result-card-toggle')).toHaveAttribute('aria-haspopup', 'dialog');
		await fireEvent.click(getByTestId('result-card-toggle'));
		await waitFor(() => expect(getByRole('dialog')).toBeInTheDocument());
		expect(getByTestId('result-card-details').textContent).toContain('"type": "metric"');
		await fireEvent.click(getByText('Open execution'));
		expect(emitted().openExecution).toHaveLength(1);
	});

	it('hides the expander when asked', () => {
		const { queryByTestId } = renderCard({ card: DEMO_CARDS.metric, expandable: false });
		expect(queryByTestId('result-card-toggle')).toBeNull();
	});

	it('labels the card region with its title', () => {
		const { getByTestId } = renderCard({ card: DEMO_CARDS.email });
		expect(getByTestId('result-card')).toHaveAttribute('aria-label', DEMO_CARDS.email.title);
	});

	it('renders up to four node icons as a cluster and skips unknown ones', () => {
		const { container } = renderCard({
			card: DEMO_CARDS.email,
			icons: [
				{ type: 'icon', name: 'bot' },
				{ type: 'unknown' },
				{ type: 'icon', name: 'mail' },
				{ type: 'icon', name: 'table' },
				{ type: 'icon', name: 'circle-check' },
				{ type: 'icon', name: 'external-link' },
			],
		});
		expect(container.querySelectorAll('.clusterItem')).toHaveLength(4);
	});

	it('accepts a single icon for back-compat', () => {
		const { container } = renderCard({
			card: DEMO_CARDS.email,
			icon: { type: 'icon', name: 'mail' },
		});
		expect(container.querySelectorAll('.clusterItem')).toHaveLength(1);
	});

	it('adds the global motion class only when animated', () => {
		const animated = render(ResultCard, { props: { card: DEMO_CARDS.keyValuePaper } });
		expect(animated.getByTestId('result-card')).toHaveClass('rc-animated');
		animated.unmount();

		const still = render(ResultCard, {
			props: { card: DEMO_CARDS.keyValuePaper, animated: false },
		});
		expect(still.getByTestId('result-card')).not.toHaveClass('rc-animated');
	});

	it('escapes text and only links https hrefs', () => {
		const { container, getByText } = renderCard({
			card: {
				type: 'list',
				title: '<b>bold</b> title',
				items: [
					{ title: 'Safe', href: 'https://example.com' },
					{ title: 'Unsafe', href: 'javascript:alert(1)' },
				],
				actions: [
					{ label: 'Open site', href: 'https://x.y' },
					{ label: 'Bad', href: 'javascript:alert(1)' },
				],
			},
		});
		expect(getByText('<b>bold</b> title')).toBeInTheDocument();
		expect(container.querySelector('b')).toBeNull();
		const links = Array.from(container.querySelectorAll('a'));
		expect(links.map((link) => link.getAttribute('href'))).toEqual([
			'https://example.com',
			'https://x.y',
		]);
		for (const link of links) {
			expect(link).toHaveAttribute('rel', 'noopener noreferrer');
			expect(link).toHaveAttribute('target', '_blank');
		}
		expect(getByText('Open site').closest('a')).toHaveClass('primary');
		// an action with an unsafe href is still shown, as a plain event pill
		expect(getByText('Bad').closest('button')).not.toBeNull();
	});
});

describe('switchers and variants', () => {
	it('weather: day tabs over the sky switch the variant and animate the body', async () => {
		const { getByTestId, getAllByRole, getByRole, emitted } = renderCard({
			card: DEMO_CARDS.weather,
		});
		const card = getByTestId('result-card');
		expect(card).toHaveClass('onSky');
		expect(card).toHaveAttribute('data-variant', 'mon');
		expect(getByTestId('result-card-weather-temperature').textContent).toBe('24°');
		expect(getByTestId('result-card-weather-condition')).toHaveTextContent('Sunny');
		expect(getByTestId('result-card-weather-day')).toHaveTextContent('Monday');
		expect(getByRole('tablist')).toHaveAttribute('aria-label', 'Forecast days');
		const tabs = getAllByRole('tab');
		expect(tabs).toHaveLength(5);
		expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

		await fireEvent.click(tabs[1]);
		expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
		expect(card).toHaveAttribute('data-variant', 'tue');
		expect(emitted().variantChange).toEqual([['tue']]);
		await settle();
		expect(getByTestId('result-card-weather-temperature').textContent).toBe('19°');
		expect(getByTestId('result-card-weather-condition')).toHaveTextContent('Cloudy');
		expect(getByTestId('result-card-weather-day')).toHaveTextContent('Tuesday');
	});

	it('weather: arrow keys move between day tabs', async () => {
		const { getAllByRole, getByRole, getByTestId } = renderCard({ card: DEMO_CARDS.weather });
		await fireEvent.keyDown(getByRole('tablist'), { key: 'ArrowLeft' });
		expect(getAllByRole('tab')[4]).toHaveAttribute('aria-selected', 'true');
		expect(getByTestId('result-card')).toHaveAttribute('data-variant', 'fri');
	});

	it('chart: period tabs sit under the title and morph the bars, legend and facts', async () => {
		const { container, getByTestId, getAllByRole, getByText, queryByText } = renderCard({
			card: DEMO_CARDS.chart,
		});
		expect(container.querySelector('.head [role="tablist"]')).not.toBeNull();
		expect(container.querySelectorAll('.col')).toHaveLength(7);
		expect(container.querySelectorAll('.seg')).toHaveLength(28);
		expect(container.querySelectorAll('.legend .row')).toHaveLength(4);
		expect(getByText('Atlas Large')).toBeInTheDocument();
		expect(getByText('640K')).toBeInTheDocument();
		expect(getByTestId('result-card-chart-total')).toHaveTextContent('1.7M');
		expect(getByText('Jul 1 – 7')).toBeInTheDocument();
		expect(getByText('Mon')).toBeInTheDocument();

		await fireEvent.click(getAllByRole('tab')[1]);
		await settle();
		expect(getByText('July')).toBeInTheDocument();
		expect(queryByText('Mon')).toBeNull();
		expect(getByText('15')).toBeInTheDocument();
		expect(getByTestId('result-card-chart-total')).toHaveTextContent('6.9M');

		const details = getByTestId('result-card-accordion');
		expect(details).toHaveAttribute('aria-expanded', 'false');
		await fireEvent.click(details);
		expect(details).toHaveAttribute('aria-expanded', 'true');
		expect(getByText('Jul 14')).toBeInTheDocument();
	});

	it('chart: hovering a segment raises the tooltip and dims the other series', async () => {
		const { container, getAllByTestId } = renderCard({ card: DEMO_CARDS.chart });
		const segments = getAllByTestId('result-card-chart-segment');
		await fireEvent.pointerEnter(segments[1], { clientX: 40, clientY: 40 });
		const tip = container.querySelector('.tip');
		expect(tip).toHaveClass('tipOn');
		expect(tip).toHaveTextContent('Atlas Mini · Mon');
		expect(segments[0]).toHaveClass('dim');
		expect(segments[1]).not.toHaveClass('dim');
		await fireEvent.pointerLeave(segments[1]);
		vi.advanceTimersByTime(100);
		await nextTick();
		expect(tip).not.toHaveClass('tipOn');
		expect(segments[0]).not.toHaveClass('dim');
	});

	it('pulse: the menu switches the range; the number pops and the sweep speeds up', async () => {
		const { container, getByTestId, getByRole, getAllByRole } = renderCard({
			card: DEMO_CARDS.pulse,
		});
		expect(getByTestId('result-card-pulse-value')).toHaveTextContent('72');
		expect(getByTestId('result-card-pulse-live')).toBeInTheDocument();
		expect(container.querySelectorAll('.stats > div')).toHaveLength(3);
		expect(container.querySelector('.chart')?.getAttribute('style')).toContain('2.4s');

		await fireEvent.click(getByTestId('result-card-menu'));
		expect(getByRole('menu')).toBeInTheDocument();
		const items = getAllByRole('menuitemradio');
		expect(items.map((item) => item.textContent?.trim())).toEqual(['Resting', 'Active']);
		await fireEvent.click(items[1]);
		expect(getByTestId('result-card')).toHaveAttribute('data-variant', 'active');
		expect(getByTestId('result-card-pulse-value')).toHaveTextContent('118');
		expect(container.querySelector('.chart')?.getAttribute('style')).toContain('1.4s');
	});

	it('ticket: the switch flips the status badge and pops the times', async () => {
		const { container, getByTestId, getByText } = renderCard({ card: DEMO_CARDS.ticket });
		// digits render one glyph per span, so read the whole text of each time slot
		const times = () => Array.from(container.querySelectorAll('.time'), (el) => el.textContent);
		expect(getByText('SFO')).toBeInTheDocument();
		expect(getByText('JFK')).toBeInTheDocument();
		expect(getByTestId('result-card-ticket-badge')).toHaveTextContent('On time');
		expect(getByTestId('result-card-ticket-badge')).toHaveClass('tone-ok');
		expect(times()).toEqual(['08:45', '17:05']);
		expect(getByText('B12')).toBeInTheDocument();
		expect(getByText('Maya Chen')).toBeInTheDocument();
		expect(container.querySelector('.grid')).toHaveTextContent('08:05');

		const toggle = getByTestId('result-card-switch');
		expect(toggle).toHaveAttribute('aria-checked', 'false');
		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute('aria-checked', 'true');
		expect(getByTestId('result-card')).toHaveAttribute('data-variant', 'live');
		await settle();
		expect(getByTestId('result-card-ticket-badge')).toHaveTextContent('Delayed');
		expect(getByTestId('result-card-ticket-badge')).toHaveClass('tone-warn');
		expect(times()).toEqual(['09:25', '17:45']);
		expect(container.querySelector('.grid')).toHaveTextContent('08:45'); // boarding moved too
	});

	it('metric: segmented tabs above the body swap the number, delta and bars', async () => {
		const { container, getByTestId, getAllByRole, getByText } = renderCard({
			card: DEMO_CARDS.metric,
		});
		expect(container.querySelector('.topSwitcher [role="tablist"]')).not.toBeNull();
		expect(getByTestId('result-card-metric-value')).toHaveTextContent('12');
		expect(getByTestId('result-card-metric-delta')).toHaveClass('delta-up');
		expect(container.querySelectorAll('.bar')).toHaveLength(3);
		expect(getByText('LinkedIn')).toBeInTheDocument();

		await fireEvent.click(getAllByRole('tab')[1]);
		await settle();
		expect(getByTestId('result-card-metric-value')).toHaveTextContent('41');
		expect(getByTestId('result-card-metric-delta')).toHaveClass('delta-down');
		expect(getByText('19')).toBeInTheDocument();
	});
});

describe('bodies', () => {
	it('event: date tile, meta rows, directions link and an attendees accordion', async () => {
		const { getByTestId, getByText, container } = renderCard({ card: DEMO_CARDS.event });
		expect(container.querySelector('.map')).not.toBeNull();
		expect(getByTestId('result-card-event-date')).toHaveTextContent('Thu');
		expect(getByTestId('result-card-event-date')).toHaveTextContent('14');
		expect(getByText('Launch review')).toBeInTheDocument();
		expect(getByText(/Google Meet/)).toBeInTheDocument();
		expect(getByText('Studio 4, 210 Market St')).toBeInTheDocument();
		expect(getByTestId('result-card-learn-link')).toHaveAttribute(
			'href',
			'https://maps.google.com/?q=210+Market+St',
		);

		const head = getByTestId('result-card-accordion');
		expect(head).toHaveTextContent('Attendees');
		expect(head).toHaveTextContent('5 going');
		expect(head).toHaveAttribute('aria-expanded', 'false');
		await fireEvent.click(head);
		expect(head).toHaveAttribute('aria-expanded', 'true');
		expect(container.querySelectorAll('[role="img"][aria-label="Maya Chen"]')).toHaveLength(1);
		expect(container.querySelectorAll('.group .avatar')).toHaveLength(5);
		expect(getByText('Maya, Leo and 3 others')).toBeInTheDocument();
	});

	it('event: skips the map, the tile and the accordion when the data is absent', () => {
		const { container, queryByTestId } = renderCard({
			card: { type: 'event', title: 'Standup', when: 'Daily · 9:00' },
		});
		expect(container.querySelector('.map')).toBeNull();
		expect(queryByTestId('result-card-event-date')).toBeNull();
		expect(queryByTestId('result-card-accordion')).toBeNull();
		expect(container).toHaveTextContent('Daily · 9:00');
	});

	it('caps records rows at 3 and reports the remainder', () => {
		const { container, getByText } = renderCard({ card: DEMO_CARDS.recordsMany });
		expect(DEMO_CARDS.recordsMany.rows).toHaveLength(5);
		expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
		expect(getByText('Marta Nowak')).toBeInTheDocument();
		expect(getByText('+9 more')).toBeInTheDocument();
	});

	it('caps list items at 4 and reports the remainder', () => {
		const items = Array.from({ length: 6 }, (_, index) => ({ title: `Item ${index + 1}` }));
		const { container, getByText } = renderCard({
			card: { ...DEMO_CARDS.list, items, total: undefined },
		});
		expect(container.querySelectorAll('ol li')).toHaveLength(4);
		expect(getByText('+2 more')).toBeInTheDocument();
	});

	it('turns the first short pair into the lead stat and caps the rest at 5', () => {
		const pairs = Array.from({ length: 8 }, (_, index) => ({
			key: `Key ${index + 1}`,
			value: `Value ${index + 1}`,
		}));
		const { container, getByText } = renderCard({
			card: { ...DEMO_CARDS.keyValue, cover: undefined, pairs },
		});
		expect(getByText('Value 1').closest('.leadValue')).not.toBeNull();
		expect(container.querySelectorAll('dt')).toHaveLength(5);
	});

	it('keeps a long first pair in the grid instead of making it the lead', () => {
		const { container } = renderCard({
			card: {
				...DEMO_CARDS.keyValue,
				cover: undefined,
				pairs: [
					{ key: 'Next tournament', value: 'Warsaw Open · 3 Oct 2026' },
					{ key: 'Points', value: '312' },
				],
			},
		});
		expect(container.querySelector('.leadValue')).toBeNull();
		expect(container.querySelectorAll('dt')).toHaveLength(2);
	});

	it('hides a metric caption that merely repeats the node name', () => {
		const withCaption = renderCard({
			card: { ...DEMO_CARDS.metric, title: 'Leads this week', nodeName: 'Weekly summary' },
		});
		expect(withCaption.container.querySelector('.caption')).toHaveTextContent('Leads this week');
		withCaption.unmount();

		const withoutCaption = renderCard({
			card: { ...DEMO_CARDS.metric, title: 'Weekly summary', nodeName: 'Weekly summary' },
		});
		expect(withoutCaption.container.querySelector('.caption')).toBeNull();
	});

	it('draws a sparkline for a trend-only metric', () => {
		const { container, getByTestId } = renderCard({ card: DEMO_CARDS.metricTrend });
		expect(getByTestId('result-card')).toHaveAttribute('data-tone', 'graphite');
		expect(getByTestId('result-card-metric-value')).toHaveTextContent('31');
		expect(container.querySelectorAll('polyline')).toHaveLength(1);
		expect(container.querySelectorAll('.bar')).toHaveLength(0);
	});

	it('renders the email with the counterpart, subject, preview and capped chips', () => {
		const { container, getByText } = renderCard({
			card: { ...DEMO_CARDS.email, attachments: ['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf'] },
		});
		expect(getByText('Re: Invoice #1042')).toBeInTheDocument();
		expect(getByText('To')).toBeInTheDocument();
		expect(getByText('anna.kowalski@allegro.pl')).toBeInTheDocument();
		expect(container.querySelectorAll('.chip')).toHaveLength(4);
		expect(getByText('c.pdf')).toBeInTheDocument();
		expect(container.textContent).not.toContain('d.pdf');
		expect(getByText('+1 more')).toBeInTheDocument();
	});

	it('renders slack messages as a channel post and telegram as a bubble', () => {
		const slack = renderCard({ card: DEMO_CARDS.slack });
		expect(slack.getByText('#marketing-feedback')).toBeInTheDocument();
		expect(slack.container.querySelector('.post')).not.toBeNull();
		expect(slack.container.querySelector('.bubbleBox')).toBeNull();
		slack.unmount();

		const telegram = renderCard({ card: DEMO_CARDS.telegram });
		expect(telegram.container.querySelector('.bubbleBox')).not.toBeNull();
		expect(telegram.getByText('Jan')).toBeInTheDocument();
		expect(telegram.getByText(DEMO_CARDS.telegram.text)).toBeInTheDocument();
	});

	it('weather: a single-day card shows the detail line and skips the strip', () => {
		const { getByTestId, queryByRole } = renderCard({ card: DEMO_CARDS.weatherSources });
		expect(getByTestId('result-card-weather-temperature').textContent).toBe('14°');
		expect(getByTestId('result-card-weather-details').textContent).toContain('Feels 12°');
		expect(getByTestId('result-card-weather-details').textContent).toContain('78%');
		expect(getByTestId('result-card-weather-details').textContent).toContain('21 km/h W');
		expect(queryByRole('tablist')).toBeNull();
	});

	it('renders an unsplash cover and ignores other hosts', () => {
		const safe = renderCard({ card: DEMO_CARDS.keyValue });
		expect(DEMO_CARDS.keyValue.cover?.src.startsWith('https://images.unsplash.com/')).toBe(true);
		expect(safe.container.querySelector('.cover')).not.toBeNull();
		safe.unmount();

		const unsafe = renderCard({
			card: { ...DEMO_CARDS.keyValue, cover: { src: 'https://evil.example/x.jpg' } },
		});
		expect(unsafe.container.querySelector('.cover')).toBeNull();
		expect(unsafe.container.innerHTML).not.toContain('evil.example');
	});
});
