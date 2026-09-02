import { render, screen } from '@testing-library/vue';

import N8nSettingsRowConfigure from './SettingsRowConfigure.vue';

describe('N8nSettingsRowConfigure', () => {
	it('defaults to the "Configure" label with a trailing chevron (not a button)', () => {
		const { container } = render(N8nSettingsRowConfigure);

		const affordance = screen.getByTestId('settings-row-configure');
		expect(affordance).toHaveTextContent('Configure');
		expect(container.querySelector('button')).not.toBeInTheDocument();
		expect(container.querySelector('[data-icon="chevron-right"]')).toBeInTheDocument();
	});

	it('replaces the label with the configured-state text when a value is provided', () => {
		render(N8nSettingsRowConfigure, { props: { value: '2 of 3 devices' } });

		const affordance = screen.getByTestId('settings-row-configure');
		expect(affordance).toHaveTextContent('2 of 3 devices');
		expect(affordance).not.toHaveTextContent('Configure');
	});

	it('always renders the trailing chevron', () => {
		const { container } = render(N8nSettingsRowConfigure, { props: { value: 'Enabled' } });

		expect(container.querySelector('[data-icon="chevron-right"]')).toBeInTheDocument();
	});
});
