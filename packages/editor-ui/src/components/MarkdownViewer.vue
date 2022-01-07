<template>
	<div ref="editor" :class="$style.markdown" v-html="getContent" />
</template>

<script lang="ts">
import Vue from 'vue';

import Markdown from 'markdown-it';
const markdownLink = require('markdown-it-link-attributes');
const markdownEmoji = require('markdown-it-emoji');
const markdownTasklists = require('markdown-it-task-lists');

import xss from 'xss';
import { escapeMarkdown } from '../utils/markdown';

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

export default Vue.extend({
	components: {},
	name: 'markdown-viewer',
	props: {
		content: {
			type: String,
		},
		images: {
			type: Array,
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
});
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
		padding: var(--spacing-4xs);
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

	code {
		margin: var(--spacing-2xl) 0 var(--spacing-l);
		padding: var(--spacing-s);
		background-color: $--node-creator-subcategory-panel-header-bacground-color;
	}

	.label {
		font-size: var(--font-size-m);
	  line-height: var(--font-line-height-xloose);
    color: var(--color-text-base);
	}

	img {
		width: 100%;
		border: 1px solid $--node-creator-border-color;
		border-radius: var(--border-radius-large);
	}
}
</style>
