<template>
	<Modal width="50%" title="About n8n" :eventBus="modalBus" :name="modalName">
		<template slot="content">
			<div class="n8n-about">
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
					<n8n-button @click="closeDialog" label="Close" />
				</div>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';

import Modal from './Modal.vue';

export default Vue.extend({
	name: 'About',
	props: {
		modalName: {
			type: String,
		},
	},
	components: {
		Modal,
	},
	data() {
		return {
			modalBus: new Vue(),
		};
	},
	computed: {
		...mapGetters('settings', ['versionCli']),
	},
	methods: {
		closeDialog () {
			this.modalBus.$emit('close');
		},
	},
});
</script>

<style scoped lang="scss">
.n8n-about {
	font-size: var(--font-size-s);
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
