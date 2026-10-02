import { render, screen } from '@testing-library/vue';
import { h } from 'vue';

import N8nSettingsRowGroup from './SettingsRowGroup.vue';
import N8nSettingsRow from '../N8nSettingsRow/SettingsRow.vue';

describe('N8nSettingsRowGroup', () => {
	it('renders as a card container with its slotted rows', () => {
		render(N8nSettingsRowGroup, {
			slots: { default: '<div data-test-id="row">row</div>' },
		});

		expect(screen.getByTestId('settings-row-group')).toBeInTheDocument();
		expect(screen.getByTestId('row')).toBeInTheDocument();
	});

	it('renders the requested tag', () => {
		render(N8nSettingsRowGroup, {
			props: { tag: 'section' },
			slots: { default: 'content' },
		});

		expect(screen.getByTestId('settings-row-group').tagName).toBe('SECTION');
	});

	it('keeps a divider element on every row (last one is hidden via CSS)', () => {
		const { container } = render({
			components: { N8nSettingsRowGroup, N8nSettingsRow },
			render() {
				return h(N8nSettingsRowGroup, null, {
					default: () => [
						h(N8nSettingsRow, { title: 'One' }),
						h(N8nSettingsRow, { title: 'Two' }),
						h(N8nSettingsRow, { title: 'Three' }),
					],
				});
			},
		});

		const dividers = container.querySelectorAll('[data-test-id="settings-row-divider"]');
		expect(dividers).toHaveLength(3);
	});

	it('drops the divider of rows that opt out', () => {
		const { container } = render({
			components: { N8nSettingsRowGroup, N8nSettingsRow },
			render() {
				return h(N8nSettingsRowGroup, null, {
					default: () => [
						h(N8nSettingsRow, { title: 'One', showDivider: false }),
						h(N8nSettingsRow, { title: 'Two' }),
					],
				});
			},
		});

		const dividers = container.querySelectorAll('[data-test-id="settings-row-divider"]');
		expect(dividers).toHaveLength(1);
	});
});
