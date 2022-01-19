<template>
	<div>
		<n8n-heading size="large">Collections ({{ collectionsUI.length }})</n8n-heading>

		<clients-only v-if="loading">
		<div>
			<agile :options="sliderOptions">
				<CollectionsCard :loading="loading" />
				<CollectionsCard :loading="loading" />
				<CollectionsCard :loading="loading" />
				<CollectionsCard :loading="loading" />
			</agile>
		</div>
		</clients-only>

		<clients-only v-else-if="collectionsUI.length">
			<agile :options="sliderOptions">
				<CollectionsCard
					v-for="collection in collectionsUI"
					:key="collection.id"
					:title="collection.name"
				>
					<template v-slot:footer>
						<n8n-text size="small" color="text-light"
							>{{ collection.workflows.length }} Workflows</n8n-text
						>
						<NodeList :nodes="collection.nodes" :showMore="false" />
					</template>
				</CollectionsCard>

				<template slot="prevButton">
					<div>
						<button>
							<font-awesome-icon icon="chevron-left" />
						</button>
					</div>
				</template>
				<template slot="nextButton">
					<div>
						<button>
							<font-awesome-icon icon="chevron-right" />
						</button>
					</div>
				</template>
			</agile>
		</clients-only>

		<div v-else :class="$style.text">
			<n8n-text>No collections found. Try adjusting your search to see more.</n8n-text>
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
	components: {
		CollectionsCard,
		NodeList,
		VueAgile,
	},
	watch: {
		collections(newCollections): void {
			if (newCollections) {
				this.$data.collectionsUI = newCollections;
				this.$data.loading = false;
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
			loading: true,
			sliderOptions: {
				dots: false,
				infinite: false,
				navButtons: true,
				slidesToShow: 4,
			},
		};
	},
});
</script>

<style lang="scss" module>
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
		font-size: 24px;
		cursor: pointer;
		transition-duration: 0.1s;

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

