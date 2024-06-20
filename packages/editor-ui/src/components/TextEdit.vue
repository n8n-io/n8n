<template>
	<div v-if="dialogVisible">
		<el-dialog
			:model-value="dialogVisible"
			append-to-body
			width="80%"
			:title="`${$locale.baseText('textEdit.edit')} ${$locale
				.nodeText()
				.inputLabelDisplayName(parameter, path)}`"
			:before-close="closeDialog"
		>
			<div class="ignore-key-press">
				<n8n-input-label :label="$locale.nodeText().inputLabelDisplayName(parameter, path)">
					<div @keydown.stop @keydown.esc="onKeyDownEsc()">
						<n8n-input
							ref="inputField"
							v-model="tempValue"
							type="textarea"
							:placeholder="$locale.nodeText().placeholder(parameter, path)"
							:read-only="isReadOnly"
							:rows="15"
							@update:model-value="valueChanged"
						/>
					</div>
				</n8n-input-label>
			</div>
		</el-dialog>
	</div>
</template>

<script lang="ts">
import { nextTick, defineComponent } from 'vue';

export default defineComponent({
	name: 'TextEdit',
	props: ['dialogVisible', 'parameter', 'path', 'modelValue', 'isReadOnly'],
	data() {
		return {
			tempValue: '', // el-input does not seem to work without v-model so add one
		};
	},
	watch: {
		async dialogVisible() {
			if (this.dialogVisible === true) {
				await nextTick();
				(this.$refs.inputField as HTMLInputElement).focus();
			}
		},
		modelValue(value: string) {
			this.tempValue = value;
		},
	},
	mounted() {
		this.tempValue = this.modelValue as string;
	},
	methods: {
		valueChanged(value: string) {
			this.$emit('update:modelValue', value);
		},

		onKeyDownEsc() {
			// Resetting input value when closing the dialog, required when closing it using the `Esc` key
			this.tempValue = this.modelValue;

			this.closeDialog();
		},

		closeDialog() {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			return false;
		},
	},
});
</script>
