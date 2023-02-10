<template>
	<el-dialog
		visible
		append-to-body
		:close-on-click-modal="false"
		width="80%"
		:title="`${$locale.baseText('codeEdit.edit')} ${$locale
			.nodeText()
			.inputLabelDisplayName(parameter, path)}`"
		:before-close="closeDialog"
	>
		<div class="text-editor-wrapper ignore-key-press">
			<code-node-editor
				:mode="codeAutocomplete === 'function' ? 'runOnceForAllItems' : 'runOnceForEachItem'"
				:value="value"
				:defaultValue="defaultValue"
				:isReadOnly="readonly"
				@valueChanged="$emit('valueChanged', $event)"
			/>
		</div>
	</el-dialog>
</template>

<script lang="ts">
import { genericHelpers } from '@/mixins/genericHelpers';
import { workflowHelpers } from '@/mixins/workflowHelpers';

import mixins from 'vue-typed-mixins';
import { IExecutionResponse, INodeUi } from '@/Interface';
import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	WorkflowDataProxy,
} from 'n8n-workflow';

import { PLACEHOLDER_FILLED_AT_EXECUTION_TIME } from '@/constants';
import CodeNodeEditor from '@/components/CodeNodeEditor/CodeNodeEditor.vue';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows';
import { useRootStore } from '@/stores/n8nRootStore';
import { useNDVStore } from '@/stores/ndv';

export default mixins(genericHelpers, workflowHelpers).extend({
	name: 'CodeEdit',
	components: {
		CodeNodeEditor,
	},
	props: ['codeAutocomplete', 'defaultValue', 'parameter', 'path', 'type', 'value', 'readonly'],
	computed: {
		...mapStores(useNDVStore, useRootStore, useWorkflowsStore),
	},
	methods: {
		closeDialog() {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			return false;
		},
	},
});

// TODO: Should style containe "module"?
</script>

<style module>
.text-editor-wrapper .cm-scroller {
	min-height: 30rem;
}
</style>
