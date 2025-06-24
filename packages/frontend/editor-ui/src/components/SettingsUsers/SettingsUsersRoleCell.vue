<script lang="ts" setup>
import { ref, computed } from 'vue';
import { ROLE, type UsersList } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { type ActionDropdownItem, N8nActionDropdown, N8nIcon } from '@n8n/design-system';

const props = defineProps<{ data: UsersList['items'][number] }>();

const i18n = useI18n();

const isEditable = computed(() => props.data.role !== ROLE.Owner);
const roles = computed<Record<string, { label: string; desc: string }>>(() => ({
	[ROLE.Owner]: { label: i18n.baseText('auth.roles.owner'), desc: '' },
	[ROLE.Admin]: {
		label: i18n.baseText('auth.roles.admin'),
		desc: i18n.baseText('settings.users.table.row.role.description.admin'),
	},
	[ROLE.Member]: {
		label: i18n.baseText('auth.roles.member'),
		desc: i18n.baseText('settings.users.table.row.role.description.member'),
	},
	[ROLE.Default]: { label: i18n.baseText('auth.roles.default'), desc: '' },
}));
const dropdownItems = computed<ActionDropdownItem[]>(() => [
	{
		id: ROLE.Member,
		label: i18n.baseText('auth.roles.member'),
	},
	{
		id: ROLE.Admin,
		label: i18n.baseText('auth.roles.admin'),
	},
	{
		id: 'remove-user',
		label: i18n.baseText('settings.users.table.row.removeUser'),
		divided: true,
	},
]);
const roleLabel = computed(() =>
	props.data.role ? roles.value[props.data.role].label : i18n.baseText('auth.roles.default'),
);
const radioValue = ref<string>(props.data.role ?? ROLE.Default);

const onActionSelect = (value: typeof props.data) => {
	console.log('value', value);
};
</script>

<template>
	<div>
		<N8nActionDropdown
			v-if="isEditable"
			placement="bottom-start"
			:items="dropdownItems"
			@select="() => onActionSelect(data)"
		>
			<template #activator>
				<span>
					<N8nText color="text-dark">{{ roleLabel }}</N8nText>
					<N8nIcon class="ml-2xs" icon="chevron-down" size="small" />
				</span>
			</template>
			<template #menuItem="item">
				<N8nText v-if="item.id === 'remove-user'" color="text-dark" :class="$style.removeUser">{{
					item.label
				}}</N8nText>
				<ElRadio
					v-else
					:model-value="radioValue"
					:label="item.id"
					@update:model-value="radioValue = item.id"
				>
					<span :class="$style.radioLabel">
						<N8nText color="text-dark" class="pb-3xs">{{ item.label }}</N8nText>
						<N8nText color="text-dark" size="small">{{ roles[item.id].desc }}</N8nText>
					</span>
				</ElRadio>
			</template>
		</N8nActionDropdown>
		<span v-else>{{ roleLabel }}</span>
	</div>
</template>

<style lang="scss" module>
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
