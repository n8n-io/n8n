<template>
	<span>
		<div class="push-connection-lost primary-color" v-if="!pushConnectionActive">
			<n8n-tooltip placement="bottom-end" >
				<div slot="content">
					{{ $baseText('pushConnectionTracker.cannotConnectToServer') }}
				</div>
				<span>
					<font-awesome-icon icon="exclamation-triangle" />&nbsp; {{ $baseText('pushConnectionTracker.connectionLost') }}
				</span>
			</n8n-tooltip>
		</div>
		<slot v-else />
	</span>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters } from "vuex";

import mixins from 'vue-typed-mixins';
import { renderText } from "./mixins/renderText";

export default mixins(renderText).extend({
	name: "PushConnectionTracker",
	computed: {
		...mapGetters(["pushConnectionActive"]),
	},
});
</script>
