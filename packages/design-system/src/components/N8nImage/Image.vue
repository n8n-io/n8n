<template functional>
	<div :class="$style.wrapper">
		<img :class="$style.image" :srcset="$options.methods.getSrcset(props.images)" />
	</div>
</template>

<script lang="ts">
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
	},
};
</script>

<style lang="scss" module>
.image {
	border: 1px solid $--node-creator-border-color;
	border-radius: var(--border-radius-large);
}
</style>
