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
import { IMPORT_CURL_MODAL_KEY, CURL_INVALID_PROTOCOLS } from '../constants';
import { showMessage } from './mixins/showMessage';
import mixins from 'vue-typed-mixins';
import { INodeUi } from '@/Interface';

export default mixins(showMessage).extend({
	name: 'ImportCurlModal',
	components: {
		Modal,
	},
	data() {
		return {
			IMPORT_CURL_MODAL_KEY,
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
		closeDialog(): void {
			this.modalBus.$emit('close');
		},
		onInput(value: string): void {
			this.curlCommand = value;
		},
		async importCurlCommand(): Promise<void> {
			const curlCommand = this.curlCommand;
			if (curlCommand !== '') {
				try {
					const parameters = await this.$store.dispatch('ui/getCurlToJson', curlCommand);

					const url = parameters['parameters.url'];

					if (CURL_INVALID_PROTOCOLS.some((p) => url.includes(p))) {
						this.showProtocolError();
						this.sendTelemetry({ success: false, invalidProtocol: true });
						return;
					}

					this.$store.dispatch('ui/setHttpNodeParameters', { parameters: JSON.stringify(parameters) });

					this.closeDialog();

					this.sendTelemetry();
				} catch (e) {
					this.showInvalidcURLCommandError();

					this.sendTelemetry({ success: false, invalidProtocol: false });
				} finally {
					this.$store.dispatch('ui/setCurlCommand', { command: this.curlCommand });
				}
			}
		},
		showProtocolError(): void {
			this.$showToast({
				title: this.$locale.baseText('importParameter.showError.ftpProtocol.title'),
				message: this.$locale.baseText('importParameter.showError.ftpProtocol.message'),
				type: 'error',
				duration: 0,
			});
		},
		showInvalidcURLCommandError(): void {
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
		): void {
			this.$telemetry.track('User imported curl command', {
				success: data.success,
				invalidProtocol: data.invalidProtocol,
			});
		},
	},
	mounted() {
		this.curlCommand = this.$store.getters['ui/getCurlCommand'];
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
