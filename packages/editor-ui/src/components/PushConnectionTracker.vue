<template>
	<span>
		<div class="push-connection-lost primary-color" v-if="!pushConnectionActive">
			<el-tooltip placement="bottom-end" effect="light">
				<div slot="content">
					{{ $translateBase('pushConnectionTracker.cannotConnectToServer') }}
				</div>
				<span>
					<font-awesome-icon icon="exclamation-triangle" />&nbsp; {{ $translateBase('pushConnectionTracker.connectionLost') }}
				</span>
			</el-tooltip>
		</div>
		<slot v-else />
	</span>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters } from "vuex";
import mixins from 'vue-typed-mixins';
import { translate } from '@/components/mixins/translate';

export default mixins(translate).extend({
	name: "PushConnectionTracker",
	computed: {
		...mapGetters(["pushConnectionActive"]),
	},
});
</script>
