<template>
	<span>
		<div v-if="isLoading">Loading binary data...</div>
		<div v-else-if="error">Error loading binary data</div>
		<span v-else>
			<video v-if="binaryData.fileType === 'video'" controls autoplay>
				<source :src="embedSource" :type="binaryData.mimeType" />
				{{ $locale.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</video>
			<vue-json-pretty
				v-else-if="binaryData.fileType === 'json'"
				:data="jsonData"
				:deep="3"
				:showLength="true"
			/>
			<embed v-else :src="embedSource" class="binary-data" :class="embedClass()" />
		</span>
	</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import type { IBinaryData } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import type { PropType } from 'vue';
import VueJsonPretty from 'vue-json-pretty';
import { useWorkflowsStore } from '@/stores';

export default defineComponent({
	name: 'BinaryDataDisplayEmbed',
	components: {
		VueJsonPretty,
	},
	props: {
		binaryData: {
			type: Object as PropType<IBinaryData>,
			required: true,
		},
	},
	data() {
		return {
			isLoading: true,
			embedSource: '',
			error: false,
			jsonData: '',
		};
	},
	computed: {
		...mapStores(useWorkflowsStore),
	},
	async mounted() {
		const { id, data, fileName, fileType, mimeType } = (this.binaryData || {}) as IBinaryData;
		const isJSONData = fileType === 'json';

		if (!id) {
			if (isJSONData) {
				this.jsonData = jsonParse(atob(data));
			} else {
				this.embedSource = 'data:' + mimeType + ';base64,' + data;
			}
		} else {
			try {
				const binaryUrl = this.workflowsStore.getBinaryUrl(id, 'view', fileName, mimeType);
				if (isJSONData) {
					this.jsonData = await (await fetch(binaryUrl)).json();
				} else {
					this.embedSource = binaryUrl;
				}
			} catch (e) {
				this.error = true;
			}
		}

		this.isLoading = false;
	},
	methods: {
		embedClass(): string[] {
			const { fileType } = (this.binaryData || {}) as IBinaryData;
			return [fileType ?? 'other'];
		},
	},
});
</script>

<style lang="scss">
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
</style>
