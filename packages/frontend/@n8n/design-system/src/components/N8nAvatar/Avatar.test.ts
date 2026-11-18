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

		it('keeps the initials on a user-designed artwork', () => {
			const { container, getByText } = render(N8nAvatar, {
				props: { firstName: 'Jan', lastName: 'Oster', seed: 'k3j9d0a1bc' },
			});

			expect(container.querySelector('svg')).toBeVisible();
			expect(getByText('JO')).toBeVisible();
		});

		it('drops the initials when a picture is shown', () => {
			const { queryByText } = render(N8nAvatar, {
				props: { firstName: 'Jan', lastName: 'Oster', src: 'blob:picture' },
			});

			expect(queryByText('JO')).toBeNull();
		});
	});
});
