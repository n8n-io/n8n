<template>
	<div v-if="dialogVisible">
		<el-dialog :visible="dialogVisible" append-to-body :close-on-click-modal="false" width="80%" :title="`Edit ${parameter.displayName}`" :before-close="closeDialog">
			<div class="text-editor-wrapper ignore-key-press">
				<div class="editor-description">
					{{parameter.displayName}}:
				</div>
				<div class="text-editor" @keydown.stop>
					<prism-editor :lineNumbers="true" :code="value" @change="valueChanged" language="js"></prism-editor>
				</div>
			</div>
		</el-dialog>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

// @ts-ignore
import PrismEditor from 'vue-prism-editor';

import {
	Workflow,
} from 'n8n-workflow';

export default Vue.extend({
	name: 'CodeEdit',
	props: [
		'dialogVisible',
		'parameter',
		'value',
	],
	components: {
		PrismEditor,
	},
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
});
</script>

<style scoped>
.editor-description {
	font-weight: bold;
	padding: 0 0 0.5em 0.2em;;
}
</style>
