<template>
	<div :class="$style.container">
		<div :class="$style.spinner">
			<n8n-spinner />
		</div>
		<n8n-text type="heading">
			Loading
		</n8n-text>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
}

.spinner {
	margin-bottom: var(--spacing-l);
	* {
		color: var(--color-primary);
		min-height: 40px;
		min-width: 40px;
	}
}
</style>
