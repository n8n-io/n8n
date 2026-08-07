<script setup lang="ts">
import { ref } from 'vue';

import N8nButton from '../../components/N8nButton/Button.vue';
import N8nCollapsiblePanel from '../../components/N8nCollapsiblePanel/CollapsiblePanel.vue';
import N8nPopover from '../../components/N8nPopover/Popover.vue';

type ExampleKey = 'spinner' | 'skeleton' | 'popover' | 'collapsible' | 'fadeIn' | 'fadeOut';

const exampleKeys: ExampleKey[] = [
	'spinner',
	'skeleton',
	'popover',
	'collapsible',
	'fadeIn',
	'fadeOut',
];
const refreshKeys = ref<Record<ExampleKey, number>>(
	exampleKeys.reduce(
		(keys, key) => ({
			...keys,
			[key]: 0,
		}),
		{} as Record<ExampleKey, number>,
	),
);
const popoverOpen = ref(true);
const collapsibleOpen = ref(true);

function refreshExample(example: ExampleKey) {
	refreshKeys.value[example] += 1;

	if (example === 'popover') {
		popoverOpen.value = true;
	}

	if (example === 'collapsible') {
		collapsibleOpen.value = true;
	}
}
</script>

<template>
	<div class="motion-demo-grid">
		<div class="motion-demo-card">
			<div class="motion-demo-header">
				<div class="motion-demo-label">Spinner</div>
				<N8nButton
					icon-only
					icon="refresh-cw"
					size="small"
					variant="ghost"
					aria-label="Refresh spinner example"
					@click="refreshExample('spinner')"
				/>
			</div>
			<div :key="refreshKeys.spinner" class="motion-demo-spinner" />
		</div>

		<div class="motion-demo-card">
			<div class="motion-demo-header">
				<div class="motion-demo-label">Skeleton pulse</div>
				<N8nButton
					icon-only
					icon="refresh-cw"
					size="small"
					variant="ghost"
					aria-label="Refresh skeleton pulse example"
					@click="refreshExample('skeleton')"
				/>
			</div>
			<div :key="refreshKeys.skeleton" class="motion-demo-skeleton">
				<div />
				<div />
				<div />
			</div>
		</div>

		<div class="motion-demo-card">
			<div class="motion-demo-header">
				<div class="motion-demo-label">N8nPopover</div>
				<N8nButton
					icon-only
					icon="refresh-cw"
					size="small"
					variant="ghost"
					aria-label="Refresh popover example"
					@click="refreshExample('popover')"
				/>
			</div>
			<div :key="refreshKeys.popover" class="motion-demo-component-stage">
				<N8nPopover
					v-model:open="popoverOpen"
					:teleported="false"
					:enable-scrolling="false"
					:suppress-auto-focus="true"
					width="180px"
				>
					<template #trigger>
						<N8nButton size="small" variant="subtle">Open popover</N8nButton>
					</template>
					<template #content>
						<div class="motion-demo-popover-content">Animated popover surface</div>
					</template>
				</N8nPopover>
			</div>
		</div>

		<div class="motion-demo-card">
			<div class="motion-demo-header">
				<div class="motion-demo-label">N8nCollapsiblePanel</div>
				<N8nButton
					icon-only
					icon="refresh-cw"
					size="small"
					variant="ghost"
					aria-label="Refresh collapsible panel example"
					@click="refreshExample('collapsible')"
				/>
			</div>
			<div :key="refreshKeys.collapsible" class="motion-demo-component-stage">
				<N8nCollapsiblePanel v-model="collapsibleOpen" title="Panel title">
					<div class="motion-demo-collapsible-content">Expanded content</div>
				</N8nCollapsiblePanel>
			</div>
		</div>

		<div class="motion-demo-card">
			<div class="motion-demo-header">
				<div class="motion-demo-label">Fade in</div>
				<N8nButton
					icon-only
					icon="refresh-cw"
					size="small"
					variant="ghost"
					aria-label="Refresh fade in example"
					@click="refreshExample('fadeIn')"
				/>
			</div>
			<div :key="refreshKeys.fadeIn" class="motion-demo-fade-in">Content entering</div>
		</div>

		<div class="motion-demo-card">
			<div class="motion-demo-header">
				<div class="motion-demo-label">Fade out</div>
				<N8nButton
					icon-only
					icon="refresh-cw"
					size="small"
					variant="ghost"
					aria-label="Refresh fade out example"
					@click="refreshExample('fadeOut')"
				/>
			</div>
			<div :key="refreshKeys.fadeOut" class="motion-demo-fade-out">Content leaving</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '../../css/mixins/motion';

.motion-demo-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--md);
	margin-top: var(--spacing--md);
}

.motion-demo-card {
	display: flex;
	min-height: 164px;
	align-items: center;
	justify-content: start;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: 1px solid var(--border-color);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.motion-demo-header {
	display: flex;
	width: 100%;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.motion-demo-label {
	color: var(--text-color--light);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--semibold);
}

.motion-demo-refresh {
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border: 1px solid var(--border-color);
	border-radius: var(--radius--sm);
	background: var(--background--surface);
	color: var(--text-color);
	cursor: pointer;
	font-size: var(--font-size--2xs);
}

.motion-demo-spinner {
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border: 2px solid var(--border-color);
	border-top-color: var(--color--primary);
	border-radius: 50%;
	@include motion.spin;
}

.motion-demo-skeleton {
	display: flex;
	width: 100%;
	flex-direction: column;
	gap: var(--spacing--2xs);

	> div {
		height: var(--spacing--sm);
		border-radius: var(--radius--sm);
		background: var(--color--foreground);
		@include motion.skeleton-pulse;
	}

	> div:nth-child(2) {
		width: 80%;
	}

	> div:nth-child(3) {
		width: 56%;
	}
}

.motion-demo-component-stage {
	width: 100%;
}

.motion-demo-popover-content,
.motion-demo-collapsible-content,
.motion-demo-fade-in,
.motion-demo-fade-out {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--md);
	color: var(--text-color);
}

.motion-demo-fade-in {
	@include motion.fade-in;
}

.motion-demo-fade-out {
	@include motion.fade-out;
}
</style>
