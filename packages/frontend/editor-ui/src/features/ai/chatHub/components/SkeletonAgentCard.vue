<template>
	<div :class="$style.card">
		<div :class="$style.avatar"></div>

		<div :class="$style.content">
			<div :class="[$style.skeleton, $style.title]"></div>
			<div :class="[$style.skeleton, $style.description]"></div>
		</div>

		<div :class="[$style.skeleton, $style.actionButton]"></div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.card {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.skeleton {
	--animation--skeleton-pulse--duration: 1s;
	--animation--skeleton-pulse--opacity-start: 0.6;
	--animation--skeleton-pulse--opacity-end: 0.3;

	background: var(--color--foreground);
	@include motion.skeleton-pulse;
	border-radius: var(--radius--sm);
}

.avatar {
	--animation--skeleton-pulse--duration: 1s;
	--animation--skeleton-pulse--opacity-start: 0.6;
	--animation--skeleton-pulse--opacity-end: 0.3;

	width: 24px;
	height: 24px;
	border-radius: 50%;
	flex-shrink: 0;
	background: var(--color--foreground);
	@include motion.skeleton-pulse;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.title {
	height: 16px;
	width: 40%;
}

.description {
	height: 14px;
	width: 60%;
}

.actionButton {
	width: 24px;
	height: 24px;
	border-radius: var(--radius);
}
</style>
