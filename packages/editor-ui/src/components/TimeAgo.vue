<template functional>
	<span>
		{{$options.format(props.date)}}
	</span>
</template>

<script lang="ts">
import { format } from 'timeago.js';

export default {
	name: 'UpdatesPanel',
	props: ['date'],
	format,
};
</script>