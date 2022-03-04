<template>
	<span>
		<div class="push-connection-lost primary-color" v-if="!pushConnectionActive">
			<n8n-tooltip placement="bottom-end" >
				<div slot="content">
					{{ $locale.baseText('pushConnectionTracker.cannotConnectToServer') }}
				</div>
				<span>
					<font-awesome-icon icon="exclamation-triangle" />&nbsp; {{ $locale.baseText('pushConnectionTracker.connectionLost') }}
				</span>
			</n8n-tooltip>
		</div>
		<slot v-else />
	</span>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters } from "vuex";

export default Vue.extend({
	name: "PushConnectionTracker",
	computed: {
		...mapGetters(["pushConnectionActive"]),
	},
});
</script>
