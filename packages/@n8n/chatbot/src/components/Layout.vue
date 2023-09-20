<script setup></script>
<template>
	<main class="chat-layout">
		<div v-if="$slots.header" class="chat-header">
			<slot name="header" />
		</div>
		<div v-if="$slots.default" class="chat-body">
			<slot />
		</div>
		<div v-if="$slots.footer" class="chat-footer">
			<slot name="footer" />
		</div>
	</main>
</template>

<style lang="scss">
.chat-layout {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	font-family: var(
		--chat--font-family,
		(
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			Oxygen-Sans,
			Ubuntu,
			Cantarell,
			'Helvetica Neue',
			sans-serif
		)
	);

	.chat-header {
		padding: var(--chat--header--padding, var(--chat--spacing));
		background: var(--chat--header--background, var(--chat--color-dark));
		color: var(--chat--header--color, var(--chat--color-light));
	}

	.chat-body {
		background: var(--chat--body--background, var(--chat--color-light));
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		position: relative;
		padding-bottom: var(--chat--input--height, var(--chat--spacing));
	}

	.chat-footer {
		border-top: 1px solid var(--chat--color-light-shade-100);
		padding: var(--chat--footer--padding, var(--chat--spacing));
		background: var(--chat--footer--background, var(--chat--color-light));
		color: var(--chat--footer--color, var(--chat--color-dark));
	}
}
</style>
