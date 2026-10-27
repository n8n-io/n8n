<script lang="ts" setup>
import type { Options as MarkdownOptions, PluginSimple } from 'markdown-it';
import Markdown from 'markdown-it';
import markdownEmoji from 'markdown-it-emoji';
import markdownLink from 'markdown-it-link-attributes';
import markdownTaskLists from 'markdown-it-task-lists';
import { computed, onBeforeUpdate, ref, shallowRef, watch, type VNode } from 'vue';
import type { IWhiteList } from 'xss';
import xss from 'xss';

import { markdownYoutubeEmbed, YOUTUBE_EMBED_SRC_REGEX, type YoutubeEmbedConfig } from './youtube';
import { toggleCheckbox, serializeAttr } from '../../utils/markdown';
import N8nLoading from '../N8nLoading';

interface IImage {
	id: string | number;
	url: string;
}

interface Options extends MarkdownOptions {
	/** Parser options for consumers that use the nested format. */
	markdown?: MarkdownOptions;
	/** Attributes to add to rendered links. */
	linkAttributes?: markdownLink.Config;
	/** Settings for task list checkboxes. */
	tasklists?: markdownTaskLists.Config;
	/** Settings for YouTube embeds. */
	youtube?: YoutubeEmbedConfig;
}

interface MarkdownProps {
	content?: string | null;
	withMultiBreaks?: boolean;
	images?: IImage[];
	loading?: boolean;
	loadingBlocks?: number;
	loadingRows?: number;
	theme?: string;
	/** Parser options and optional settings for built-in plugins. */
	options?: Options;
	/** Additional plugins, applied after the built-in plugins. */
	plugins?: PluginSimple[];
}

const props = withDefaults(defineProps<MarkdownProps>(), {
	content: '',
	withMultiBreaks: false,
	images: () => [],
	loading: false,
	loadingBlocks: 2,
	loadingRows: 3,
	theme: 'markdown',
	plugins: () => [],
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

interface MarkdownLink {
	href: string;
	label: string;
	title?: string;
	target?: string;
	rel?: string;
}

const editor = ref<HTMLDivElement | undefined>(undefined);
const links = shallowRef<Array<{ props: MarkdownLink; target: HTMLElement }>>([]);

/** Read link attributes only after the HTML sanitizer has checked them. */
function refreshLinkTargets() {
	if (props.loading || !slots.link || !editor.value) {
		links.value = [];
		return;
	}
	const nextLinks: typeof links.value = [];
	for (const anchor of editor.value.querySelectorAll<HTMLAnchorElement>('a[data-link-slot]')) {
		const href = anchor.getAttribute('href');
		/** Keep rich link content in the sanitized HTML instead of reducing it to text. */
		if (!href || anchor.children.length > 0) continue;
		const target = links.value[nextLinks.length]?.target ?? document.createElement('span');
		nextLinks.push({
			props: {
				href,
				label: anchor.textContent ?? '',
				title: anchor.getAttribute('title') ?? undefined,
				target: anchor.getAttribute('target') ?? undefined,
				rel: anchor.getAttribute('rel') ?? undefined,
			},
			target,
		});
		anchor.replaceWith(target);
	}
	links.value = nextLinks;
}
const slots = defineSlots<{
	/** Render sanitized links with plain text labels. */
	link?: (props: MarkdownLink) => VNode[];
	/** Render fenced code without changing its whitespace. */
	'code-block'?: (props: { code: string; language: string }) => VNode[];
}>();
/** Slot presence is not reactive. Update it before each parent-driven render. */
const hasLinkSlot = ref(Boolean(slots.link));
const hasCodeSlot = ref(Boolean(slots['code-block']));
onBeforeUpdate(() => {
	hasLinkSlot.value = Boolean(slots.link);
	hasCodeSlot.value = Boolean(slots['code-block']);
});
const codeBlocks = shallowRef<
	Array<{ id: number; code: string; language: string; target: HTMLElement }>
>([]);
let nextCodeBlockId = 0;
const renderedBlocks: Array<{ code: string; language: string }> = [];

/** Reuse each target so streamed HTML does not reset slot component state. */
function refreshCodeTargets() {
	if (props.loading || !slots['code-block'] || !editor.value) {
		codeBlocks.value = [];
		return;
	}
	const available = new Set(codeBlocks.value);
	/** Match unchanged fences first so a removed fence cannot take another fence's state. */
	const matches = renderedBlocks.map((block) => {
		const match = [...available].find(
			(previous) => previous.code === block.code && previous.language === block.language,
		);
		if (match) available.delete(match);
		return match;
	});
	codeBlocks.value = renderedBlocks.map((block, index) => {
		const previous =
			matches[index] ??
			[...available].find(
				(candidate) =>
					candidate === codeBlocks.value[index] && candidate.language === block.language,
			);
		if (previous) available.delete(previous);
		const target = previous?.target ?? document.createElement('div');
		target.classList.add('not-prose');
		editor.value?.querySelector(`[data-code-slot="${index}"]`)?.replaceWith(target);
		return { ...block, id: previous?.id ?? nextCodeBlockId++, target };
	});
}

// The shared `.n8n-markdown` styles (css/markdown.scss) change markdown's
// vertical rhythm. Stickies opt out to keep their legacy layout, so hand-sized
// notes in saved workflows don't clip or overlap nodes (ADO-5800).
const applyGlobalMarkdownStyles = computed(() => props.theme !== 'sticky');

const md = computed(() => {
	const { options } = props;
	const parser = new Markdown({
		html: false,
		linkify: true,
		typographer: true,
		breaks: true,
		...options,
		...options.markdown,
	})
		.use(markdownLink, options.linkAttributes ?? { attrs: { target: '_blank', rel: 'noopener' } })
		.use(markdownEmoji)
		.use(markdownTaskLists, options.tasklists ?? { enabled: true, label: true, labelAfter: false })
		.use(markdownYoutubeEmbed, options.youtube ?? {});

	for (const plugin of props.plugins) {
		parser.use(plugin);
	}

	if (hasLinkSlot.value) {
		const renderLink = parser.renderer.rules.link_open;
		parser.renderer.rules.link_open = (tokens, index, options, env, self) => {
			tokens[index].attrSet('data-link-slot', '');
			return (
				renderLink?.(tokens, index, options, env, self) ?? self.renderToken(tokens, index, options)
			);
		};
	}

	if (hasCodeSlot.value) {
		parser.renderer.rules.fence = (tokens, index) => {
			const token = tokens[index];
			const blockIndex = renderedBlocks.length;
			renderedBlocks.push({ code: token.content, language: token.info.trim().split(/\s+/)[0] });
			return `<div data-code-slot="${blockIndex}"></div>`;
		};
	}

	return parser;
});

// `xss` is CJS with no `exports` map. Node's lexer cannot see `whiteList` as a
// named export, so `import { whiteList }` throws at link time under native ESM
// once a consumer loads our `dist`. At runtime `module.exports` is the filter
// function with the helpers hung off it, which the shipped typings don't model.
const { whiteList } = xss as unknown as { whiteList: IWhiteList };

const xssWhiteList = {
	...whiteList,
	label: ['class', 'for'],
	a: [...(whiteList.a ?? []), 'rel', 'data-link-slot'],
	/** Keep plugin markers for code actions, table containers, and footnotes. */
	div: [...(whiteList.div ?? []), 'class', 'data-markdown-token-idx', 'data-code-slot'],
	span: [...(whiteList.span ?? []), 'class', 'title'],
	iframe: ['width', 'height', 'src', 'title', 'frameborder', 'allow', 'referrerpolicy'],
};

const htmlContent = computed(() => {
	renderedBlocks.length = 0;
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
	const html = md.value.render(contentToRender);

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

watch(
	[htmlContent, editor, () => props.loading, () => props.content],
	() => {
		refreshCodeTargets();
		refreshLinkTargets();
	},
	{ flush: 'post' },
);

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
			:class="theme === 'sticky' ? $style.sticky : undefined"
			@click="onClick"
			@mousedown="onMouseDown"
			@change="onChange"
			v-html="htmlContent"
		/>
		<!-- eslint-enable vue/no-v-html -->
		<div v-else>
			<div v-for="(_, index) in loadingBlocks" :key="index">
				<N8nLoading :loading="loading" :rows="loadingRows" animated variant="p" />
				<div :class="$style.spacer" />
			</div>
		</div>
		<Teleport v-for="(link, index) in links" :key="`link-${index}`" :to="link.target">
			<slot name="link" v-bind="link.props" />
		</Teleport>
		<Teleport v-for="block in codeBlocks" :key="block.id" :to="block.target">
			<slot name="code-block" :code="block.code" :language="block.language" />
		</Teleport>
	</div>
</template>

<style lang="scss">
@use '../../css/markdown.scss';
</style>

<style lang="scss" module>
/** Stickies opt-out of base Markdown styling, so they provide their own **/
.sticky {
	color: var(--sticky--color--text);
	overflow-wrap: break-word;

	input[type='checkbox'] {
		accent-color: var(--color--primary);
	}

	input[type='checkbox'] + label {
		cursor: pointer;
	}

	h1:not(:where(:global(.not-prose), :global(.not-prose) *)),
	h2:not(:where(:global(.not-prose), :global(.not-prose) *)),
	h3:not(:where(:global(.not-prose), :global(.not-prose) *)),
	h4:not(:where(:global(.not-prose), :global(.not-prose) *)),
	h5:not(:where(:global(.not-prose), :global(.not-prose) *)),
	h6:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		color: var(--sticky--color--text);
	}

	h1:not(:where(:global(.not-prose), :global(.not-prose) *)),
	h2:not(:where(:global(.not-prose), :global(.not-prose) *)),
	h3:not(:where(:global(.not-prose), :global(.not-prose) *)),
	h4:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		margin-bottom: var(--spacing--2xs);
		font-weight: var(--font-weight--medium);
		line-height: var(--line-height--lg);
	}

	/** Stickies keep their legacy heading scale when no base size is set. */
	h1:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		font-size: calc(var(--n8n-markdown--font-size--base, var(--font-size--md)) * 2.25);
	}

	h2:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		font-size: calc(var(--n8n-markdown--font-size--base, var(--font-size--md)) * 1.5);
	}

	h3:not(:where(:global(.not-prose), :global(.not-prose) *)),
	h4:not(:where(:global(.not-prose), :global(.not-prose) *)),
	h5:not(:where(:global(.not-prose), :global(.not-prose) *)),
	h6:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		font-size: var(--n8n-markdown--font-size--base, var(--font-size--md));
	}

	p:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		margin-bottom: var(--spacing--2xs);
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--regular);
		line-height: var(--line-height--lg);
	}

	ul:not(:where(:global(.not-prose), :global(.not-prose) *)),
	ol:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		margin-bottom: var(--spacing--2xs);
		padding-left: var(--spacing--md);

		li:not(:where(:global(.not-prose), :global(.not-prose) *)) {
			margin-top: 0.25em;
			font-size: var(--font-size--sm);
			font-weight: var(--font-weight--regular);
			line-height: var(--line-height--md);
		}

		&:has(input[type='checkbox']):not(:where(:global(.not-prose), :global(.not-prose) *)) {
			list-style-type: none;
			padding-left: var(--spacing--5xs);
		}
	}

	pre > code:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		display: block;
		overflow-x: auto;
		padding: var(--spacing--sm);
		background-color: var(--sticky--code--color--background);
		color: var(--sticky--code--color--text);
	}

	pre > code:not(:where(:global(.not-prose), :global(.not-prose) *)),
	li > code:not(:where(:global(.not-prose), :global(.not-prose) *)),
	p > code:not(:where(:global(.not-prose), :global(.not-prose) *)),
	td > code:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		color: var(--sticky--code--color--text);
	}

	// Shared markdown link look, minus `font-weight: medium`: a weight change
	// shifts wrap points and note heights must stay stable (ADO-5800).
	// Links inside headings keep the heading style, like the shared skin.
	a:not(:where(h1, h2, h3, h4, h5, h6) *):not(:where(:global(.not-prose), :global(.not-prose) *)) {
		color: var(--color--text--shade-1);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-thickness: 1px;
		transition: color 0.15s ease;

		&:hover:not(:where(:global(.not-prose), :global(.not-prose) *)) {
			color: var(--color--primary);
		}
	}

	// Shared markdown blockquote look with the sticky's compact vertical
	// rhythm, and sticky-aware colors so it stays visible on all note colors.
	blockquote:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		margin-bottom: var(--spacing--2xs);
		padding-left: var(--spacing--sm);
		border-left: var(--spacing--4xs) solid var(--sticky--border-color, currentColor);
		font-style: italic;

		// The blockquote carries the bottom spacing; don't stack the paragraph's.
		// No open-quote/close-quote pseudos here: the app reset sets
		// `blockquote { quotes: none }`, so they never render inside n8n.
		p:last-of-type:not(:where(:global(.not-prose), :global(.not-prose) *)) {
			margin-bottom: 0;
		}
	}

	// Shared markdown table look with the sticky's compact vertical rhythm,
	// and sticky-aware colors so borders stay visible on all note colors.
	table:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		width: 100%;
		table-layout: auto;
		margin-bottom: var(--spacing--2xs);
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
	}

	thead:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		border-bottom: 1px solid var(--sticky--border-color, currentColor);
	}

	thead th:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		color: var(--sticky--color--text);
		font-weight: var(--font-weight--bold);
		vertical-align: bottom;
		padding: 0 0.6em 0.8em;
	}

	tbody tr:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		border-bottom: 1px solid var(--sticky--border-color, currentColor);

		&:last-child:not(:where(:global(.not-prose), :global(.not-prose) *)) {
			border-bottom-width: 0;
		}
	}

	tbody td:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		vertical-align: baseline;
		padding: 0.8em 0.6em;
	}

	thead th:not(:where(:global(.not-prose), :global(.not-prose) *)),
	tbody td:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		text-align: start;

		&:first-child:not(:where(:global(.not-prose), :global(.not-prose) *)) {
			padding-inline-start: 0;
		}

		&:last-child:not(:where(:global(.not-prose), :global(.not-prose) *)) {
			padding-inline-end: 0;
		}
	}

	td code:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		font-size: var(--font-size--xs);
	}

	img:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		object-fit: contain;
		margin-top: var(--spacing--xs);
		margin-bottom: var(--spacing--2xs);

		&[src*='#full-width']:not(:where(:global(.not-prose), :global(.not-prose) *)) {
			width: 100%;
		}
	}

	pre:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		margin-bottom: var(--spacing--sm);
		display: grid;
	}

	iframe:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		aspect-ratio: 16/9 auto;
	}

	summary:not(:where(:global(.not-prose), :global(.not-prose) *)) {
		cursor: pointer;
	}
}

.spacer {
	margin: var(--spacing--2xl);
}
</style>
