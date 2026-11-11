import type { SkillListItem } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project, ProjectListItem } from '@/features/collaboration/projects/projects.types';

import SkillScopeBadge from './SkillScopeBadge.vue';

const renderBadge = createComponentRenderer(SkillScopeBadge);
const skill: Pick<SkillListItem, 'scope' | 'projectId' | 'projectName' | 'projectType'> = {
	scope: 'project',
	projectId: 'p1',
	projectName: 'Marketing',
	projectType: null,
};

describe('SkillScopeBadge', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('uses the current project icon when the project lists are empty', () => {
		mockedStore(useProjectsStore).currentProject = {
			id: 'p1',
			type: 'team',
			icon: { type: 'emoji', value: '🚀' },
		} as Project;
		const { getByTestId } = renderBadge({ props: { skill } });

		expect(getByTestId('skill-scope-badge')).toHaveTextContent(/🚀\s*Marketing/);
	});

	it.each(['personal', 'team', 'public'] as const)(
		'handles a listed %s project when the skill has no project type',
		(type) => {
			mockedStore(useProjectsStore).projects = [{ id: 'p1', type }] as ProjectListItem[];
			const { container } = renderBadge({ props: { skill } });

			expect(
				container.querySelector(`[data-icon="${type === 'personal' ? 'user' : 'layers'}"]`),
			).not.toBeNull();
		},
	);

	it('uses the fetched personal-project type when the project is not listed', () => {
		const { container } = renderBadge({ props: { skill: { ...skill, projectType: 'personal' } } });

		expect(container.querySelector('[data-icon="user"]')).not.toBeNull();
	});
});
