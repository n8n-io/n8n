import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';

import ParameterInputLoadError from './ParameterInputLoadError.vue';

const renderComponent = createComponentRenderer(ParameterInputLoadError);

describe('ParameterInputLoadError', () => {
	it('announces the failure and keeps the row occupied', () => {
		const { getByRole, getByTestId } = renderComponent();

		expect(getByRole('alert')).toBeVisible();
		expect(getByTestId('parameter-input-load-error')).toHaveTextContent(
			'This field could not be loaded',
		);
	});

	it('reloads the page on the recovery action', async () => {
		const reload = vi.fn();
		const original = window.location;
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...original, reload },
		});

		try {
			const { getByRole } = renderComponent();
			await userEvent.click(getByRole('button', { name: 'Reload' }));

			expect(reload).toHaveBeenCalledTimes(1);
		} finally {
			Object.defineProperty(window, 'location', { configurable: true, value: original });
		}
	});

	it('drops the shell input props instead of putting them on the DOM', () => {
		const { getByTestId } = renderComponent({
			attrs: { path: 'parameters.tableId', displayTitle: 'Table' },
		});

		const root = getByTestId('parameter-input-load-error');
		expect(root).not.toHaveAttribute('path');
		expect(root).not.toHaveAttribute('displaytitle');
	});
});
