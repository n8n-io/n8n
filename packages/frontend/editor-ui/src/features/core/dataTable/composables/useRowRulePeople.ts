import type { DataTableRowRuleCondition } from '@n8n/api-types';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed } from 'vue';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';

export type RowRuleMatch = DataTableRowRuleCondition['match'];
export type RowRuleOption = { value: string; label: string };

/** The people and teams that a row rule column can hold, by the value the rule matches on. */
export const useRowRulePeople = () => {
	const usersStore = useUsersStore();
	const projectsStore = useProjectsStore();

	const people = computed(() => usersStore.allUsers.filter((user) => !user.isPendingUser));
	const teams = computed(() =>
		projectsStore.availableProjects.filter((project) => project.type === ProjectTypes.Team),
	);

	const load = async () => {
		await Promise.all([
			usersStore.fetchUsers({ take: 50, filter: { isPending: false } }),
			projectsStore.getAvailableProjects(),
		]);
	};

	const searchPeople = async (query: string) => {
		await usersStore.fetchUsers({ take: 50, filter: { isPending: false, fullText: query } });
	};

	const options = (match: RowRuleMatch): RowRuleOption[] => {
		if (match === 'project') {
			return teams.value.map(({ id, name }) => ({ value: id, label: name ?? id }));
		}
		return people.value.flatMap((user) => {
			const value = match === 'id' ? user.id : user.email;
			if (!value) return [];
			const name = user.fullName?.trim();
			return [{ value, label: name ? `${name} (${user.email})` : (user.email ?? user.id) }];
		});
	};

	/** The name to show for a stored value, or `undefined` for an unknown one. */
	const label = (match: RowRuleMatch, value: unknown) => {
		if (typeof value !== 'string' || value === '') return undefined;
		return options(match).find((option) => option.value === value)?.label;
	};

	return { load, searchPeople, options, label };
};
