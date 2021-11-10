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
import mixins from 'vue-typed-mixins';
import { renderText } from './mixins/renderText';

export default mixins(renderText).extend({
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
				[this.$baseText('timeAgo.justNow'), this.$baseText('timeAgo.rightNow')],
				[this.$baseText('timeAgo.justNow'), this.$baseText('timeAgo.rightNow')], // ['%s seconds ago', 'in %s seconds'],
				[this.$baseText('timeAgo.oneMinuteAgo'), this.$baseText('timeAgo.inOneMinute')],
				[this.$baseText('timeAgo.minutesAgo'), this.$baseText('timeAgo.inMinutes')],
				[this.$baseText('timeAgo.oneHourAgo'), this.$baseText('timeAgo.inOneHour')],
				[this.$baseText('timeAgo.hoursAgo'), this.$baseText('timeAgo.inHours')],
				[this.$baseText('timeAgo.oneDayAgo'), this.$baseText('timeAgo.inOneDay')],
				[this.$baseText('timeAgo.daysAgo'), this.$baseText('timeAgo.inDays')],
				[this.$baseText('timeAgo.oneWeekAgo'), this.$baseText('timeAgo.inOneWeek')],
				[this.$baseText('timeAgo.weeksAgo'), this.$baseText('timeAgo.inWeeks')],
				[this.$baseText('timeAgo.oneMonthAgo'), this.$baseText('timeAgo.inOneMonth')],
				[this.$baseText('timeAgo.monthsAgo'), this.$baseText('timeAgo.inMonths')],
				[this.$baseText('timeAgo.oneYearAgo'), this.$baseText('timeAgo.inOneYear')],
				[this.$baseText('timeAgo.yearsAgo'), this.$baseText('timeAgo.inYears')],
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
