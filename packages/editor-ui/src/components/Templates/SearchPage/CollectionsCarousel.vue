<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading :bold="true" size="medium" color="text-light">
				Collections
				<span v-if="!loading" v-text="`(${collections.length})`" />
			</n8n-heading>
		</div>

		<div v-if="loading" :class="$style.slider">
			<agile :options="sliderOptions">
				<CollectionsCard v-for="n in 4" :key="n" :loading="loading" />
			</agile>
		</div>

		<span :class="$style.slider" v-else-if="collections.length">
			<agile ref="slider" :options="sliderOptions">
				<CollectionsCard
					v-for="collection in collections"
					:key="collection.id"
					:title="collection.name"
					:loading="loading"
				>
					<template v-slot:footer>
						<n8n-text size="small" color="text-light">
							{{ collection.workflows.length }} Workflows
						</n8n-text>
						<NodeList :nodes="collection.nodes" :showMore="false" />
					</template>
				</CollectionsCard>
			</agile>
			<div :class="$style.buttons">
				<button v-show="currentSlide > 1" :class="$style.button" @click="$refs.slider.goToPrev(); currentSlide = currentSlide - 1">
					<font-awesome-icon icon="chevron-left" />
				</button>
				<button v-show="currentSlide !== collections.length" :class="$style.button" @click="$refs.slider.goToNext(); currentSlide = currentSlide + 1">
					<font-awesome-icon icon="chevron-right" />
				</button>
			</div>
		</span>

		<div v-else :class="$style.text">
			<n8n-text>No collections found. Try adjusting your search to see more.</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import CollectionsCard from '@/components/Templates/SearchPage/CollectionsCard.vue';
import NodeList from '@/components/Templates/SearchPage/NodeList.vue';

import VueAgile from 'vue-agile';

import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'CollectionsCarousel',
	props: {
		loading: {
			type: Boolean,
		},
	},
	components: {
		CollectionsCard,
		NodeList,
		VueAgile,
	},
	computed: {
		collections() {
			return this.$store.getters['templates/getCollections'];
		},
	},
	data() {
		return {
			currentSlide: 1,
			sliderOptions: {
				dots: false,
				infinite: false,
				navButtons: false,
				slidesToShow: 3.35,
			},
		};
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

.slider {
	&:after {
		content: '';
		width: 60px;
		height: 140px;
		top: 30px;
		right: 0;
		position: absolute;
		background: linear-gradient(270deg, rgba(255, 255, 255, 0.8) 25%, rgba(250, 7, 7, 0) 100%);
		z-index: 0;
	}
}

.buttons {
	width: 100%;
	height: 100%;
	top: 50%;
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

	&:nth-child(1) {
		left: var(--spacing-2xs);
	}

	&:nth-child(2) {
		right: var(--spacing-2xs);
	}

	svg {
		color: var(--color-foreground-xdark);
	}
}

.text {
	padding-top: var(--spacing-xs);
}
</style>

<style lang="scss">
.agile {
	&__track {
		width: 50px;
	}
}
</style>
