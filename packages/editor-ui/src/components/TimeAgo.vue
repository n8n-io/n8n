<template functional>
	<span :title="$options.methods.convertToHumanReadableDate($props)">
		{{$options.methods.format(props)}}
	</span>
</template>

<script lang="ts">
import { format, LocaleFunc, register } from 'timeago.js';
import { convertToHumanReadableDate } from './helpers';

const localeFunc = (num: number, index: number, totalSec: number): [string, string] => {
	// number: the timeago / timein number;
	// index: the index of array below;
	// totalSec: total seconds between date to be formatted and today's date;
	return [
		['Just now', 'Right now'],
		['Just now', 'Right now'], // ['%s seconds ago', 'in %s seconds'],
		['1 minute ago', 'in 1 minute'],
		['%s minutes ago', 'in %s minutes'],
		['1 hour ago', 'in 1 hour'],
		['%s hours ago', 'in %s hours'],
		['1 day ago', 'in 1 day'],
		['%s days ago', 'in %s days'],
		['1 week ago', 'in 1 week'],
		['%s weeks ago', 'in %s weeks'],
		['1 month ago', 'in 1 month'],
		['%s months ago', 'in %s months'],
		['1 year ago', 'in 1 year'],
		['%s years ago', 'in %s years'],
	][index] as [string, string];
};

register('main', localeFunc as LocaleFunc);

export default {
	name: 'UpdatesPanel',
	props: {
		date: {
			type: String,
		},
		capitalize: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		format(props: {date: string, capitalize: boolean}) {
			const text = format(props.date, 'main');

			if (!props.capitalize) {
				return text.toLowerCase();
			}

			return text;
		},
		convertToHumanReadableDate,
	},
};
</script>
