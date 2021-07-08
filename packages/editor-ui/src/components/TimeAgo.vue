<template functional>
	<span>
		{{$options.format(props.date)}}
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

import { format } from 'timeago.js';

export default Vue.extend({
	name: 'UpdatesPanel',
	props: ['date'],
	format,
});
</script>