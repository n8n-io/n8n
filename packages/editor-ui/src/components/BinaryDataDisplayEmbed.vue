<template>
	<span>
		<div v-if="isLoading">
			Loading binary data...
		</div>
		<div v-else-if="error">
			Error loading binary data
		</div>
		<span v-else>
			<video v-if="binaryData.fileType === 'video'" controls autoplay>
				<source :src="embedSource" :type="binaryData.mimeType">
				{{ $locale.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</video>
			<embed v-else :src="embedSource" class="binary-data" :class="embedClass()"/>
		</span>
	</span>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { restApi } from '@/mixins/restApi';
import type { IBinaryData } from 'n8n-workflow';

export default mixins(
	restApi,
)
	.extend({
		name: 'BinaryDataDisplayEmbed',
		props: [
			'binaryData', // IBinaryData
		],
		data() {
			return {
				isLoading: true,
				embedSource: '',
				error: false,
			};
		},
		async mounted() {
			const id = this.binaryData?.id;
			if(!id) {
				this.embedSource = 'data:' + this.binaryData.mimeType + ';base64,' + this.binaryData.data;
				this.isLoading = false;
				return;
			}

			try {
				this.embedSource = this.restApi().getBinaryUrl(id);
				this.isLoading = false;
			} catch (e) {
				this.isLoading = false;
				this.error = true;
			}
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
