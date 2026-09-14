<script lang="ts" setup>
import type { Options as MarkdownOptions } from 'markdown-it';
import Markdown from 'markdown-it';
import markdownEmoji from 'markdown-it-emoji';
import markdownLink from 'markdown-it-link-attributes';
import markdownTaskLists from 'markdown-it-task-lists';
import { computed, ref } from 'vue';
import type { IWhiteList } from 'xss';
import xss from 'xss';

import { markdownYoutubeEmbed, YOUTUBE_EMBED_SRC_REGEX, type YoutubeEmbedConfig } from './youtube';
import { toggleCheckbox, serializeAttr } from '../../utils/markdown';
import N8nLoading from '../N8nLoading';

interface IImage {
	id: string | number;
	url: string;
}

interface Options {
	markdown: MarkdownOptions;
	linkAttributes: markdownLink.Config;
	tasklists: markdownTaskLists.Config;
	youtube: YoutubeEmbedConfig;
}

interface MarkdownProps {
	content?: string | null;
	withMultiBreaks?: boolean;
	images?: IImage[];
	loading?: boolean;
	loadingBlocks?: number;
	loadingRows?: number;
	theme?: string;
	options?: Options;
}

const props = withDefaults(defineProps<MarkdownProps>(), {
	content: '',
	withMultiBreaks: false,
	images: () => [],
	loading: false,
	loadingBlocks: 2,
	loadingRows: 3,
	theme: 'markdown',
	options: () => ({
		markdown: {
			html: false,
			linkify: true,
			typographer: true,
			breaks: true,
		},
		linkAttributes: {
			attrs: {
				target: '_blank',
				rel: 'noopener',
			},
		},
		tasklists: {
			enabled: true,
			label: true,
			labelAfter: false,
		},
		youtube: {},
	}),
});

const editor = ref<HTMLDivElement | undefined>(undefined);

// The shared `.n8n-markdown` styles (css/markdown.scss) change markdown's
// vertical rhythm. Stickies opt out to keep their legacy layout, so hand-sized
// notes in saved workflows don't clip or overlap nodes (ADO-5800).
const applyGlobalMarkdownStyles = computed(() => props.theme !== 'sticky');

const { options } = props;
const md = new Markdown(options.markdown)
	.use(markdownLink, options.linkAttributes)
	.use(markdownEmoji)
	.use(markdownTaskLists, options.tasklists)
	.use(markdownYoutubeEmbed, options.youtube);

// `xss` is CJS with no `exports` map. Node's lexer cannot see `whiteList` as a
// named export, so `import { whiteList }` throws at link time under native ESM
// once a consumer loads our `dist`. At runtime `module.exports` is the filter
// function with the helpers hung off it, which the shipped typings don't model.
const { whiteList } = xss as unknown as { whiteList: IWhiteList };

const xssWhiteList = {
	...whiteList,
	label: ['class', 'for'],
	iframe: ['width', 'height', 'src', 'title', 'frameborder', 'allow', 'referrerpolicy'],
};

const htmlContent = computed(() => {
	if (!props.content) {
		return '';
	}

	const imageUrls: { [key: string]: string } = {};
	if (props.images) {
		props.images.forEach((image: IImage) => {
			if (!image) {
				// Happens if an image got deleted but the workflow
				// still has a reference to it
				return;
			}
			imageUrls[image.id] = image.url;
		});
	}

	const fileIdRegex = new RegExp('fileId:([0-9]+)');
	let contentToRender = props.content;
	if (props.withMultiBreaks) {
		// Stickies in saved workflows were laid out against the legacy spacing
		// semantics: a single blank line is a real paragraph break, and each extra
		// blank line in a run renders as an &nbsp; line (ADO-5800). Fenced code
		// blocks are excluded so &nbsp; never leaks into rendered code.
		// Parse a code-fence line into its fence char and run length (>= 3). A fence
		// can be made of 3+ backticks or tildes; the closing fence must use the same
		// char and be at least as long, and carry no info string after it.
		const parseFence = (line: string) => {
			const match = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
			return match ? { char: match[1][0], length: match[1].length, rest: match[2] } : null;
		};
		const renderExtraBlankLines = (text: string) =>
			text.replace(/\n{3,}/g, (match) => {
				// Keep \n\n for the paragraph break, add &nbsp;\n for each extra blank line
				return '\n\n' + '&nbsp;\n'.repeat(match.length - 2);
			});
		const segments: Array<{ isCode: boolean; lines: string[] }> = [];
		let openFence: { char: string; length: number } | null = null;
		for (const line of contentToRender.split('\n')) {
			const fence = parseFence(line);
			let isCode = false;
			if (openFence) {
				isCode = true;
				// A closing fence matches the opening char, is at least as long, and
				// has no trailing content; shorter/different fences stay code content.
				if (
					fence &&
					fence.char === openFence.char &&
					fence.length >= openFence.length &&
					fence.rest.trim() === ''
				) {
					openFence = null;
				}
			} else if (fence) {
				openFence = { char: fence.char, length: fence.length };
				isCode = true;
			}
			const previous = segments[segments.length - 1];
			if (previous && previous.isCode === isCode) {
				previous.lines.push(line);
			} else {
				segments.push({ isCode, lines: [line] });
			}
		}
		contentToRender = segments
			.map(({ isCode, lines }) =>
				isCode ? lines.join('\n') : renderExtraBlankLines(lines.join('\n')),
			)
			.join('\n');
	}
	const html = md.render(contentToRender);

	const safeHtml = xss(html, {
		onTagAttr(tag, name, value) {
			if (tag === 'img' && name === 'src') {
				if (value.match(fileIdRegex)) {
					const id = value.split('fileId:')[1];
					const imageUrl = imageUrls[id];
					if (!imageUrl) {
						return '';
					}
					return serializeAttr(tag, name, imageUrl);
				}
				// Only allow http requests to supported image files from the `static` directory
				const isImageFile = value.split('#')[0].match(/\.(jpeg|jpg|gif|png|webp)$/) !== null;
				const isStaticImageFile = isImageFile && value.startsWith('/static/');
				if (!value.startsWith('https://') && !isStaticImageFile) {
					return '';
				}
			}

			if (tag === 'iframe') {
				if (name === 'src') {
					// Only allow YouTube as src for iframes embeds
					if (YOUTUBE_EMBED_SRC_REGEX.test(value)) {
						return serializeAttr(tag, name, value);
					} else {
						return '';
					}
				}
				return;
			}

			// Return nothing, means keep the default handling measure
			return;
		},
		onTag(tag, code) {
			if (tag === 'img' && code.includes('alt="workflow-screenshot"')) {
				return '';
			}
			// return nothing, keep tag
			return;
		},
		onIgnoreTag(tag, tagHTML) {
			// Allow checkboxes
			if (tag === 'input' && tagHTML.includes('type="checkbox"')) {
				return tagHTML;
			}
			return;
		},
		whiteList: xssWhiteList,
	});

	return safeHtml;
});

const emit = defineEmits<{
	'markdown-click': [link: HTMLAnchorElement, e: MouseEvent];
	'update-content': [content: string];
}>();

const onClick = (event: MouseEvent) => {
	let clickedLink: HTMLAnchorElement | null = null;

	if (event.target instanceof HTMLAnchorElement) {
		clickedLink = event.target;
	}

	if (event.target instanceof HTMLElement && event.target.matches('a *')) {
		const parentLink = event.target.closest('a');
		if (parentLink) {
			clickedLink = parentLink;
		}
	}
	if (clickedLink) {
		emit('markdown-click', clickedLink, event);
	}
};

// Handle checkbox changes
const onChange = async (event: Event) => {
	if (event.target instanceof HTMLInputElement && event.target.type === 'checkbox') {
		const checkboxes = editor.value?.querySelectorAll('input[type="checkbox"]');
		if (checkboxes) {
			// Get the index of the checkbox that was clicked
			const index = Array.from(checkboxes).indexOf(event.target);
			if (index !== -1) {
				onCheckboxChange(index);
			}
		}
	}
};

const onMouseDown = (event: MouseEvent) => {
	// Mouse down on input fields is caught by node view handlers
	// which prevents checking them, this will prevent that
	if (event.target instanceof HTMLInputElement) {
		event.stopPropagation();
	}
};

// Update markdown when checkbox state changes
const onCheckboxChange = (index: number) => {
	const currentContent = props.content;
	if (!currentContent) {
		return;
	}

	// We are using index to connect the checkbox with the corresponding line in the markdown
	const newContent = toggleCheckbox(currentContent, index);
	emit('update-content', newContent);
};
</script>

<template>
	<div :class="{ 'n8n-markdown': applyGlobalMarkdownStyles }">
		<!-- Needed to support YouTube player embeds. HTML rendered here is sanitized. -->
		<!-- eslint-disable vue/no-v-html -->
		<div
			v-if="!loading"
			ref="editor"
			:class="$style[theme]"
			@click="onClick"
			@mousedown="onMouseDown"
			@change="onChange"
			v-html="htmlContent"
		/>
		<!-- eslint-enable vue/no-v-html -->
		<div v-else :class="$style.markdown">
			<div v-for="(_, index) in loadingBlocks" :key="index">
				<N8nLoading :loading="loading" :rows="loadingRows" animated variant="p" />
				<div :class="$style.spacer" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.markdown {
	color: var(--color--text);

	* {
		font-size: var(--font-size--md);
		line-height: var(--line-height--xl);
	}

	h1,
	h2,
	h3,
	h4 {
		margin-bottom: var(--spacing--sm);
		font-size: var(--font-size--md);
		font-weight: var(--font-weight--bold);
	}

	h3,
	h4 {
		font-weight: var(--font-weight--bold);
	}

	p,
	span {
		margin-bottom: var(--spacing--sm);
	}

	ul,
	ol {
		margin-bottom: var(--spacing--sm);
		padding-left: var(--spacing--md);

		li {
			margin-top: 0.25em;
		}
	}

	// The pre box (background + padding) comes from the global .n8n-markdown
	// styles in css/markdown.scss; a second box on code doubles it up.
	pre > code {
		background-color: transparent;
		color: var(--color--text--shade-1);
	}

	li > code,
	p > code {
		padding: 0 var(--spacing--4xs);
		color: var(--color--text--shade-1);
		background-color: var(--color--background);
	}

	.label {
		color: var(--color--text);
	}

	img {
		max-width: 100%;
		border-radius: var(--radius--lg);
	}

	blockquote {
		padding-left: 10px;
		font-style: italic;
		border-left: var(--border-color) 2px solid;
	}
}

input[type='checkbox'] {
	accent-color: var(--color--primary);
}

input[type='checkbox'] + label {
	cursor: pointer;
}

.sticky {
	color: var(--sticky--color--text);
	overflow-wrap: break-word;

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		color: var(--sticky--color--text);
	}

	h1,
	h2,
	h3,
	h4 {
		margin-bottom: var(--spacing--2xs);
		font-weight: var(--font-weight--bold);
		line-height: var(--line-height--lg);
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
		font-size: var(--font-size--md);
	}

	p {
		margin-bottom: var(--spacing--2xs);
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--regular);
		line-height: var(--line-height--lg);
	}

	ul,
	ol {
		margin-bottom: var(--spacing--2xs);
		padding-left: var(--spacing--md);

		li {
			margin-top: 0.25em;
			font-size: var(--font-size--sm);
			font-weight: var(--font-weight--regular);
			line-height: var(--line-height--md);
		}

		&:has(input[type='checkbox']) {
			list-style-type: none;
			padding-left: var(--spacing--5xs);
		}
	}

	pre > code {
		padding: var(--spacing--sm);
		background-color: var(--sticky--code--color--background);
		color: var(--sticky--code--color--text);
	}

	pre > code,
	li > code,
	p > code,
	td > code {
		color: var(--sticky--code--color--text);
	}

	// Shared markdown link look, minus `font-weight: medium`: a weight change
	// shifts wrap points and note heights must stay stable (ADO-5800).
	// Links inside headings keep the heading style, like the shared skin.
	a:not(:where(h1, h2, h3, h4, h5, h6) *) {
		color: var(--color--text--shade-1);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-thickness: 1px;
		transition: color 0.15s ease;

		&:hover {
			color: var(--color--primary);
		}
	}

	// Shared markdown blockquote look with the sticky's compact vertical
	// rhythm, and sticky-aware colors so it stays visible on all note colors.
	blockquote {
		margin-bottom: var(--spacing--2xs);
		padding-left: var(--spacing--sm);
		border-left: var(--spacing--4xs) solid var(--sticky--border-color, currentColor);
		font-style: italic;

		// The blockquote carries the bottom spacing; don't stack the paragraph's.
		// No open-quote/close-quote pseudos here: the app reset sets
		// `blockquote { quotes: none }`, so they never render inside n8n.
		p:last-of-type {
			margin-bottom: 0;
		}
	}

	// Shared markdown table look with the sticky's compact vertical rhythm,
	// and sticky-aware colors so borders stay visible on all note colors.
	table {
		width: 100%;
		table-layout: auto;
		margin-bottom: var(--spacing--2xs);
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
	}

	thead {
		border-bottom: 1px solid var(--sticky--border-color, currentColor);
	}

	thead th {
		color: var(--sticky--color--text);
		font-weight: var(--font-weight--bold);
		vertical-align: bottom;
		padding: 0 0.6em 0.8em;
	}

	tbody tr {
		border-bottom: 1px solid var(--sticky--border-color, currentColor);

		&:last-child {
			border-bottom-width: 0;
		}
	}

	tbody td {
		vertical-align: baseline;
		padding: 0.8em 0.6em;
	}

	thead th,
	tbody td {
		text-align: start;

		&:first-child {
			padding-inline-start: 0;
		}

		&:last-child {
			padding-inline-end: 0;
		}
	}

	td code {
		font-size: var(--font-size--xs);
	}

	img {
		object-fit: contain;
		margin-top: var(--spacing--xs);
		margin-bottom: var(--spacing--2xs);

		&[src*='#full-width'] {
			width: 100%;
		}
	}
}

.sticky,
.markdown {
	pre {
		margin-bottom: var(--spacing--sm);
		display: grid;
	}

	pre > code {
		display: block;
		overflow-x: auto;
	}

	iframe {
		aspect-ratio: 16/9 auto;
	}

	summary {
		cursor: pointer;
	}
}

.spacer {
	margin: var(--spacing--2xl);
}
</style>
