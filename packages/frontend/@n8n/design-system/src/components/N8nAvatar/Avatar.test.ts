import { render } from '@testing-library/vue';

import N8nAvatar from './Avatar.vue';

describe('components', () => {
	describe('N8nAlert', () => {
		test.each([
			['Firstname', 'Lastname', 'FL'],
			['Firstname', undefined, 'Fi'],
			[undefined, 'Lastname', 'La'],
			[undefined, undefined, ''],
			['', '', ''],
		])('should render initials for name "%s %s" as %s', (firstName, lastName, initials) => {
			const { container, getByText } = render(N8nAvatar, {
				props: { firstName, lastName },
			});

			if (firstName || lastName) {
				expect(container.querySelector('svg')).toBeVisible();
				expect(getByText(initials)).toBeVisible();
			} else {
				expect(container.querySelector('svg')).not.toBeInTheDocument();
			}
		});

		test('renders a solid circle in place of the pattern when a color is given', () => {
			const { container, getByTestId, getByText } = render(N8nAvatar, {
				props: { firstName: 'Ada', lastName: 'Lovelace', color: 'rebeccapurple', size: 'small' },
			});

			expect(container.querySelector('svg')).not.toBeInTheDocument();
			expect(getByTestId('avatar-solid')).toHaveStyle({ backgroundColor: 'rebeccapurple' });
			expect(getByText('AL')).toBeVisible();
		});
	});
});
