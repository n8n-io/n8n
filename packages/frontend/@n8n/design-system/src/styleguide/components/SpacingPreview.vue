<script lang="ts" setup>
import { computed } from 'vue';

interface SpacingPreviewProps {
	property?: 'padding' | 'margin';
	side?: string;
}

const SIZES = [
	'0',
	'5xs',
	'4xs',
	'3xs',
	'2xs',
	'xs',
	's',
	'm',
	'l',
	'xl',
	'2xl',
	'3xl',
	'4xl',
	'5xl',
] as const;

const props = withDefaults(defineProps<SpacingPreviewProps>(), {
	property: 'padding',
	side: '',
});

const sizes = computed(() => [...SIZES, ...(props.property === 'margin' ? ['auto'] : [])]);
</script>

<template>
	<div>
		<div v-for="size in sizes" :key="size" class="spacing-group">
			<div class="spacing-example" :class="`${property[0]}${side ? side[0] : ''}-${size}`">
				<div class="spacing-box" />
				<div class="label">{{ property[0] }}{{ side ? side[0] : '' }}-{{ size }}</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss">
$box-size: 64px;

.spacing-group {
	border: var(--border);
	margin: var(--spacing--sm);
	display: inline-flex;
}

.spacing-example {
	background: white;
	position: relative;
	background: hsla(var(--color--primary-h), var(--color--primary-s), var(--color--primary-l), 0.25);
}

.spacing-box {
	width: $box-size;
	height: $box-size;
	display: block;
	position: relative;
	background: var(--color--primary);
}

.label {
	position: absolute;
	bottom: -1rem;
	right: 0;
	font-size: var(--font-size--sm);
}
</style>
