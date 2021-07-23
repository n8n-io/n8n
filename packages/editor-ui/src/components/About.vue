<template>
	<span>
		<el-dialog class="n8n-about" :visible="dialogVisible" append-to-body width="50%" title="About n8n" :before-close="closeDialog">
			<div>
				<el-row>
					<el-col :span="8" class="info-name">
						n8n Version:
					</el-col>
					<el-col :span="16">
						{{versionCli}}
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="8" class="info-name">
						Source Code:
					</el-col>
					<el-col :span="16">
						<a href="https://github.com/n8n-io/n8n" target="_blank">https://github.com/n8n-io/n8n</a>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="8" class="info-name">
						License:
					</el-col>
					<el-col :span="16">
						<a href="https://github.com/n8n-io/n8n/blob/master/packages/cli/LICENSE.md" target="_blank">Apache 2.0 with Commons Clause</a>
					</el-col>
				</el-row>

				<div class="action-buttons">
					<el-button type="success" @click="closeDialog">
						Close
					</el-button>
				</div>
			</div>
		</el-dialog>
	</span>
</template>

<script lang="ts">
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';

export default mixins(
	genericHelpers,
	showMessage,
).extend({
	name: 'About',
	props: [
		'dialogVisible',
	],
	computed: {
		versionCli (): string {
			return this.$store.getters.versionCli;
		},
	},
	methods: {
		closeDialog () {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			return false;
		},
	},
});
</script>

<style scoped lang="scss">
.n8n-about {
	.el-row {
		padding: 0.25em 0;
	}
}

.action-buttons {
	margin-top: 1em;
	text-align: right;
}

.info-name {
	line-height: 32px;
}

</style>
