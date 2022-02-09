<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading :bold="true" size="medium" color="text-light">
				{{ $locale.baseText('templates.collections') }}
				<span v-if="!loading" v-text="`(${collections.length})`" />
			</n8n-heading>
		</div>

		<div v-if="loading" :class="$style.slider">
			<agile ref="slider" :dots="false" :navButtons="false" :infinite="false" :slides-to-show="4">
				<CollectionsCard v-for="n in 4" :key="n" :loading="loading" />
			</agile>
		</div>

		<div :class="$style.slider" v-else-if="collections.length">
			<agile ref="slider" :dots="false" :navButtons="false" :infinite="false" :slides-to-show="4">
				<CollectionsCard
					v-for="collection in collections"
					:id="collection.id"
					:key="collection.id"
					:loading="loading"
					:navigate-to="navigateTo"
					:title="collection.name"
				>
					<template v-slot:footer>
						<n8n-text size="small" color="text-light">
							{{ collection.workflows.length }}
							{{ $locale.baseText('templates.workflows') }}
						</n8n-text>
						<NodeList :nodes="collection.nodes" :showMore="false" />
					</template>
				</CollectionsCard>
			</agile>
			<div :class="$style.buttons">
				<button v-show="carouselScrollPosition > 0" :class="$style.button" @click="scrollLeft">
					<font-awesome-icon icon="chevron-left" />
				</button>
				<button v-show="!scrollEnd" :class="$style.button" @click="scrollRight">
					<font-awesome-icon icon="chevron-right" />
				</button>
			</div>
		</div>

		<div v-else :class="$style.text">
			<n8n-text color="text-base">{{ $locale.baseText('templates.collectionNotFound') }}</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import CollectionsCard from '@/components/CollectionsCard.vue';
import NodeList from '@/components/NodeList.vue';
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
		navigateTo: {
			type: Function,
		},
	},
	watch: {
		collections(collections) {
			const list = document.querySelector('.agile__list');
			if (list) {
				const width = list.clientWidth;
				const collectionsWidth = collections.length * (this.carouselWidth + collections.length * 2);
				this.scrollEnd = collectionsWidth < width;
			}
		},
	},
	components: {
		CollectionsCard,
		NodeList,
		VueAgile,
	},
	data() {
		return {
			carouselScrollPosition: 0,
			carouselWidth: 240,
			scrollEnd: false,
		};
	},
	methods: {
		handleCarouselScroll() {
			const list = document.querySelector('.agile__list');
			if (list) {
				this.carouselScrollPosition = Number(list.scrollLeft.toFixed());

				const width = list.clientWidth;
				const scrollWidth = list.scrollWidth;
				const scrollLeft = this.carouselScrollPosition;

				if (scrollWidth - width <= scrollLeft + 10) {
					this.scrollEnd = true;
				} else {
					this.scrollEnd = false;
				}
			}
		},
		scrollLeft() {
			const list = document.querySelector('.agile__list');
			if (list) {
				list.scrollBy({ left: -(this.carouselWidth * 2), top: 0, behavior: 'smooth' });
			}
		},
		scrollRight() {
			const list = document.querySelector('.agile__list');
			if (list) {
				list.scrollBy({ left: this.carouselWidth * 2, top: 0, behavior: 'smooth' });
			}
		},
	},
	mounted() {
		const list = document.querySelector('.agile__list');
		this.$nextTick(() => {
			if (list) {
				list.addEventListener('scroll', this.handleCarouselScroll);
			}
		});
	},
	beforeDestroy() {
		window.removeEventListener('scroll', this.handleCarouselScroll);
	},
});
</script>

<style lang="scss" module>
.container {
	position: relative;
}

.header {
	padding-bottom: var(--spacing-2xs);
}

.buttons {
	width: 100%;
	height: 0;
	top: 45%;
	position: absolute;
	background: transparent;
	border: none;
	font-size: var(--font-size-xl);
	transition-duration: 0.1s;
	cursor: pointer;
	z-index: 1;
}

.button {
	width: 28px;
	height: 37px;
	position: absolute;
	border-radius: var(--border-radius-large);
	border: $--version-card-border;
	background-color: #fbfcfe;
	opacity: 1;
	cursor: pointer;
	z-index: 2;

	&:nth-child(1) {
		left: var(--spacing-2xs);

		&:after {
			content: '';
			width: 40px;
			height: 140px;
			top: -54px;
			left: -23px;
			position: absolute;
			position: absolute;
			background: linear-gradient(270deg, rgba(255, 255, 255, 0.25) 0%, rgba(248, 249, 251, 1) 86%);
			z-index: -1;
		}
	}

	&:nth-child(2) {
		right: var(--spacing-2xs);

		&:after {
			content: '';
			width: 40px;
			height: 140px;
			top: -54px;
			right: -23px;
			position: absolute;
			position: absolute;
			background: linear-gradient(
				270deg,
				rgba(248, 249, 251, 1) 25%,
				rgba(255, 255, 255, 0.25) 100%
			);
			z-index: -1;
		}
	}

	svg {
		color: var(--color-foreground-xdark);
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
