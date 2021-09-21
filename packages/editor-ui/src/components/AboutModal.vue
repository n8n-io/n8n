<template>
	<Modal width="50%" title="About n8n" :eventBus="modalBus" :name="modalName">
		<template slot="content">
			<div :class="$style.container">
				<el-row>
					<el-col :span="8" class="info-name">
						<n8n-text>n8n Version:</n8n-text>
					</el-col>
					<el-col :span="16">
						<n8n-text>{{versionCli}}</n8n-text>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="8" class="info-name">
						<n8n-text>Source code:</n8n-text>
					</el-col>
					<el-col :span="16">
						<n8n-link href="https://github.com/n8n-io/n8n" :newWindow="true">https://github.com/n8n-io/n8n</n8n-link>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="8" class="info-name">
						<n8n-text>License:</n8n-text>
					</el-col>
					<el-col :span="16">
						<n8n-link href="https://github.com/n8n-io/n8n/blob/master/packages/cli/LICENSE.md" :newWindow="true">Apache 2.0 with Commons Clause</n8n-link>
					</el-col>
				</el-row>
			</div>
		</template>

		<template slot="footer">
				<div class="action-buttons">
					<n8n-button @click="closeDialog" float="right" label="Close" />
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

<style module lang="scss">
.container {
	> * {
		margin-bottom: var(--spacing-s);
	}
}
</style>
