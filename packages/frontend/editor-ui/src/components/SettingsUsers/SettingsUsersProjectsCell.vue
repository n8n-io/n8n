<script lang="ts" setup="">
import { computed } from 'vue';
import { type UsersList } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{ data: UsersList['items'][number] }>();

const i18n = useI18n();

const projects = computed(() =>
	props.data.projectRelations?.length
		? props.data.projectRelations.map(({ name }) => name)
		: [i18n.baseText('settings.users.table.row.allProjects')],
);
</script>

<template>
	<div>
		<span>{{ projects.join(', ') }}</span>
	</div>
</template>

<style lang="scss" module></style>
