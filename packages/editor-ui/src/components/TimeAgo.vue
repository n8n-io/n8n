<template functional>
	<span :title="$options.methods.convertToHumanReadableDate($props)">
		{{$options.methods.format(props)}}
	</span>
</template>

<script lang="ts">
import { format } from 'timeago.js';
import { convertToHumanReadableDate } from './helpers';

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
			const text = format(props.date);
			if (props.capitalize) {
				const parts = text.split(' ');
				parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
				return parts.join(' ');
			}

			return text;
		},
		convertToHumanReadableDate,
	},
};
</script>
