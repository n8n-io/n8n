<template>
	<span @keydown.stop>
		<ExpandableInput
			v-if="isEditEnabled"
			:placeholder="placeholder"
			:value="newValue"
			:maxlength="maxLength"
			:autofocus="true"
			@input="onInput"
			@esc="onEscape"
			@blur="onBlur"
			@enter="submit"
		/>
		<span class="clickable" @click="onClick" v-else>
			<slot></slot>
		</span>
	</span>
</template>

<script lang="ts">
import Vue from "vue";
import ExpandableInput from "./ExpandableInput.vue";

export default Vue.extend({
	name: "InlineTextEdit",
	components: {ExpandableInput},
	props: ['isEditEnabled', 'value', 'placeholder', 'maxLength'],
	data() {
		return {
			newValue: '',
			escPressed: false,
			disabled: false,
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

			const onSubmit = () => {
				this.$data.disabled = false;
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