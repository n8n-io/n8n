import type { TaskBoardAssigneeRef } from '@n8n/api-types';
import type { SelectItem, SelectOptionBase } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ProjectRelation } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { fetchProjectAgents, fetchProjectWithMembers } from '../task-board.api';
import { UNASSIGNED_VALUE } from '../task-board.constants';
import type { TaskBoardAgentOption, TaskBoardPersonOption } from '../task-board.types';
import { encodeAssignee } from '../task-board.utils';

function personName(member: ProjectRelation): string {
	const name = [member.firstName, member.lastName].filter(Boolean).join(' ');
	return name || member.email || member.id;
}

/**
 * The people and agents a task in the project can have as assignee.
 * People are the project members. Agents come from the agents module. When that module is
 * off or its request fails, the picker shows people only.
 */
export function useAssigneeOptions(projectId: MaybeRefOrGetter<string | undefined>) {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const i18n = useI18n();

	const people = ref<TaskBoardPersonOption[]>([]);
	const agents = ref<TaskBoardAgentOption[]>([]);

	async function loadPeople(id: string) {
		try {
			const project = await fetchProjectWithMembers(rootStore.restApiContext, id);
			people.value = project.relations.map((member) => ({
				id: member.id,
				name: personName(member),
				role: member.role,
			}));
		} catch {
			// The picker then offers agents and "Unassigned" only.
			people.value = [];
		}
	}

	async function loadAgents(id: string) {
		if (!settingsStore.isAgentsEnabled) {
			agents.value = [];
			return;
		}
		try {
			const list = await fetchProjectAgents(rootStore.restApiContext, id);
			agents.value = list
				.filter((agent) => !agent.isArchived)
				.map((agent) => ({ id: agent.id, name: agent.name }));
		} catch {
			// Agents are optional here: the picker shows people only.
			agents.value = [];
		}
	}

	async function load() {
		const id = toValue(projectId);
		if (!id) return;
		await Promise.all([loadPeople(id), loadAgents(id)]);
	}

	watch(() => toValue(projectId), load, { immediate: true });

	const peopleOptions = computed<SelectOptionBase[]>(() =>
		people.value.map((person) => ({
			value: encodeAssignee({ type: 'user', id: person.id }),
			label: person.name,
			icon: 'user',
		})),
	);

	const agentOptions = computed<SelectOptionBase[]>(() =>
		agents.value.map((agent) => ({
			value: encodeAssignee({ type: 'agent', id: agent.id }),
			label: agent.name,
			icon: 'bot',
		})),
	);

	const items = computed<SelectItem[]>(() => {
		const result: SelectItem[] = [
			{ value: UNASSIGNED_VALUE, label: i18n.baseText('taskBoard.assignee.unassigned') },
		];
		if (peopleOptions.value.length > 0) {
			result.push({
				type: 'group',
				label: i18n.baseText('taskBoard.assignee.people'),
				items: peopleOptions.value,
			});
		}
		if (agentOptions.value.length > 0) {
			result.push({
				type: 'group',
				label: i18n.baseText('taskBoard.assignee.agents'),
				items: agentOptions.value,
			});
		}
		return result;
	});

	/**
	 * The items, plus the current assignee when the lists do not have it (for example an
	 * archived agent). Without it the select shows the raw encoded value.
	 */
	function itemsFor(current: TaskBoardAssigneeRef | null): SelectItem[] {
		if (!current) return items.value;
		const value = encodeAssignee(current);
		const known = [...peopleOptions.value, ...agentOptions.value].some(
			(option) => option.value === value,
		);
		if (known) return items.value;
		return [
			...items.value,
			{ value, label: current.name, icon: current.type === 'user' ? 'user' : 'bot' },
		];
	}

	/** The display name of an encoded assignee, for an optimistic update. */
	function labelFor(value: string): string {
		return (
			[...peopleOptions.value, ...agentOptions.value].find((option) => option.value === value)
				?.label ?? ''
		);
	}

	return { items, people, agents, load, itemsFor, labelFor };
}
