<script lang="ts" setup>
import { ref, computed } from 'vue';
import { ROLE, type Role, type UsersList } from '@n8n/api-types';
import { ElRadio } from 'element-plus';
import { N8nActionDropdown, N8nIcon, N8nText, type ActionDropdownItem } from '@n8n/design-system';
const props = defineProps<{
	data: UsersList['items'][number];
	roles: Record<Role, { label: string; desc: string }>;
	actions: Array<ActionDropdownItem<Role>>;
}>();

const emit = defineEmits<{
	'update:role': [payload: { role: Role; userId: string }];
}>();

const selectedRole = ref<Role>(props.data.role ?? ROLE.Default);
const isEditable = computed(() => props.data.role !== ROLE.Owner);
const roleLabel = computed(() => props.roles[selectedRole.value].label);

const onActionSelect = (role: Role) => {
	emit('update:role', {
		role,
		userId: props.data.id,
	});
};
</script>

<template>
	<div>
		<N8nActionDropdown
			v-if="isEditable"
			placement="bottom-start"
			:items="props.actions"
			data-test-id="user-role-dropdown"
			@select="onActionSelect"
		>
			<template #activator>
				<button :class="$style.roleLabel" type="button">
					<N8nText color="text-dark">{{ roleLabel }}</N8nText>
					<N8nIcon color="text-dark" icon="chevron-down" size="large" />
				</button>
			</template>
			<template #menuItem="item">
				<ElRadio
					:model-value="selectedRole"
					:label="item.id"
					@update:model-value="selectedRole = item.id as Role"
				>
					<span :class="$style.radioLabel">
						<N8nText color="text-dark" class="pb-3xs">{{ item.label }}</N8nText>
						<N8nText color="text-dark" size="small">{{
							props.roles[item.id as Role].desc
						}}</N8nText>
					</span>
				</ElRadio>
			</template>
		</N8nActionDropdown>
		<span v-else>{{ roleLabel }}</span>
	</div>
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

.removeUser {
	display: block;
	padding: var(--spacing--2xs) var(--spacing--lg);
}
</style>
