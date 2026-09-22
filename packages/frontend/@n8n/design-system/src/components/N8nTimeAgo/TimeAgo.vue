<script lang="ts" setup>
import dateformat from 'dateformat';
import { format } from 'timeago.js';
import { computed } from 'vue';

export interface TimeAgoProps {
	/** Date to render, as an ISO 8601 string */
	date: string;
	/** Keep the casing of the locale text instead of lowercasing it */
	capitalize?: boolean;
	/** Name of a timeago.js locale that the app registered. Omit to use the timeago.js default */
	locale?: string;
}

defineOptions({ name: 'N8nTimeAgo' });
const props = withDefaults(defineProps<TimeAgoProps>(), {
	capitalize: false,
});

const formatted = computed(() => {
	const text = format(props.date, props.locale);

	if (!props.capitalize) {
		return text.toLowerCase();
	}

	return text;
});

const title = computed(() => dateformat(new Date(props.date).getTime(), 'd mmmm, yyyy @ HH:MM Z'));
</script>

<template>
	<span :title="title">
		{{ formatted }}
	</span>
</template>
