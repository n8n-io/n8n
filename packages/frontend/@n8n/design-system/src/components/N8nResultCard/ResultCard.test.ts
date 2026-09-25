import { fireEvent, render } from '@testing-library/vue';

import ResultCard from './ResultCard.vue';
import { DEMO_CARDS } from './demoCards';
import { resolveResultCardSkin } from './skins';

describe('resolveResultCardSkin', () => {
	it('maps base node types (with Tool / Trigger suffixes) to skins and falls back to neutral', () => {
		expect(resolveResultCardSkin('n8n-nodes-base.slackTool').id).toBe('slack');
		expect(resolveResultCardSkin('n8n-nodes-base.gmailTrigger').id).toBe('gmail');
		expect(resolveResultCardSkin(undefined).id).toBe('neutral');
		expect(resolveResultCardSkin('n8n-nodes-community.foo').id).toBe('neutral');
	});
});

describe('N8nResultCard', () => {
	it('renders the shell with eyebrow, title, status and footer', () => {
		const { getByText, getByTestId } = render(ResultCard, {
			props: {
				card: DEMO_CARDS.email,
				footer: { workflowName: 'Inbox assistant', time: '12:04' },
			},
		});
		expect(getByTestId('result-card')).toHaveAttribute('data-skin', 'gmail');
		expect(getByText('Gmail · Email sent')).toBeInTheDocument();
		expect(getByText('Reply sent to Anna Kowalski')).toBeInTheDocument();
		expect(getByText('Sent')).toBeInTheDocument();
		expect(getByText('via Inbox assistant')).toBeInTheDocument();
	});

	it('renders each archetype body', () => {
		// Each render is unmounted before the next: render() queries are bound to
		// document.body, and demo cards share strings (e.g. 'LinkedIn').
		const email = render(ResultCard, { props: { card: DEMO_CARDS.email } });
		expect(email.getByText('anna.kowalski@allegro.pl')).toBeInTheDocument();
		expect(email.getByText('invoice-1042.pdf')).toBeInTheDocument();
		email.unmount();

		const records = render(ResultCard, { props: { card: DEMO_CARDS.recordsMany } });
		expect(records.getByText('Marta Nowak')).toBeInTheDocument();
		expect(records.getByText('+7 more')).toBeInTheDocument();
		records.unmount();

		const metric = render(ResultCard, { props: { card: DEMO_CARDS.metric } });
		expect(metric.getByText('12')).toBeInTheDocument();
		expect(metric.getByText('LinkedIn')).toBeInTheDocument();
		metric.unmount();

		const message = render(ResultCard, { props: { card: DEMO_CARDS.slack } });
		expect(message.getByText('#marketing-feedback')).toBeInTheDocument();
		message.unmount();

		const keyValue = render(ResultCard, { props: { card: DEMO_CARDS.keyValue } });
		expect(keyValue.getByText('#184')).toBeInTheDocument();
	});

	it('escapes text and only links https hrefs', () => {
		const { container, getByText } = render(ResultCard, {
			props: {
				card: {
					type: 'list',
					title: '<b>bold</b> title',
					items: [
						{ title: 'Safe', href: 'https://example.com' },
						{ title: 'Unsafe', href: 'javascript:alert(1)' },
					],
				},
			},
		});
		expect(getByText('<b>bold</b> title')).toBeInTheDocument();
		expect(container.querySelector('b')).toBeNull();
		const links = container.querySelectorAll('a');
		expect(links).toHaveLength(1);
		expect(links[0]).toHaveAttribute('href', 'https://example.com');
		expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('toggles details and emits openExecution', async () => {
		const { getByText, queryByTestId, emitted } = render(ResultCard, {
			props: { card: DEMO_CARDS.metric, executionLink: true },
		});
		expect(queryByTestId('result-card-details')).toBeNull();
		await fireEvent.click(getByText('Details'));
		expect(queryByTestId('result-card-details')).not.toBeNull();
		await fireEvent.click(getByText('Open execution'));
		expect(emitted().openExecution).toHaveLength(1);
	});

	it('falls back to the neutral skin and a generic status label', () => {
		const { getByTestId, getByText } = render(ResultCard, {
			props: {
				card: {
					...DEMO_CARDS.keyValue,
					nodeType: 'n8n-nodes-community.foo',
					statusLabel: undefined,
				},
			},
		});
		expect(getByTestId('result-card')).toHaveAttribute('data-skin', 'neutral');
		expect(getByText('Info')).toBeInTheDocument();
	});

	it('falls back to the generic status label when statusLabel is an empty string', () => {
		const { getByText } = render(ResultCard, {
			props: { card: { ...DEMO_CARDS.keyValue, status: 'success', statusLabel: '' } },
		});
		expect(getByText('Done')).toBeInTheDocument();
	});

	it('renders only safe action links, without empty list items', () => {
		const { container } = render(ResultCard, {
			props: {
				card: {
					...DEMO_CARDS.keyValue,
					actions: [
						{ label: 'Open', href: 'https://x.y' },
						{ label: 'Bad', href: 'javascript:alert(1)' },
					],
				},
			},
		});
		const links = container.querySelectorAll('a');
		expect(links).toHaveLength(1);
		expect(links[0]).toHaveAttribute('href', 'https://x.y');
		expect(links[0]).toHaveTextContent('Open');
		expect(container.querySelectorAll('li')).toHaveLength(1);
	});

	it('caps records rows at 5 and reports the remainder', () => {
		const rows = Array.from({ length: 7 }, (_, index) => [`Row ${index + 1}`, 'x', 'y', 'z']);
		const { container, getByText } = render(ResultCard, {
			props: { card: { ...DEMO_CARDS.records, rows, total: 7 } },
		});
		expect(container.querySelectorAll('tbody tr')).toHaveLength(5);
		expect(getByText('+2 more')).toBeInTheDocument();
	});

	it('caps list items at 5 and reports the remainder', () => {
		const items = Array.from({ length: 6 }, (_, index) => ({ title: `Item ${index + 1}` }));
		const { container, getByText } = render(ResultCard, {
			props: { card: { ...DEMO_CARDS.list, items, total: undefined } },
		});
		expect(container.querySelectorAll('ol li')).toHaveLength(5);
		expect(getByText('+1 more')).toBeInTheDocument();
	});

	it('caps key/value pairs at 6', () => {
		const pairs = Array.from({ length: 8 }, (_, index) => ({
			key: `Key ${index + 1}`,
			value: `Value ${index + 1}`,
		}));
		const { container } = render(ResultCard, {
			props: { card: { ...DEMO_CARDS.keyValue, pairs } },
		});
		expect(container.querySelectorAll('dt')).toHaveLength(6);
	});
});
