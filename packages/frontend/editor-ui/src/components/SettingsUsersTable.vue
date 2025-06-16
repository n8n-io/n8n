<script lang="ts" setup>
import { computed, ref } from 'vue';
import { ROLE, type UsersList } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import N8nDataTableServer, {
	type TableHeader,
} from '@n8n/design-system/components/N8nDataTableServer/N8nDataTableServer.vue';
import N8nUserInfo from '@n8n/design-system/components/N8nUserInfo';

type Item = UsersList['data'][number];

const i18n = useI18n();

const props = defineProps<{
	data: UsersList;
	loading?: boolean;
}>();

const emit = defineEmits<{
	'update:options': [
		payload: {
			page: number;
			itemsPerPage: number;
			sortBy: Array<{ id: string; desc: boolean }>;
		},
	];
}>();

const rows = computed(() => props.data.data);
const roles = computed(() => ({
	[ROLE.Owner]: i18n.baseText('auth.roles.owner'),
	[ROLE.Admin]: i18n.baseText('auth.roles.admin'),
	[ROLE.Member]: i18n.baseText('auth.roles.member'),
	[ROLE.Default]: i18n.baseText('auth.roles.default'),
}));
const headers = ref<Array<TableHeader<Item>>>([
	{
		title: i18n.baseText('settings.users.table.header.user'),
		key: 'name',
		width: 400,
		value(row) {
			return row;
		},
	},
	{
		title: i18n.baseText('settings.users.table.header.accountType'),
		key: 'role',
		value(row) {
			return roles.value[row.role] || i18n.baseText('auth.roles.owner.default');
		},
	},
	{
		title: i18n.baseText('settings.users.table.header.lastActive'),
		key: 'lastActive',
	},
	{
		title: i18n.baseText('projects.menu.title'),
		key: 'projects',
		disableSort: true,
		value(row) {
			return row.projects ?? [i18n.baseText('settings.users.table.row.allProjects')];
		},
	},
]);
</script>

<template>
	<div>
		<N8nDataTableServer
			:headers="headers"
			:items="rows"
			:items-length="data.count"
			@update:options="emit('update:options', $event)"
		>
			<template #[`item.name`]="{ value }">
				<div class="pt-s pb-s">
					<N8nUserInfo v-bind="value" />
				</div>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module></style>
