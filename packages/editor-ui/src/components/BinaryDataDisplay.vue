<template>
	<div v-if="windowVisible" class="binary-data-window">
		<n8n-button
			@click.stop="closeWindow"
			size="small"
			class="binary-data-window-back"
			:title="$locale.baseText('binaryDataDisplay.backToOverviewPage')"
			icon="arrow-left"
			:label="$locale.baseText('binaryDataDisplay.backToList')"
		/>

		<div class="binary-data-window-wrapper">
			<div v-if="!binaryData">
				{{ $locale.baseText('binaryDataDisplay.noDataFoundToDisplay') }}
			</div>
			<BinaryDataDisplayEmbed v-else :binaryData="binaryData"/>
		</div>

	</div>
</template>

<script lang="ts">
import {
	IBinaryData,
	IRunData,
} from 'n8n-workflow';

import BinaryDataDisplayEmbed from '@/components/BinaryDataDisplayEmbed.vue';

import { nodeHelpers } from '@/mixins/nodeHelpers';

import mixins from 'vue-typed-mixins';
import { restApi } from '@/mixins/restApi';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows';

export default mixins(
	nodeHelpers,
	restApi,
)
	.extend({
		name: 'BinaryDataDisplay',
		components: {
			BinaryDataDisplayEmbed,
		},
		props: [
			'displayData', // IBinaryDisplayData
			'windowVisible', // boolean
		],
		computed: {
			...mapStores(
				useWorkflowsStore,
			),
			binaryData (): IBinaryData | null {
				const binaryData = this.getBinaryData(this.workflowRunData, this.displayData.node, this.displayData.runIndex, this.displayData.outputIndex);

				if (binaryData.length === 0) {
					return null;
				}

				if (this.displayData.index >= binaryData.length || binaryData[this.displayData.index][this.displayData.key] === undefined) {
					return null;
				}

				const binaryDataItem: IBinaryData = binaryData[this.displayData.index][this.displayData.key];

				return binaryDataItem;
			},

			embedClass (): string[] {
				// @ts-ignore
				if (this.binaryData! !== null && this.binaryData!.mimeType! !== undefined && (this.binaryData!.mimeType! as string).startsWith('image')) {
					return ['image'];
				}
				return ['other'];
			},

			workflowRunData (): IRunData | null {
				const workflowExecution = this.workflowsStore.getWorkflowExecution;
				if (workflowExecution === null) {
					return null;
				}
				const executionData = workflowExecution.data;
				return executionData? executionData.resultData.runData : null;
			},

		},
		methods: {
			closeWindow () {
				// Handle the close externally as the visible parameter is an external prop
				// and is so not allowed to be changed here.
				this.$emit('close');
				return false;
			},
		},
	});
</script>

<style lang="scss">

.binary-data-window {
	position: absolute;
	top: 50px;
	left: 0;
	z-index: 10;
	width: 100%;
	height: calc(100% - 50px);
	background-color: var(--color-background-base);
	overflow: hidden;
	text-align: center;

	.binary-data-window-wrapper {
		margin-top: .5em;
		padding: 0 1em;
		height: calc(100% - 50px);

		.el-row,
		.el-col {
			height: 100%;
		}
	}

	.binary-data {
		background-color: var(--color-foreground-xlight);

		&.image {
			max-height: calc(100% - 1em);
			max-width: calc(100% - 1em);
		}

		&.other {
			height: calc(100% - 1em);
			width: calc(100% - 1em);
		}
	}

}

</style>
