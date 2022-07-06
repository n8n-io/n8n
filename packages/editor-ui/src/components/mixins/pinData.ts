import Vue from 'vue';
import { INodeUi } from "@/Interface";
import { IDataObject } from "n8n-workflow";
import {stringSizeInBytes} from "@/components/helpers";
import {MAX_WORKFLOW_PINNED_DATA_SIZE, PIN_DATA_NODE_TYPES_DENYLIST} from "@/constants";

interface PinDataContext {
	node: INodeUi;
	$showError(error: Error, title: string): void;
}

export const pinData = (Vue as Vue.VueConstructor<Vue & PinDataContext>).extend({
	computed: {
		pinData (): IDataObject | undefined {
			return this.node ? this.$store.getters['pinDataByNodeName'](this.node!.name) : undefined;
		},
		hasPinData (): boolean {
			return !!this.node && typeof this.pinData !== 'undefined';
		},
		isPinDataNodeType(): boolean {
			return !!this.node && !PIN_DATA_NODE_TYPES_DENYLIST.includes(this.node.type);
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
				const positionMatch = error.message.match(/at position (\d+)/);

				error.message = message.charAt(0).toUpperCase() + message.slice(1);
				error.message = error.message.replace(
					'Unexpected token \' in JSON',
					'Unexpected single quote. Please use double quotes (") instead',
				);

				if (positionMatch) {
					const position = parseInt(positionMatch[1], 10);
					const lineBreaksUpToPosition = (data.slice(0, position).match(/\n/g) || []).length;

					error.message = `On line ${lineBreaksUpToPosition + 1}: ${error.message}`;
				}

				error.message += '.';

				this.$showError(error, title);

				return false;
			}
		},
		isValidPinDataSize(data: string | object): boolean {
			if (typeof data === 'object') data = JSON.stringify(data);

			if (this.$store.getters['pinDataSize'] + stringSizeInBytes(data) > MAX_WORKFLOW_PINNED_DATA_SIZE) {
				this.$showError(
					new Error(this.$locale.baseText('ndv.pinData.error.tooLarge.description')),
					this.$locale.baseText('ndv.pinData.error.tooLarge.title'),
				);

				return false;
			}

			return true;
		},
	},
});
