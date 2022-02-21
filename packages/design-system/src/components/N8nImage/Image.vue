<template>
	<div :class="$style.wrapper">
		<div v-show="imageIsLoaded">
			<img :class="$style.image" :srcset="srcset" @load="imageIsLoaded = true"/>
		</div>
		<div>
			<n8n-loading :loading="!imageIsLoaded" :rows="1" variant="image" />
		</div>
	</div>
</template>

<script lang="ts">
import N8nLoading from '../N8nLoading';

interface IImage {
	url: string;
	width: string;
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
	computed: {
		srcset(): string {
			let srcset = '';
			if (this.images as IImage[]) {
				for (let i = 0; i < this.images.length; i++) {
					if (!this.images[i].metadata) {
						srcset += this.images[i].url;
					} else {
						srcset += this.images[i].url + ` ${this.images[i].metadata.width}w,`;
					}
				}
			}
			return srcset;
		},
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
						srcset += images[i].url;
					} else {
						srcset += images[i].url + ` ${images[i].metadata.width}w,`;
					}

				}
			}
			return srcset;
		},
		onLoad() {
			this.imageIsLoaded = true;
		},
	},
};
</script>

<style lang="scss" module>
.image {
	border: var(--border-base);
	border-radius: var(--border-radius-large);
}
</style>
