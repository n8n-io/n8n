<template>
	<span>
		<div v-if="isLoading">
			Loading binary data...
		</div>
		<div v-else-if="error">
			Error loading binary data
		</div>
		<span v-else>
			<video v-if="binaryData.mimeType && binaryData.mimeType.startsWith('video/')" controls autoplay>
				<source :src="embedSource" :type="binaryData.mimeType">
				{{ $locale.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</video>
			<embed v-else :src="embedSource" class="binary-data" :class="embedClass()"/>
		</span>
	</span>
</template>

<script lang="ts">


import mixins from 'vue-typed-mixins';
import { restApi } from '@/components/mixins/restApi';

export default mixins(
	restApi,
)
	.extend({
		name: 'BinaryDataDisplayEmbed',
		props: [
			'binaryData', // IBinaryDisplayData
		],
		data() {
			return {
				isLoading: true,
				embedSource: '',
				error: false,
			};
		},
		async mounted() {
			if(!this.binaryData.id) {
				this.embedSource = 'data:' + this.binaryData.mimeType + ';base64,' + this.binaryData.data;
				this.isLoading = false;
				return;
			}

			try {
				const bufferString = await this.restApi().getBinaryBufferString(this.binaryData!.id!);
				this.embedSource = 'data:' + this.binaryData.mimeType + ';base64,' + bufferString;
				this.isLoading = false;
			} catch (e) {
				this.isLoading = false;
				this.error = true;
			}
		},
		methods: {
			embedClass(): string[] {
				// @ts-ignore
				if (this.binaryData! !== null && this.binaryData!.mimeType! !== undefined && (this.binaryData!.mimeType! as string).startsWith('image')) {
					return ['image'];
				}
				return ['other'];
			},
		},
	});
</script>

<style lang="scss">

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

</style>
