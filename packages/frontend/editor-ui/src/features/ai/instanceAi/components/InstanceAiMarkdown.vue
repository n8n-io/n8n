<script lang="ts" setup>
import { computed, inject, ref, onMounted, onUpdated, useCssModule } from 'vue';
import ChatMarkdownChunk from '@/features/ai/chatHub/components/ChatMarkdownChunk.vue';
import { useInstanceAiStore } from '../instanceAi.store';

const props = defineProps<{
	content: string;
}>();

const store = useInstanceAiStore();
const styles = useCssModule();
const wrapperRef = ref<HTMLElement | null>(null);

const openWorkflowPreview = inject<((id: string) => void) | undefined>(
	'openWorkflowPreview',
	undefined,
);
const openDataTablePreview = inject<((id: string, projectId: string) => void) | undefined>(
	'openDataTablePreview',
	undefined,
);

/** Icon SVG paths for each resource type — matches the n8n design system icons. */
const ICON_SVGS: Record<string, string> = {
	workflow:
		'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.17 8H7.83a1.83 1.83 0 1 0 0 3.66h8.34a1.83 1.83 0 0 1 0 3.66H2.83"/><path d="m18 2 4 4-4 4"/><path d="m6 20-4-4 4-4"/></svg>',
	credential:
		'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>',
	'data-table':
		'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
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

		// Look up registry entry (needed for projectId on data-table links)
		const registryEntry =
			type === 'data-table'
				? [...store.resourceRegistry.values()].find((r) => r.type === 'data-table' && r.id === id)
				: undefined;

		// Swap href to the real app URL (used for Cmd+click / new tab)
		link.href =
			type === 'data-table' && registryEntry?.projectId
				? `/projects/${registryEntry.projectId}/datatables/${id}`
				: (URL_BUILDERS[type]?.(id) ?? '#');
		link.target = '_blank';
		link.dataset.resourceChip = type;
		link.dataset.resourceId = id;
		link.classList.add(styles.resourceChip);

		// Regular click opens preview; Cmd/Ctrl+click falls through to default (new tab)
		link.addEventListener('click', (e: MouseEvent) => {
			if (e.metaKey || e.ctrlKey) return; // Let browser handle new-tab

			e.preventDefault();
			if (type === 'workflow') {
				openWorkflowPreview?.(id);
			} else if (type === 'data-table') {
				if (registryEntry?.projectId) {
					openDataTablePreview?.(id, registryEntry.projectId);
				}
			}
		});

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
	display: inline !important;
	padding: 0 !important;
	font-size: inherit !important;
	font-weight: var(--font-weight--regular) !important;
	background: none !important;
	border: none !important;
	border-radius: 0 !important;
	color: inherit !important;
	text-decoration: underline !important;
	text-decoration-color: var(--color--text--tint-1) !important;
	cursor: pointer !important;
	vertical-align: baseline !important;
	line-height: inherit !important;

	&:hover {
		background: none !important;
		color: var(--color--primary) !important;
	}
}

.resourceChipIcon {
	display: inline-flex;
	align-items: center;
	vertical-align: middle;
	margin-right: var(--spacing--5xs);
}
</style>
