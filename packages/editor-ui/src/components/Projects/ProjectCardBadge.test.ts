import { createComponentRenderer } from '@/__tests__/render';
import ProjectCardBadge from '@/components/Projects/ProjectCardBadge.vue';

const renderComponent = createComponentRenderer(ProjectCardBadge);

describe('ProjectCardBadge', () => {
	it('should show "Owned by me" badge if there is no homeProject', () => {
		const { getByText } = renderComponent({
			props: {
				resource: {},
				personalProject: {},
			},
		});

		expect(getByText('Owned by me')).toBeVisible();
	});

	it('should show "Owned by me" badge if homeProject ID equals personalProject ID', () => {
		const { getByText } = renderComponent({
			props: {
				resource: {
					homeProject: {
						id: '1',
					},
				},
				personalProject: {
					id: '1',
				},
			},
		});

		expect(getByText('Owned by me')).toBeVisible();
	});

	test.each([
		['First Last <email@domain.com>', 'First Last'],
		['First Last Third <email@domain.com>', 'First Last Third'],
		['First Last Third Fourth <email@domain.com>', 'First Last Third Fourth'],
		['<email@domain.com>', 'email@domain.com'],
		[' <email@domain.com>', 'email@domain.com'],
		['My project', 'My project'],
		['MyProject', 'MyProject'],
	])('should show the correct owner badge for project name: "%s"', (name, result) => {
		const { getByText } = renderComponent({
			props: {
				resource: {
					homeProject: {
						id: '1',
						name,
					},
				},
				personalProject: {
					id: '2',
				},
			},
		});
		expect(getByText(result)).toBeVisible();
	});
});
