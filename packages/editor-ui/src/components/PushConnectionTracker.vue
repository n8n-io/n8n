<template>
	<span>
		<div class="push-connection-lost color-primary" v-if="!pushConnectionActive">
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
import mixins from "vue-typed-mixins";
import { mapGetters } from "vuex";

import { pushConnection } from "@/components/mixins/pushConnection";

export default mixins(pushConnection).extend({
	name: "PushConnectionTracker",
	computed: {
		...mapGetters(["pushConnectionActive"]),
	},
	async mounted() {
		// Initialize the push connection
		this.pushConnect();
	},
	beforeDestroy() {
		this.pushDisconnect();
	},
});
</script>