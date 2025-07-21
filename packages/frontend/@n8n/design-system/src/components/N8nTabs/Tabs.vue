<script lang="ts" setup generic="Value extends string | number">
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import type { TabOptions } from '../../types';
import N8nIcon from '../N8nIcon';
import N8nTooltip from '../N8nTooltip';

interface TabsProps {
	modelValue?: Value;
	options?: Array<TabOptions<Value>>;
	size?: 'small' | 'medium';
}

withDefaults(defineProps<TabsProps>(), {
	modelValue: undefined,
	options: () => [],
	size: 'medium',
});

const scrollPosition = ref(0);
const canScrollRight = ref(false);
const tabs = ref<Element | undefined>(undefined);
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
	const container = tabs.value as Element;
	if (container) {
		container.addEventListener('scroll', (event: Event) => {
			const width = container.clientWidth;
			const scrollWidth = container.scrollWidth;
			scrollPosition.value = (event.target as Element).scrollLeft;
			canScrollRight.value = scrollWidth - width > scrollPosition.value;
		});

		resizeObserver = new ResizeObserver(() => {
			const width = container.clientWidth;
			const scrollWidth = container.scrollWidth;
			canScrollRight.value = scrollWidth - width > scrollPosition.value;
		});
		resizeObserver.observe(container);

		const width = container.clientWidth;
		const scrollWidth = container.scrollWidth;
		canScrollRight.value = scrollWidth - width > scrollPosition.value;
	}
});

onUnmounted(() => {
	resizeObserver?.disconnect();
});

const emit = defineEmits<{
	tooltipClick: [tab: Value, e: MouseEvent];
	'update:modelValue': [tab: Value];
}>();

const handleTooltipClick = (tab: Value, event: MouseEvent) => emit('tooltipClick', tab, event);
const handleTabClick = (tab: Value) => emit('update:modelValue', tab);

const scroll = (left: number) => {
	const container = tabs.value;
	if (container) {
		container.scrollBy({ left, top: 0, behavior: 'smooth' });
	}
};
const scrollLeft = () => scroll(-50);
const scrollRight = () => scroll(50);
</script>

<template>
	<div :class="['n8n-tabs', $style.container, size === 'small' ? $style.small : '']">
		<div v-if="scrollPosition > 0" :class="$style.back" @click="scrollLeft">
			<N8nIcon icon="chevron-left" size="small" />
		</div>
		<div v-if="canScrollRight" :class="$style.next" @click="scrollRight">
			<N8nIcon icon="chevron-right" size="small" />
		</div>
		<div ref="tabs" :class="$style.tabs">
			<div
				v-for="option in options"
				:id="option.value.toString()"
				:key="option.value"
				:class="{ [$style.alignRight]: option.align === 'right' }"
			>
				<N8nTooltip :disabled="!option.tooltip" placement="bottom">
					<template #content>
						<div v-n8n-html="option.tooltip" @click="handleTooltipClick(option.value, $event)" />
					</template>
					<a
						v-if="option.href"
						target="_blank"
						:href="option.href"
						:class="[$style.link, $style.tab]"
						@click="() => handleTabClick(option.value)"
					>
						<div>
							{{ option.label }}
							<span :class="$style.external">
								<N8nIcon icon="external-link" size="small" />
							</span>
						</div>
					</a>
					<RouterLink
						v-else-if="option.to"
						:to="option.to"
						:class="[$style.tab, { [$style.activeTab]: modelValue === option.value }]"
					>
						<N8nIcon v-if="option.icon" :icon="option.icon" size="medium" />
						<span v-if="option.label">{{ option.label }}</span>
					</RouterLink>
					<div
						v-else
						:class="{ [$style.tab]: true, [$style.activeTab]: modelValue === option.value }"
						:data-test-id="`tab-${option.value}`"
						@click="() => handleTabClick(option.value)"
					>
						<N8nIcon v-if="option.icon" :icon="option.icon" size="small" />
						<span v-if="option.label" :class="$style.notificationContainer"
							>{{ option.label }}
							<div v-if="option.notification" :class="$style.notification"><div></div></div
						></span>
					</div>
				</N8nTooltip>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;
	height: 24px;
	min-height: 24px;
	width: 100%;
}

.tabs {
	color: var(--color-text-base);
	font-weight: var(--font-weight-medium);
	display: flex;
	align-items: center;
	width: 100%;
	position: absolute;
	overflow-x: scroll;

	/* Hide scrollbar for Chrome, Safari and Opera */
	&::-webkit-scrollbar {
		display: none;
	}

	/* Hide scrollbar for IE, Edge and Firefox */
	-ms-overflow-style: none; /* IE and Edge */
	scrollbar-width: none; /* Firefox */
}

.tab {
	--active-tab-border-width: 2px;
	display: block;
	padding: 0 var(--spacing-s);
	padding-bottom: calc(
		var(--spacing-bottom-tab, var(--spacing-2xs)) + var(--active-tab-border-width)
	);
	font-size: var(--font-size-tab, var(--font-size-s));
	font-weight: var(--font-weight-tab, var(--font-weight-regular));
	cursor: pointer;
	white-space: nowrap;
	color: var(--color-text-base);
	&:hover {
		color: var(--color-primary);
	}

	span + span {
		margin-left: var(--spacing-4xs);
	}

	.small & {
		font-size: var(--font-size-2xs);
	}
}

.activeTab {
	color: var(--color-primary);
	padding-bottom: var(--spacing-bottom-tab, var(--spacing-2xs));
	border-bottom: var(--color-primary) var(--active-tab-border-width) solid;
}

.alignRight:not(.alignRight + .alignRight) {
	margin-left: auto;
}

.link {
	cursor: pointer;
	color: var(--color-text-base);

	&:hover {
		color: var(--color-primary);
	}
}

.external {
	display: inline-block;
	margin-left: var(--spacing-5xs);
}

.button {
	position: absolute;
	background-color: var(--color-tabs-arrow-buttons, var(--color-background-base));
	z-index: 1;
	height: 24px;
	width: 10px;
	display: flex;
	align-items: center;
	font-weight: var(--font-weight-bold);
}

.notificationContainer {
	display: flex;
	position: relative;
}

.notification {
	display: flex;
	position: absolute;
	right: -0.5em;
	align-items: center;
	justify-content: center;

	div {
		height: 0.3em;
		width: 0.3em;
		background-color: var(--color-primary);
		border-radius: 50%;
	}
}

.back {
	composes: tab;
	composes: button;
	left: 0;
}

.next {
	composes: tab;
	composes: button;
	right: 0;
}
</style>
