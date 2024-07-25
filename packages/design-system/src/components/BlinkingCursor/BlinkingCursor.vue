<template>
	<span class="blinking-cursor"></span>
</template>

<style lang="scss">
.blinking-cursor {
	display: inline-block;
	height: 16px;
	width: 6px;
	background-color: #7e8186;
	border-radius: 2px;
	margin-left: 4px;

	animation: 1s blink step-end infinite;
}

@keyframes blink {
	from,
	to {
		background-color: transparent;
	}
	50% {
		background-color: #7e8186;
	}
}
</style>
