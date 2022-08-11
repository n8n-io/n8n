<template>
	<div
		:class="{
			['list-mode-dropdown-container']: true,
			[$style['list-mode-dropdown-container']]: true,
		}"
	>
		<div :class="$style['error-state-container']">
			<n8n-text size="medium" color="text-dark" tag="p">Could not load</n8n-text>
			<n8n-text size="small" tag="p">Check that your credential is set up correctly</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';

export default mixins().extend ({
	name: 'ListModeDropdown',
	components: {},
	props: {},
	data() {
		return {};
	},
});
</script>

<style lang="scss" module>

.list-mode-dropdown-container {
	position: absolute;
	top: 3em;
	width: 100%;
	margin-top: 1em;
	z-index: 2005;
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	padding: 1em;
	background: white;
	box-shadow: 0px 2px 4px rgba(68, 28, 23, 0.07);
	border-radius: var(--border-radius-base);
	text-align: center;
}

.error-state-container {
	padding: 3em;
}
</style>
