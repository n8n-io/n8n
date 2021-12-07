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
				[this.$i18n2.baseText('timeAgo.justNow'), this.$i18n2.baseText('timeAgo.rightNow')],
				[this.$i18n2.baseText('timeAgo.justNow'), this.$i18n2.baseText('timeAgo.rightNow')], // ['%s seconds ago', 'in %s seconds'],
				[this.$i18n2.baseText('timeAgo.oneMinuteAgo'), this.$i18n2.baseText('timeAgo.inOneMinute')],
				[this.$i18n2.baseText('timeAgo.minutesAgo'), this.$i18n2.baseText('timeAgo.inMinutes')],
				[this.$i18n2.baseText('timeAgo.oneHourAgo'), this.$i18n2.baseText('timeAgo.inOneHour')],
				[this.$i18n2.baseText('timeAgo.hoursAgo'), this.$i18n2.baseText('timeAgo.inHours')],
				[this.$i18n2.baseText('timeAgo.oneDayAgo'), this.$i18n2.baseText('timeAgo.inOneDay')],
				[this.$i18n2.baseText('timeAgo.daysAgo'), this.$i18n2.baseText('timeAgo.inDays')],
				[this.$i18n2.baseText('timeAgo.oneWeekAgo'), this.$i18n2.baseText('timeAgo.inOneWeek')],
				[this.$i18n2.baseText('timeAgo.weeksAgo'), this.$i18n2.baseText('timeAgo.inWeeks')],
				[this.$i18n2.baseText('timeAgo.oneMonthAgo'), this.$i18n2.baseText('timeAgo.inOneMonth')],
				[this.$i18n2.baseText('timeAgo.monthsAgo'), this.$i18n2.baseText('timeAgo.inMonths')],
				[this.$i18n2.baseText('timeAgo.oneYearAgo'), this.$i18n2.baseText('timeAgo.inOneYear')],
				[this.$i18n2.baseText('timeAgo.yearsAgo'), this.$i18n2.baseText('timeAgo.inYears')],
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
