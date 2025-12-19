<template>
	<span :class="$style.typing" data-test-id="chat-typing-indicator"><i></i><i></i><i></i></span>
</template>

<style lang="scss" module>
.typing {
	display: inline-flex;
	gap: 6px;
}

.typing i {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: currentColor;
	opacity: 0.35;
	animation: blink 1.2s infinite;
}

.typing i:nth-child(2) {
	animation-delay: 0.2s;
}

.typing i:nth-child(3) {
	animation-delay: 0.4s;
}

@keyframes blink {
	0%,
	80%,
	100% {
		opacity: 0.35;
		transform: translateY(0);
	}
	40% {
		opacity: 1;
		transform: translateY(-2px);
	}
}
</style>
