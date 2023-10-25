<script lang="ts" setup>
type Props = {
	html: string;
	canDrop: boolean;
};

withDefaults(defineProps<Props>(), {
	canDrop: false,
});
</script>

<template>
	<div
		:class="[$style.dragPill, canDrop ? $style.droppablePill : $style.defaultPill]"
		v-html="html"
	/>
</template>

<style lang="scss" module>
.dragPill {
	display: inline-flex;
	height: 24px;
	padding: 0 var(--spacing-3xs);
	border: 1px solid var(--color-foreground-light);
	border-radius: 4px;
	background: var(--color-background-xlight);
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	white-space: nowrap;
	align-items: center;

	span {
		display: flex;
		height: 100%;
		align-items: center;
	}
}

.droppablePill {
	&,
	span span {
		color: var(--color-success);
		border-color: var(--color-success-light);
		background-color: white;
	}
}

.defaultPill {
	transform: translate(-50%, -100%);
	box-shadow: 0 2px 6px rgba(68, 28, 23, 0.2);

	&,
	span span {
		color: var(--color-primary);
		border-color: var(--color-primary-tint-1);
		background-color: var(--color-primary-tint-3);
	}
}
</style>
