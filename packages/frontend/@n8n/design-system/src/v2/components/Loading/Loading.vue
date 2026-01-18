<script lang="ts" setup>
import { Primitive } from 'reka-ui';
import { computed } from 'vue';

import type { LoadingProps } from './Loading.types';

const props = withDefaults(defineProps<LoadingProps>(), {
	animated: true,
	loading: true,
	rows: 1,
	cols: 0,
	shrinkLast: true,
	variant: 'p',
});

const isLastRowShrunk = computed(() => props.shrinkLast && props.rows > 1);

const showH1Layout = computed(() => props.variant === 'h1' && !props.cols);
const showPLayout = computed(() => props.variant === 'p' && !props.cols);
const showCustomLayout = computed(() => props.variant === 'custom' && !props.cols);
const showColsLayout = computed(() => props.cols > 0);
const showDefaultLayout = computed(
	() =>
		!showH1Layout.value && !showPLayout.value && !showCustomLayout.value && !showColsLayout.value,
);

function isLastRow(index: number, total: number): boolean {
	return index === total - 1;
}
</script>

<template>
	<Primitive
		v-if="loading"
		as="div"
		:class="['n8n-loading', `n8n-loading-${variant}`, 'el-skeleton', $style.loading]"
		aria-hidden="true"
	>
		<!-- Column-based layout -->
		<template v-if="showColsLayout">
			<div
				v-for="i in cols"
				:key="`col-${i}`"
				:class="[$style.item, $style[variant], { [$style.animated]: animated }]"
			/>
		</template>

		<!-- H1 variant with rows -->
		<template v-else-if="showH1Layout">
			<div :class="$style.rowContainer">
				<div
					v-for="(_, index) in rows"
					:key="`h1-${index}`"
					:class="{ [$style.h1Last]: isLastRow(index, rows) && isLastRowShrunk }"
				>
					<div :class="[$style.item, $style.h1, { [$style.animated]: animated }]" />
				</div>
			</div>
		</template>

		<!-- P variant with rows -->
		<template v-else-if="showPLayout">
			<div :class="$style.rowContainer">
				<div
					v-for="(_, index) in rows"
					:key="`p-${index}`"
					:class="{ [$style.pLast]: isLastRow(index, rows) && isLastRowShrunk }"
				>
					<div :class="[$style.item, $style.p, { [$style.animated]: animated }]" />
				</div>
			</div>
		</template>

		<!-- Custom variant -->
		<template v-else-if="showCustomLayout">
			<div :class="[$style.item, $style.custom, { [$style.animated]: animated }]" />
		</template>

		<!-- Default single item -->
		<template v-else-if="showDefaultLayout">
			<div :class="[$style.item, $style[variant], { [$style.animated]: animated }]" />
		</template>
	</Primitive>
</template>

<style lang="scss" module>
@keyframes skeleton-pulse {
	0% {
		opacity: 1;
	}
	50% {
		opacity: 0.4;
	}
	100% {
		opacity: 1;
	}
}

.loading {
	display: block;
}

.rowContainer {
	display: flex;
	flex-direction: column;
}

.item {
	background-color: var(--color--foreground);
	border-radius: var(--radius);
}

.animated {
	animation: skeleton-pulse 1.5s ease-in-out infinite;
}

// Variant-specific styles
.p {
	height: 16px;
	margin-bottom: var(--spacing--2xs);
}

.h1 {
	height: 20px;
	margin-bottom: var(--spacing--xs);
}

.h3 {
	height: 14px;
}

.text {
	height: 13px;
	width: 50%;
}

.caption {
	height: 12px;
}

.button {
	height: 32px;
	width: 64px;
	border-radius: var(--radius);
}

.image {
	height: 100px;
	width: 100px;
}

.circle {
	height: 36px;
	width: 36px;
	border-radius: 50%;
}

.rect {
	height: 20px;
	width: 100%;
}

.custom {
	width: 100%;
	height: 100%;
}

// Last row shrink styles
.h1Last {
	width: 40%;
}

.pLast {
	width: 61%;
}
</style>

<style lang="scss">
// Global styles for backward compatibility
.n8n-loading-custom {
	&,
	& > div {
		width: 100%;
		height: 100%;
	}
}
</style>
