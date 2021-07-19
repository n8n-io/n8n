<template>
	<div v-if="windowVisible" class="binary-data-window">
		<el-button
			@click.stop="closeWindow"
			size="small"
			class="binary-data-window-back"
			title="Back to overview page"
			icon="el-icon-arrow-left"
		>
			Back to list
		</el-button>

		<div class="binary-data-window-wrapper">
			<div v-if="!binaryData">
				Data to display did not get found
			</div>
			<video v-else-if="binaryData.mimeType && binaryData.mimeType.startsWith('video/')" controls autoplay>
				<source :src="'data:' + binaryData.mimeType + ';base64,' + binaryData.data" :type="binaryData.mimeType">
				Your browser does not support the video element. Kindly update it to latest version.
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

import mixins from 'vue-typed-mixins';

export default mixins(
	nodeHelpers,
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
		padding: 0 1em;
		height: calc(100% - 50px);

		.el-row,
		.el-col {
			height: 100%;
		}
	}

	.binary-data-window-back {
		margin: 0 0 0.5em 0;
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
