<template>
	<div v-if="dialogVisible">
		<el-dialog
			:visible="dialogVisible"
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
							v-model="tempValue"
							type="textarea"
							ref="inputField"
							:value="value"
							:placeholder="$locale.nodeText().placeholder(parameter, path)"
							:readOnly="isReadOnly"
							@change="valueChanged"
							:rows="15"
						/>
					</div>
				</n8n-input-label>
			</div>
		</el-dialog>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'TextEdit',
	props: ['dialogVisible', 'parameter', 'path', 'value', 'isReadOnly'],
	data() {
		return {
			tempValue: '', // el-input does not seem to work without v-model so add one
		};
	},
	methods: {
		valueChanged(value: string) {
			this.$emit('valueChanged', value);
		},

		onKeyDownEsc() {
			// Resetting input value when closing the dialog, required when closing it using the `Esc` key
			this.tempValue = this.value;

			this.closeDialog();
		},

		closeDialog() {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			return false;
		},
	},
	mounted() {
		this.tempValue = this.value as string;
	},
	watch: {
		dialogVisible() {
			if (this.dialogVisible === true) {
				Vue.nextTick(() => {
					(this.$refs.inputField as HTMLInputElement).focus();
				});
			}
		},
		value() {
			this.tempValue = this.value as string;
		},
	},
});
</script>
