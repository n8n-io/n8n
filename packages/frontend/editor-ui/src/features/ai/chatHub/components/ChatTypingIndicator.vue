<template>
	<span :class="$style.typing" data-test-id="chat-typing-indicator"><i></i><i></i><i></i></span>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

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
	@include motion.typing-blink;
}

.typing i:nth-child(2) {
	animation-delay: 0.2s;
}

.typing i:nth-child(3) {
	animation-delay: 0.4s;
}
</style>
