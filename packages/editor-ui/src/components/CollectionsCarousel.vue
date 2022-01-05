<template>
	<div>
		<n8n-heading size="large">Collections</n8n-heading>

		<agile :slidesToShow="3" :navButtons="true" :dots="false">

			<CollectionsCard v-for="collection in fakeCollections" :key="collection.id" :title="collection.name">
			  <template v-slot:footer>
					<n8n-text size="small" color="text-light">{{collection.workflows.length}} Workflows</n8n-text>
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

	</div>
</template>

<script lang="ts">

import mixins from 'vue-typed-mixins';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import CollectionsCard from '@/components/CollectionsCard.vue';
import VueAgile from 'vue-agile';

export default mixins(
	genericHelpers,
).extend({
	name: 'CollectionsCarousel',
	components: {
		CollectionsCard,
		VueAgile,
	},
	data() {
		return {
			collectionsUI: [],
		};
	},
	computed: {
		collections() {
			return this.$store.getters['templates/getCollections'];
		},
		fakeCollections() {
			return [
				{
					id: '1',
					name: 'First',
					workflows: {
						length: 6,
					},
					nodes: [
						{
							displayName: "Merge",
							name: "n8n-nodes-base.merge",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Query User",
							name: "n8n-nodes-base.notion",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Merge3",
							name: "n8n-nodes-base.merge",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Concatenate SemesterIDs",
							name: "n8n-nodes-base.function",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
					],
				},
				{
					id: '2',
					name: 'Second',
					workflows: {
						length: 6,
					},
					nodes: [
						{
							displayName: "Merge",
							name: "n8n-nodes-base.merge",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Query User",
							name: "n8n-nodes-base.notion",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Merge3",
							name: "n8n-nodes-base.merge",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Concatenate SemesterIDs",
							name: "n8n-nodes-base.function",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
					],
				},
				{
					id: '3',
					name: 'Third',
					workflows: {
						length: 6,
					},
					nodes: [
						{
							displayName: "Merge",
							name: "n8n-nodes-base.merge",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Query User",
							name: "n8n-nodes-base.notion",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Merge3",
							name: "n8n-nodes-base.merge",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Concatenate SemesterIDs",
							name: "n8n-nodes-base.function",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
					],
				},
				{
					id: '4',
					name: 'Forth',
					workflows: {
						length: 6,
					},
					nodes: [
						{
							displayName: "Merge",
							name: "n8n-nodes-base.merge",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Query User",
							name: "n8n-nodes-base.notion",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Merge3",
							name: "n8n-nodes-base.merge",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Concatenate SemesterIDs",
							name: "n8n-nodes-base.function",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
					],
				},
				{
					id: '5',
					name: 'Fifth',
					workflows: {
						length: 6,
					},
					nodes: [
						{
							displayName: "Merge",
							name: "n8n-nodes-base.merge",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Query User",
							name: "n8n-nodes-base.notion",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Merge3",
							name: "n8n-nodes-base.merge",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
						{
							displayName: "Concatenate SemesterIDs",
							name: "n8n-nodes-base.function",
							icon: 'path',
							defaults: {
								color: 'white',
							},
						},
					],
				},
			];

		},
	},
	watch: {
		collections(newCollections) {
			// this.collectionsUI = newCollections;
			// console.log(this.collectionsUI);
		},
	},
	methods: {
	},
});
</script>

<style lang="scss">

.agile {
	padding-top: 8px;

	// .agile__slides {
	// 	width: 260px;
	// 	height: 140px;
	// }

		&__nav-button {
			background: transparent;
			border: none;
			cursor: pointer;
			font-size: 24px;
			height: 100%;
			position: absolute;
			top: 0;
			transition-duration: .1s;
			width: 36px;

			button {
				opacity: 1;
				width: 28px;
				height: 37px;
				border-radius: var(--border-radius-large);
				border: 1px solid #DBDFE7;
				background-color: #FBFCFE;
			}

			&--prev {
				left: 0;
			}

			&--next {
				right: 0;
			}
		}

}

</style>
