<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading :bold="true" size="medium" color="text-light">
				Collections
				<span v-if="!loading" v-text="`(${collectionsUI.length})`" />
			</n8n-heading>
		</div>

		<div v-if="loading" :class="$style.slider">
			<agile :options="sliderOptions">
				<CollectionsCard v-for="n in 4" :key="n" :loading="loading" />
			</agile>
		</div>

		<span :class="$style.slider" v-else-if="collectionsUI.length">
			<agile :options="sliderOptions">
				<CollectionsCard
					v-for="collection in collectionsUI"
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

				<template slot="prevButton">
					<div>
						<button >
							<font-awesome-icon icon="chevron-left" />
						</button>
					</div>
				</template>
				<template slot="nextButton">
					<div>
						<button >
							<font-awesome-icon icon="chevron-right" />
						</button>
					</div>
				</template>
			</agile>
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
	watch: {
		collections(newCollections): void {
			if (newCollections) {
				this.$data.collectionsUI = newCollections;
			} else {
				this.$data.collectionsUI = [];
			}
		},
	},
	computed: {
		collections() {
			return this.$store.getters['templates/getCollections'];
		},
	},
	data() {
		return {
			collectionsUI: [],
			sliderOptions: {
				dots: false,
				infinite: false,
				navButtons: true,
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

.text {
	padding-top: var(--spacing-xs);
}
</style>

<style lang="scss">
.agile {
	&__nav-button {
		width: 36px;
		height: 100%;
		top: 0;
		position: absolute;
		background: transparent;
		border: none;
		font-size: var(--font-size-xl);
		cursor: pointer;
		transition-duration: 0.1s;
		z-index: 1;

		button {
			width: 28px;
			height: 37px;
			border-radius: var(--border-radius-large);
			border: $--version-card-border;
			background-color: #fbfcfe;
			opacity: 1;
		}

		&--prev {
			left: 0;
		}

		&--next {
			right: 0;
		}
	}
	&__track {
		width: 50px;
	}
}
</style>
