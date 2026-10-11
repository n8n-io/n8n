<script lang="ts" setup>
import { useTimestamp } from '@vueuse/core';
import dateformat from 'dateformat';
import { format } from 'timeago.js';
import { computed, watch } from 'vue';

/** Keeps a live label close to the truth without a per-second timer. */
const LIVE_REFRESH_INTERVAL = 30_000;

export interface TimeAgoProps {
	/** Date to render, as an ISO 8601 string */
	date: string;
	/** Keep the casing of the locale text instead of lowercasing it */
	capitalize?: boolean;
	/** Name of a timeago.js locale that the app registered. Omit to use the timeago.js default */
	locale?: string;
	/** Re-render as the date ages. Off by default, so long lists cost no timers */
	live?: boolean;
}

defineOptions({ name: 'N8nTimeAgo' });
const props = withDefaults(defineProps<TimeAgoProps>(), {
	capitalize: false,
	live: false,
});

// `format()` reads the clock outside reactivity, so only a ticking date ages the label.
const now = useTimestamp({ interval: LIVE_REFRESH_INTERVAL, immediate: props.live });

// The tick trails the clock, so a newer date would read as the future until the next tick.
if (props.live) {
	watch(
		() => props.date,
		() => (now.value = Date.now()),
	);
}

const formatted = computed(() => {
	const text = props.live
		? format(props.date, props.locale, { relativeDate: now.value })
		: format(props.date, props.locale);

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
