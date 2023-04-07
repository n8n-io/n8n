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
		<div class="ignore-key-press">
			<code-node-editor
				class="text-editor-wrapper"
				:mode="codeAutocomplete"
				:value="value"
				:defaultValue="defaultValue"
				:isReadOnly="readonly"
				:maxHeight="true"
				:hideFullscreenButton="true"
				@valueChanged="valueChanged"
			/>
		</div>
	</el-dialog>
</template>

<script lang="ts">
import { genericHelpers } from '@/mixins/genericHelpers';
import { workflowHelpers } from '@/mixins/workflowHelpers';

import mixins from 'vue-typed-mixins';
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
	data() {
		return {
			code: '',
		};
	},
	methods: {
		valueChanged(value: string) {
			this.code = value;
		},
		closeDialog() {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			this.$emit('valueChanged', this.code);
			return false;
		},
	},
	mounted() {
		this.code = this.value;
	},
});
</script>

<style lang="scss" scoped>
.text-editor-wrapper {
	min-height: 30rem;
	height: 30rem;
}
</style>
