<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import type { ProjectRole } from '@n8n/permissions';
import { type ActionDropdownItem, N8nActionDropdown, N8nIcon, N8nText } from '@n8n/design-system';
import { ElRadio } from 'element-plus';
import { isProjectRole } from '@/utils/typeGuards';
import type { ProjectMemberData } from '@/types/projects.types';

const props = defineProps<{
	data: ProjectMemberData;
	roles: Record<ProjectRole, { label: string; desc: string }>;
	actions: Array<ActionDropdownItem<ProjectRole | 'remove'>>;
}>();

const emit = defineEmits<{
	'update:role': [payload: { role: ProjectRole | 'remove'; userId: string }];
}>();

const selectedRole = ref<string>(props.data.role);
const isEditable = computed(() => props.data.role !== 'project:personalOwner');

watch(
	() => props.data.role,
	(newRole) => {
		selectedRole.value = newRole;
	},
);
const roleLabel = computed(() =>
	isProjectRole(selectedRole.value)
		? props.roles[selectedRole.value]?.label || selectedRole.value
		: selectedRole.value,
);

const onActionSelect = (role: ProjectRole | 'remove') => {
	emit('update:role', {
		role,
		userId: props.data.id,
	});
};
</script>

<template>
	<N8nActionDropdown
		v-if="isEditable"
		placement="bottom-start"
		:items="props.actions"
		data-test-id="project-member-role-dropdown"
		@select="onActionSelect"
	>
		<template #activator>
			<button :class="$style.roleLabel" type="button">
				<N8nText color="text-dark">{{ roleLabel }}</N8nText>
				<N8nIcon color="text-dark" icon="chevron-down" size="large" />
			</button>
		</template>
		<template #menuItem="item">
			<N8nText v-if="item.id === 'remove'" color="text-dark" :class="$style.removeUser">{{
				item.label
			}}</N8nText>
			<ElRadio
				v-else
				:model-value="selectedRole"
				:label="item.id"
				:disabled="item.disabled"
				@update:model-value="selectedRole = item.id"
			>
				<span :class="$style.radioLabel">
					<N8nText color="text-dark" class="pb-3xs">{{ item.label }}</N8nText>
					<N8nText color="text-dark" size="small">{{
						isProjectRole(item.id) ? props.roles[item.id]?.desc || '' : ''
					}}</N8nText>
				</span>
			</ElRadio>
		</template>
	</N8nActionDropdown>
	<span v-else>{{ roleLabel }}</span>
</template>

<style lang="scss" module>
.roleLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-3xs);
	background: transparent;
	padding: 0;
	border: none;
	cursor: pointer;
}

.radioLabel {
	max-width: 268px;
	display: inline-flex;
	flex-direction: column;
	padding: var(--spacing-2xs) 0;

	span {
		white-space: normal;
	}
}

.removeUser {
	display: block;
	padding: var(--spacing-2xs) var(--spacing-l);
}
</style>
