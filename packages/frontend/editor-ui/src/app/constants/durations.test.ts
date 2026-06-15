import { getDebounceTime } from './durations';

describe('getDebounceTime', () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	it('returns original time when no multiplier is set', () => {
		expect(getDebounceTime(100)).toBe(100);
		expect(getDebounceTime(1500)).toBe(1500);
	});

	it('applies multiplier from sessionStorage', () => {
		sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '0.5');
		expect(getDebounceTime(100)).toBe(50);
		expect(getDebounceTime(1500)).toBe(750);
	});

	it('returns 0 when multiplier is 0', () => {
		sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '0');
		expect(getDebounceTime(100)).toBe(0);
		expect(getDebounceTime(1500)).toBe(0);
	});

	it('handles multiplier greater than 1', () => {
		sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '2');
		expect(getDebounceTime(100)).toBe(200);
	});

	it('defaults to 1 for invalid multiplier values', () => {
		sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', 'invalid');
		expect(getDebounceTime(100)).toBe(100);
	});

	it('rounds to nearest integer', () => {
		sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '0.33');
		expect(getDebounceTime(100)).toBe(33);
	});
});
