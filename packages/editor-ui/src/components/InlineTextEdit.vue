<template>
	<span @keydown.stop class="inline-edit">
		<span v-if="isEditEnabled && !isDisabled">
			<ExpandableInputEdit
				:placeholder="placeholder"
				:modelValue="newValue"
				:maxlength="maxLength"
				:autofocus="true"
				:eventBus="inputBus"
				@update:modelValue="onInput"
				@esc="onEscape"
				@blur="onBlur"
				@enter="submit"
			/>
		</span>

		<span @click="onClick" class="preview" v-else>
			<ExpandableInputPreview :modelValue="previewValue || modelValue" />
		</span>
	</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ExpandableInputEdit from '@/components/ExpandableInput/ExpandableInputEdit.vue';
import ExpandableInputPreview from '@/components/ExpandableInput/ExpandableInputPreview.vue';
import { createEventBus } from 'n8n-design-system/utils';

export default defineComponent({
	name: 'InlineTextEdit',
	components: { ExpandableInputEdit, ExpandableInputPreview },
	props: {
		isEditEnabled: {
			type: Boolean,
			default: false,
		},
		modelValue: {
			type: String,
			default: '',
		},
		placeholder: {
			type: String,
			default: '',
		},
		maxLength: {
			type: Number,
			default: 0,
		},
		previewValue: {
			type: String,
			default: '',
		},
		disabled: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			isDisabled: this.disabled,
			newValue: '',
			escPressed: false,
			inputBus: createEventBus(),
		};
	},
	methods: {
		onInput(newValue: string) {
			if (this.disabled) {
				return;
			}

			this.newValue = newValue;
		},
		onClick() {
			if (this.disabled) {
				return;
			}

			this.newValue = this.modelValue;
			this.$emit('toggle');
		},
		onBlur() {
			if (this.disabled) {
				return;
			}

			if (!this.escPressed) {
				this.submit();
			}
			this.escPressed = false;
		},
		submit() {
			if (this.disabled) {
				return;
			}

			const onSubmit = (updated: boolean) => {
				this.isDisabled = false;

				if (!updated) {
					this.inputBus.emit('focus');
				}
			};

			this.isDisabled = true;
			this.$emit('submit', { name: this.newValue, onSubmit });
		},
		onEscape() {
			if (this.disabled) {
				return;
			}

			this.escPressed = true;
			this.$emit('toggle');
		},
	},
	watch: {
		disabled(value) {
			this.isDisabled = value;
		},
	},
});
</script>

<style lang="scss" scoped>
.preview {
	cursor: pointer;
}
</style>
