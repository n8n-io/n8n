import { formatWalletBalance } from './aiGatewayUtils';

describe('formatWalletBalance', () => {
	it('should return undefined while the balance is unknown', () => {
		expect(formatWalletBalance(undefined)).toBeUndefined();
	});

	it('should format a positive balance', () => {
		expect(formatWalletBalance(5)).toBe('$5.00 remaining');
		expect(formatWalletBalance(0.5)).toBe('$0.50 remaining');
	});

	it('should show "No credits" for zero or negative balance', () => {
		expect(formatWalletBalance(0)).toBe('No credits');
		expect(formatWalletBalance(-1)).toBe('No credits');
	});
});
