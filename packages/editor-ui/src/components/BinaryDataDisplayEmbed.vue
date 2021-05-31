<template>
	<div>
		<div v-if="isLoading">
			Loading binary data...
		</div>
		<div v-else>
			<video v-if="binaryData.mimeType && binaryData.mimeType.startsWith('video/')" controls autoplay>
				<source :src="embedSource" :type="binaryData.mimeType">
				Your browser does not support the video element. Kindly update it to latest version.
			</video>
			<embed v-else :src="embedSource" class="binary-data" :class="embedClass"/>
		</div>
	</div>
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
			};
		},
		async mounted() {
			if(!this.binaryData.internalPath) {
				this.embedSource = 'data:' + this.binaryData.mimeType + ';base64,' + this.binaryData.data;
				this.isLoading = false;
				return;
			}

			const bufferString = await this.restApi().getBinaryBufferString(this.binaryData!.internalPath!);
			this.embedSource = 'data:' + this.binaryData.mimeType + ';base64,' + bufferString;
			this.isLoading = false;
		},
		methods: {
			embedClass (): string[] {
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
