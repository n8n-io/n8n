import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

const { useProjectsStoreMock } = vi.hoisted(() => ({ useProjectsStoreMock: vi.fn() }));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: useProjectsStoreMock,
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: () => 'Personal' }),
}));

import { useAgentProjectBreadcrumb } from './useAgentProjectBreadcrumb';

describe('useAgentProjectBreadcrumb', () => {
	beforeEach(() => useProjectsStoreMock.mockReset());

	it('uses the user icon for a personal project', () => {
		useProjectsStoreMock.mockReturnValue({
			personalProject: { id: 'personal', icon: { type: 'emoji', value: '🚀' } },
			currentProject: null,
			myProjects: [],
		});

		const { projectName, projectIcon } = useAgentProjectBreadcrumb(computed(() => 'personal'));

		expect(projectName.value).toBe('Personal');
		expect(projectIcon.value).toEqual({ type: 'icon', value: 'user' });
	});

	it('uses the selected team project icon', () => {
		useProjectsStoreMock.mockReturnValue({
			personalProject: null,
			currentProject: { id: 'other', icon: null },
			myProjects: [{ id: 'team', name: 'Team', icon: { type: 'emoji', value: '🚀' } }],
		});

		const { projectName, projectIcon } = useAgentProjectBreadcrumb(computed(() => 'team'));

		expect(projectName.value).toBe('Team');
		expect(projectIcon.value).toEqual({ type: 'emoji', value: '🚀' });
	});

	it('uses the default icon when the project has no icon', () => {
		useProjectsStoreMock.mockReturnValue({
			personalProject: null,
			currentProject: { id: 'team', name: 'Team', icon: null },
			myProjects: [],
		});

		const { projectIcon } = useAgentProjectBreadcrumb(computed(() => 'team'));

		expect(projectIcon.value).toEqual({ type: 'icon', value: 'layers' });
	});
});
