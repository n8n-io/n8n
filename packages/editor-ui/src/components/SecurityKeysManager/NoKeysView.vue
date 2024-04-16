<template>
	<div :class="$style.container">
		<div :class="$style.icon">🔑</div>
		<div>
			<div class="mb-s">
				<n8n-heading size="large">
					{{ $locale.baseText('securityKeysModal.noKeys.title') }}
				</n8n-heading>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
	padding: var(--spacing-s);
	justify-content: center;
	align-items: center;
	height: 100%;
}

.icon {
	font-size: var(--spacing-2xl);
}
</style>
