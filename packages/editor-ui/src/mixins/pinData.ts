import { defineComponent } from 'vue';
import type { INodeUi } from '@/Interface';
import type { INodeTypeDescription, IPinData } from 'n8n-workflow';
import { stringSizeInBytes } from '@/utils';
import { MAX_WORKFLOW_PINNED_DATA_SIZE, PIN_DATA_NODE_TYPES_DENYLIST } from '@/constants';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useToast } from '@/composables';

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
	computed: {
		...mapStores(useWorkflowsStore),
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
		isValidPinDataSize(data: string | object): boolean {
			if (typeof data === 'object') data = JSON.stringify(data);

			if (
				this.workflowsStore.pinDataSize + stringSizeInBytes(data) >
				MAX_WORKFLOW_PINNED_DATA_SIZE
			) {
				this.showError(
					new Error(this.$locale.baseText('ndv.pinData.error.tooLarge.description')),
					this.$locale.baseText('ndv.pinData.error.tooLarge.title'),
				);

				return false;
			}

			return true;
		},
	},
});
