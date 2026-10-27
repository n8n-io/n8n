import { render, screen } from '@testing-library/vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { getDebounceTime, useDebounce } from './useDebounce';

describe('useDebounce()', () => {
	const debounceTime = 500;

	const TestComponent = {
		template: `
      <div>
				<button @click="callDebounced(mockFn, { debounceTime,  })">
					Click me
				</button>

				<button @click="callDebounced(mockFn, { debounceTime, trailing: true })">
					Click me trailing
				</button>
			</div>
    `,
		props: {
			mockFn: {
				type: Function,
			},
		},
		setup() {
			vitest.useFakeTimers();
			const { callDebounced } = useDebounce();
			return {
				callDebounced,
				debounceTime,
			};
		},
	};

	it('debounces a function call', () => {
		const mockFn = vi.fn();
		render(TestComponent, { props: { mockFn } });
		const button = screen.getByText('Click me');

		button.click();
		button.click();

		expect(mockFn).toHaveBeenCalledTimes(1);
	});

	it('supports trailing option', () => {
		const mockFn = vi.fn();
		render(TestComponent, { props: { mockFn } });
		const button = screen.getByText('Click me trailing');

		button.click();
		button.click();

		expect(mockFn).toHaveBeenCalledTimes(0);

		vitest.advanceTimersByTime(debounceTime);

		expect(mockFn).toHaveBeenCalledTimes(1);
	});

	it('works with async functions', () => {
		const mockAsyncFn = vi.fn(async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
		});
		render(TestComponent, { props: { mockFn: mockAsyncFn } });
		const button = screen.getByText('Click me');

		button.click();
		button.click();

		expect(mockAsyncFn).toHaveBeenCalledTimes(1);
	});
});

describe('getDebounceTime()', () => {
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
