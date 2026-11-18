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
 * The people and agents a task of the board can have as assignee.
 * People are the project members. Agents are the agents of the project that are on the team
 * of the board (`boardAgentIds`). When the agents module is off or its request fails, the
 * picker shows people only.
 */
export function useAssigneeOptions(
	projectId: MaybeRefOrGetter<string | undefined>,
	boardAgentIds: MaybeRefOrGetter<string[]>,
) {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const i18n = useI18n();

	const people = ref<TaskBoardPersonOption[]>([]);
	const projectAgents = ref<TaskBoardAgentOption[]>([]);
	const agents = computed(() => {
		const onBoard = new Set(toValue(boardAgentIds));
		return projectAgents.value.filter((agent) => onBoard.has(agent.id));
	});

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
			projectAgents.value = [];
			return;
		}
		try {
			const list = await fetchProjectAgents(rootStore.restApiContext, id);
			projectAgents.value = list
				.filter((agent) => !agent.isArchived)
				.map((agent) => ({ id: agent.id, name: agent.name }));
		} catch {
			// Agents are optional here: the picker shows people only.
			projectAgents.value = [];
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

	const options = computed(() => [...peopleOptions.value, ...agentOptions.value]);

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
		if (options.value.some((option) => option.value === value)) return items.value;
		return [
			...items.value,
			{ value, label: current.name, icon: current.type === 'user' ? 'user' : 'bot' },
		];
	}

	/** The display name of an encoded assignee, for an optimistic update. */
	function labelFor(value: string): string {
		return options.value.find((option) => option.value === value)?.label ?? '';
	}

	return { items, people, agents, load, itemsFor, labelFor };
}
