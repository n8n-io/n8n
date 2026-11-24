import { createComponentRenderer } from '@/__tests__/render';
import ProjectSharingInfo from './ProjectSharingInfo.vue';
import type { ProjectSharingData } from '../projects.types';

const renderComponent = createComponentRenderer(ProjectSharingInfo);

const personalProject = (overrides: Partial<ProjectSharingData> = {}): ProjectSharingData => ({
	id: 'project-1',
	name: 'Ada Lovelace <ada@example.com>',
	icon: null,
	type: 'personal',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	...overrides,
});

describe('ProjectSharingInfo', () => {
	it('shows the name and email of a person', () => {
		const { getByText } = renderComponent({
			props: { project: personalProject({ accountKind: 'person' }) },
		});

		expect(getByText('Ada Lovelace')).toBeVisible();
		expect(getByText('ada@example.com')).toBeVisible();
	});

	it('shows a service account with its name and a service account label', () => {
		const { getByText, queryByText } = renderComponent({
			props: { project: personalProject({ name: 'Support bot', accountKind: 'service' }) },
		});

		expect(getByText('Support bot')).toBeVisible();
		expect(getByText('Service account')).toBeVisible();
		expect(queryByText('Support')).toBeNull();
	});

	it('names the project that the service account acts for', () => {
		const { getByText } = renderComponent({
			props: {
				project: personalProject({
					name: 'Support bot',
					accountKind: 'service',
					accountProject: { id: 'project-2', name: 'Marketing' },
				}),
			},
		});

		expect(getByText('Support bot')).toBeVisible();
		expect(getByText('Service account in Marketing')).toBeVisible();
	});

	it('shows the subtitle in place of the label when one is given', () => {
		const { getByText, queryByText } = renderComponent({
			props: {
				project: personalProject({ name: 'Support bot', accountKind: 'service' }),
				subtitle: 'No access',
			},
		});

		expect(getByText('No access')).toBeVisible();
		expect(queryByText('Service account')).toBeNull();
	});
});
