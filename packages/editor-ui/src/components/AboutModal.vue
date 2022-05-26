<template>
	<Modal
		width="540px"
		:title="$locale.baseText('about.aboutN8n')"
		:eventBus="modalBus"
		:name="ABOUT_MODAL_KEY"
		:center="true"
	>
		<template slot="content">
			<div :class="$style.container">
				<el-row>
					<el-col :span="8" class="info-name">
						<n8n-text>{{ $locale.baseText('about.n8nVersion') }}</n8n-text>
					</el-col>
					<el-col :span="16">
						<n8n-text>{{ versionCli }}</n8n-text>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="8" class="info-name">
						<n8n-text>{{ $locale.baseText('about.sourceCode') }}</n8n-text>
					</el-col>
					<el-col :span="16">
						<n8n-link to="https://github.com/n8n-io/n8n">https://github.com/n8n-io/n8n</n8n-link>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="8" class="info-name">
						<n8n-text>{{ $locale.baseText('about.license') }}</n8n-text>
					</el-col>
					<el-col :span="16">
						<n8n-link to="https://github.com/n8n-io/n8n/blob/master/packages/cli/LICENSE.md">
							{{ $locale.baseText('about.n8nLicense') }}
						</n8n-link>
					</el-col>
				</el-row>
			</div>
		</template>

		<template slot="footer">
			<div class="action-buttons">
				<n8n-button @click="closeDialog" float="right" :label="$locale.baseText('about.close')" />
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';
import Modal from './Modal.vue';
import { ABOUT_MODAL_KEY } from '../constants';

export default Vue.extend({
	name: 'About',
	components: {
		Modal,
	},
	data() {
		return {
			ABOUT_MODAL_KEY,
			modalBus: new Vue(),
		};
	},
	computed: {
		...mapGetters('settings', ['versionCli']),
	},
	methods: {
		closeDialog() {
			this.modalBus.$emit('close');
		},
	},
});
</script>

<style module lang="scss">
.container > * {
	margin-bottom: var(--spacing-s);
}
</style>
