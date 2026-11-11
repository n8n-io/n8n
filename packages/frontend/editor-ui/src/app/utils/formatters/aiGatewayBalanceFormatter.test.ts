import type { I18nClass } from '@n8n/i18n';
import { describe, expect, it } from 'vitest';

import {
	formatAiGatewayBalanceRemaining,
	getAiGatewayBalancePill,
} from './aiGatewayBalanceFormatter';

const i18n = {
	baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
		options?.interpolate ? `${key}:${options.interpolate.balance}` : key,
} as unknown as I18nClass;

describe('formatAiGatewayBalanceRemaining', () => {
	it('formats the balance in dollars with two decimals', () => {
		expect(formatAiGatewayBalanceRemaining(12.3, i18n)).toBe(
			'aiGateway.wallet.balanceRemaining:$12.30',
		);
	});

	it('keeps the remaining text for a zero or negative balance', () => {
		expect(formatAiGatewayBalanceRemaining(0, i18n)).toBe(
			'aiGateway.wallet.balanceRemaining:$0.00',
		);
	});
});

describe('getAiGatewayBalancePill', () => {
	it('returns undefined until the balance is known', () => {
		expect(getAiGatewayBalancePill(undefined, i18n)).toBeUndefined();
	});

	it('returns a default pill with the remaining balance', () => {
		expect(getAiGatewayBalancePill(5, i18n)).toEqual({
			text: 'aiGateway.wallet.balanceRemaining:$5.00',
			type: 'default',
		});
	});

	it.each([0, -1])('returns a danger "No credits" pill for a balance of %s', (balance) => {
		expect(getAiGatewayBalancePill(balance, i18n)).toEqual({
			text: 'aiGateway.wallet.noCredits',
			type: 'danger',
		});
	});
});
