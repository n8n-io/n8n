import type { WhatsAppMetaState } from '@n8n/api-types';
import { i18n } from '@n8n/i18n';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { configure } from '@testing-library/vue';
import { beforeEach, describe, expect, it } from 'vitest';

import AgentChannelWhatsAppMetaCallout from './AgentChannelWhatsAppMetaCallout.vue';
import { presentWhatsAppMetaState } from './metaStatus';

// These tests use the real English text, so a missing key or a wrong word fails here.
configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(AgentChannelWhatsAppMetaCallout);

const NUMBER = '+1 555-184-1090';
const NAME = 'Acme Support';

/** The wording in the design prototype, with the number and name filled in. */
const PROTOTYPE_WORDING: Array<
	[Exclude<WhatsAppMetaState, 'connected' | 'unknown'>, string, string, string | undefined]
> = [
	[
		'numberPending',
		`Your number ${NUMBER} is pending activation`,
		'The agent can’t send or receive messages until Meta activates the number, which can take a few days.',
		undefined,
	],
	[
		'dailyLimit',
		`Your number ${NUMBER} reached its daily message limit`,
		'The agent can reply, but messages it starts are paused until the limit resets, within 24 hours.',
		undefined,
	],
	[
		'nameInReviewBlocked',
		`The display name “${NAME}” is in review`,
		'The agent can’t send messages until Meta approves the name, which can take a few days.',
		undefined,
	],
	[
		'nameDeclinedBlocked',
		`The display name “${NAME}” wasn’t approved`,
		'The agent can’t send messages until you submit a new name in WhatsApp Manager and Meta approves it.',
		'Submit a new name ↗',
	],
	[
		'nameInReview',
		`The display name “${NAME}” is in review`,
		'The agent can reply while Meta reviews the name, which can take a few days.',
		undefined,
	],
	[
		'nameDeclined',
		`The display name “${NAME}” wasn’t approved`,
		'The agent can still reply. Submit a new name in WhatsApp Manager to try again.',
		'Submit a new name ↗',
	],
	[
		'businessNotVerified',
		'Your business isn’t verified with Meta',
		'The agent can reply, but scheduled messages are limited to 250 people a day until you verify your business.',
		'Verify your business ↗',
	],
	[
		'businessInReview',
		'Your business is in review with Meta',
		'The agent can reply, but scheduled messages are limited to 250 people a day until Meta verifies your business.',
		undefined,
	],
];

describe('WhatsApp Meta callout wording', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it.each(PROTOTYPE_WORDING)(
		'says what the prototype says for %s',
		(state, title, description, action) => {
			const presentation = presentWhatsAppMetaState(state);

			expect(
				i18n.baseText(presentation!.titleKey, { interpolate: { number: NUMBER, name: NAME } }),
			).toBe(title);
			expect(i18n.baseText(presentation!.descriptionKey)).toBe(description);
			expect(presentation!.action && i18n.baseText(presentation!.action.labelKey)).toBe(action);
		},
	);

	it.each(PROTOTYPE_WORDING)('shows the number and name on screen for %s', (state, title) => {
		const { getByTestId } = renderComponent({
			props: { status: { state, displayName: NAME, displayPhoneNumber: NUMBER } },
		});

		expect(getByTestId('whatsapp-meta-callout')).toHaveTextContent(title);
	});

	// Not in the design prototype. Review this wording with design.
	it('words the numberUnavailable callout', () => {
		const presentation = presentWhatsAppMetaState('numberUnavailable');

		expect(i18n.baseText(presentation!.titleKey, { interpolate: { number: NUMBER } })).toBe(
			`Your number ${NUMBER} can’t send messages`,
		);
		expect(i18n.baseText(presentation!.descriptionKey)).toBe(
			'Meta shows this number as disconnected, banned, deleted or moved. The agent can’t send or receive messages. Check the number in WhatsApp Manager.',
		);
		expect(i18n.baseText(presentation!.action!.labelKey)).toBe('Open WhatsApp Manager ↗');
	});

	it.each([
		['numberUnavailable', 'Your number can’t send messages'],
		['numberPending', 'Your number is pending activation'],
		['dailyLimit', 'Your number reached its daily message limit'],
		['nameInReviewBlocked', 'Your display name is in review'],
		['nameDeclinedBlocked', 'Your display name wasn’t approved'],
		['nameInReview', 'Your display name is in review'],
		['nameDeclined', 'Your display name wasn’t approved'],
	] as const)(
		'words the %s headline without a gap when Meta gives no name or number',
		(state, headline) => {
			const { getByTestId } = renderComponent({ props: { status: { state } } });

			const text = getByTestId('whatsapp-meta-callout').textContent ?? '';
			expect(text).toContain(headline);
			expect(text).not.toMatch(/[{}]|“”/);
		},
	);
});
