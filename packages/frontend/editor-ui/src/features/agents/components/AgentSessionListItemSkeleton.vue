<script setup lang="ts">
/** Fixed token widths keep the skeleton stable between renders. */
const skeletonTitleWidth = {
	'--n8n--agent-session-list--skeleton-text-width': 'var(--spacing--5xl)',
};
const skeletonMetaWidths = ['var(--spacing--2xl)', 'var(--spacing--xl)', 'var(--spacing--2xl)'].map(
	(width) => ({ '--n8n--agent-session-list--skeleton-text-width': width }),
);
</script>

<template>
	<li :class="$style.listSkeleton">
		<div :class="$style.listStart">
			<div :class="$style.listIconContainer">
				<span :class="$style.listIconSkeleton"></span>
			</div>
			<span :class="$style.listTextSkeleton" :style="skeletonTitleWidth"></span>
		</div>
		<div :class="$style.listEnd">
			<span
				v-for="(width, index) in skeletonMetaWidths"
				:key="index"
				:class="$style.listTextSkeleton"
				:style="width"
			></span>
			<span :class="$style.listIconSkeleton"></span>
		</div>
	</li>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion' as motion;
.listSkeleton {
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	min-width: 0;
	padding-inline-start: var(--spacing--xs);
	height: var(--height--2xl);
	color: inherit;
	text-decoration: none;
	outline: 0;
}

.listStart,
.listEnd {
	display: flex;
	align-items: center;
	gap: var(--n8n-agent-session-list-start-gap, var(--spacing--2xs));
}

.listStart {
	min-width: 0;
	align-self: stretch;
}

.listEnd {
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--spacing--sm);
	font-variant-numeric: tabular-nums;
}

.listIconContainer {
	position: relative;
	flex-shrink: 0;
	display: grid;
	place-items: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
}

.listTextSkeleton,
.listIconSkeleton {
	border-radius: var(--radius--xs);
	background-color: var(--background--active);
	@include motion.skeleton-pulse;
}

.listIconSkeleton {
	width: var(--height--3xs);
	height: var(--height--3xs);
}

.listTextSkeleton {
	width: var(--n8n--agent-session-list--skeleton-text-width, var(--spacing--md));
	height: var(--height--2xs);
}
</style>
