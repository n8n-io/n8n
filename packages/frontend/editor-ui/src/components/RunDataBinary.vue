<script setup lang="ts">
import { saveAs } from 'file-saver';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { ViewableMimeTypes } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import type { IBinaryKeyData } from 'n8n-workflow';
import { N8nButton, N8nText } from '@n8n/design-system';

const { binaryData } = defineProps<{ binaryData: IBinaryKeyData[] }>();

const emit = defineEmits<{ preview: [index: number, key: string | number] }>();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();

function isViewable(index: number, key: string | number): boolean {
	const { mimeType } = binaryData[index][key];
	return ViewableMimeTypes.includes(mimeType);
}

function isDownloadable(index: number, key: string | number): boolean {
	const { mimeType, fileName } = binaryData[index][key];
	return !!(mimeType && fileName);
}

async function downloadBinaryData(index: number, key: string | number) {
	const { id, data, fileName, fileExtension, mimeType } = binaryData[index][key];

	if (id) {
		const url = workflowsStore.getBinaryUrl(id, 'download', fileName ?? '', mimeType);
		saveAs(url, [fileName, fileExtension].join('.'));
		return;
	} else {
		const bufferString = 'data:' + mimeType + ';base64,' + data;
		const blob = await fetch(bufferString).then(async (d) => await d.blob());
		saveAs(blob, fileName);
	}
}
</script>

<template>
	<div :class="$style.component">
		<N8nText v-if="binaryData.length === 0" align="center" tag="div">
			{{ i18n.baseText('runData.noBinaryDataFound') }}
		</N8nText>
		<div v-for="(binaryDataEntry, index) in binaryData" :key="index">
			<div v-if="binaryData.length > 1" :class="$style.binaryIndex">
				<div>
					{{ index + 1 }}
				</div>
			</div>

			<div :class="$style.binaryRow">
				<div
					v-for="(data, key) in binaryDataEntry"
					:key="index + '_' + key"
					:class="$style.binaryCell"
				>
					<div :data-test-id="'ndv-binary-data_' + index">
						<div :class="$style.binaryHeader">
							{{ key }}
						</div>
						<div v-if="data.fileName">
							<div>
								<N8nText size="small" :bold="true"
									>{{ i18n.baseText('runData.fileName') }}:
								</N8nText>
							</div>
							<div :class="$style.binaryValue">{{ data.fileName }}</div>
						</div>
						<div v-if="data.directory">
							<div>
								<N8nText size="small" :bold="true"
									>{{ i18n.baseText('runData.directory') }}:
								</N8nText>
							</div>
							<div :class="$style.binaryValue">{{ data.directory }}</div>
						</div>
						<div v-if="data.fileExtension">
							<div>
								<N8nText size="small" :bold="true">
									{{ i18n.baseText('runData.fileExtension') }}:
								</N8nText>
							</div>
							<div :class="$style.binaryValue">{{ data.fileExtension }}</div>
						</div>
						<div v-if="data.mimeType">
							<div>
								<N8nText size="small" :bold="true">
									{{ i18n.baseText('runData.mimeType') }}:
								</N8nText>
							</div>
							<div :class="$style.binaryValue">{{ data.mimeType }}</div>
						</div>
						<div v-if="data.fileSize">
							<div>
								<N8nText size="small" :bold="true">
									{{ i18n.baseText('runData.fileSize') }}:
								</N8nText>
							</div>
							<div :class="$style.binaryValue">{{ data.fileSize }}</div>
						</div>

						<div :class="$style.binaryButtonContainer">
							<N8nButton
								v-if="isViewable(index, key)"
								size="small"
								:label="i18n.baseText('runData.showBinaryData')"
								data-test-id="ndv-view-binary-data"
								@click="emit('preview', index, key)"
							/>
							<N8nButton
								v-if="isDownloadable(index, key)"
								size="small"
								type="secondary"
								:label="i18n.baseText('runData.downloadBinaryData')"
								data-test-id="ndv-download-binary-data"
								@click="downloadBinaryData(index, key)"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.component {
	position: absolute;
	top: 0;
	left: 0;
	padding: 0 var(--ndv-spacing) var(--spacing-3xl) var(--ndv-spacing);
	right: 0;
	overflow-y: auto;
	line-height: var(--font-line-height-xloose);
	word-break: normal;
	height: 100%;
}

.binaryIndex {
	display: block;
	padding: var(--spacing-2xs);
	font-size: var(--font-size-2xs);

	> * {
		display: inline-block;
		width: 30px;
		height: 30px;
		line-height: 30px;
		border-radius: var(--border-radius-base);
		text-align: center;
		background-color: var(--color-foreground-xdark);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-xlight);
	}
}

.binaryRow {
	display: inline-flex;
	font-size: var(--font-size-2xs);
}

.binaryCell {
	display: inline-block;
	width: 300px;
	overflow: hidden;
	background-color: var(--color-foreground-xlight);
	margin-right: var(--ndv-spacing);
	margin-bottom: var(--ndv-spacing);
	border-radius: var(--border-radius-base);
	border: var(--border-base);
	padding: var(--ndv-spacing);
}

.binaryHeader {
	color: $color-primary;
	font-weight: var(--font-weight-bold);
	font-size: 1.2em;
	padding-bottom: var(--spacing-2xs);
	margin-bottom: var(--spacing-2xs);
	border-bottom: 1px solid var(--color-text-light);
}

.binaryButtonContainer {
	margin-top: 1.5em;
	display: flex;
	flex-direction: row;
	justify-content: center;

	> * {
		flex-grow: 0;
		margin-right: var(--spacing-3xs);
	}
}

.binaryValue {
	white-space: initial;
	word-wrap: break-word;
}
</style>
