<template>
	<button class="chat-button">
		<slot />
	</button>
</template>
<style lang="scss">
.chat-button {
	display: inline-flex;
	text-align: center;
	vertical-align: middle;
	user-select: none;
	color: var(--chat--button--color, var(--chat--color-light));
	background-color: var(--chat--button--background, var(--chat--color-primary));
	border: 1px solid transparent;
	padding: var(--chat--button--padding, calc(var(--chat--spacing) * 1 / 2) var(--chat--spacing));
	font-size: 1rem;
	line-height: 1.5;
	border-radius: var(--chat--button--border-radius, var(--chat--border-radius));
	transition:
		color var(--chat--transition-duration) ease-in-out,
		background-color var(--chat--transition-duration) ease-in-out,
		border-color var(--chat--transition-duration) ease-in-out,
		box-shadow var(--chat--transition-duration) ease-in-out;
	cursor: pointer;

	&:hover {
		color: var(--chat--button--hover--color, var(--chat--color-light));
		background-color: var(--chat--button--hover--background, var(--chat--color-primary-shade-50));
		text-decoration: none;
	}

	&:focus {
		outline: 0;
		box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
	}

	&:disabled {
		opacity: 0.65;
	}
}
</style>
