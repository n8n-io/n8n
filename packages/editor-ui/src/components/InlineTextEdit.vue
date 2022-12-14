<template>
	<span @keydown.stop class="inline-edit">
		<span v-if="isEditEnabled">
			<ExpandableInputEdit
				:placeholder="placeholder"
				:value="newValue"
				:maxlength="maxLength"
				:autofocus="true"
				:eventBus="inputBus"
				@input="onInput"
				@esc="onEscape"
				@blur="onBlur"
				@enter="submit"
			/>
		</span>

		<span @click="onClick" class="preview" v-else>
			<ExpandableInputPreview :value="previewValue || value" />
		</span>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';
import ExpandableInputEdit from '@/components/ExpandableInput/ExpandableInputEdit.vue';
import ExpandableInputPreview from '@/components/ExpandableInput/ExpandableInputPreview.vue';

export default Vue.extend({
	name: 'InlineTextEdit',
	components: { ExpandableInputEdit, ExpandableInputPreview },
	props: ['isEditEnabled', 'value', 'placeholder', 'maxLength', 'previewValue'],
	data() {
		return {
			newValue: '',
			escPressed: false,
			disabled: false,
			inputBus: new Vue(),
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

			this.$data.newValue = this.$props.value;
			this.$emit('toggle');
		},
		onBlur() {
			if (this.disabled) {
				return;
			}

			if (!this.$data.escPressed) {
				this.submit();
			}
			this.$data.escPressed = false;
		},
		submit() {
			if (this.disabled) {
				return;
			}

			const onSubmit = (updated: boolean) => {
				this.$data.disabled = false;

				if (!updated) {
					this.$data.inputBus.$emit('focus');
				}
			};

			this.$data.disabled = true;
			this.$emit('submit', this.newValue, onSubmit);
		},
		onEscape() {
			if (this.disabled) {
				return;
			}

			this.$data.escPressed = true;
			this.$emit('toggle');
		},
	},
});
</script>

<style lang="scss" scoped>
.preview {
	cursor: pointer;
}
</style>
