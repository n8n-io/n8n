<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		type?: 'primary' | 'secondary';
		element?: 'button' | 'a';
		disabled?: boolean;
	}>(),
	{
		type: 'primary',
		element: 'button',
		disabled: false,
	},
);

const buttonTypeClass = computed(() => {
	return `chat-button-${props.type}${props.disabled ? '-disabled' : ''}`;
});
</script>

<template>
	<span :class="{ 'chat-button-wrapper-disabled': props.disabled }">
		<component :is="element" :class="['chat-button', buttonTypeClass]" v-bind="$attrs">
			<slot />
		</component>
	</span>
</template>
<style lang="scss">
.chat-button-wrapper-disabled {
	cursor: not-allowed;
}

.chat-button {
	display: inline-flex;
	text-align: center;
	vertical-align: middle;
	user-select: none;
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
}

.chat-button-primary {
	color: var(--chat--button--color--primary);
	background-color: var(--chat--button--background--primary);
	border: var(--chat--button--border--primary);

	&:hover {
		color: var(--chat--button--color--primary--hover);
		background-color: var(--chat--button--background--primary--hover);
		border: var(--chat--button--border--primary--hover);
	}
}

.chat-button-primary-disabled {
	pointer-events: none;
	color: var(--chat--button--color--primary--disabled);
	background-color: var(--chat--button--background--primary--disabled);
	border: var(--chat--button--border--primary--disabled);
}

.chat-button-secondary {
	color: var(--chat--button--color--secondary);
	background-color: var(--chat--button--background--secondary);
	border: var(--chat--button--border--secondary);

	&:hover {
		color: var(--chat--button--color--secondary--hover);
		background-color: var(--chat--button--background--secondary--hover);
		border: var(--chat--button--border--secondary--hover);
	}
}

.chat-button-secondary-disabled {
	pointer-events: none;
	color: var(--chat--button--color--secondary--disabled);
	background-color: var(--chat--button--background--secondary--disabled);
	border: var(--chat--button--border--secondary--disabled);
}
</style>
