<template>
	<div v-if="dialogVisible">
		<el-dialog :visible="dialogVisible" append-to-body :close-on-click-modal="false" width="80%" :title="`${$baseText('codeEdit.edit')} ${$nodeText.topParameterDisplayName(parameter)}`" :before-close="closeDialog">
			<div class="ignore-key-press">
				<n8n-input-label :label="$nodeText.topParameterDisplayName(parameter)">
					<div :class="$style.editor" @keydown.stop>
						<prism-editor :lineNumbers="true" :code="value" :readonly="isReadOnly" @change="valueChanged" language="js"></prism-editor>
					</div>
				</n8n-input-label>
			</div>
		</el-dialog>
	</div>
</template>

<script lang="ts">
// @ts-ignore
import PrismEditor from 'vue-prism-editor';

import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(
	genericHelpers,
)
	.extend({
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

<style lang="scss" module>
.editor {
	font-size: var(--font-size-s);
}
</style>
