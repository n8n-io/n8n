<template>
  <div>
		<div v-if="!loading" ref="editor" :class="$style.markdown" v-html="getContent" />
		<div v-else :class="$style.markdown">
			<div v-for="(block, index) in loadingBlocks"
				:key="'block-' + index">
				<n8n-loading
					:animated="loadingAnimated"
					:loading="loading"
					:rows="loadingRows"
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

const DEFAULT_XSS_OPTIONS = {
	escapeHtml: (html: string) => escapeMarkdown(html),
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
		loadingAnimated: {
			type: Boolean,
			default: true,
		},
		loadingBlocks: {
			type: Number,
			default: 2
		},
		loadingRows: {
			type: Number,
			default: () => {
				return 3;
			}
		},
		options: {
			type: Object,
			default() {
				return {
					markdown: DEFAULT_OPTIONS_MARKDOWN,
					linkAttributes: DEFAULT_OPTIONS_LINK_ATTRIBUTES,
					tasklists: DEFAULT_OPTIONS_TASKLISTS,
					xssOptions: DEFAULT_XSS_OPTIONS,
				};
			},
		},
	},
	computed: {
		getContent(): string {
			if (this.content) {
				const imageUrls: { [key: string]: string } = {};
				if (this.images) {
					// @ts-ignore
					this.images.forEach((image: IImage) => {
						if (!image) {
							// Happens if an image got deleted but the workflow
							// still has a reference to it
							return;
						}
						imageUrls[image.id] = `${image.url}`;
					});
				}

				// Replace the fileIds with the actual URLs
				const imageRegexString = '][(]fileId:([0-9]+)[)]';
				const imageMatches = this.content.match(new RegExp(imageRegexString, 'g'));
				let content = this.content;

				if (imageMatches !== null) {
					for (const imageMatch of imageMatches) {
						const matches = imageMatch.match(new RegExp(imageRegexString));
						if (matches) {
							const imageId = matches[1];
							if (!imageUrls[imageId]) {
								// Image is missing for some unknown reason
								continue;
							}
							const imageUrl = imageUrls[imageId];
							content = content.replace(
								new RegExp('][(]fileId:' + imageId + '[)]'),
								`](${imageUrl})`,
							);
						}
					}
				}

				content = xss(content, this.options.xssOptions);

				return this.md.render(content);
			} else {
				return '';
			}
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
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);

	h1, h2, h3, h4 {
		margin-bottom: var(--spacing-s);
	}

	h3, h4 {
		font-weight: var(--font-weight-bold);;
	}

	p,
	span {
		margin-bottom: var(--spacing-s);
		font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
	}

	ul, ol {
		margin-bottom: var(--spacing-s);
		padding-left: var(--spacing-m);
		font-size: var(--font-size-m);
		line-height: var(--font-line-height-xloose);

		li {
			margin-top: 0.25em;
		}
	}

	a {
		font-size: var(--font-size-m);
		line-height: var(--font-line-height-xloose);
	}

	li > code,
	p > code {
		display: block;
		padding: var(--spacing-s);
		color: #555555;
		background-color: #f2f4f8;
	}

	.label {
		font-size: var(--font-size-m);
	  line-height: var(--font-line-height-xloose);
    color: var(--color-text-base);
	}

	img {
		width: 100%;
		border: 1px solid #dbdfe7;
		border-radius: var(--border-radius-large);
	}

	.spacer {
		margin: 48px;
	}
}
</style>
