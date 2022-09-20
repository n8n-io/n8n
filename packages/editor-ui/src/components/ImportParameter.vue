<template>
	<div class="import-section">
		<n8n-button
			type="secondary"
			:label="$locale.baseText('importParameter.label')"
			size="mini"
			@click="onImportCurlClicked"
		/>
	</div>
</template>

<script lang="ts">
import { INodeUi, IUpdateInformation } from '@/Interface';
import { IMPORT_CURL } from '@/constants';
import mixins from 'vue-typed-mixins';
import { showMessage } from './mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'ImportParameter',
	computed: {
		isModalOpen() {
			return this.$store.getters['ui/isModalOpen'](IMPORT_CURL);
		},
		node(): INodeUi {
			return this.$store.getters.activeNode;
		},
	},
	methods: {
		async onImportSubmit() {
			const curlCommand = this.$store.getters['ui/getCommand'];
			if (curlCommand !== '') {
				try {
					const parameters = await this.$store.dispatch('settings/getCurlToJson', curlCommand);

					if (['ftp://', 'ftps://'].some((p) => parameters.url.includes(p))) {
						this.$showToast({
							title: this.$locale.baseText('importParameter.showError.ftpProtocol.title'),
							message: this.$locale.baseText('importParameter.showError.ftpProtocol.message'),
							type: 'error',
							duration: 0,
						});
					}
					// @ts-ignore
					this.valueChanged({
						node: this.node.name,
						name: 'parameters',
						value: parameters,
					});

					this.$telemetry.track('User imported curl command', {
						success: true,
					});
				} catch (e) {
					this.$showToast({
						title: this.$locale.baseText('importParameter.showError.invalidCurlCommand.title'),
						message: this.$locale.baseText('importParameter.showError.invalidCurlCommand.message'),
						type: 'error',
						duration: 0,
					});

					this.$telemetry.track('User imported curl command', {
						success: false,
					});
				}
			}
		},
		onImportCurlClicked() {
			this.$store.dispatch('ui/openModal', IMPORT_CURL);
		},
		valueChanged(parameterData: IUpdateInformation) {
			this.$emit('valueChanged', parameterData);
		},
	},
	watch: {
		isModalOpen(newValue, oldValue) {
			if (newValue === false) {
				this.onImportSubmit();
			}
		},
	},
});
</script>

<style lang="scss">
.import-section {
	display: flex;
	flex-direction: row-reverse;
	margin-top: 10px;
}
</style>
