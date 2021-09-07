<template functional>
	<span :title="$options.methods.convertToHumanReadableDate(date)">
		{{$options.methods.format(props.date)}}
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
	},
	methods: {
		format,
		convertToHumanReadableDate,
	},
};
</script>
