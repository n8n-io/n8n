<template>
	<span :class="$style.container">
		<span :class="$style.saved" v-if="saved">{{ $locale.baseText('saveButton.saved') }}</span>
		<n8n-button
			v-else
			:label="saveButtonLabel"
			:loading="isSaving"
			:disabled="disabled"
			:class="$style.button"
			:type="type"
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
		},
		savingLabel: {
			type: String,
		},
		savedLabel: {
			type: String,
		},
		type: {
			type: String,
			default: 'primary',
		},
	},
	computed: {
		saveButtonLabel() {
			return this.isSaving
				? this.$locale.baseText('saveButton.saving')
				: this.$locale.baseText('saveButton.save');
		},
	},
});
</script>

<style lang="scss" module>
.container {
	display: inline-flex;
	justify-content: center;
	align-items: center;
	height: 30px;
}

.button {
	height: 30px;
}

.saved {
	color: $custom-font-very-light;
	font-size: 12px;
	font-weight: 600;
	line-height: 12px;
	text-align: center;
	padding: var(--spacing-2xs) var(--spacing-xs);
}
</style>
