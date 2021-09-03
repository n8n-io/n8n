<template>
	<span :class="$style.container">
		<n8n-button v-if="!saved || isSaving" label="Save" :disabled="isSaving" @click="$emit('click')" />
		<span :class="$style.saved" v-else>Saved</span>
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
