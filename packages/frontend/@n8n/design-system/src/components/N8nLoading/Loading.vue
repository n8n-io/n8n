<script lang="ts" setup>
const VARIANT = [
	'custom',
	'p',
	'text',
	'h1',
	'h3',
	'text',
	'caption',
	'button',
	'image',
	'circle',
	'rect',
] as const;

interface LoadingProps {
	animated?: boolean;
	loading?: boolean;
	rows?: number;
	cols?: number;
	shrinkLast?: boolean;
	variant?: (typeof VARIANT)[number];
}

withDefaults(defineProps<LoadingProps>(), {
	animated: true,
	loading: true,
	rows: 1,
	cols: 0,
	shrinkLast: true,
	variant: 'p',
});

// Callers and skeleton.scss size the bars through these class names.
// A bare Element Plus item uses the text variant.
const textItemClass = ['el-skeleton__item', 'el-skeleton__text'];
</script>

<template>
	<div
		v-if="loading"
		aria-hidden="true"
		:class="['n8n-loading', `n8n-loading-${variant}`, 'el-skeleton', { 'is-animated': animated }]"
	>
		<template v-if="cols">
			<div v-for="i in cols" :key="i" :class="textItemClass" />
		</template>
		<template v-else>
			<div v-if="variant === 'h1'">
				<div
					v-for="(item, index) in rows"
					:key="index"
					:class="{
						[$style.h1Last]: item === rows && rows > 1 && shrinkLast,
					}"
				>
					<div :class="['el-skeleton__item', 'el-skeleton__h1']" />
				</div>
			</div>
			<div v-else-if="variant === 'p'">
				<div
					v-for="(item, index) in rows"
					:key="index"
					:class="{
						[$style.pLast]: item === rows && rows > 1 && shrinkLast,
					}"
				>
					<div :class="['el-skeleton__item', 'el-skeleton__p']" />
				</div>
			</div>
			<div v-else-if="variant === 'custom'" :class="$style.custom">
				<div :class="textItemClass" />
			</div>
			<div v-else :class="['el-skeleton__item', `el-skeleton__${variant}`]" />
		</template>
	</div>
</template>

<style lang="scss" module>
.h1Last {
	width: 40%;
}
.pLast {
	width: 61%;
}
.custom {
	width: 100%;
	height: 100%;
}
</style>

<style lang="scss">
.n8n-loading-custom.el-skeleton {
	&,
	.el-skeleton__item {
		width: 100%;
		height: 100%;
	}
}
</style>
