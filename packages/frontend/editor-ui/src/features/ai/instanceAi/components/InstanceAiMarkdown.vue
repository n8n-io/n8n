<script lang="ts" setup>
import { computed, ref, onMounted, onUpdated, useCssModule } from 'vue';
import ChatMarkdownChunk from '@/features/ai/chatHub/components/ChatMarkdownChunk.vue';
import { useInstanceAiStore } from '../instanceAi.store';

const props = defineProps<{
	content: string;
}>();

const store = useInstanceAiStore();
const styles = useCssModule();
const wrapperRef = ref<HTMLElement | null>(null);

/** Icon SVG paths for each resource type — matches the n8n design system icons. */
const ICON_SVGS: Record<string, string> = {
	workflow:
		'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.17 8H7.83a1.83 1.83 0 1 0 0 3.66h8.34a1.83 1.83 0 0 1 0 3.66H2.83"/><path d="m18 2 4 4-4 4"/><path d="m6 20-4-4 4-4"/></svg>',
	credential:
		'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>',
	'data-table':
		'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
};

/** URL builders for each resource type. */
const URL_BUILDERS: Record<string, (id: string) => string> = {
	workflow: (id) => `/workflow/${id}`,
	credential: () => '/credentials',
	'data-table': () => '/data-tables',
};

/**
 * Pre-process the raw markdown content: replace known resource names with
 * markdown links using a custom `n8n-resource://` URL scheme. These links
 * are then enhanced in the DOM after rendering.
 *
 * Only replaces names that appear as standalone words (not inside code spans
 * or existing links) and are at least 3 characters long to avoid false positives.
 */
const processedContent = computed(() => {
	const registry = store.resourceRegistry;
	if (registry.size === 0) return props.content;

	let result = props.content;

	// Build entries sorted longest-name-first to avoid partial-match conflicts
	const entries = [...registry.values()]
		.filter((entry) => entry.name.length >= 3)
		.sort((a, b) => b.name.length - a.name.length);

	for (const entry of entries) {
		// Escape special regex characters in the resource name
		const escaped = entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// Match the resource name as a standalone word, but NOT if it is:
		// - Inside backticks (inline code)
		// - Already inside a markdown link [...](...) or the link URL part
		// - Preceded by [ or followed by ]( (link text boundaries)
		const pattern = new RegExp(
			// Negative lookbehind: not preceded by [ or ` or /
			'(?<![\\[`\\/])' +
				// The name itself, as a word boundary
				`\\b(${escaped})\\b` +
				// Negative lookahead: not followed by ]( or ` or ://
				'(?![\\]`]|\\(|://)',
			'g',
		);

		result = result.replace(pattern, (_match, name: string) => {
			const url = `n8n-resource://${entry.type}/${entry.id}`;
			return `[${name}](${url})`;
		});
	}

	return result;
});

const source = computed(() => ({
	type: 'text' as const,
	content: processedContent.value,
}));

/**
 * Post-process the rendered DOM to transform `n8n-resource://` links into
 * styled resource chips with icons.
 */
function enhanceResourceLinks(): void {
	if (!wrapperRef.value) return;

	const links = wrapperRef.value.querySelectorAll<HTMLAnchorElement>('a[href^="n8n-resource://"]');

	for (const link of links) {
		// Already enhanced — skip
		if (link.dataset.resourceChip) continue;

		const href = link.getAttribute('href') ?? '';
		const match = /^n8n-resource:\/\/(workflow|credential|data-table)\/(.+)$/.exec(href);
		if (!match) continue;

		const [, type, id] = match;

		// Swap href to the real app URL
		link.href = URL_BUILDERS[type]?.(id) ?? '#';
		link.target = '_blank';
		link.dataset.resourceChip = type;
		link.classList.add(styles.resourceChip);

		// Prepend icon SVG
		const iconHtml = ICON_SVGS[type];
		if (iconHtml) {
			const iconSpan = document.createElement('span');
			iconSpan.classList.add(styles.resourceChipIcon);
			iconSpan.innerHTML = iconHtml;
			link.prepend(iconSpan);
		}
	}
}

onMounted(enhanceResourceLinks);
onUpdated(enhanceResourceLinks);
</script>

<template>
	<div ref="wrapperRef">
		<ChatMarkdownChunk :source="source" />
	</div>
</template>

<style lang="scss" module>
.resourceChip {
	display: inline-flex !important;
	align-items: center !important;
	gap: 2px !important;
	padding: 1px var(--spacing--4xs) !important;
	font-size: var(--font-size--2xs) !important;
	font-weight: var(--font-weight--bold) !important;
	background: var(--color--background--shade-1) !important;
	border: var(--border) !important;
	border-radius: var(--radius) !important;
	color: var(--color--primary) !important;
	text-decoration: none !important;
	cursor: pointer !important;
	vertical-align: baseline !important;
	line-height: var(--line-height--md) !important;

	&:hover {
		background: color-mix(in srgb, var(--color--primary) 12%, var(--color--background)) !important;
		border-color: var(--color--primary) !important;
		color: var(--color--primary) !important;
	}
}

.resourceChipIcon {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
}
</style>
