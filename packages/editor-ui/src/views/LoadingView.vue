<template>
	<div :class="$style.spinner">
		<n8n-spinner />
	</div>
</template>

<style lang="scss" module>
.spinner {
	margin-bottom: var(--spacing-l);
	position: absolute;
	left: 50%;
	top: 30%;

	* {
		color: var(--color-primary);
		min-height: 40px;
		min-width: 40px;
	}
}
</style>
