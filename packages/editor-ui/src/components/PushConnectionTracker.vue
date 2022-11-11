<template>
	<span>
		<div class="push-connection-lost primary-color" v-if="!rootStore.pushConnectionActive">
			<n8n-tooltip placement="bottom-end" >
				<div slot="content" v-html="$locale.baseText('pushConnectionTracker.cannotConnectToServer')"></div>
				<span>
					<font-awesome-icon icon="exclamation-triangle" />&nbsp; {{ $locale.baseText('pushConnectionTracker.connectionLost') }}
				</span>
			</n8n-tooltip>
		</div>
		<slot v-else />
	</span>
</template>

<script lang="ts">
import { useRootStore } from "@/stores/n8nRootStore";
import { mapStores } from "pinia";
import Vue from "vue";

export default Vue.extend({
	name: "PushConnectionTracker",
	computed: {
		...mapStores(
			useRootStore,
		),
	},
});
</script>
