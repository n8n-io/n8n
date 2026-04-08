<script lang="ts" setup>
import { ElSkeleton, ElSkeletonItem } from 'element-plus';

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
</script>

<template>
	<ElSkeleton
		:loading="loading"
		:animated="animated"
		:class="['n8n-loading', `n8n-loading-${variant}`]"
	>
		<template v-if="cols" #template>
			<ElSkeletonItem v-for="i in cols" :key="i" />
		</template>
		<template v-else #template>
			<div v-if="variant === 'h1'">
				<div
					v-for="(item, index) in rows"
					:key="index"
					:class="{
						[$style.h1Last]: item === rows && rows > 1 && shrinkLast,
					}"
				>
					<ElSkeletonItem :variant="variant" />
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
					<ElSkeletonItem :variant="variant" />
				</div>
			</div>
			<div v-else-if="variant === 'custom'" :class="$style.custom">
				<ElSkeletonItem />
			</div>
			<ElSkeletonItem v-else :variant="variant" />
		</template>
	</ElSkeleton>
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
