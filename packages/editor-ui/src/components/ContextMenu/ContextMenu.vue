<script setup lang="ts">
interface ContextMenuItem {
	id: string;
	name: string;
	icon: string;
	shortcut: string;
}

interface Props {
	items: ContextMenuItem[];
}

defineProps<Props>();

const emit = defineEmits<{
	(event: 'action', value: string): void;
}>();

const onAction = (id: string): void => {
	emit('action', id);
};
</script>

<template>
	<div data-test-id="context-menu">
		<ul :class="$style">
			<li>
				<button></button>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.context-menu {
	display: flex;
	flex-direction: column;
	padding: var(--spacing-s) var(--spacing-m);
}
</style>
