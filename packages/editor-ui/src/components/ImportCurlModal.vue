<template>
	<Modal
		width="700px"
		:title="$locale.baseText('importCurlModal.title')"
		:eventBus="modalBus"
		:name="IMPORT_CURL"
		:center="true"
	>
		<template slot="content">
			<div :class="$style.container">
				<n8n-input-label :label="$locale.baseText('importCurlModal.input.label')">
					<n8n-input
						:value="curlCommand"
						type="textarea"
						:rows="5"
						:placeholder="$locale.baseText('importCurlModal.input.placeholder')"
						@input="onInput"
						@focus="$event.target.select()"
						ref="input"
					/>
				</n8n-input-label>
			</div>
		</template>
		<template slot="footer">
			<div :class="$style.modalFooter">
				<n8n-notice :class="$style.notice" :content="$locale.baseText('ImportCurlModal.notice.content')" />
				<div>
					<n8n-button
						@click="importCurlCommand"
						float="right"
						:label="$locale.baseText('importCurlModal.button.label')"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import Modal from './Modal.vue';
import { IMPORT_CURL, CURL_INVALID_PROTOCOLS } from '../constants';
import { showMessage } from './mixins/showMessage';
import mixins from 'vue-typed-mixins';
import { INodeUi, IUpdateInformation } from '@/Interface';

export default mixins(showMessage).extend({
	name: 'ImportCurlModal',
	components: {
		Modal,
	},
	data() {
		return {
			IMPORT_CURL,
			curlCommand: '',
			modalBus: new Vue(),
		};
	},
	computed: {
		node(): INodeUi {
			return this.$store.getters.activeNode;
		},
	},
	methods: {
		closeDialog() {
			this.modalBus.$emit('close');
		},
		onInput(value: string) {
			this.curlCommand = value;
		},
		valueChanged(parameterData: IUpdateInformation) {
			this.$emit('valueChanged', parameterData);
		},
		async importCurlCommand() {
			const curlCommand = this.curlCommand;
			if (curlCommand !== '') {
				try {
					const parameters = await this.$store.dispatch('ui/getCurlToJson', curlCommand);

					if (CURL_INVALID_PROTOCOLS.some((p) => parameters.url.includes(p))) {
						this.showProtocolError();
						this.sendTelemetry({ success: false, invalidProtocol: true });
						return;
					}

					// @ts-ignore
					this.valueChanged({
						node: this.node.name,
						name: 'parameters',
						value: parameters,
					});

					this.closeDialog();

					this.sendTelemetry();
				} catch (e) {
					this.showInvalidcURLCommandError();

					this.sendTelemetry({ success: false, invalidProtocol: false });
				} finally {
					this.$store.dispatch('ui/setCommand', { command: this.curlCommand });
				}
			}
		},
		showProtocolError() {
			this.$showToast({
				title: this.$locale.baseText('importParameter.showError.ftpProtocol.title'),
				message: this.$locale.baseText('importParameter.showError.ftpProtocol.message'),
				type: 'error',
				duration: 0,
			});
		},
		showInvalidcURLCommandError() {
			this.$showToast({
				title: this.$locale.baseText('importParameter.showError.invalidCurlCommand.title'),
				message: this.$locale.baseText('importParameter.showError.invalidCurlCommand.message'),
				type: 'error',
				duration: 0,
			});
		},
		sendTelemetry(
			data: { success: boolean; invalidProtocol: boolean } = {
				success: true,
				invalidProtocol: false,
			},
		) {
			this.$telemetry.track('User imported curl command', {
				success: data.success,
				invalidProtocol: data.invalidProtocol,
			});
		},
	},
	mounted() {
		this.curlCommand = this.$store.getters['ui/getCommand'];
		setTimeout(() => {
			(this.$refs.input as HTMLTextAreaElement).focus();
		});
	},
});
</script>

<style module lang="scss">
.modalFooter {
	justify-content: space-between;
	display: flex;
	flex-direction: row;
}

.notice {
	margin: 0;
}

.container > * {
	margin-bottom: var(--spacing-s);
  &:last-child{
		margin-bottom: 0;
	}
}
</style>
