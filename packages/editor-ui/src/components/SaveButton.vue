<template>
	<span :class="$style.container">
		<span :class="$style.saved" v-if="saved">{{ savedLabel }}</span>
		<n8n-button
			v-else
			:label="isSaving ? savingLabel : saveLabel"
			:loading="isSaving"
			:disabled="disabled"
			@click="$emit('click')"
		/>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: "SaveButton",
	props: {
		saved: {
			type: Boolean,
		},
		isSaving: {
			type: Boolean,
		},
		disabled: {
			type: Boolean,
		},
		saveLabel: {
			type: String,
			default: 'Save',
		},
		savingLabel: {
			type: String,
			default: 'Saving',
		},
		savedLabel: {
			type: String,
			default: 'Saved',
		},
	},
});
</script>

<style lang="scss" module>
.container {
	width: 65px;
}

.saved {
	color: $--custom-font-very-light;
	font-size: 12px;
	font-weight: 600;
	line-height: 12px;
	text-align: center;
	padding: var(--spacing-2xs) var(--spacing-xs);
}
</style>
