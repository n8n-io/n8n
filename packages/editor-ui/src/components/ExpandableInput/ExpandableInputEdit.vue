<template>
	<ExpandableInputBase :value="value" :placeholder="placeholder">
		<input
			class="el-input__inner"
			:value="value"
			:placeholder="placeholder"
			:maxlength="maxlength"
			@input="onInput"
			@keydown.enter="onEnter"
			@keydown.esc="onEscape"
			ref="input"
			size="4"
			v-click-outside="onClickOutside"
		/>
	</ExpandableInputBase>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import ExpandableInputBase from './ExpandableInputBase.vue';
import { EventBus } from '@/event-bus';

export default Vue.extend({
	components: { ExpandableInputBase },
	name: 'ExpandableInputEdit',
	props: {
		value: {},
		placeholder: {},
		maxlength: {},
		autofocus: {},
		eventBus: {
			type: Object as PropType<EventBus>,
		},
	},
	mounted() {
		// autofocus on input element is not reliable
		if (this.autofocus && this.$refs.input) {
			this.focus();
		}
		this.eventBus?.on('focus', this.focus);
	},
	destroyed() {
		this.eventBus?.off('focus', this.focus);
	},
	methods: {
		focus() {
			if (this.$refs.input) {
				(this.$refs.input as HTMLInputElement).focus();
			}
		},
		onInput() {
			this.$emit('input', (this.$refs.input as HTMLInputElement).value);
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
