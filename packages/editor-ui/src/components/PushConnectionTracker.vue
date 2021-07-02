<template>
	<span>
		<div class="push-connection-lost primary-color" v-if="!pushConnectionActive">
			<el-tooltip placement="bottom-end" effect="light">
				<div slot="content">
					Cannot connect to server.<br />
					It is either down or you have a connection issue. <br />
					It should reconnect automatically once the issue is resolved.
				</div>
				<span>
					<font-awesome-icon icon="exclamation-triangle" />&nbsp; Connection lost
				</span>
			</el-tooltip>
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