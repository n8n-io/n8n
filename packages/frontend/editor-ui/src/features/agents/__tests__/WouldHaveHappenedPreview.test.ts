import { createTestingPinia } from '@pinia/testing';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { I18nClass } from '@n8n/i18n';
import { describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { mockedStore } from '@/__tests__/utils';
import WouldHaveHappenedPreview from '../components/testRun/WouldHaveHappenedPreview.vue';
import WouldHaveHappenedSummary from '../components/testRun/WouldHaveHappenedSummary.vue';
import type { WouldHaveHappenedPreview as Preview } from '../components/testRun/wouldHaveHappened.types';

const renderPreview = createComponentRenderer(WouldHaveHappenedPreview);
const renderSummary = createComponentRenderer(WouldHaveHappenedSummary);

function render(preview: Preview) {
	return renderPreview({ props: { preview }, pinia: createTestingPinia() });
}

function card(container: Element) {
	const element = container.querySelector('[data-test-id="would-have-happened-card"]');
	if (!(element instanceof HTMLElement)) throw new Error('Card not rendered');
	return element;
}

function field(container: Element, label: string): string | undefined {
	const term = [...container.querySelectorAll('dt')].find((dt) => dt.textContent?.trim() === label);
	return term?.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim();
}

function expectNoMissingValueText(container: Element) {
	expect(container.textContent).not.toMatch(/undefined|null|NaN|\[object Object\]/);
}

const LONG_BODY = Array.from(
	{ length: 12 },
	(_, index) => `Line ${index + 1}: thanks for your patience while we look into the refund.`,
).join('\n');

describe('WouldHaveHappenedPreview', () => {
	describe('email', () => {
		const email: Preview = {
			kind: 'email',
			toolName: 'send_refund_email',
			app: { name: 'Gmail', nodeType: 'n8n-nodes-base.gmail' },
			to: ['ana@example.com'],
			cc: ['support-leads@example.com'],
			subject: 'Your refund for order #4821',
			body: 'Hi Ana,\n\nWe issued a refund of $42.00. It reaches your card in 3–5 days.\n\nBest,\nSupport',
		};

		it('shows the recipients, subject, body, and not sent marker', () => {
			const { container, getByText } = render(email);
			const root = card(container);

			expect(within(root).getByText('Email')).toBeInTheDocument();
			expect(within(root).getByTestId('would-have-happened-meta')).toHaveTextContent(
				'Gmail · send_refund_email',
			);
			expect(within(root).getByTestId('would-have-happened-not-sent')).toHaveTextContent(
				'Not sent in this test run',
			);
			expect(field(root, 'To')).toBe('ana@example.com');
			expect(field(root, 'Cc')).toBe('support-leads@example.com');
			expect(getByText('Your refund for order #4821')).toBeInTheDocument();
			expect(root.textContent).toContain('We issued a refund of $42.00.');
			expect(root).toHaveAttribute('aria-label', 'Email');
		});

		it('collapses many recipients and expands them on request', async () => {
			const to = Array.from({ length: 7 }, (_, index) => `person${index + 1}@example.com`);
			const { container, getByTestId } = render({ ...email, to, cc: undefined });
			const root = card(container);

			expect(getByTestId('would-have-happened-list')).toHaveTextContent(
				'person1@example.com, person2@example.com, person3@example.com',
			);
			expect(getByTestId('would-have-happened-list-toggle')).toHaveTextContent('+4 more');
			expect(root.textContent).not.toContain('person4@example.com');

			await userEvent.click(getByTestId('would-have-happened-list-toggle'));

			expect(field(root, 'To')).toContain('person7@example.com');
			expect(getByTestId('would-have-happened-list-toggle')).toHaveTextContent('Show less');
		});

		it('clamps a long body and expands it on request', async () => {
			const { container, getByTestId } = render({ ...email, body: LONG_BODY });
			const root = card(container);

			expect(root.textContent).not.toContain('Line 12:');
			expect(getByTestId('would-have-happened-text-toggle')).toHaveTextContent('Show more');

			await userEvent.click(getByTestId('would-have-happened-text-toggle'));

			expect(root.textContent).toContain('Line 12:');
			expect(getByTestId('would-have-happened-text-toggle')).toHaveTextContent('Show less');
		});

		it('keeps the line breaks of the body exactly', () => {
			const { getAllByTestId } = render(email);
			const body = getAllByTestId('would-have-happened-text').at(-1);

			expect(body?.textContent).toBe(
				'Hi Ana,\n\nWe issued a refund of $42.00. It reaches your card in 3–5 days.\n\nBest,\nSupport',
			);
		});

		it('shows HTML in the body as text', () => {
			const body = '<p>Hello <b>Ana</b></p><script>alert(1)</script><img src=x onerror=alert(1)>';
			const { container } = render({ ...email, body });
			const root = card(container);

			expect(root.textContent).toContain(body);
			expect(root.querySelector('script, img, b')).toBeNull();
		});

		it('omits missing fields', () => {
			const { container } = render({
				kind: 'email',
				toolName: 'send_email',
				to: ['ana@example.com', '  '],
				cc: [],
				subject: '   ',
			});
			const root = card(container);

			expect(field(root, 'To')).toBe('ana@example.com');
			expect(field(root, 'Cc')).toBeUndefined();
			expect(within(root).queryByTestId('would-have-happened-text')).toBeNull();
			expect(within(root).getByTestId('would-have-happened-meta')).toHaveTextContent('send_email');
			expectNoMissingValueText(root);
		});

		it('shows an empty message when nothing was captured', () => {
			const { container } = render({ kind: 'email', toolName: 'send_email', to: [] });

			expect(within(card(container)).getByTestId('would-have-happened-empty')).toHaveTextContent(
				'No details',
			);
			expectNoMissingValueText(container);
		});
	});

	describe('chat message', () => {
		it('shows the channel and message text', () => {
			const { container } = render({
				kind: 'chatMessage',
				toolName: 'post_to_support',
				app: { name: 'Slack' },
				channel: '#support-escalations',
				text: 'Heads up: order #4821 was refunded. *No action needed.*',
			});
			const root = card(container);

			expect(within(root).getByText('Message')).toBeInTheDocument();
			expect(within(root).getByTestId('would-have-happened-meta')).toHaveTextContent(
				'Slack · post_to_support',
			);
			expect(field(root, 'Channel')).toBe('#support-escalations');
			// Markdown shows as written.
			expect(root.textContent).toContain('*No action needed.*');
			expect(root.querySelector('em, strong')).toBeNull();
			expect(within(root).getByTestId('would-have-happened-not-sent')).toBeInTheDocument();
		});

		it('shows the recipient of a direct message and omits the channel', () => {
			const { container } = render({
				kind: 'chatMessage',
				toolName: 'dm_user',
				recipient: 'Ana Silva',
				text: 'Your refund is on its way.',
			});
			const root = card(container);

			expect(field(root, 'To')).toBe('Ana Silva');
			expect(field(root, 'Channel')).toBeUndefined();
			expectNoMissingValueText(root);
		});
	});

	describe('issue', () => {
		it('shows the title, project, assignee, labels, and description', () => {
			const { container, getByText } = render({
				kind: 'issue',
				toolName: 'create_ticket',
				app: { name: 'Linear' },
				project: 'Support',
				title: 'Refund failed for order #4821',
				description: 'Stripe returned card_declined. Customer asked twice.',
				assignee: 'Rodrigo',
				labels: ['bug', 'billing'],
			});
			const root = card(container);

			expect(within(root).getByText('Issue')).toBeInTheDocument();
			expect(getByText('Refund failed for order #4821')).toBeInTheDocument();
			expect(field(root, 'Project')).toBe('Support');
			expect(field(root, 'Assignee')).toBe('Rodrigo');
			expect(field(root, 'Labels')).toBe('bug, billing');
			expect(root.textContent).toContain('Stripe returned card_declined.');
		});

		it('clamps a very long title and keeps the rest of the card', async () => {
			const title = `Refund failed ${'because the payment provider timed out '.repeat(10)}`;
			const { container, getByTestId } = render({
				kind: 'issue',
				toolName: 'create_ticket',
				title,
			});
			const root = card(container);

			expect(getByTestId('would-have-happened-text').textContent?.endsWith('…')).toBe(true);
			expect(within(root).getByTestId('would-have-happened-not-sent')).toBeInTheDocument();

			await userEvent.click(getByTestId('would-have-happened-text-toggle'));

			expect(getByTestId('would-have-happened-text')).toHaveTextContent(title.trim());
		});

		it('omits missing fields', () => {
			const { container } = render({
				kind: 'issue',
				toolName: 'create_ticket',
				title: 'Refund failed',
				labels: [],
			});
			const root = card(container);

			expect(root.querySelector('dl')).toBeNull();
			expectNoMissingValueText(root);
		});
	});

	describe('table row', () => {
		it('shows the table and each column value', () => {
			const { container } = render({
				kind: 'tableRow',
				toolName: 'log_refund',
				app: { name: 'Google Sheets' },
				table: 'Refunds 2026',
				columns: {
					Order: '#4821',
					Amount: 42,
					Approved: true,
					Tags: ['refund', 'card'],
					Notes: null,
					Reviewer: undefined,
					Blank: '',
				},
			});
			const root = card(container);

			expect(within(root).getByText('Table row')).toBeInTheDocument();
			expect(field(root, 'Table')).toBe('Refunds 2026');
			expect(field(root, 'Order')).toBe('#4821');
			expect(field(root, 'Amount')).toBe('42');
			expect(field(root, 'Approved')).toBe('true');
			expect(field(root, 'Tags')).toBe('refund, card');
			// Set-but-empty values can clear real data, so they are shown.
			expect(field(root, 'Notes')).toBe('null');
			expect(field(root, 'Blank')).toBe('""');
			expect(field(root, 'Reviewer')).toBeUndefined();
			expect(root.textContent).not.toMatch(/undefined|NaN|\[object Object\]/);
		});

		it('says when the row has no values', () => {
			const { container } = render({
				kind: 'tableRow',
				toolName: 'log_refund',
				table: 'Refunds 2026',
				columns: {},
			});

			expect(card(container).textContent).toContain('No values');
		});
	});

	describe('calendar event', () => {
		it('shows the title, time, location, and attendees', () => {
			const { container, getByText } = render({
				kind: 'calendarEvent',
				toolName: 'book_call',
				app: { name: 'Google Calendar' },
				title: 'Refund follow-up with Ana',
				start: 'Fri 14 Nov, 10:00',
				end: '10:30',
				location: 'Google Meet',
				attendees: ['ana@example.com', 'support@example.com'],
				description: 'Confirm the refund arrived.',
			});
			const root = card(container);

			expect(within(root).getByText('Calendar event')).toBeInTheDocument();
			expect(getByText('Refund follow-up with Ana')).toBeInTheDocument();
			expect(field(root, 'When')).toBe('Fri 14 Nov, 10:00 – 10:30');
			expect(field(root, 'Location')).toBe('Google Meet');
			expect(field(root, 'Attendees')).toBe('ana@example.com, support@example.com');
			expect(root.textContent).toContain('Confirm the refund arrived.');
		});

		it("formats dates in the app's language, not the browser's", () => {
			const spy = vi.spyOn(I18nClass.prototype, 'locale', 'get').mockReturnValue('de-DE');
			try {
				const { container } = render({
					kind: 'calendarEvent',
					toolName: 'book_call',
					start: '2026-11-14',
				});
				expect(field(card(container), 'When')).toContain('14.11.2026');
			} finally {
				spy.mockRestore();
			}
		});

		it('formats ISO dates for the reader', () => {
			const { container } = render({
				kind: 'calendarEvent',
				toolName: 'book_call',
				start: '2026-11-14',
			});
			const when = field(card(container), 'When');

			expect(when).toMatch(/^Starts /);
			expect(when).toContain('2026');
			expect(when).not.toContain('2026-11-14');
		});

		it('omits a missing time and attendees', () => {
			const { container } = render({
				kind: 'calendarEvent',
				toolName: 'book_call',
				title: 'Refund follow-up',
				attendees: [],
			});
			const root = card(container);

			expect(field(root, 'When')).toBeUndefined();
			expect(field(root, 'Attendees')).toBeUndefined();
			expectNoMissingValueText(root);
		});
	});

	describe('generic', () => {
		it('shows the fields of a kind this client does not know', () => {
			const { container } = render({
				kind: 'smsMessage',
				toolName: 'send_sms',
				app: { name: 'Twilio' },
				to: '+15550100',
				text: 'Your refund is on its way',
			} as unknown as Preview);
			const root = card(container);

			expect(field(root, 'to')).toBe('+15550100');
			expect(field(root, 'text')).toBe('Your refund is on its way');
			expect(root.textContent).not.toContain('No input');
		});

		it('ties each expand toggle to the content it expands', async () => {
			const { container } = render({
				kind: 'email',
				toolName: 'send_email',
				to: ['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com', 'e@example.com'],
				body: LONG_BODY,
			});
			const toggles = [
				...container.querySelectorAll<HTMLElement>(
					'[data-test-id="would-have-happened-list-toggle"], [data-test-id="would-have-happened-text-toggle"]',
				),
			];

			expect(toggles.length).toBeGreaterThanOrEqual(2);
			const ids = toggles.map((toggle) => toggle.getAttribute('aria-controls'));
			expect(new Set(ids).size).toBe(ids.length);
			for (const id of ids) {
				expect(id).toBeTruthy();
				expect(container.querySelector(`[id="${id}"]`)).not.toBeNull();
			}
		});

		it('shows inputs that clear a value instead of saying there is no input', () => {
			const { container } = render({
				kind: 'generic',
				toolName: 'update_issue',
				input: {
					assignee: null,
					description: '',
					labels: [],
					extra: undefined,
					cleared: [null, ''],
					mixed: ['existing', null, ''],
				},
			});
			const root = card(container);

			expect(field(root, 'assignee')).toBe('null');
			expect(field(root, 'description')).toBe('""');
			expect(field(root, 'labels')).toBe('[]');
			expect(field(root, 'extra')).toBeUndefined();
			expect(field(root, 'cleared')).toBe('[null,""]');
			expect(field(root, 'mixed')).toBe('["existing",null,""]');
			expect(root.textContent).not.toContain('No input');
		});

		it('shows the tool name and its input as key/value pairs', () => {
			const { container } = render({
				kind: 'generic',
				toolName: 'update_crm_contact',
				app: { name: 'HubSpot' },
				input: {
					email: 'ana@example.com',
					lifecycleStage: 'customer',
					properties: { plan: 'pro' },
					skipped: undefined,
				},
			});
			const root = card(container);

			expect(within(root).getByText('update_crm_contact')).toBeInTheDocument();
			expect(within(root).getByTestId('would-have-happened-meta')).toHaveTextContent('HubSpot');
			expect(within(root).getByTestId('would-have-happened-meta')).not.toHaveTextContent(
				'update_crm_contact',
			);
			expect(field(root, 'email')).toBe('ana@example.com');
			expect(field(root, 'lifecycleStage')).toBe('customer');
			expect(field(root, 'properties')).toBe('{ "plan": "pro" }');
			expect(field(root, 'skipped')).toBeUndefined();
			expect(within(root).getByTestId('would-have-happened-not-sent')).toBeInTheDocument();
		});

		it('says when the tool has no input', () => {
			const { container } = render({ kind: 'generic', toolName: 'ping', input: {} });

			expect(within(card(container)).getByTestId('would-have-happened-empty')).toHaveTextContent(
				'No input',
			);
		});
	});

	it('uses the node icon when the app node type is known', () => {
		const pinia = createTestingPinia();
		const nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeType = (name: string) =>
			name === 'n8n-nodes-base.slack'
				? ({
						name,
						displayName: 'Slack',
						iconUrl: 'icons/n8n-nodes-base/dist/nodes/Slack/slack.svg',
					} as never)
				: null;

		const { container } = renderPreview({
			props: {
				preview: {
					kind: 'chatMessage',
					toolName: 'post',
					app: { name: 'Slack', nodeType: 'n8n-nodes-base.slack' },
					text: 'Hi',
				},
			},
			pinia,
		});

		expect(card(container).querySelector('header img')).not.toBeNull();
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
