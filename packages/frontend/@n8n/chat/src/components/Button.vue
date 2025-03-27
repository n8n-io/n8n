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
	color: var(--chat--button--color);
	background-color: var(--chat--button--background);
	border: 1px solid transparent;
	padding: var(--chat--button--padding);
	font-size: 1rem;
	line-height: 1.5;
	border-radius: var(--chat--button--border-radius);
	transition:
		color var(--chat--transition-duration) ease-in-out,
		background-color var(--chat--transition-duration) ease-in-out,
		border-color var(--chat--transition-duration) ease-in-out,
		box-shadow var(--chat--transition-duration) ease-in-out;
	cursor: pointer;

	&:hover {
		color: var(--chat--button--hover--color);
		background-color: var(--chat--button--hover--background);
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
