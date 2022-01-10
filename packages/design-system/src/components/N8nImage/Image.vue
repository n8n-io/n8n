<template>
	<div :class="$style.wrapper">
		<div v-show="imageIsLoaded">
			<img :class="$style.image" :srcset="getSrcset(images)" @load="imageIsLoaded = true"/>
		</div>
		<div>
			<n8n-loading :animated="true" :loading="!imageIsLoaded" :rows="1" variant="image" />
		</div>
	</div>
</template>

<script lang="ts">
import N8nLoading from '../N8nLoading';

interface IProps {
	url: string;
	metadata: IMetadata;
}

interface IMetadata {
  width: string
}

export default {
	name: 'n8n-image',
	props: {
		images: {
			type: Array,
		},
	},
	components: {
		N8nLoading,
	},
	data() {
		return {
			imageIsLoaded: false,
		};
	},
	methods: {
		getSrcset(images: IProps[]): string {
			let srcset = '';
			if (images) {
				for (let i = 0; i < images.length; i++) {
          if (!images[i].metadata) {
            srcset += images[i].url + ` 600w,`;
          } else {
						srcset += images[i].url + ` ${images[i].metadata.width}w,`;
					}

				}
			}
			return srcset;
		},
		onLoad() {
			this.imageIsLoaded = true;
		}
	},
};
</script>

<style lang="scss" module>
.image {
	border: 1px solid #dbdfe7;
	border-radius: var(--border-radius-large);
}
</style>
