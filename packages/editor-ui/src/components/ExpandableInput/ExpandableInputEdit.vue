<template>
	<ExpandableInputBase :model-value="modelValue" :placeholder="placeholder">
		<input
			ref="input"
			v-on-click-outside="onClickOutside"
			class="el-input__inner"
			:value="modelValue"
			:placeholder="placeholder"
			:maxlength="maxlength"
			size="4"
			@input="onInput"
			@keydown.enter="onEnter"
			@keydown.esc="onEscape"
		/>
	</ExpandableInputBase>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ExpandableInputBase from './ExpandableInputBase.vue';
import type { PropType } from 'vue';
import type { EventBus } from 'n8n-design-system';

export default defineComponent({
	name: 'ExpandableInputEdit',
	components: { ExpandableInputBase },
	props: {
		modelValue: {
			type: String,
			required: true,
		},
		placeholder: { type: String, required: true },
		maxlength: { type: Number },
		autofocus: { type: Boolean },
		eventBus: {
			type: Object as PropType<EventBus>,
		},
	},
	emits: ['update:modelValue', 'enter', 'blur', 'esc'],
	mounted() {
		// autofocus on input element is not reliable
		if (this.autofocus && this.$refs.input) {
			this.focus();
		}
		this.eventBus?.on('focus', this.focus);
	},
	beforeUnmount() {
		this.eventBus?.off('focus', this.focus);
	},
	methods: {
		focus() {
			if (this.$refs.input) {
				(this.$refs.input as HTMLInputElement).focus();
			}
		},
		onInput() {
			this.$emit('update:modelValue', (this.$refs.input as HTMLInputElement).value);
		},
		onEnter() {
			this.$emit('enter', (this.$refs.input as HTMLInputElement).value);
		},
		onClickOutside(e: Event) {
			if (e.type === 'click') {
				this.$emit('blur', (this.$refs.input as HTMLInputElement).value);
			}
		},
		onEscape() {
			this.$emit('esc');
		},
	},
});
</script>
