import { renderComponent } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import PersonalSpacePermissions from './PersonalSpacePermissions.vue';
import { PERSONAL_SPACE_GROUPS, PERSONAL_SPACE_RESOURCES } from '../personalSpacePermissions';

describe('PersonalSpacePermissions', () => {
	it('renders View and Manage as checked, disabled groups that start collapsed', () => {
		const { getByTestId } = renderComponent(PersonalSpacePermissions);

		for (const group of PERSONAL_SPACE_GROUPS) {
			const checkbox = getByTestId(`personal-space-group-${group}`);
			expect(checkbox.getAttribute('aria-checked')).toBe('true');
			expect(checkbox).toBeDisabled();

			expect(getByTestId(`personal-space-toggle-${group}`).getAttribute('aria-expanded')).toBe(
				'false',
			);
			expect(getByTestId(`personal-space-resources-${group}`)).not.toBeVisible();
		}
	});

	it('expands a group to the six disabled resource permissions and collapses it again', async () => {
		const { getByTestId } = renderComponent(PersonalSpacePermissions);
		const toggle = getByTestId('personal-space-toggle-manage');

		await userEvent.click(toggle);

		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		const list = getByTestId('personal-space-resources-manage');
		expect(list).toBeVisible();
		expect(toggle.getAttribute('aria-controls')).toBe(list.id);
		for (const resource of PERSONAL_SPACE_RESOURCES) {
			const checkbox = getByTestId(`personal-space-manage-${resource}`);
			expect(checkbox.getAttribute('aria-checked')).toBe('true');
			expect(checkbox).toBeDisabled();
		}
		expect(list.textContent).toContain('Workflows');
		expect(list.textContent).toContain('Credentials');
		expect(list.textContent).toContain('Data tables');
		expect(list.textContent).toContain('Agents');
		expect(list.textContent).toContain('Folders');
		expect(list.textContent).toContain('Executions');
		// The other group stays collapsed.
		expect(getByTestId('personal-space-resources-view')).not.toBeVisible();

		await userEvent.click(toggle);

		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		expect(list).not.toBeVisible();
	});

	it('explains the personal space and links to the personal space policies', () => {
		const { getByTestId, getByText } = renderComponent(PersonalSpacePermissions);

		expect(getByTestId('personal-space-callout').textContent).toContain(
			'All users get a personal space by default, with the permissions shown above.',
		);
		expect(getByText('personal space policies')).toBeInTheDocument();
	});
});
