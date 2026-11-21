import { createComponentRenderer } from '../../__tests__/render';
import DataGridLoadingIndicator from './DataGridLoadingIndicator.vue';

const renderComponent = createComponentRenderer(DataGridLoadingIndicator);

describe('DataGridLoadingIndicator', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should show the indicator only after one second', async () => {
		const { queryByTestId, findByTestId } = renderComponent({});

		await vi.advanceTimersByTimeAsync(999);
		expect(queryByTestId('data-grid-loading')).not.toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(1);
		expect(await findByTestId('data-grid-loading')).toHaveTextContent('Loading...');
	});

	it('should clear its delay timer when it unmounts before the delay ends', () => {
		const { unmount } = renderComponent({});
		expect(vi.getTimerCount()).toBe(1);

		unmount();

		expect(vi.getTimerCount()).toBe(0);
	});
});
