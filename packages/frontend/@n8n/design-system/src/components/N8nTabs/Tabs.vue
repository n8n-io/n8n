<script lang="ts" setup generic="Value extends string | number">
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import type { TabOptions } from '../../types';
import N8nIcon from '../N8nIcon';
import Tag from '../N8nTag/Tag.vue';
import N8nTooltip from '../N8nTooltip';

interface TabsProps {
	modelValue?: Value;
	options?: Array<TabOptions<Value>>;
	size?: 'small' | 'medium';
	variant?: 'modern' | 'legacy';
}

withDefaults(defineProps<TabsProps>(), {
	modelValue: undefined,
	options: () => [],
	size: 'medium',
	variant: 'legacy',
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
	<div
		:class="[
			'n8n-tabs',
			$style.container,
			size === 'small' ? $style.small : '',
			variant === 'modern' ? $style.modern : '',
		]"
	>
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
				<N8nTooltip :disabled="!option.tooltip" placement="bottom" :show-after="100">
					<template #content>
						<div v-n8n-html="option.tooltip" @click="handleTooltipClick(option.value, $event)" />
					</template>
					<a
						v-if="option.href"
						target="_blank"
						:href="option.href"
						rel="noopener noreferrer"
						:class="[$style.link, $style.tab, option.label ? '' : $style.noText]"
						@click="() => handleTabClick(option.value)"
					>
						<div>
							{{ option.label }}
							<N8nIcon
								:class="$style.external"
								:icon="option.icon ?? 'external-link'"
								size="small"
							/>
						</div>
					</a>
					<RouterLink
						v-else-if="option.to"
						:to="option.to"
						:class="[
							$style.tab,
							{ [$style.activeTab]: modelValue === option.value, [$style.noText]: !option.label },
						]"
					>
						<N8nIcon v-if="option.icon" :icon="option.icon" size="medium" />
						<span v-if="option.label">{{ option.label }}</span>
						<Tag v-if="option.tag" :text="option.tag" :clickable="false" />
					</RouterLink>
					<div
						v-else
						:class="{
							[$style.tab]: true,
							[$style.activeTab]: modelValue === option.value,
							[$style.noText]: !option.label,
							[$style.dangerTab]: option.variant === 'danger',
						}"
						:data-test-id="`tab-${option.value}`"
						@click="() => handleTabClick(option.value)"
					>
						<N8nIcon
							v-if="option.icon && option.iconPosition !== 'right'"
							:icon="option.icon"
							:class="$style.icon"
							size="small"
						/>
						<span v-if="option.label" :class="$style.notificationContainer">
							{{ option.label }}
							<div v-if="option.notification" :class="$style.notification" />
						</span>
						<N8nIcon
							v-if="option.icon && option.iconPosition === 'right'"
							:icon="option.icon"
							:class="$style.icon"
							size="small"
						/>
						<Tag v-if="option.tag" :text="option.tag" :clickable="false" />
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

	&.modern {
		height: 26px;
		min-height: 26px;
	}
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

	.small.modern & {
		gap: var(--spacing-xs);
	}
}

.tab {
	--active-tab-border-width: 2px;
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs);
	padding: 0 var(--spacing-s);
	padding-bottom: calc(var(--spacing-2xs) + var(--active-tab-border-width));
	font-size: var(--font-size-s);

	cursor: pointer;
	white-space: nowrap;
	color: var(--color-text-base);
	&:hover {
		color: var(--color-primary);
	}

	span + span {
		margin-left: var(--spacing-4xs);
	}

	.modern & {
		padding-bottom: calc(var(--spacing-xs) + var(--active-tab-border-width));
		font-size: var(--font-size-2xs);
		font-weight: var(--font-weight-bold);
	}

	.small & {
		font-size: var(--font-size-2xs);
	}

	.small.modern & {
		padding-inline: 0;
	}
}

.activeTab {
	color: var(--color-primary);
	padding-bottom: var(--spacing-2xs);
	border-bottom: var(--color-primary) var(--active-tab-border-width) solid;

	.modern & {
		padding-bottom: var(--spacing-xs);
	}
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

	.noText & {
		display: block;
		margin-left: 0;
	}
}

.noText .icon {
	display: block;
}

.dangerTab {
	color: var(--color-danger);

	&:hover {
		color: var(--color-danger);
	}
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

	&:after {
		content: '';
		display: block;
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
