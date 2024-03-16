<template>
	<div :class="['n8n-tabs', $style.container]">
		<div v-if="scrollPosition > 0" :class="$style.back" @click="scrollLeft">
			<N8nIcon icon="chevron-left" size="small" />
		</div>
		<div v-if="canScrollRight" :class="$style.next" @click="scrollRight">
			<N8nIcon icon="chevron-right" size="small" />
		</div>
		<div ref="tabs" :class="$style.tabs">
			<div
				v-for="option in options"
				:id="option.value"
				:key="option.value"
				:class="{ [$style.alignRight]: option.align === 'right' }"
			>
				<n8n-tooltip :disabled="!option.tooltip" placement="bottom">
					<template #content>
						<div @click="handleTooltipClick(option.value, $event)" v-html="option.tooltip" />
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
							<span :class="$style.external"
								><N8nIcon icon="external-link-alt" size="small"
							/></span>
						</div>
					</a>

					<div
						v-else
						:class="{ [$style.tab]: true, [$style.activeTab]: modelValue === option.value }"
						:data-test-id="`tab-${option.value}`"
						@click="() => handleTabClick(option.value)"
					>
						<N8nIcon v-if="option.icon" :icon="option.icon" size="medium" />
						<span v-if="option.label">{{ option.label }}</span>
					</div>
				</n8n-tooltip>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import N8nIcon from '../N8nIcon';

interface TabOptions {
	value: string;
	label?: string;
	icon?: string;
	href?: string;
	tooltip?: string;
	align?: 'left' | 'right';
}

interface TabsProps {
	modelValue?: string;
	options?: TabOptions[];
}

withDefaults(defineProps<TabsProps>(), {
	options: () => [],
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

const $emit = defineEmits<{
	(event: 'tooltipClick', tab: string, e: MouseEvent): void;
	(event: 'update:modelValue', tab: string);
}>();

const handleTooltipClick = (tab: string, event: MouseEvent) => $emit('tooltipClick', tab, event);
const handleTabClick = (tab: string) => $emit('update:modelValue', tab);

const scroll = (left: number) => {
	const container = tabs.value;
	if (container) {
		container.scrollBy({ left, top: 0, behavior: 'smooth' });
	}
};
const scrollLeft = () => scroll(-50);
const scrollRight = () => scroll(50);
</script>

<style lang="scss" module>
.container {
	position: relative;
	height: 24px;
	min-height: 24px;
	width: 100%;
}

.tabs {
	color: var(--color-text-base);
	font-weight: var(--font-weight-bold);
	display: flex;
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
	display: block;
	padding: 0 var(--spacing-s) var(--spacing-2xs) var(--spacing-s);
	padding-bottom: var(--spacing-2xs);
	font-size: var(--font-size-s);
	cursor: pointer;
	white-space: nowrap;
	&:hover {
		color: var(--color-primary);
	}
}

.activeTab {
	color: var(--color-primary);
	border-bottom: var(--color-primary) 2px solid;
}

.alignRight {
	margin-left: auto;
}

.link {
	cursor: pointer;
	color: var(--color-text-base);

	&:hover {
		color: var(--color-primary);

		.external {
			display: inline-block;
		}
	}
}

.external {
	display: none;
}

.button {
	position: absolute;
	background-color: var(--color-background-base);
	z-index: 1;
	height: 24px;
	width: 10px;
	display: flex;
	align-items: center;
	font-weight: var(--font-weight-bold);
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
