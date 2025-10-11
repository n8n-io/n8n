<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { IBinaryData } from 'n8n-workflow';
import { jsonParse, base64DecodeUTF8 } from 'n8n-workflow';
import VueJsonPretty from 'vue-json-pretty';
import RunDataHtml from '@/components/RunDataHtml.vue';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	binaryData: IBinaryData;
}>();

const isLoading = ref(true);
const embedSource = ref('');
const error = ref(false);
const data = ref('');
const csvData = ref<string[][]>([]);

const workflowsStore = useWorkflowsStore();

const i18n = useI18n();

const embedClass = computed(() => {
	return [props.binaryData.fileType ?? 'other'];
});

// Proper CSV parser that handles quoted values, CRLF, and newlines in fields
const parseCSV = (csvText: string): string[][] => {
	const rows: string[][] = [];
	let row: string[] = [];
	let currentField = '';
	let inQuotes = false;

	for (let i = 0; i < csvText.length; i++) {
		const char = csvText[i];
		const nextChar = csvText[i + 1];

		if (char === '"') {
			if (inQuotes && nextChar === '"') {
				// Double quote within quotes - add single quote
				currentField += '"';
				i++; // Skip next quote
			} else {
				// Toggle quote state
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			// End of field
			row.push(currentField);
			currentField = '';
		} else if ((char === '\n' || char === '\r') && !inQuotes) {
			// End of row (handle both LF and CRLF)
			if (char === '\r' && nextChar === '\n') {
				i++; // Skip the \n in CRLF
			}

			// Only add row if it has content
			if (row.length > 0 || currentField) {
				row.push(currentField);
				rows.push(row);
				row = [];
				currentField = '';
			}
		} else {
			currentField += char;
		}
	}

	// Add last field and row if there's remaining content
	if (currentField || row.length > 0) {
		row.push(currentField);
		rows.push(row);
	}

	return rows;
};

onMounted(async () => {
	const { id, data: binaryData, fileName, fileType, mimeType } = props.binaryData;
	const isJSONData = fileType === 'json';
	const isHTMLData = fileType === 'html';
	const isCSVData = mimeType === 'text/csv';

	if (!id) {
		if (isJSONData || isHTMLData || isCSVData) {
			const decodedData = base64DecodeUTF8(binaryData);
			if (isJSONData) {
				data.value = jsonParse(decodedData);
			} else if (isCSVData) {
				// Parse CSV data with proper handling of quoted values
				csvData.value = parseCSV(decodedData);
			} else {
				data.value = decodedData;
			}
		} else {
			embedSource.value = `data:${mimeType};charset=utf-8;base64,${binaryData}`;
		}
	} else {
		try {
			const binaryUrl = workflowsStore.getBinaryUrl(id, 'view', fileName ?? '', mimeType);
			if (isJSONData || isHTMLData || isCSVData) {
				const fetchedData = await fetch(binaryUrl, { credentials: 'include' });
				if (isJSONData) {
					data.value = await fetchedData.json();
				} else if (isCSVData) {
					const csvText = await fetchedData.text();
					// Parse CSV data with proper handling of quoted values
					csvData.value = parseCSV(csvText);
				} else {
					data.value = await fetchedData.text();
				}
			} else {
				embedSource.value = binaryUrl;
			}
		} catch (e) {
			error.value = true;
		}
	}

	isLoading.value = false;
});
</script>

<template>
	<span>
		<div v-if="isLoading">Loading binary data...</div>
		<div v-else-if="error">Error loading binary data</div>
		<span v-else>
			<video v-if="binaryData.fileType === 'video'" controls autoplay>
				<source :src="embedSource" :type="binaryData.mimeType" />
				{{ i18n.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</video>
			<audio v-else-if="binaryData.fileType === 'audio'" controls autoplay>
				<source :src="embedSource" :type="binaryData.mimeType" />
				{{ i18n.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</audio>
			<img v-else-if="binaryData.fileType === 'image'" :src="embedSource" />
			<VueJsonPretty
				v-else-if="binaryData.fileType === 'json'"
				:data="data"
				:deep="3"
				:show-length="true"
			/>
			<RunDataHtml v-else-if="binaryData.fileType === 'html'" :input-html="data" />
			<div v-else-if="binaryData.mimeType === 'text/csv'" class="csv-container">
				<div v-if="csvData.length === 0">
					{{ i18n.baseText('binaryDataDisplay.noCsvDataToDisplay') }}
				</div>
				<table v-else class="csv-table">
					<thead v-if="csvData.length > 0">
						<tr>
							<th v-for="(header, index) in csvData[0]" :key="index">{{ header }}</th>
						</tr>
					</thead>
					<tbody v-if="csvData.length > 1">
						<tr v-for="(row, rowIndex) in csvData.slice(1)" :key="rowIndex">
							<td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
						</tr>
					</tbody>
				</table>
			</div>
			<embed v-else :src="embedSource" class="binary-data" :class="embedClass" />
		</span>
	</span>
</template>

<style lang="scss">
img,
video {
	max-height: 100%;
	max-width: 100%;
}
.binary-data {
	&.other,
	&.pdf {
		height: 100%;
		width: 100%;
	}
}

.csv-container {
	width: 100%;
	height: calc(100% - 2em);
	overflow-x: auto;
	overflow-y: auto;
	padding: 0;
	box-sizing: border-box;
	position: relative;
	display: flex;
	justify-content: center;
}

.csv-table {
	width: max-content;
	border-collapse: collapse;
	font-size: 0.8em;
	background-color: var(--color-background-xlight);
	margin: 0.5em;
	align-self: flex-start;

	th,
	td {
		border: 1px solid var(--color-foreground-base);
		padding: 4px 8px;
		text-align: left;
		white-space: nowrap;
		max-width: 300px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	th {
		background-color: var(--color-background-base);
		font-weight: bold;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	tbody tr:hover {
		background-color: var(--color-background-light);
	}
}
</style>
