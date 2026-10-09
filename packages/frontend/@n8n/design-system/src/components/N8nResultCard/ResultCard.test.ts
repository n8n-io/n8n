import { fireEvent, render } from '@testing-library/vue';

import ResultCard from './ResultCard.vue';
import type { ResultCardData, ResultCardProps } from './ResultCard.types';
import { DEMO_CARDS } from './demoCards';
import { resolveResultCardService, resolveResultCardTone } from './tones';
import { formatDisplayNumber, isSafeCoverSrc, parseDisplayNumber, stagger } from './utils';

/** Motion is off by default so bodies render their final state synchronously. */
const renderCard = (props: ResultCardProps) =>
	render(ResultCard, { props: { animated: false, ...props } });

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
		expect(resolveResultCardTone({ type: 'list', nodeType: 'n8n-nodes-community.foo' }).id).toBe(
			'lavender',
		);
	});

	it('flags light and dark tones', () => {
		expect(resolveResultCardTone({ type: 'metric' }).kind).toBe('dark');
		expect(resolveResultCardTone({ type: 'email' }).kind).toBe('light');
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
	it('parses and formats display numbers', () => {
		expect(parseDisplayNumber('12')).toEqual({ value: 12, decimals: 0 });
		expect(parseDisplayNumber('1,204')).toEqual({ value: 1204, decimals: 0 });
		expect(parseDisplayNumber('9,787.32')).toEqual({ value: 9787.32, decimals: 2 });
		expect(parseDisplayNumber('-3')).toEqual({ value: -3, decimals: 0 });
		expect(parseDisplayNumber('$12')).toBeNull();
		expect(parseDisplayNumber('12%')).toBeNull();
		expect(parseDisplayNumber('')).toBeNull();
		expect(formatDisplayNumber(1204, 0)).toBe('1,204');
		expect(formatDisplayNumber(9787.3, 2)).toBe('9,787.30');
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

describe('N8nResultCard', () => {
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

	it('marks light and dark tones and the service on the shell', () => {
		const light = renderCard({ card: DEMO_CARDS.email });
		expect(light.getByTestId('result-card')).toHaveClass('light');
		expect(light.getByTestId('result-card')).toHaveAttribute('data-service', 'gmail');
		light.unmount();

		const dark = renderCard({ card: DEMO_CARDS.slack });
		expect(dark.getByTestId('result-card')).toHaveClass('dark');
		expect(dark.getByTestId('result-card')).toHaveAttribute('data-archetype', 'message');
	});

	it('colours the status dot', () => {
		const { container } = renderCard({ card: DEMO_CARDS.email });
		const dot = container.querySelector('header span[aria-hidden="true"]');
		expect(dot).toHaveClass('dot-success');
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
		expect(getByText('Value 1')).toHaveClass('leadValue');
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

	it('renders the metric value immediately without motion, one bar per breakdown row', () => {
		const { container, getByTestId, getByText } = renderCard({ card: DEMO_CARDS.metric });
		expect(getByTestId('result-card-metric-value')).toHaveTextContent('12');
		expect(getByText('new leads since Monday')).toBeInTheDocument();
		expect(container.querySelectorAll('.bar')).toHaveLength(DEMO_CARDS.metric.breakdown!.length);
		expect(getByText('LinkedIn')).toBeInTheDocument();
		expect(container.querySelector('polyline')).toBeNull();
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

	it('renders the email as a letter with capped chips', () => {
		const { container, getByText } = renderCard({
			card: { ...DEMO_CARDS.email, attachments: ['a.pdf', 'b.pdf', 'c.pdf'] },
		});
		expect(getByText('Re: Invoice #1042')).toBeInTheDocument();
		expect(getByText('To')).toBeInTheDocument();
		expect(getByText('anna.kowalski@allegro.pl')).toBeInTheDocument();
		expect(container.querySelectorAll('li')).toHaveLength(3);
		expect(getByText('a.pdf')).toBeInTheDocument();
		expect(getByText('b.pdf')).toBeInTheDocument();
		expect(container.textContent).not.toContain('c.pdf');
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
		// the hero sentence already names the recipient; the bubble must not repeat it
		expect(telegram.queryByText('Jan')).toBeNull();
		expect(telegram.getByText(DEMO_CARDS.telegram.title)).toBeInTheDocument();
	});

	it('renders a weather card: rounded hero, detail line, one chip per source, agreement, forecast', () => {
		const { container, getByTestId, getByText } = renderCard({ card: DEMO_CARDS.weather });
		expect(getByText('Lisbon, Portugal')).toBeInTheDocument();
		expect(getByTestId('result-card-weather-temperature').textContent).toBe('14°C');
		expect(getByText('Light rain')).toBeInTheDocument();
		expect(getByTestId('result-card-weather-details').textContent).toContain('Feels 12°');
		expect(getByTestId('result-card-weather-details').textContent).toContain('78%');
		expect(getByTestId('result-card-weather-details').textContent).toContain('21 km/h W');
		expect(getByTestId('result-card-weather-details').textContent).toContain('H 16° L 9°');
		expect(getByTestId('result-card-weather-sources').children).toHaveLength(3);
		expect(getByText('Open-Meteo')).toBeInTheDocument();
		expect(getByText('3 sources within 1.4°')).toBeInTheDocument();
		expect(getByTestId('result-card-weather-forecast').children).toHaveLength(5);
		expect(container.querySelector('article')?.getAttribute('data-tone')).toBe('sky');
	});

	it('hides the weather parts that are absent and skips the agreement line for one source', () => {
		const { queryByTestId, queryByText, getByTestId } = renderCard({
			card: {
				type: 'weather',
				title: 'Berlin',
				location: 'Berlin',
				temperature: 3.6,
				unit: 'F',
				condition: 'Snow',
				icon: 'snow',
				sources: [{ name: 'Open-Meteo', temperature: 3.6 }],
			},
		});
		expect(getByTestId('result-card-weather-temperature').textContent).toBe('4°F');
		expect(queryByTestId('result-card-weather-details')).toBeNull();
		expect(queryByTestId('result-card-weather-forecast')).toBeNull();
		expect(queryByText(/sources within/)).toBeNull();
	});

	it('renders an unsplash cover and ignores other hosts', () => {
		const safe = renderCard({ card: DEMO_CARDS.keyValue });
		expect(DEMO_CARDS.keyValue.cover?.src.startsWith('https://images.unsplash.com/')).toBe(true);
		expect(safe.container.querySelector('.cover')).not.toBeNull();
		expect(safe.getByTestId('result-card')).toHaveClass('covered');
		expect(safe.getByTestId('result-card')).toHaveClass('dark');
		safe.unmount();

		const unsafe = renderCard({
			card: { ...DEMO_CARDS.keyValue, cover: { src: 'https://evil.example/x.jpg' } },
		});
		expect(unsafe.container.querySelector('.cover')).toBeNull();
		expect(unsafe.getByTestId('result-card')).not.toHaveClass('covered');
		expect(unsafe.getByTestId('result-card').getAttribute('style')).not.toContain('evil.example');
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
					{ label: 'Open', href: 'https://x.y' },
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
		expect(getByText('Open')).toHaveClass('pillPrimary');
		expect(container.textContent).not.toContain('Bad');
	});

	it('toggles details and emits openExecution', async () => {
		const { getByText, getByTestId, queryByTestId, emitted } = renderCard({
			card: DEMO_CARDS.metric,
			executionLink: true,
		});
		expect(queryByTestId('result-card-details')).toBeNull();
		expect(getByTestId('result-card-toggle')).toHaveAttribute('aria-expanded', 'false');
		await fireEvent.click(getByText('Details'));
		expect(queryByTestId('result-card-details')).not.toBeNull();
		expect(getByTestId('result-card-toggle')).toHaveAttribute('aria-expanded', 'true');
		expect(getByTestId('result-card-toggle')).toHaveAttribute(
			'aria-controls',
			getByTestId('result-card-details').id,
		);
		await fireEvent.click(getByText('Open execution'));
		expect(emitted().openExecution).toHaveLength(1);
		await fireEvent.click(getByText('Hide details'));
		expect(queryByTestId('result-card-details')).toBeNull();
	});

	it('hides the expander and the execution link when asked', () => {
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
});
