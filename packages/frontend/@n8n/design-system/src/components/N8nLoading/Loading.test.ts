import { render } from '@testing-library/vue';

import Loading from './Loading.vue';
import Loading2 from '../../v2/components/Loading/Loading.vue';

describe.each([
	['N8nLoading', Loading],
	['N8nLoading2', Loading2],
])('%s visibility', (_, component) => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('does not show the skeleton during a fast load', async () => {
		const { container, rerender } = render(component);
		expect(container.querySelector('.n8n-loading')).not.toBeVisible();

		await vi.advanceTimersByTimeAsync(100);
		await rerender({ loading: false });
		await vi.advanceTimersByTimeAsync(300);

		expect(container.querySelector('.n8n-loading')).not.toBeInTheDocument();
	});

	it('shows a slow load after 300 ms and hides it on completion', async () => {
		const { container, rerender } = render(component);
		await vi.advanceTimersByTimeAsync(299);
		expect(container.querySelector('.n8n-loading')).not.toBeVisible();

		await vi.advanceTimersByTimeAsync(1);
		expect(container.querySelector('.n8n-loading')).toBeVisible();
		await rerender({ loading: false });
		expect(container.querySelector('.n8n-loading')).not.toBeInTheDocument();
	});

	it('supports immediate feedback for menus and callers that own the delay', () => {
		const { container } = render(component, { props: { delay: 0 } });
		expect(container.querySelector('.n8n-loading')).toBeVisible();
		expect(container.querySelector('.n8n-loading')).toHaveAttribute('aria-hidden', 'true');
	});
});
