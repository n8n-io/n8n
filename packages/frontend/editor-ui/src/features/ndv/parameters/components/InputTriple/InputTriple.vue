<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import { computed, ref } from 'vue';

type Props = {
	middleWidth?: string;
};
withDefaults(defineProps<Props>(), { middleWidth: '160px' });

const containerRef = ref<HTMLElement | null>(null);
const { width } = useElementSize(containerRef);

const bp = computed(() => {
	if (width.value <= 0) return 'default';
	if (width.value <= 400) return 'stacked';
	if (width.value <= 680) return 'medium';
	return 'default';
});

// True when the right item wraps below (medium or stacked)
const isStacked = computed(() => bp.value !== 'default');
</script>

<template>
	<div
		ref="containerRef"
		:class="{
			[$style.observer]: true,
			[$style.stacked]: bp === 'stacked',
			[$style.medium]: bp === 'medium',
			[$style.default]: bp === 'default',
			[$style.noRightSlot]: !$slots.right,
			[$style.noMiddleSlot]: !$slots.middle,
		}"
	>
		<div :class="$style.triple">
			<div v-if="$slots.left" :class="$style.item">
				<slot name="left" :is-stacked="isStacked"></slot>
			</div>
			<div
				v-if="$slots.middle"
				:class="[$style.item, $style.middle]"
				:style="{ flexBasis: middleWidth }"
			>
				<slot name="middle" :is-stacked="isStacked"></slot>
			</div>
			<div v-if="$slots.right" :class="$style.item">
				<slot name="right" :is-stacked="isStacked"></slot>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.triple {
	display: flex;
	flex-wrap: nowrap;
	align-items: flex-start;
}

.observer {
	--parameter-input-options--height: 22px;
	width: 100%;
	position: relative;
}

.item {
	position: relative;
	flex-shrink: 0;
	flex-basis: 240px;
	flex-grow: 1;
	z-index: 0;

	--input--radius: 0;

	// Suppress gap in our N8nInput wrapper (no prepend/append in triple)
	:global(.n8n-input) {
		gap: 0;
	}

	&:focus-within {
		z-index: 1;
	}
}

.default .item:not(:first-child) {
	margin-left: -1px;
}

.middle {
	flex-grow: 0;
	flex-basis: 160px;
}

.item:first-of-type {
	--input--radius--top-left: var(--radius);
	--input--radius--bottom-left: var(--radius);
	--input-triple--radius--top-right: 0;
	--input-triple--radius--bottom-right: 0;

	// Expression inputs
	:global(.cm-editor) {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	:global(.el-input-group__prepend) {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	:global(.el-input-group__prepend + * .cm-editor) {
		border-radius: 0;
	}
}

.item:last-of-type {
	--input--radius--top-left: 0;
	--input--radius--bottom-left: 0;
	--input--radius--top-right: var(--radius);
	--input--radius--bottom-right: var(--radius);
	--input-triple--radius--top-right: var(--radius);
	--input-triple--radius--bottom-right: var(--radius);

	// Expression inputs
	:global(.cm-editor) {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
	}

	:global(.el-input-group__prepend) {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
	}
}

// Medium: right item wraps below, left+middle stay on first row
.medium:not(.noRightSlot) {
	.triple {
		flex-wrap: wrap;
	}

	.middle {
		margin-left: -1px;

		--input-triple--radius--top-right: var(--radius);
		--input-triple--radius--bottom-right: 0;
	}

	.item:first-of-type {
		--input--radius--top-left: var(--radius);
		--input-triple--radius--top-right: 0;
		--input--radius--bottom-left: 0;
		--input--radius--bottom-right: 0;
	}

	.item:first-of-type :global(.cm-editor) {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		border-bottom-left-radius: 0;
	}

	.item:first-of-type :global(.el-input-group__prepend) {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		border-bottom-left-radius: 0;
	}

	.item:last-of-type {
		flex-basis: 400px;
		margin-top: -1px;

		--input--radius--top-left: 0;
		--input--radius--top-right: 0;
		--input-triple--radius--top-right: 0;
		--input--radius--bottom-left: var(--radius);
		--input--radius--bottom-right: var(--radius);
		--input-triple--radius--bottom-right: var(--radius);
	}

	.item:last-of-type :global(.cm-editor) {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		border-bottom-left-radius: 0;
	}

	.item:last-of-type :global(.el-input-group__prepend) {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		border-bottom-left-radius: 0;
	}
}

// Stacked: all items in a single column
.stacked {
	.triple {
		display: block;
	}

	.middle {
		padding-top: 0;
	}

	.middle:not(.item:last-of-type) {
		width: 100%;
		--input--radius: 0;
	}

	.item:first-of-type {
		--input--radius--top-left: var(--radius);
		--input--radius--top-right: var(--radius);
		--input-triple--radius--top-right: var(--radius);
		--input--radius--bottom-left: 0;
		--input--radius--bottom-right: 0;
		--input-triple--radius--bottom-right: 0;
	}

	.item:first-of-type :global(.cm-editor) {
		border-radius: var(--radius) var(--radius) 0 0;
	}

	.item:first-of-type :global(.el-input-group__prepend) {
		border-radius: var(--radius) 0 0 0;
	}

	.item:first-of-type :global(.el-input-group__prepend + * .cm-editor) {
		border-radius: 0 var(--radius) 0 0;
	}

	.item:not(:first-of-type) {
		margin-top: -1px;
	}

	.item:not(:first-of-type):not(:last-of-type) {
		--parameter-input-options--height: 0;
	}

	.middle :global(.cm-editor),
	.middle :global(.el-input-group__prepend) {
		border-radius: 0;
	}

	.item:last-of-type {
		--input--radius--top-left: 0;
		--input--radius--top-right: 0;
		--input-triple--radius--top-right: 0;
		--input--radius--bottom-left: var(--radius);
		--input--radius--bottom-right: var(--radius);
		--input-triple--radius--bottom-right: var(--radius);
	}

	.item:last-of-type :global(.cm-editor) {
		border-radius: 0 0 var(--radius) var(--radius);
	}

	.item:last-of-type :global(.el-input-group__prepend) {
		border-radius: 0 0 0 var(--radius);
	}

	.item:last-of-type :global(.el-input-group__prepend + * .cm-editor) {
		border-bottom-left-radius: 0;
	}
}
</style>
