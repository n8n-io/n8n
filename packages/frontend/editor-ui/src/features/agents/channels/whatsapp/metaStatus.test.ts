import type { WhatsAppMetaState } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { metaTitleKey, presentWhatsAppMetaState, WHATSAPP_MANAGER_URL } from './metaStatus';

describe('presentWhatsAppMetaState', () => {
	it.each<WhatsAppMetaState>(['connected', 'unknown'])('shows nothing for %s', (state) => {
		expect(presentWhatsAppMetaState(state)).toBeNull();
	});

	it('uses the error theme when the state stops the agent from sending', () => {
		expect(presentWhatsAppMetaState('numberUnavailable')?.theme).toBe('danger');
		expect(presentWhatsAppMetaState('nameDeclinedBlocked')?.theme).toBe('danger');
		expect(presentWhatsAppMetaState('nameDeclined')?.theme).toBe('warning');
	});

	it.each<[WhatsAppMetaState, string]>([
		['nameDeclinedBlocked', 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers/'],
		['nameDeclined', 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers/'],
		['numberUnavailable', 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers/'],
		['businessNotVerified', 'https://business.facebook.com/settings/security'],
	])('links %s to the right place in Meta', (state, url) => {
		expect(presentWhatsAppMetaState(state)?.action?.url).toBe(url);
	});

	it.each<WhatsAppMetaState>([
		'numberPending',
		'dailyLimit',
		'nameInReviewBlocked',
		'nameInReview',
		'businessInReview',
	])('has no action when %s is only a wait', (state) => {
		expect(presentWhatsAppMetaState(state)?.action).toBeUndefined();
	});

	it('uses the same WhatsApp Manager link as the identity card', () => {
		expect(WHATSAPP_MANAGER_URL).toBe(
			'https://business.facebook.com/latest/whatsapp_manager/phone_numbers/',
		);
		expect(presentWhatsAppMetaState('nameDeclined')?.action?.url).toBe(WHATSAPP_MANAGER_URL);
	});

	describe('metaTitleKey', () => {
		it.each<[WhatsAppMetaState, string]>([
			['numberUnavailable', 'agents.channels.whatsapp.meta.numberUnavailable.titleNoNumber'],
			['numberPending', 'agents.channels.whatsapp.meta.numberPending.titleNoNumber'],
			['dailyLimit', 'agents.channels.whatsapp.meta.dailyLimit.titleNoNumber'],
		])('drops the number from the %s headline when Meta gives none', (state, key) => {
			const presentation = presentWhatsAppMetaState(state)!;

			expect(metaTitleKey(presentation, {})).toBe(key);
			expect(metaTitleKey(presentation, { displayPhoneNumber: '+1 555' })).toBe(
				presentation.titleKey,
			);
		});

		it.each<[WhatsAppMetaState, string]>([
			['nameInReviewBlocked', 'agents.channels.whatsapp.meta.nameInReview.titleNoName'],
			['nameInReview', 'agents.channels.whatsapp.meta.nameInReview.titleNoName'],
			['nameDeclinedBlocked', 'agents.channels.whatsapp.meta.nameDeclined.titleNoName'],
			['nameDeclined', 'agents.channels.whatsapp.meta.nameDeclined.titleNoName'],
		])('drops the name from the %s headline when Meta gives none', (state, key) => {
			const presentation = presentWhatsAppMetaState(state)!;

			expect(metaTitleKey(presentation, {})).toBe(key);
			expect(metaTitleKey(presentation, { displayName: 'Acme' })).toBe(presentation.titleKey);
		});

		it.each<WhatsAppMetaState>(['businessNotVerified', 'businessInReview'])(
			'keeps the %s headline, which has no number or name',
			(state) => {
				const presentation = presentWhatsAppMetaState(state)!;

				expect(metaTitleKey(presentation, {})).toBe(presentation.titleKey);
			},
		);
	});
});
