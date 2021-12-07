<template>
	<span :class="$style.container">
		<span :class="$style.saved" v-if="saved">{{ $i18n2.baseText('saveButton.saved') }}</span>
		<n8n-button
			v-else
			:label="saveButtonLabel"
			:loading="isSaving"
			:disabled="disabled"
			@click="$emit('click')"
		/>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';
import mixins from 'vue-typed-mixins';
import { renderText } from './mixins/renderText';

export default mixins(renderText).extend({
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
	},
	computed: {
		saveButtonLabel() {
			return this.isSaving
				? this.$i18n2.baseText('saveButton.saving')
				: this.$i18n2.baseText('saveButton.save');
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
