<template>
	<el-dialog
		visible
		append-to-body
		:close-on-click-modal="false"
		width="80%"
		:title="`Edit ${parameter.displayName}`"
		:before-close="closeDialog"
	>
		<div class="text-editor-wrapper ignore-key-press">
			<div ref="code" class="text-editor" @keydown.stop></div>
		</div>
	</el-dialog>
</template>

<script lang="ts">
// @ts-ignore
// import PrismEditor from 'vue-prism-editor';


import { genericHelpers } from '@/components/mixins/genericHelpers';
import { monacoProvider } from '@/components/mixins/monacoProvider';
import { nodeHelpers } from './mixins/nodeHelpers';

import mixins from 'vue-typed-mixins';
import { INodeUi } from '@/Interface';

export default mixins(genericHelpers, monacoProvider, nodeHelpers).extend({
	name: 'CodeEdit',
	props: ['dialogVisible', 'parameter', 'value'],
	mounted() {
		setTimeout(() => {
			this.createEditor({
				root: this.$refs.code as HTMLElement,
				content: this.value,
				onUpdate: (value) => this.$emit('valueChanged', value),
				readOnly: this.isReadOnly,
			});
			this.loadAutocompleteData();
		});
	},
	methods: {
		closeDialog() {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			return false;
		},

		loadAutocompleteData(): void {
			const currentNode: INodeUi = this.$store.getters.activeNode;
			const inputNodes: INodeUi[] | null = this.getInputNodes(currentNode);

			const inputData = inputNodes
				? inputNodes.map((node) => this.getNodeInputData(node))
				: [];

			const hasMultipleInputs = inputData.length > 1;

			this.loadJsLibrary({
				name: 'items',
				content: inputData[0],
				comment: [
					hasMultipleInputs ? '**Warning:** This node has inputs from multiple nodes! Multiple runs of this node will be generated for each input.' : '',
					'\n',
					'This item is only populated in the `Function` node.',
				].join('\n'),
				showOriginal: inputData[0].length < 25,
			});

			this.loadJsLibrary({
				name: 'item',
				content: inputData[0] ? inputData[0][0]: undefined,
				comment: 'This item is only populated in the `Function Item` node.',
			});
		},
	},
});
</script>

<style scoped>
.editor-description {
	font-weight: bold;
	padding: 0 0 0.5em 0.2em;
}

.text-editor {
	min-height: 30rem;
  font-size: var(--font-size-s);
}
</style>
