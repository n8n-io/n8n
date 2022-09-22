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
				[this.$locale.baseText('timeAgo.justNow'), this.$locale.baseText('timeAgo.rightNow')],
				[this.$locale.baseText('timeAgo.justNow'), this.$locale.baseText('timeAgo.rightNow')], // ['%s seconds ago', 'in %s seconds'],
				[this.$locale.baseText('timeAgo.oneMinuteAgo'), this.$locale.baseText('timeAgo.inOneMinute')],
				[this.$locale.baseText('timeAgo.minutesAgo'), this.$locale.baseText('timeAgo.inMinutes')],
				[this.$locale.baseText('timeAgo.oneHourAgo'), this.$locale.baseText('timeAgo.inOneHour')],
				[this.$locale.baseText('timeAgo.hoursAgo'), this.$locale.baseText('timeAgo.inHours')],
				[this.$locale.baseText('timeAgo.oneDayAgo'), this.$locale.baseText('timeAgo.inOneDay')],
				[this.$locale.baseText('timeAgo.daysAgo'), this.$locale.baseText('timeAgo.inDays')],
				[this.$locale.baseText('timeAgo.oneWeekAgo'), this.$locale.baseText('timeAgo.inOneWeek')],
				[this.$locale.baseText('timeAgo.weeksAgo'), this.$locale.baseText('timeAgo.inWeeks')],
				[this.$locale.baseText('timeAgo.oneMonthAgo'), this.$locale.baseText('timeAgo.inOneMonth')],
				[this.$locale.baseText('timeAgo.monthsAgo'), this.$locale.baseText('timeAgo.inMonths')],
				[this.$locale.baseText('timeAgo.oneYearAgo'), this.$locale.baseText('timeAgo.inOneYear')],
				[this.$locale.baseText('timeAgo.yearsAgo'), this.$locale.baseText('timeAgo.inYears')],
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
			const epoch = date.getTime();
			return convertToHumanReadableDate(epoch);
		},
	},
});
</script>
