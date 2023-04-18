<template>
	<Modal
		width="700px"
		:title="$locale.baseText('importCurlModal.title')"
		:eventBus="modalBus"
		:name="IMPORT_CURL_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div :class="$style.container">
				<n8n-input-label :label="$locale.baseText('importCurlModal.input.label')" color="text-dark">
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
		<template #footer>
			<div :class="$style.modalFooter">
				<n8n-notice
					:class="$style.notice"
					:content="$locale.baseText('ImportCurlModal.notice.content')"
				/>
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
import Modal from './Modal.vue';
import {
	IMPORT_CURL_MODAL_KEY,
	CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS,
	CURL_IMPORT_NODES_PROTOCOLS,
} from '../constants';
import { showMessage } from '@/mixins/showMessage';
import mixins from 'vue-typed-mixins';
import { INodeUi } from '@/Interface';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useNDVStore } from '@/stores/ndv';
import { createEventBus } from '@/event-bus';

export default mixins(showMessage).extend({
	name: 'ImportCurlModal',
	components: {
		Modal,
	},
	data() {
		return {
			IMPORT_CURL_MODAL_KEY,
			curlCommand: '',
			modalBus: createEventBus(),
		};
	},
	computed: {
		...mapStores(useNDVStore, useUIStore),
		node(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
	},
	methods: {
		closeDialog(): void {
			this.modalBus.emit('close');
		},
		onInput(value: string): void {
			this.curlCommand = value;
		},
		async importCurlCommand(): Promise<void> {
			const curlCommand = this.curlCommand;
			if (curlCommand === '') return;

			try {
				const parameters = await this.uiStore.getCurlToJson(curlCommand);
				const url = parameters['parameters.url'];

				const invalidProtocol = CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS.find((p) =>
					url.includes(`${p}://`),
				);

				if (!invalidProtocol) {
					this.uiStore.setHttpNodeParameters({
						name: IMPORT_CURL_MODAL_KEY,
						parameters: JSON.stringify(parameters),
					});

					this.closeDialog();

					this.sendTelemetry();

					return;
					// if we have a node that supports the invalid protocol
					// suggest that one
				} else if (CURL_IMPORT_NODES_PROTOCOLS[invalidProtocol]) {
					const useNode = CURL_IMPORT_NODES_PROTOCOLS[invalidProtocol];

					this.showProtocolErrorWithSupportedNode(invalidProtocol, useNode);
					// we do not have a node that supports the use protocol
				} else {
					this.showProtocolError(invalidProtocol);
				}
				this.sendTelemetry({ success: false, invalidProtocol: true, protocol: invalidProtocol });
			} catch (e) {
				this.showInvalidcURLCommandError();

				this.sendTelemetry({ success: false, invalidProtocol: false });
			} finally {
				this.uiStore.setCurlCommand({ name: IMPORT_CURL_MODAL_KEY, command: this.curlCommand });
			}
		},
		showProtocolErrorWithSupportedNode(protocol: string, node: string): void {
			this.$showToast({
				title: this.$locale.baseText('importParameter.showError.invalidProtocol1.title', {
					interpolate: {
						node,
					},
				}),
				message: this.$locale.baseText('importParameter.showError.invalidProtocol.message', {
					interpolate: {
						protocol: protocol.toUpperCase(),
					},
				}),
				type: 'error',
				duration: 0,
			});
		},
		showProtocolError(protocol: string): void {
			this.$showToast({
				title: this.$locale.baseText('importParameter.showError.invalidProtocol2.title'),
				message: this.$locale.baseText('importParameter.showError.invalidProtocol.message', {
					interpolate: {
						protocol,
					},
				}),
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
			data: { success: boolean; invalidProtocol: boolean; protocol?: string } = {
				success: true,
				invalidProtocol: false,
				protocol: '',
			},
		): void {
			this.$telemetry.track('User imported curl command', {
				success: data.success,
				invalidProtocol: data.invalidProtocol,
				protocol: data.protocol,
			});
		},
	},
	mounted() {
		this.curlCommand = this.uiStore.getCurlCommand || '';
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
	&:last-child {
		margin-bottom: 0;
	}
}
</style>
