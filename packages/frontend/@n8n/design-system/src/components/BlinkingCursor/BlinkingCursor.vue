<template>
	<span class="blinking-cursor"></span>
</template>

<style lang="scss">
.blinking-cursor {
	display: inline-block;
	height: var(--font-size--md);
	width: var(--spacing--3xs);
	border-radius: var(--radius--sm);
	margin-left: var(--spacing--4xs);

	animation: 1s blink step-end infinite;
}

@keyframes blink {
	from,
	to {
		background-color: transparent;
	}
	50% {
		background-color: var(--color--foreground--shade-2);
	}
}
</style>
