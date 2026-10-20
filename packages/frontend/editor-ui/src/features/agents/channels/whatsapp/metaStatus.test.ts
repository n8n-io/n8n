import type { WhatsAppMetaState } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { presentWhatsAppMetaState } from './metaStatus';

describe('presentWhatsAppMetaState', () => {
	it.each<WhatsAppMetaState>(['connected', 'unknown'])('shows nothing for %s', (state) => {
		expect(presentWhatsAppMetaState(state)).toBeNull();
	});

	it('uses the error theme only when a declined name blocks sending', () => {
		expect(presentWhatsAppMetaState('nameDeclinedBlocked')?.theme).toBe('danger');
		expect(presentWhatsAppMetaState('nameDeclined')?.theme).toBe('warning');
	});

	it.each<[WhatsAppMetaState, string]>([
		['nameDeclinedBlocked', 'https://business.facebook.com/wa/manage/phone-numbers/'],
		['nameDeclined', 'https://business.facebook.com/wa/manage/phone-numbers/'],
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
});
