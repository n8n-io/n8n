<template>
	<div v-if="dialogVisible">
		<el-dialog :visible="dialogVisible" append-to-body width="80%" :title="`Edit ${parameter.displayName}`" :before-close="closeDialog">

			<div class="text-editor-wrapper ignore-key-press">
				<div class="editor-description">
					{{parameter.displayName}}:
				</div>
				<div class="text-editor" @keydown.stop @keydown.esc="closeDialog()">
					<el-input type="textarea" ref="inputField" :value="value" :placeholder="parameter.placeholder" @change="valueChanged" @keydown.stop="noOp" rows="15" />
				</div>
			</div>

		</el-dialog>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import {
	Workflow,
} from 'n8n-workflow';

export default Vue.extend({

	name: 'TextEdit',
	props: [
		'dialogVisible',
		'parameter',
		'value',
	],
	data () {
		return {
		};
	},
	methods: {
		valueChanged (value: string) {
			this.$emit('valueChanged', value);
		},

		closeDialog () {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			return false;
		},
	},
	watch: {
		dialogVisible () {
			if (this.dialogVisible === true) {
				Vue.nextTick(() => {
					(this.$refs.inputField as HTMLInputElement).focus();
				});
			}
		},
	},
});
</script>

<style scoped>
.editor-description {
	font-weight: bold;
	padding: 0 0 0.5em 0.2em;;
}
</style>
