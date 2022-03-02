<template>
  <div :class="$style.wrapper">
		<div :class="$style.spinner">
			<n8n-spinner />
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	width: 100%;
	height: 100%;
	position: absolute;
	background-color: var(--color-background-light);
}

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
