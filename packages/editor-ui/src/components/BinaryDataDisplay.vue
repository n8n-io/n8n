<template>
	<div v-if="windowVisible" class="binary-data-window">
		<n8n-button
			@click.stop="closeWindow"
			size="small"
			class="binary-data-window-back"
			:title="$baseText('binaryDataDisplay.backToOverviewPage')"
			icon="arrow-left"
			:label="$baseText('binaryDataDisplay.backToList')"
		/>

		<div class="binary-data-window-wrapper">
			<div v-if="!binaryData">
				{{ $baseText('binaryDataDisplay.noDataFoundToDisplay') }}
			</div>
			<video v-else-if="binaryData.mimeType && binaryData.mimeType.startsWith('video/')" controls autoplay>
				<source :src="'data:' + binaryData.mimeType + ';base64,' + binaryData.data" :type="binaryData.mimeType">
				{{ $baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</video>
			<embed v-else :src="'data:' + binaryData.mimeType + ';base64,' + binaryData.data" class="binary-data" :class="embedClass"/>
		</div>

	</div>
</template>

<script lang="ts">
import {
	IBinaryData,
	IRunData,
	IRunExecutionData,
} from 'n8n-workflow';

import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { renderText } from '@/components/mixins/renderText';

import mixins from 'vue-typed-mixins';

export default mixins(
	nodeHelpers,
	renderText,
)
	.extend({
		name: 'BinaryDataDisplay',
		props: [
			'displayData', // IBinaryDisplayData
			'windowVisible', // boolean
		],
		computed: {
			binaryData (): IBinaryData | null {
				const binaryData = this.getBinaryData(this.workflowRunData, this.displayData.node, this.displayData.runIndex, this.displayData.outputIndex);

				if (binaryData.length === 0) {
					return null;
				}

				if (this.displayData.index >= binaryData.length || binaryData[this.displayData.index][this.displayData.key] === undefined) {
					return null;
				}
				return binaryData[this.displayData.index][this.displayData.key];
			},

			embedClass (): string[] {
				if (this.binaryData !== null &&
					this.binaryData.mimeType !== undefined &&
					(this.binaryData.mimeType as string).startsWith('image')
				) {
					return ['image'];
				}
				return ['other'];
			},

			workflowRunData (): IRunData | null {
				const workflowExecution = this.$store.getters.getWorkflowExecution;
				if (workflowExecution === null) {
					return null;
				}
				const executionData: IRunExecutionData = workflowExecution.data;
				return executionData.resultData.runData;
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
	background-color: #f9f9f9;
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
		background-color: #fff;

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
