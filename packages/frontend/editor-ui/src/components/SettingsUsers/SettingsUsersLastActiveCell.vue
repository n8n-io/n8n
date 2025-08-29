<script lang="ts" setup>
import { computed } from 'vue';
import { type UsersList } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { formatTimeAgo } from '@/utils/formatters/dateFormatter';

const i18n = useI18n();

const props = defineProps<{ data: UsersList['items'][number] }>();
const formattedDate = computed(() =>
	props.data.lastActiveAt ? formatTimeAgo(props.data.lastActiveAt) : i18n.baseText('generic.never'),
);
</script>

<template>
	<span>{{ formattedDate }}</span>
</template>
