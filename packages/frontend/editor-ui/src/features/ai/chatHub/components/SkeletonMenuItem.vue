<template>
	<div :class="$style.skeletonItem">
		<div :class="$style.skeletonAvatar"></div>
		<div :class="$style.skeletonText"></div>
	</div>
</template>

<style lang="scss" module>
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
	background: var(--color--foreground);
	animation: skeleton-pulse 1s ease-in-out infinite;
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

@keyframes skeleton-pulse {
	0%,
	100% {
		opacity: 0.6;
	}
	50% {
		opacity: 0.3;
	}
}
</style>
