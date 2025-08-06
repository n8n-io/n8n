<script lang="ts" setup>
import { format, register } from 'timeago.js';
import { convertToHumanReadableDate } from '@/utils/typesUtils';
import { computed, onBeforeMount } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useI18n } from '@n8n/i18n';

type Props = {
	date: string;
	capitalize?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	capitalize: false,
});

const rootStore = useRootStore();
const i18n = useI18n();

const defaultLocale = computed(() => rootStore.defaultLocale);
const formatted = computed(() => {
	const text = format(props.date, defaultLocale.value);

	if (!props.capitalize) {
		return text.toLowerCase();
	}

	return text;
});

const convertDate = computed(() => {
	const date = new Date(props.date);
	const epoch = date.getTime();
	return convertToHumanReadableDate(epoch);
});

onBeforeMount(() => {
	register(defaultLocale.value, localeFunc);
});

function localeFunc(_: number, index: number): [string, string] {
	// number: the timeago / timein number;
	// index: the index of array below;
	return [
		[i18n.baseText('timeAgo.justNow'), i18n.baseText('timeAgo.rightNow')],
		[i18n.baseText('timeAgo.justNow'), i18n.baseText('timeAgo.rightNow')], // ['%s seconds ago', 'in %s seconds'],
		[i18n.baseText('timeAgo.oneMinuteAgo'), i18n.baseText('timeAgo.inOneMinute')],
		[i18n.baseText('timeAgo.minutesAgo'), i18n.baseText('timeAgo.inMinutes')],
		[i18n.baseText('timeAgo.oneHourAgo'), i18n.baseText('timeAgo.inOneHour')],
		[i18n.baseText('timeAgo.hoursAgo'), i18n.baseText('timeAgo.inHours')],
		[i18n.baseText('timeAgo.oneDayAgo'), i18n.baseText('timeAgo.inOneDay')],
		[i18n.baseText('timeAgo.daysAgo'), i18n.baseText('timeAgo.inDays')],
		[i18n.baseText('timeAgo.oneWeekAgo'), i18n.baseText('timeAgo.inOneWeek')],
		[i18n.baseText('timeAgo.weeksAgo'), i18n.baseText('timeAgo.inWeeks')],
		[i18n.baseText('timeAgo.oneMonthAgo'), i18n.baseText('timeAgo.inOneMonth')],
		[i18n.baseText('timeAgo.monthsAgo'), i18n.baseText('timeAgo.inMonths')],
		[i18n.baseText('timeAgo.oneYearAgo'), i18n.baseText('timeAgo.inOneYear')],
		[i18n.baseText('timeAgo.yearsAgo'), i18n.baseText('timeAgo.inYears')],
	][index] as [string, string];
}
</script>

<template>
	<span :title="convertDate">
		{{ formatted }}
	</span>
</template>
