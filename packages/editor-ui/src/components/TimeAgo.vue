<template>
	<span :title="convertDate">
		{{ format }}
	</span>
</template>

<script lang="ts">
import { format, LocaleFunc, register } from 'timeago.js';
import { convertToHumanReadableDate } from './helpers';
import Vue from 'vue';
import { mapGetters } from 'vuex';

export default Vue.extend({
	name: 'TimeAgo',
	props: {
		date: {
			type: String,
		},
		capitalize: {
			type: Boolean,
			default: false,
		},
	},
	beforeMount() {
		register(this.defaultLocale, this.localeFunc as LocaleFunc);
	},
	methods: {
		localeFunc(num: number, index: number, totalSec: number): [string, string] {
			// number: the timeago / timein number;
			// index: the index of array below;
			// totalSec: total seconds between date to be formatted and today's date;
			return [
				[this.$i.baseText('timeAgo.justNow'), this.$i.baseText('timeAgo.rightNow')],
				[this.$i.baseText('timeAgo.justNow'), this.$i.baseText('timeAgo.rightNow')], // ['%s seconds ago', 'in %s seconds'],
				[this.$i.baseText('timeAgo.oneMinuteAgo'), this.$i.baseText('timeAgo.inOneMinute')],
				[this.$i.baseText('timeAgo.minutesAgo'), this.$i.baseText('timeAgo.inMinutes')],
				[this.$i.baseText('timeAgo.oneHourAgo'), this.$i.baseText('timeAgo.inOneHour')],
				[this.$i.baseText('timeAgo.hoursAgo'), this.$i.baseText('timeAgo.inHours')],
				[this.$i.baseText('timeAgo.oneDayAgo'), this.$i.baseText('timeAgo.inOneDay')],
				[this.$i.baseText('timeAgo.daysAgo'), this.$i.baseText('timeAgo.inDays')],
				[this.$i.baseText('timeAgo.oneWeekAgo'), this.$i.baseText('timeAgo.inOneWeek')],
				[this.$i.baseText('timeAgo.weeksAgo'), this.$i.baseText('timeAgo.inWeeks')],
				[this.$i.baseText('timeAgo.oneMonthAgo'), this.$i.baseText('timeAgo.inOneMonth')],
				[this.$i.baseText('timeAgo.monthsAgo'), this.$i.baseText('timeAgo.inMonths')],
				[this.$i.baseText('timeAgo.oneYearAgo'), this.$i.baseText('timeAgo.inOneYear')],
				[this.$i.baseText('timeAgo.yearsAgo'), this.$i.baseText('timeAgo.inYears')],
			][index] as [string, string];
		},
	},
	computed: {
		...mapGetters(['defaultLocale']),
		format(): string {
			const text = format(this.date, this.defaultLocale);

			if (!this.capitalize) {
				return text.toLowerCase();
			}

			return text;
		},
		convertDate(): string {
			const date = new Date(this.date);
			const epoch = date.getTime() / 1000;
			return convertToHumanReadableDate(epoch);
		},
	},
});
</script>
