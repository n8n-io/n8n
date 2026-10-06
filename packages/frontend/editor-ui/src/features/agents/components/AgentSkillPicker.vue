<script setup lang="ts">
import { computed, ref } from 'vue';
import type { HubSkillListItem } from '@n8n/api-types';
import { N8nDropdownMenu } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';

import { getSkills } from '@/features/settings/context/skills.api';

import AgentChipAddButton from './AgentChipAddButton.vue';

const CREATE_ID = '__create__';

const props = withDefaults(
	defineProps<{
		/** The agent's project: decides which hub skills are attachable. */
		projectId: string;
		attachedIds: string[];
		addLabel: string;
		compact: boolean;
		disabled?: boolean;
		addButtonTestId?: string;
	}>(),
	{
		disabled: false,
		addButtonTestId: undefined,
	},
);

const emit = defineEmits<{
	attach: [skill: HubSkillListItem];
	create: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const { showError } = useToast();

const open = ref(false);
const loading = ref(false);
const skills = ref<HubSkillListItem[]>([]);
const skillById = computed(() => new Map(skills.value.map((skill) => [skill.id, skill])));

/** Fetched on every open, so a skill created meanwhile shows up. */
async function onOpenChange(isOpen: boolean) {
	open.value = isOpen;
	if (!isOpen) return;
	loading.value = true;
	try {
		const response = await getSkills(rootStore.restApiContext, {
			attachableToProjectId: props.projectId,
		});
		skills.value = response.data;
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.error.load'));
	} finally {
		loading.value = false;
	}
}

type Group = {
	key: string;
	label: string;
	icon: string;
	attachable: boolean;
	skills: HubSkillListItem[];
};

/** Just you, then projects (the agent's own first), then Instance. Out-of-scope groups last within their kind. */
const groups = computed<Group[]>(() => {
	const byKey = new Map<string, Group>();
	for (const skill of skills.value) {
		const key = skill.scope === 'project' ? `project:${skill.projectId}` : skill.scope;
		let group = byKey.get(key);
		if (!group) {
			group = {
				key,
				label:
					skill.scope === 'user'
						? i18n.baseText('settings.context.skills.scope.user')
						: skill.scope === 'instance'
							? i18n.baseText('settings.context.skills.scope.instance')
							: (skill.projectName ?? i18n.baseText('settings.context.skills.scope.project')),
				icon: skill.scope === 'user' ? 'user' : skill.scope === 'instance' ? 'globe' : 'layers',
				attachable: skill.attachable === true,
				skills: [],
			};
			byKey.set(key, group);
		}
		group.skills.push(skill);
	}
	const order = (group: Group) =>
		(group.key === 'user' ? 0 : group.key === 'instance' ? 2 : 1) + (group.attachable ? 0 : 0.5);
	return [...byKey.values()].sort((a, b) => order(a) - order(b));
});

const items = computed<Array<DropdownMenuItemProps<string>>>(() => {
	const attached = new Set(props.attachedIds);
	const list: Array<DropdownMenuItemProps<string>> = [];
	for (const group of groups.value) {
		list.push({
			id: `header:${group.key}`,
			header: true,
			icon: { type: 'icon', value: group.icon },
			label: group.attachable
				? group.label
				: i18n.baseText('agents.builder.skills.picker.outOfScope', {
						interpolate: { scope: group.label },
					}),
		});
		for (const skill of group.skills) {
			list.push({
				id: skill.id,
				label: skill.name,
				icon: { type: 'icon', value: 'book-open' },
				disabled: !group.attachable || attached.has(skill.id),
				testId: 'agent-skill-picker-item',
			});
		}
	}
	list.push({
		id: CREATE_ID,
		label: i18n.baseText('agents.builder.skills.picker.createNew'),
		icon: { type: 'icon', value: 'plus' },
		divided: list.length > 0,
		testId: 'agent-skill-picker-create',
	});
	return list;
});

function onSelect(id: string) {
	if (id === CREATE_ID) {
		emit('create');
		return;
	}
	const skill = skillById.value.get(id);
	if (skill) emit('attach', skill);
}
</script>

<template>
	<N8nDropdownMenu
		:model-value="open"
		:items="items"
		:loading="loading"
		:disabled="props.disabled"
		placement="bottom-start"
		max-height="24rem"
		content-test-id="agent-skill-picker"
		@update:model-value="onOpenChange"
		@select="onSelect"
	>
		<template #trigger>
			<AgentChipAddButton
				:label="props.addLabel"
				:compact="props.compact"
				:disabled="props.disabled"
				:test-id="props.addButtonTestId"
			/>
		</template>
	</N8nDropdownMenu>
</template>
