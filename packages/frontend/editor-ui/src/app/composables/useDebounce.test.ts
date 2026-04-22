import { vi, describe, it, expect } from 'vitest';
import { useDebounce } from './useDebounce';
import { render, screen } from '@testing-library/vue';

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

	it('debounces a function call', async () => {
		const mockFn = vi.fn();
		render(TestComponent, { props: { mockFn } });
		const button = screen.getByText('Click me');

		button.click();
		button.click();

		expect(mockFn).toHaveBeenCalledTimes(1);
	});

	it('supports trailing option', async () => {
		const mockFn = vi.fn();
		render(TestComponent, { props: { mockFn } });
		const button = screen.getByText('Click me trailing');

		button.click();
		button.click();

		expect(mockFn).toHaveBeenCalledTimes(0);

		vitest.advanceTimersByTime(debounceTime);

		expect(mockFn).toHaveBeenCalledTimes(1);
	});

	it('works with async functions', async () => {
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
