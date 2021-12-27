<template>
	<div ref="editor" :class="$style.markdown" v-html="getContent" />
</template>

<script lang="ts">
import Vue from 'vue';

import MarkdownIt from 'markdown-it';
const markdownItLink = require('markdown-it-link-attributes');
const markdownItEmoji = require('markdown-it-emoji');
const markdownItTasklists = require('markdown-it-task-lists');

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
					markdownIt: DEFAULT_OPTIONS_MARKDOWN,
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
		const optMarkdownIt = this.options.markdownIt;
		return {
			md: new MarkdownIt(optMarkdownIt)
				.use(markdownItLink, this.options.linkAttributes)
				.use(markdownItEmoji)
				.use(markdownItTasklists, this.options.tasklists),
		};
	},
});
</script>

<style lang="scss" module>
.markdown {
	color: var(--color-text-base);
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-loose);

	p,
	span {
		line-height: var(--font-line-height-loose);
	}

	ul {
		padding: var(--spacing-4xs);
		padding-left: var(--spacing-m);
		line-height: var(--font-line-height-loose);
	}

	img {
		width: 100%;
	}
}
</style>
