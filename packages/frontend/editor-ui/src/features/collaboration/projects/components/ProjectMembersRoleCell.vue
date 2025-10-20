<script lang="ts" setup>
import { type ActionDropdownItem, N8nActionDropdown, N8nIcon, N8nText } from '@n8n/design-system';
import type { AllRolesMap, Role } from '@n8n/permissions';
import { ElRadio } from 'element-plus';
import { computed } from 'vue';
import type { ProjectMemberData } from '../projects.types';
const props = defineProps<{
	data: ProjectMemberData;
	roles: AllRolesMap['project'];
	actions: Array<ActionDropdownItem<Role['slug']>>;
}>();

const emit = defineEmits<{
	'update:role': [payload: { role: Role['slug']; userId: string }];
	'badge-click': [action: Role['slug']];
}>();

const selectedRole = computed(() => props.roles.find((role) => role.slug === props.data.role));
const isEditable = computed(() => props.data.role !== 'project:personalOwner');

const onActionSelect = (role: Role['slug']) => {
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
		:max-height="280"
		data-test-id="project-member-role-dropdown"
		@select="onActionSelect"
		@badge-click="emit('badge-click', $event)"
	>
		<template #activator>
			<button :class="$style.roleLabel" type="button">
				<N8nText color="text-dark">{{ selectedRole?.displayName }}</N8nText>
				<N8nIcon color="text-dark" icon="chevron-down" size="large" />
			</button>
		</template>
		<template #menuItem="item">
			<ElRadio :model-value="selectedRole?.slug" :label="item.id" :disabled="item.disabled">
				<span :class="$style.radioLabel">
					<N8nText color="text-dark" class="pb-3xs">{{ item.label }}</N8nText>
					<N8nText color="text-dark" size="small">
						{{ item.description }}
					</N8nText>
				</span>
			</ElRadio>
		</template>
	</N8nActionDropdown>
	<span v-else> {{ selectedRole?.displayName }}</span>
</template>

<style lang="scss" module>
.roleLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	background: transparent;
	padding: 0;
	border: none;
	cursor: pointer;
}

.radioLabel {
	max-width: 268px;
	display: inline-flex;
	flex-direction: column;
	padding: var(--spacing--2xs) 0;

	span {
		white-space: normal;
	}
}
</style>
