<template>
	<div>
		<div v-if="!loading" ref="editor" :class="$style.markdown" v-html="htmlContent" />
		<div v-else :class="$style.markdown">
			<div v-for="(block, index) in loadingBlocks"
				:key="index">
				<n8n-loading
					:loading="loading"
					:rows="loadingRows"
					animated
					variant="p"
				/>
				<div :class="$style.spacer" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import N8nLoading from '../N8nLoading';
import Markdown from 'markdown-it';
const markdownLink = require('markdown-it-link-attributes');
const markdownEmoji = require('markdown-it-emoji');
const markdownTasklists = require('markdown-it-task-lists');

import xss from 'xss';
import { escapeMarkdown } from '../../utils/markdown';

const DEFAULT_OPTIONS_MARKDOWN = {
	html: true,
	linkify: true,
	typographer: true,
	breaks: true,
};

const DEFAULT_OPTIONS_LINK_ATTRIBUTES = {
	attrs: {
		target: '_blank',
		rel: 'noopener',
	},
};

const DEFAULT_OPTIONS_TASKLISTS = {
	label: true,
	labelAfter: true,
};

interface IImage {
	id: string;
	url: string;
}

export default {
	components: {
		N8nLoading,
	},
	name: 'n8n-markdown',
	props: {
		content: {
			type: String,
		},
		images: {
			type: Array,
		},
		loading: {
			type: Boolean,
		},
		loadingBlocks: {
			type: Number,
			default: 2,
		},
		loadingRows: {
			type: Number,
			default: () => {
				return 3;
			},
		},
		options: {
			type: Object,
			default() {
				return {
					markdown: DEFAULT_OPTIONS_MARKDOWN,
					linkAttributes: DEFAULT_OPTIONS_LINK_ATTRIBUTES,
					tasklists: DEFAULT_OPTIONS_TASKLISTS,
				};
			},
		},
	},
	computed: {
		htmlContent(): string {
			if (!this.content) {
				 return '';
			}

			const imageUrls: { [key: string]: string } = {};
			if (this.images) {
				// @ts-ignore
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
			const html = this.md.render(escapeMarkdown(this.content));
			const safeHtml = xss(html, {
				onTagAttr: (tag, name, value, isWhiteAttr) => {
					if (tag === 'img' && name === 'src') {
						if (value.match(fileIdRegex)) {
							const id = value.split('fileId:')[1];
							return `src=${xss.friendlyAttrValue(imageUrls[id])}` || '';
						}
						if (!value.startsWith('https://')) {
							return '';
						}
					}
					// Return nothing, means keep the default handling measure
				},
				onTag: function (tag, html, options) {
					if (tag === 'img' && html.includes(`alt="workflow-screenshot"`)) {
						return '';
					}
					// return nothing, keep tag
				},
			});

			return safeHtml;
		},
	},
	data() {
		return {
			md: new Markdown(this.options.markdown)
				.use(markdownLink, this.options.linkAttributes)
				.use(markdownEmoji)
				.use(markdownTasklists, this.options.tasklists),
		};
	},
};
</script>

<style lang="scss" module>
.markdown {
	color: var(--color-text-base);

	* {
		font-size: var(--font-size-m);
		line-height: var(--font-line-height-xloose);
	}

	h1, h2, h3, h4 {
		margin-bottom: var(--spacing-s);
		font-size: var(--font-size-m);
		font-weight: var(--font-weight-bold);
	}

	h3, h4 {
		font-weight: var(--font-weight-bold);
	}

	p,
	span {
		margin-bottom: var(--spacing-s);
	}

	ul, ol {
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

.spacer {
	margin: var(--spacing-2xl);
}
</style>
