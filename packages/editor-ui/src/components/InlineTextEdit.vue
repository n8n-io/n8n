<template>
	<span @keydown.stop>
		<ExpandableInput
			v-if="isEditEnabled"
			:placeholder="placeholder"
			:value="newValue"
			:maxlength="maxLength"
			@change="onChange"
			@input="onInput"
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
		};
	},
	methods: {
		onInput(newValue: string) {
			this.newValue = newValue;
		},
		onClick() {
			this.$data.newValue = this.$props.value;
			this.$emit('toggle');
		},
		onChange() {
			this.$emit('change', this.newValue);
			this.$emit('toggle');
		},
	},
});
</script>