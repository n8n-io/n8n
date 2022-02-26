<template>
	<div :class="$style.container" v-show="loading || collections.length">
		<agile ref="slider" :dots="false" :navButtons="false" :infinite="false" :slides-to-show="4" @after-change="updateCarouselScroll">
			<Card v-for="n in (loading ? 4: 0)" :key="`loading-${n}`" :loading="loading" />
			<CollectionCard
				v-for="collection in (loading? []: collections)"
				:key="collection.id"
				:collection="collection"
				@click="(e) => onCardClick(e, collection.id)"
			/>
		</agile>
		<button v-show="carouselScrollPosition > 0" :class="$style.leftButton" @click="scrollLeft">
			<font-awesome-icon icon="chevron-left" />
		</button>
		<button v-show="!scrollEnd" :class="$style.rightButton" @click="scrollRight">
			<font-awesome-icon icon="chevron-right" />
		</button>
	</div>
</template>

<script lang="ts">
import Card from '@/components/Card.vue';
import CollectionCard from '@/components/CollectionCard.vue';
import VueAgile from 'vue-agile';

import { genericHelpers } from '@/components/mixins/genericHelpers';
import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'CollectionsCarousel',
	props: {
		collections: {
			type: Array,
		},
		loading: {
			type: Boolean,
		},
	},
	watch: {
		collections() {
			setTimeout(() => {
				this.updateCarouselScroll();
			}, 0);
		},
		loading() {
			setTimeout(() => {
				this.updateCarouselScroll();
			}, 0);
		},
	},
	components: {
		Card,
		CollectionCard,
		VueAgile,
	},
	data() {
		return {
			carouselScrollPosition: 0,
			cardWidth: 240,
			scrollEnd: false,
			listElement: null as null | Element,
		};
	},
	methods: {
		updateCarouselScroll() {
			if (this.listElement) {
				this.carouselScrollPosition = Number(this.listElement.scrollLeft.toFixed());

				const width = this.listElement.clientWidth;
				const scrollWidth = this.listElement.scrollWidth;
				const scrollLeft = this.carouselScrollPosition;
				this.scrollEnd = scrollWidth - width <= scrollLeft + 7;
			}
		},
		onCardClick(event: MouseEvent, id: string) {
			this.$emit('openCollection', {event, id});
		},
		scrollLeft() {
			if (this.listElement) {
				this.listElement.scrollBy({ left: -(this.cardWidth * 2), top: 0, behavior: 'smooth' });
			}
		},
		scrollRight() {
			if (this.listElement) {
				this.listElement.scrollBy({ left: this.cardWidth * 2, top: 0, behavior: 'smooth' });
			}
		},
	},
	mounted() {
		this.$nextTick(() => {
			const slider = this.$refs.slider;
			if (!slider) {
				return;
			}
			// @ts-ignore
			this.listElement = slider.$el.querySelector('.agile__list');
			if (this.listElement) {
				this.listElement.addEventListener('scroll', this.updateCarouselScroll);
			}
		});
	},
	beforeDestroy() {
		if (this.$refs.slider) {
			// @ts-ignore
			this.$refs.slider.destroy();
		}
		window.removeEventListener('scroll', this.updateCarouselScroll);
	},
});
</script>

<style lang="scss" module>
.container {
	position: relative;
}

.button {
	width: 28px;
	height: 37px;
	position: absolute;
	top: 35%;
	border-radius: var(--border-radius-large);
	border: var(--border-base);
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
		color: var(--color-foreground-xdark);
	}
}

.leftButton {
	composes: button;
	left: -30px;

	&:after {
		left: 27px;
		background: linear-gradient(270deg, rgba(255, 255, 255, 0.25) 0%, rgba(248, 249, 251, 1) 86%);
	}
}

.rightButton {
	composes: button;
	right: -30px;
	&:after {
		right: 27px;
		background: linear-gradient(270deg,rgba(248, 249, 251, 1) 25%, rgba(255, 255, 255, 0.25) 100%);
	}
}
</style>

<style lang="scss">
.agile {
	&__list {
		width: 100%;
		padding-bottom: var(--spacing-2xs);
		overflow-x: scroll;
		transition: all 1s ease-in-out;

		&::-webkit-scrollbar {
			height: 6px;
		}

		&::-webkit-scrollbar-thumb {
			border-radius: 6px;
			background-color: var(--color-foreground-dark);
		}
	}

	&__track {
		width: 50px;
	}
}
</style>
