<template>
	<div :class="['n8n-tabs', $style.container]">
		<div :class="$style.back" v-if="scrollPosition > 0" @click="scrollLeft">
			<n8n-icon icon="chevron-left" size="small" />
		</div>
		<div :class="$style.next" v-if="canScrollRight" @click="scrollRight">
			<n8n-icon icon="chevron-right" size="small" />
		</div>
		<div ref="tabs" :class="$style.tabs">
			<div  v-for="option in options"
				:key="option.value"
				:id="option.value"
				:class="{ [$style.alignRight]: option.align === 'right' }"
			>
				<n8n-tooltip :disabled="!option.tooltip" placement="bottom">
					<div slot="content" v-html="option.tooltip" @click="handleTooltipClick(option.value, $event)"></div>
					<a
						v-if="option.href"
						target="_blank"
						:href="option.href"
						:class="[$style.link, $style.tab]"
						@click="() => handleTabClick(option.value)"
					>
						<div>
							{{ option.label }}
							<span :class="$style.external"><n8n-icon icon="external-link-alt" size="small" /></span>
						</div>
					</a>

					<div
						v-else
						:class="{ [$style.tab]: true, [$style.activeTab]: value === option.value }"
						@click="() => handleTabClick(option.value)"
					>
						<n8n-icon v-if="option.icon" :icon="option.icon" size="medium" />
						<span v-if="option.label">{{ option.label }}</span>
					</div>
				</n8n-tooltip>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nIcon from '../N8nIcon';

export default Vue.extend({
	name: 'N8nTabs',
	components: {
		N8nIcon,
	},
	mounted() {
		const container = this.$refs.tabs as HTMLDivElement | undefined;
		if (container) {
			container.addEventListener('scroll', (event: Event) => {
				const width = container.clientWidth;
				const scrollWidth = container.scrollWidth;
				// @ts-ignore
				this.scrollPosition = event.srcElement.scrollLeft; // eslint-disable-line @typescript-eslint/no-unsafe-assignment

				this.canScrollRight = scrollWidth - width > this.scrollPosition;
			});

			this.resizeObserver = new ResizeObserver(() => {
				const width = container.clientWidth;
				const scrollWidth = container.scrollWidth;
				this.canScrollRight = scrollWidth - width > this.scrollPosition;
			});
			this.resizeObserver.observe(container);

			const width = container.clientWidth;
			const scrollWidth = container.scrollWidth;
			this.canScrollRight = scrollWidth - width > this.scrollPosition;
		}
	},
	destroyed() {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
	},
	data() {
		return {
			scrollPosition: 0,
			canScrollRight: false,
			resizeObserver: null as ResizeObserver | null,
		};
	},
	props: {
		value: {
		},
		options: {
		},
	},
	methods: {
		handleTooltipClick(tab: string, event: MouseEvent) {
			this.$emit('tooltipClick', tab, event);
		},
		handleTabClick(tab: string) {
			this.$emit('input', tab);
		},
		scrollLeft() {
			this.scroll(-50);
		},
		scrollRight() {
			this.scroll(50);
		},
		scroll(left: number) {
			const container = this.$refs.tabs as (HTMLDivElement & { scrollBy: ScrollByFunction }) | undefined;
			if (container) {
				container.scrollBy({ left, top: 0, behavior: 'smooth' });
			}
		},
	},
});

type ScrollByFunction = (arg: { left: number, top: number, behavior: 'smooth' | 'instant' | 'auto' }) => void;

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
	-ms-overflow-style: none;  /* IE and Edge */
	scrollbar-width: none;  /* Firefox */
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
