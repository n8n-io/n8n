<script setup lang="ts">
import { nextTick, onBeforeMount, onMounted, ref, watch } from 'vue';
import type { ITemplatesCollection } from '@n8n/rest-api-client/api/templates';
import Card from '@/components/CollectionWorkflowCard.vue';
import TemplatesInfoCard from './TemplatesInfoCard.vue';
import { VueAgile } from 'vue-agile';

import { N8nIcon } from '@n8n/design-system';
type SliderRef = InstanceType<typeof VueAgile>;

const props = withDefaults(
	defineProps<{
		collections: ITemplatesCollection[];
		loading?: boolean;
		showItemCount?: boolean;
		showNavigation?: boolean;
		cardsWidth?: string;
	}>(),
	{
		showItemCount: true,
		showNavigation: true,
		cardsWidth: '240px',
		loading: false,
	},
);

const emit = defineEmits<{
	openCollection: [payload: { event: MouseEvent; id: number }];
}>();

const carouselScrollPosition = ref(0);
const cardWidth = ref(parseInt(props.cardsWidth, 10));
const scrollEnd = ref(false);
const listElement = ref<null | Element>(null);
const sliderRef = ref<SliderRef>(null);

const updateCarouselScroll = () => {
	if (listElement.value) {
		carouselScrollPosition.value = Number(listElement.value.scrollLeft.toFixed());

		const width = listElement.value.clientWidth;
		const scrollWidth = listElement.value.scrollWidth;
		const scrollLeft = carouselScrollPosition.value;
		scrollEnd.value = scrollWidth - width <= scrollLeft + 7;
	}
};

const onCardClick = (event: MouseEvent, id: number) => {
	emit('openCollection', { event, id });
};

const scrollLeft = () => {
	if (listElement.value) {
		listElement.value.scrollBy({ left: -(cardWidth.value * 2), top: 0, behavior: 'smooth' });
	}
};

const scrollRight = () => {
	if (listElement.value) {
		listElement.value.scrollBy({ left: cardWidth.value * 2, top: 0, behavior: 'smooth' });
	}
};

watch(
	() => props.collections,
	() => {
		setTimeout(() => {
			updateCarouselScroll();
		}, 0);
	},
);

watch(
	() => props.loading,
	() => {
		setTimeout(() => {
			updateCarouselScroll();
		}, 0);
	},
);

onMounted(async () => {
	await nextTick();

	if (!sliderRef.value) {
		return;
	}

	listElement.value = sliderRef.value.$el.querySelector('.agile__list');
	if (listElement.value) {
		listElement.value.addEventListener('scroll', updateCarouselScroll);
	}
});

onBeforeMount(() => {
	if (sliderRef.value) {
		sliderRef.value.destroy();
	}
	window.addEventListener('scroll', updateCarouselScroll);
});
</script>

<template>
	<div v-show="loading || collections.length" :class="$style.container">
		<VueAgile
			ref="sliderRef"
			:dots="false"
			:nav-buttons="false"
			:infinite="false"
			:slides-to-show="4"
			@after-change="updateCarouselScroll"
		>
			<Card v-for="n in loading ? 4 : 0" :key="`loading-${n}`" :loading="loading" />
			<TemplatesInfoCard
				v-for="collection in loading ? [] : collections"
				:key="collection.id"
				data-test-id="templates-info-card"
				:collection="collection"
				:show-item-count="showItemCount"
				:width="cardsWidth"
				@click="(e) => onCardClick(e, collection.id)"
			/>
		</VueAgile>
		<button
			v-show="showNavigation && carouselScrollPosition > 0"
			:class="{ [$style.leftButton]: true }"
			@click="scrollLeft"
		>
			<N8nIcon icon="chevron-left" />
		</button>
		<button
			v-show="showNavigation && !scrollEnd"
			:class="{ [$style.rightButton]: true }"
			@click="scrollRight"
		>
			<N8nIcon icon="chevron-right" />
		</button>
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;
}

.button {
	width: 28px;
	height: 37px;
	position: absolute;
	top: 35%;
	border-radius: var(--radius--lg);
	border: var(--border);
	background-color: #fbfcfe;
	cursor: pointer;

	&:after {
		content: '';
		width: 40px;
		height: 140px;
		top: -55px;
		position: absolute;
	}
	svg {
		color: var(--color--foreground--shade-2);
	}
}

.leftButton {
	composes: button;
	left: -30px;

	&:after {
		left: 27px;
		background: linear-gradient(
			270deg,
			hsla(
				var(--color--background--light-2-h),
				var(--color--background--light-2-s),
				var(--color--background--light-2-l),
				50%
			),
			hsla(
				var(--color--background--light-2-h),
				var(--color--background--light-2-s),
				var(--color--background--light-2-l),
				100%
			)
		);
	}
}

.rightButton {
	composes: button;
	right: -30px;

	&:after {
		right: 27px;
		background: linear-gradient(
			90deg,
			hsla(
				var(--color--background--light-2-h),
				var(--color--background--light-2-s),
				var(--color--background--light-2-l),
				50%
			),
			hsla(
				var(--color--background--light-2-h),
				var(--color--background--light-2-s),
				var(--color--background--light-2-l),
				100%
			)
		);
	}
}
</style>

<style lang="scss">
.agile {
	&__list {
		width: 100%;
		padding-bottom: var(--spacing--2xs);
		overflow-x: auto;
		transition: all 1s ease-in-out;
	}

	&__track {
		width: 50px;
	}
}
</style>
