<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		type?: 'primary' | 'secondary';
		element?: 'button' | 'a';
	}>(),
	{
		type: 'primary',
		element: 'button',
	},
);

const buttonTypeClass = computed(() => {
	return `chat-button-${props.type}`;
});
</script>

<template>
	<component :is="element" :class="['chat-button', buttonTypeClass]">
		<slot />
	</component>
</template>
<style lang="scss">
.chat-button {
	display: inline-flex;
	text-align: center;
	vertical-align: middle;
	user-select: none;
	border: var(--chat--button--border-width) solid;
	padding: var(--chat--button--padding);
	font-size: var(--chat--button--font-size);
	line-height: var(--chat--button--line-height);
	border-radius: var(--chat--button--border-radius);
	transition:
		color var(--chat--transition-duration) ease-in-out,
		background-color var(--chat--transition-duration) ease-in-out,
		border-color var(--chat--transition-duration) ease-in-out,
		box-shadow var(--chat--transition-duration) ease-in-out;
	cursor: pointer;
	text-decoration: none;

	&:focus {
		outline: 0;
		box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
	}

	&:disabled {
		opacity: 0.65;
	}
}

.chat-button-primary {
	color: var(--chat--button--color--primary);
	background-color: var(--chat--button--background--primary);
	border-color: var(--chat--button--border-color--primary);

	&:hover {
		color: var(--chat--button--hover--color);
		background-color: var(--chat--button--hover--background);
		border-color: var(--chat--button--border-color--primary--hover);
	}
}

.chat-button-secondary {
	color: var(--chat--button--color--secondary);
	background-color: var(--chat--button--background--secondary);
	border-color: var(--chat--button--border-color--secondary);

	&:hover {
		color: var(--chat--button--color--secondary--hover);
		background-color: var(--chat--button--background--secondary--hover);
		border-color: var(--chat--button--border-color--secondary--hover);
	}
}
</style>
