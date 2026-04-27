<script lang="ts" setup>
import ChatMarkdownChunk from '@/features/ai/chatHub/components/ChatMarkdownChunk.vue';
import type { ComponentPublicInstance } from 'vue';
import { computed, inject, onBeforeUnmount, onMounted, onUpdated, ref, useCssModule } from 'vue';
import { useInstanceAiStore } from '../instanceAi.store';

const props = defineProps<{
	content: string;
}>();

const store = useInstanceAiStore();
const styles = useCssModule();
const wrapperRef = ref<ComponentPublicInstance | null>(null);

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
/** Internal XML blocks that should never render in the chat (LLM may echo them). */
const INTERNAL_BLOCK_PATTERN =
	/<(?:planning-blueprint|planned-task-follow-up|background-task-completed|running-tasks)[\s\S]*?<\/(?:planning-blueprint|planned-task-follow-up|background-task-completed|running-tasks)>/g;

const processedContent = computed(() => {
	const registry = store.resourceNameIndex;

	// Strip internal protocol blocks the LLM may have echoed
	let result = props.content.replace(INTERNAL_BLOCK_PATTERN, '').trim();

	if (registry.size === 0) return result;

	// Build entries sorted longest-name-first to avoid partial-match conflicts
	const entries = [...registry.values()]
		.filter((entry) => entry.name.length >= 3)
		.sort((a, b) => b.name.length - a.name.length);

	for (const entry of entries) {
		// Escape special regex characters in the resource name
		const escaped = entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// Match the resource name as a standalone token, but NOT if it is:
		// - Inside backticks (inline code)
		// - Already inside a markdown link [...](...) or the link URL part
		// - Preceded by [ or followed by ]( (link text boundaries)
		//
		// Use \b when the name edge is a word character; use a whitespace/
		// punctuation boundary otherwise (handles names like "Test (v2.0)").
		const startBoundary = /\w/.test(entry.name[0]) ? '\\b' : '(?<=^|[\\s,;:!?])';
		const endBoundary = /\w/.test(entry.name[entry.name.length - 1]) ? '\\b' : '(?=$|[\\s,;:!?.])';

		const pattern = new RegExp(
			// Negative lookbehind: not preceded by [ or ` or /
			'(?<![\\[`\\/])' +
				// The name with appropriate boundaries
				`${startBoundary}(${escaped})${endBoundary}` +
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

/** Route patterns that map internal n8n URLs to resource types. */
const INTERNAL_ROUTE_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
	{ pattern: /^(?:https?:\/\/[^/]+)?\/workflow\/([a-zA-Z0-9]+)/, type: 'workflow' },
	{ pattern: /^(?:https?:\/\/[^/]+)?\/credentials(?:\/|$)/, type: 'credential' },
	{ pattern: /^(?:https?:\/\/[^/]+)?\/data-tables(?:\/|$)/, type: 'data-table' },
];

/**
 * Apply resource chip styling (icon + class) to an anchor element.
 */
function applyResourceChip(link: HTMLAnchorElement, type: string): void {
	link.dataset.resourceChip = type;
	link.classList.add(styles.resourceChip);

	const iconHtml = ICON_SVGS[type];
	if (iconHtml) {
		const iconSpan = document.createElement('span');
		iconSpan.classList.add(styles.resourceChipIcon);
		iconSpan.innerHTML = iconHtml;
		link.prepend(iconSpan);
	}
}

/** Track click handlers attached to links so they can be cleaned up. */
const linkHandlers = new WeakMap<HTMLAnchorElement, (e: MouseEvent) => void>();

/**
 * Post-process the rendered DOM to transform resource links into
 * styled resource chips with icons. Handles both:
 * - `n8n-resource://` custom scheme links (from pre-processing)
 * - Standard links pointing to internal n8n routes (generated by the AI)
 */
function enhanceResourceLinks(): void {
	if (!wrapperRef.value) return;

	const allLinks = (wrapperRef.value.$el as HTMLElement).querySelectorAll<HTMLAnchorElement>('a');

	for (const link of allLinks) {
		// Already enhanced — skip
		if (link.dataset.resourceChip) continue;

		const href = link.getAttribute('href') ?? '';

		// 1. Handle n8n-resource:// custom scheme links
		const resourceMatch = /^n8n-resource:\/\/(workflow|credential|data-table)\/(.+)$/.exec(href);
		if (resourceMatch) {
			const [, type, id] = resourceMatch;

			// Look up registry entry (needed for projectId on data-table links).
			// Search the name index because it contains both produced and listed
			// resources — a user may click through to a data table the agent
			// only referenced via a list call.
			const registryEntry =
				type === 'data-table'
					? [...store.resourceNameIndex.values()].find(
							(r) => r.type === 'data-table' && r.id === id,
						)
					: undefined;

			// Swap href to the real app URL (used for Cmd+click / new tab)
			link.href =
				type === 'data-table' && registryEntry?.projectId
					? `/projects/${registryEntry.projectId}/datatables/${id}`
					: (URL_BUILDERS[type]?.(id) ?? '#');
			link.target = '_blank';
			link.dataset.resourceId = id;
			applyResourceChip(link, type);

			// Regular click opens preview; Cmd/Ctrl+click falls through to default (new tab)
			const handler = (e: MouseEvent) => {
				if (e.metaKey || e.ctrlKey) return; // Let browser handle new-tab

				const canPreview =
					(type === 'workflow' && openWorkflowPreview) ||
					(type === 'data-table' && registryEntry?.projectId && openDataTablePreview);

				if (!canPreview) return; // Let browser navigate normally

				e.preventDefault();
				if (type === 'workflow') {
					openWorkflowPreview?.(id);
				} else if (type === 'data-table' && registryEntry?.projectId) {
					openDataTablePreview?.(id, registryEntry.projectId);
				}
			};
			link.addEventListener('click', handler);
			linkHandlers.set(link, handler);

			continue;
		}

		// 2. Handle standard links pointing to internal n8n routes
		for (const { pattern, type } of INTERNAL_ROUTE_PATTERNS) {
			if (pattern.test(href)) {
				link.target = '_blank';
				applyResourceChip(link, type);
				break;
			}
		}
	}
}

/** Remove click handlers from all enhanced links. */
function cleanupLinkHandlers(): void {
	if (!wrapperRef.value) return;
	const allLinks = (wrapperRef.value.$el as HTMLElement).querySelectorAll<HTMLAnchorElement>('a');
	for (const link of allLinks) {
		const handler = linkHandlers.get(link);
		if (handler) {
			link.removeEventListener('click', handler);
			linkHandlers.delete(link);
		}
	}
}

onMounted(enhanceResourceLinks);
onUpdated(() => {
	cleanupLinkHandlers();
	enhanceResourceLinks();
});
onBeforeUnmount(cleanupLinkHandlers);
</script>

<template>
	<ChatMarkdownChunk ref="wrapperRef" :source="source" />
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
