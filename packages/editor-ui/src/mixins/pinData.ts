import { defineComponent } from 'vue';
import type { INodeUi } from '@/Interface';
import type { INodeTypeDescription, IPinData, INodeExecutionData } from 'n8n-workflow';
import { stringSizeInBytes } from '@/utils';
import {
	MAX_EXPECTED_REQUEST_SIZE,
	MAX_WORKFLOW_PIN_DATA_SIZE,
	MAX_WORKFLOW_SIZE,
	PIN_DATA_NODE_TYPES_DENYLIST,
} from '@/constants';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useToast } from '@/composables';
import { jsonParse, jsonStringify } from 'n8n-workflow';
import { dataPinningEventBus } from '@/event-bus';

export interface IPinDataContext {
	node: INodeUi;
	nodeType: INodeTypeDescription;
	$showError(error: Error, title: string): void;
}

export const pinData = defineComponent({
	setup() {
		return {
			...useToast(),
		};
	},
	mounted() {
		dataPinningEventBus.on('data-pinning-error', this.onDataPinningError);
		dataPinningEventBus.on('data-unpinning', this.onDataUnpinning);
	},
	computed: {
		...mapStores(useWorkflowsStore, useNDVStore),
		pinData(): IPinData[string] | undefined {
			return this.node ? this.workflowsStore.pinDataByNodeName(this.node.name) : undefined;
		},
		hasPinData(): boolean {
			return !!this.node && typeof this.pinData !== 'undefined';
		},
		isPinDataNodeType(): boolean {
			return (
				!!this.node &&
				!this.isMultipleOutputsNodeType &&
				!PIN_DATA_NODE_TYPES_DENYLIST.includes(this.node.type)
			);
		},
		isMultipleOutputsNodeType(): boolean {
			return this.nodeType?.outputs.length > 1;
		},
	},
	methods: {
		isValidPinDataJSON(data: string): boolean {
			try {
				JSON.parse(data);

				return true;
			} catch (error) {
				const title = this.$locale.baseText('runData.editOutputInvalid');

				const toRemove = new RegExp(/JSON\.parse:|of the JSON data/, 'g');
				const message = error.message.replace(toRemove, '').trim();
				const positionMatchRegEx = /at position (\d+)/;
				const positionMatch = error.message.match(positionMatchRegEx);

				error.message = message.charAt(0).toUpperCase() + message.slice(1);
				error.message = error.message.replace(
					"Unexpected token ' in JSON",
					this.$locale.baseText('runData.editOutputInvalid.singleQuote'),
				);

				if (positionMatch) {
					const position = parseInt(positionMatch[1], 10);
					const lineBreaksUpToPosition = (data.slice(0, position).match(/\n/g) || []).length;

					error.message = error.message.replace(
						positionMatchRegEx,
						this.$locale.baseText('runData.editOutputInvalid.atPosition', {
							interpolate: {
								position: `${position}`,
							},
						}),
					);

					error.message = `${this.$locale.baseText('runData.editOutputInvalid.onLine', {
						interpolate: {
							line: `${lineBreaksUpToPosition + 1}`,
						},
					})} ${error.message}`;
				}

				this.showError(error, title);

				return false;
			}
		},
		isValidPinDataSize(data: string | object, activeNodeName: string): boolean {
			if (typeof data === 'object') data = JSON.stringify(data);

			const { pinData: currentPinData, ...workflow } = this.workflowsStore.getCurrentWorkflow();
			const workflowJson = jsonStringify(workflow, { replaceCircularRefs: true });

			const newPinData = { ...currentPinData, [activeNodeName]: data };
			const newPinDataSize = this.workflowsStore.getPinDataSize(newPinData);

			let isValid = true;
			if (newPinDataSize > MAX_WORKFLOW_PIN_DATA_SIZE) {
				this.showError(
					new Error(this.$locale.baseText('ndv.pinData.error.tooLarge.description')),
					this.$locale.baseText('ndv.pinData.error.tooLarge.title'),
				);

				isValid = false;
			}

			if (
				stringSizeInBytes(workflowJson) + newPinDataSize >
				MAX_WORKFLOW_SIZE - MAX_EXPECTED_REQUEST_SIZE
			) {
				this.showError(
					new Error(this.$locale.baseText('ndv.pinData.error.tooLargeWorkflow.description')),
					this.$locale.baseText('ndv.pinData.error.tooLargeWorkflow.title'),
				);

				isValid = false;
			}

			return isValid;
		},
		setPinData(node: INodeUi | null, data: string | INodeExecutionData[], source: string): boolean {
			if (typeof data === 'string') {
				if (!this.isValidPinDataJSON(data)) {
					this.onDataPinningError({ errorType: 'invalid-json', source });
					return false;
				}

				data = jsonParse(data);
			}

			if (!this.isValidPinDataSize(data, node?.name ?? '')) {
				this.onDataPinningError({ errorType: 'data-too-large', source });
				return false;
			}

			this.onDataPinningSuccess({ source });
			this.workflowsStore.pinData({ node, data });

			return true;
		},
		unsetPinData(node: INodeUi | null, source: string): void {
			this.onDataUnpinning({ source });
			this.workflowsStore.unpinData({ node });
		},
		onDataPinningSuccess({ source }: { source: 'pin-icon-click' | 'save-edit' }) {
			const telemetryPayload = {
				pinning_source: source,
				node_type: this.activeNode?.type,
				session_id: this.sessionId,
				data_size: stringSizeInBytes(this.pinData),
				view: this.displayMode,
				run_index: this.runIndex,
			};
			void this.$externalHooks().run('runData.onDataPinningSuccess', telemetryPayload);
			this.$telemetry.track('Ndv data pinning success', telemetryPayload);
		},
		onDataPinningError({
			errorType,
			source,
		}: {
			errorType: 'data-too-large' | 'invalid-json';
			source: 'on-ndv-close-modal' | 'pin-icon-click' | 'save-edit';
		}) {
			this.$telemetry.track('Ndv data pinning failure', {
				pinning_source: source,
				node_type: this.activeNode?.type,
				session_id: this.sessionId,
				data_size: stringSizeInBytes(this.pinData),
				view: this.displayMode,
				run_index: this.runIndex,
				error_type: errorType,
			});
		},
		onDataUnpinning({
			source,
		}: {
			source: 'banner-link' | 'pin-icon-click' | 'unpin-and-execute-modal';
		}) {
			this.$telemetry.track('User unpinned ndv data', {
				node_type: this.activeNode?.type,
				session_id: this.sessionId,
				run_index: this.runIndex,
				source,
				data_size: stringSizeInBytes(this.pinData),
			});
		},
	},
});
