<template>
	<div class="n8n-markdown">
		<div
			v-if="!loading"
			ref="editor"
			class="ph-no-capture"
			:class="$style[theme]"
			v-html="htmlContent"
			@click="onClick"
		/>
		<div v-else :class="$style.markdown">
			<div v-for="(block, index) in loadingBlocks" :key="index">
				<n8n-loading :loading="loading" :rows="loadingRows" animated variant="p" />
				<div :class="$style.spacer" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import N8nLoading from '../N8nLoading';
import type { PluginSimple } from 'markdown-it';
import Markdown from 'markdown-it';

import markdownLink from 'markdown-it-link-attributes';
import markdownEmoji from 'markdown-it-emoji';
import markdownTasklists from 'markdown-it-task-lists';

import type { PropType } from 'vue';
import { defineComponent } from 'vue';

import xss, { friendlyAttrValue } from 'xss';
import { escapeMarkdown } from '../../utils/markdown';

const DEFAULT_OPTIONS_MARKDOWN = {
	html: true,
	linkify: true,
	typographer: true,
	breaks: true,
} as const;

const DEFAULT_OPTIONS_LINK_ATTRIBUTES = {
	attrs: {
		target: '_blank',
		rel: 'noopener',
	},
} as const;

const DEFAULT_OPTIONS_TASKLISTS = {
	label: true,
	labelAfter: true,
} as const;

export interface IImage {
	id: string;
	url: string;
}

export interface Options {
	markdown: typeof DEFAULT_OPTIONS_MARKDOWN;
	linkAttributes: typeof DEFAULT_OPTIONS_LINK_ATTRIBUTES;
	tasklists: typeof DEFAULT_OPTIONS_TASKLISTS;
}

export default defineComponent({
	components: {
		N8nLoading,
	},
	name: 'n8n-markdown',
	props: {
		content: {
			type: String,
			default: '',
		},
		withMultiBreaks: {
			type: Boolean,
			default: false,
		},
		images: {
			type: Array as PropType<IImage[]>,
			default: () => [],
		},
		loading: {
			type: Boolean,
			default: false,
		},
		loadingBlocks: {
			type: Number,
			default: 2,
		},
		loadingRows: {
			type: Number,
			default: 3,
		},
		theme: {
			type: String,
			default: 'markdown',
		},
		options: {
			type: Object as PropType<Options>,
			default: (): Options => ({
				markdown: DEFAULT_OPTIONS_MARKDOWN,
				linkAttributes: DEFAULT_OPTIONS_LINK_ATTRIBUTES,
				tasklists: DEFAULT_OPTIONS_TASKLISTS,
			}),
		},
	},
	data(): { md: Markdown } {
		return {
			md: new Markdown(this.options.markdown)
				.use(markdownLink, this.options.linkAttributes)
				.use(markdownEmoji)
				.use(markdownTasklists as PluginSimple, this.options.tasklists),
		};
	},
	computed: {
		htmlContent(): string {
			if (!this.content) {
				return '';
			}

			const imageUrls: { [key: string]: string } = {};
			if (this.images) {
				this.images.forEach((image: IImage) => {
					if (!image) {
						// Happens if an image got deleted but the workflow
						// still has a reference to it
						return;
					}
					imageUrls[image.id] = image.url;
				});
			}

			const fileIdRegex = new RegExp('fileId:([0-9]+)');
			let contentToRender = this.content;
			if (this.withMultiBreaks) {
				contentToRender = contentToRender.replaceAll('\n\n', '\n&nbsp;\n');
			}
			const html = this.md.render(escapeMarkdown(contentToRender));
			const safeHtml = xss(html, {
				onTagAttr: (tag, name, value) => {
					if (tag === 'img' && name === 'src') {
						if (value.match(fileIdRegex)) {
							const id = value.split('fileId:')[1];
							return `src=${friendlyAttrValue(imageUrls[id])}` || '';
						}
						// Only allow http requests to supported image files from the `static` directory
						const isImageFile = value.split('#')[0].match(/\.(jpeg|jpg|gif|png|webp)$/) !== null;
						const isStaticImageFile = isImageFile && value.startsWith('/static/');
						if (!value.startsWith('https://') && !isStaticImageFile) {
							return '';
						}
					}
					// Return nothing, means keep the default handling measure
				},
				onTag(tag, code) {
					if (tag === 'img' && code.includes('alt="workflow-screenshot"')) {
						return '';
					}
					// return nothing, keep tag
				},
			});

			return safeHtml;
		},
	},
	methods: {
		onClick(event: MouseEvent) {
			let clickedLink = null;

			if (event.target instanceof HTMLAnchorElement) {
				clickedLink = event.target;
			}

			if (event.target instanceof HTMLElement && event.target.matches('a *')) {
				const parentLink = event.target.closest('a');
				if (parentLink) {
					clickedLink = parentLink;
				}
			}
			this.$emit('markdown-click', clickedLink, event);
		},
	},
});
</script>

<style lang="scss" module>
.markdown {
	color: var(--color-text-base);

	* {
		font-size: var(--font-size-m);
		line-height: var(--font-line-height-xloose);
	}

	h1,
	h2,
	h3,
	h4 {
		margin-bottom: var(--spacing-s);
		font-size: var(--font-size-m);
		font-weight: var(--font-weight-bold);
	}

	h3,
	h4 {
		font-weight: var(--font-weight-bold);
	}

	p,
	span {
		margin-bottom: var(--spacing-s);
	}

	ul,
	ol {
		margin-bottom: var(--spacing-s);
		padding-left: var(--spacing-m);

		li {
			margin-top: 0.25em;
		}
	}

	pre {
		margin-bottom: var(--spacing-s);
		display: grid;
	}

	pre > code {
		display: block;
		padding: var(--spacing-s);
		color: var(--color-text-dark);
		background-color: var(--color-background-base);
		overflow-x: auto;
	}

	li > code,
	p > code {
		padding: 0 var(--spacing-4xs);
		color: var(--color-text-dark);
		background-color: var(--color-background-base);
	}

	.label {
		color: var(--color-text-base);
	}

	img {
		width: 100%;
		max-height: 90vh;
		object-fit: cover;
		border: var(--border-width-base) var(--color-foreground-base) var(--border-style-base);
		border-radius: var(--border-radius-large);
	}

	blockquote {
		padding-left: 10px;
		font-style: italic;
		border-left: var(--border-color-base) 2px solid;
	}
}

.sticky {
	color: var(--color-text-dark);

	h1,
	h2,
	h3,
	h4 {
		margin-bottom: var(--spacing-2xs);
		font-weight: var(--font-weight-bold);
		line-height: var(--font-line-height-loose);
	}

	h1 {
		font-size: 36px;
	}

	h2 {
		font-size: 24px;
	}

	h3,
	h4,
	h5,
	h6 {
		font-size: var(--font-size-m);
	}

	p {
		margin-bottom: var(--spacing-2xs);
		font-size: var(--font-size-s);
		font-weight: var(--font-weight-regular);
		line-height: var(--font-line-height-loose);
	}

	ul,
	ol {
		margin-bottom: var(--spacing-2xs);
		padding-left: var(--spacing-m);

		li {
			margin-top: 0.25em;
			font-size: var(--font-size-s);
			font-weight: var(--font-weight-regular);
			line-height: var(--font-line-height-regular);
		}
	}

	code {
		background-color: var(--color-background-base);
		padding: 0 var(--spacing-4xs);
		color: var(--color-secondary);
	}

	pre > code,
	li > code,
	p > code {
		color: var(--color-secondary);
	}

	a {
		&:hover {
			text-decoration: underline;
		}
	}

	img {
		object-fit: contain;

		&[src*='#full-width'] {
			width: 100%;
		}
	}
}

.spacer {
	margin: var(--spacing-2xl);
}
</style>
