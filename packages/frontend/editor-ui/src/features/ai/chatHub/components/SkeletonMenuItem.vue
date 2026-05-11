<template>
	<div :class="$style.skeletonItem">
		<div :class="$style.skeletonAvatar"></div>
		<div :class="$style.skeletonText"></div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.skeletonItem {
	display: flex;
	align-items: center;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	gap: var(--spacing--2xs);
	border-radius: var(--spacing--4xs);
	height: 30px;
}

.skeletonAvatar,
.skeletonText {
	--animation--skeleton-pulse--duration: 1s;
	--animation--skeleton-pulse--opacity-start: 0.6;
	--animation--skeleton-pulse--opacity-end: 0.3;

	background: var(--color--foreground);
	@include motion.skeleton-pulse;
}

.skeletonAvatar {
	width: 16px;
	height: 16px;
	border-radius: 50%;
	flex-shrink: 0;
}

.skeletonText {
	height: 14px;
	width: 80%;
	border-radius: var(--radius--sm);
}
</style>
