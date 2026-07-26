<script lang="ts" setup>
import ChatMarkdownChunk from '@/features/ai/chatHub/components/ChatMarkdownChunk.vue';
import { computed, inject, onMounted, onUpdated, ref, useCssModule } from 'vue';
import { useThread } from '../instanceAi.store';

const props = defineProps<{
	content: string;
	/**
	 * True while the source text is still streaming in. While streaming we skip
	 * the resource-name decoration — O(content × resources), re-run on every
	 * token — and apply it once the block settles. Markdown formatting still
	 * renders live, and the post-render DOM link walk keeps running so links
	 * the AI writes directly (e.g. `[name](/workflow/abc)`) stay safe to click
	 * mid-stream (target="_blank" instead of same-tab SPA navigation).
	 */
	streaming?: boolean;
}>();

const thread = useThread();
const styles = useCssModule();
const wrapperRef = ref<HTMLElement | null>(null);

/**
 * Preview openers — return true when they switched the preview tab, false
 * when the tab was already active (so we fall back to opening a new tab).
 */
const openWorkflowPreview = inject<((id: string) => boolean) | undefined>(
	'openWorkflowPreview',
	undefined,
);
const openDataTablePreview = inject<((id: string, projectId: string) => boolean) | undefined>(
	'openDataTablePreview',
	undefined,
);
const openAgentPreview = inject<((id: string, projectId: string) => boolean) | undefined>(
	'openAgentPreview',
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
	agent:
		'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
};

/** URL builders for each resource type — fallbacks when the registry has no projectId. */
const URL_BUILDERS: Record<string, (id: string) => string> = {
	workflow: (id) => `/workflow/${id}`,
	credential: (id) => `/home/credentials/${id}`,
	'data-table': () => '/home/datatables',
	agent: () => '/home/agents',
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

const rawContent = computed(() => props.content.replace(INTERNAL_BLOCK_PATTERN, '').trim());

function escapeMarkdownLinkText(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function isEscaped(content: string, index: number): boolean {
	let backslashCount = 0;
	for (let i = index - 1; i >= 0 && content[i] === '\\'; i--) {
		backslashCount++;
	}
	return backslashCount % 2 === 1;
}

function findCodeSpanEnd(content: string, start: number): number | undefined {
	let tickCount = 0;
	while (content[start + tickCount] === '`') tickCount++;

	const fence = '`'.repeat(tickCount);
	const end = content.indexOf(fence, start + tickCount);
	return end === -1 ? undefined : end + tickCount;
}

function findMarkdownLinkEnd(content: string, start: number): number | undefined {
	let bracketDepth = 1;
	let closeBracketIndex: number | undefined;

	for (let i = start + 1; i < content.length; i++) {
		if (isEscaped(content, i)) continue;
		if (content[i] === '[') {
			bracketDepth++;
		} else if (content[i] === ']') {
			bracketDepth--;
			if (bracketDepth === 0) {
				closeBracketIndex = i;
				break;
			}
		}
	}

	if (closeBracketIndex === undefined || content[closeBracketIndex + 1] !== '(') return undefined;

	let parenDepth = 1;
	for (let i = closeBracketIndex + 2; i < content.length; i++) {
		if (isEscaped(content, i)) continue;
		if (content[i] === '(') {
			parenDepth++;
		} else if (content[i] === ')') {
			parenDepth--;
			if (parenDepth === 0) return i + 1;
		}
	}

	return undefined;
}

function replaceUnprotectedMarkdownText(
	content: string,
	replaceSegment: (segment: string) => string,
): string {
	let result = '';
	let segmentStart = 0;
	let index = 0;

	while (index < content.length) {
		const char = content[index];
		const protectedEnd =
			char === '`'
				? findCodeSpanEnd(content, index)
				: char === '[' && !isEscaped(content, index)
					? findMarkdownLinkEnd(content, index)
					: undefined;

		if (protectedEnd !== undefined) {
			result += replaceSegment(content.slice(segmentStart, index));
			result += content.slice(index, protectedEnd);
			segmentStart = protectedEnd;
			index = protectedEnd;
			continue;
		}

		index++;
	}

	return result + replaceSegment(content.slice(segmentStart));
}

function decorateResourceNames(content: string): string {
	const registry = thread.linkableResourceNameIndex;
	if (registry.size === 0) return content;

	// Build entries sorted longest-name-first to avoid partial-match conflicts
	const entries = [...registry.values()]
		.filter((entry) => entry.name.length >= 3)
		.sort((a, b) => b.name.length - a.name.length);

	let result = content;
	for (const entry of entries) {
		result = replaceUnprotectedMarkdownText(result, (segment) => {
			// Escape special regex characters in the resource name
			const escaped = entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

			// Use \b when the name edge is a word character; use a whitespace/
			// punctuation boundary otherwise (handles names like "Test (v2.0)").
			const startBoundary = /\w/.test(entry.name[0]) ? '\\b' : '(?<=^|[\\s,;:!?])';
			const endBoundary = /\w/.test(entry.name[entry.name.length - 1])
				? '\\b'
				: '(?=$|[\\s,;:!?.])';

			const pattern = new RegExp(
				// Negative lookbehind: not preceded by / so URL paths are not mutated.
				'(?<!\\/)' +
					// The name with appropriate boundaries
					`${startBoundary}(${escaped})${endBoundary}` +
					// Negative lookahead: not followed by :// so URLs are not mutated.
					'(?!://)',
				'g',
			);

			return segment.replace(pattern, (_match, name: string) => {
				const url = `n8n-resource://${entry.type}/${encodeURIComponent(entry.id)}`;
				return `[${escapeMarkdownLinkText(name)}](${url})`;
			});
		});
	}

	return result;
}

const source = computed(() => ({
	type: 'text' as const,
	content: props.streaming ? rawContent.value : decorateResourceNames(rawContent.value),
}));

/** Route patterns that map internal n8n URLs to resource types. */
const INTERNAL_ROUTE_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
	{ pattern: /^\/workflow\/([a-zA-Z0-9]+)/, type: 'workflow' },
	{ pattern: /^\/(?:home\/)?credentials(?:\/|$)/, type: 'credential' },
	{ pattern: /^\/(?:home\/)?data-?tables(?:\/|$)/, type: 'data-table' },
	{ pattern: /^\/home\/agents(?:\/|$)/, type: 'agent' },
	{ pattern: /^\/projects\/[^/]+\/credentials(?:\/|$)/, type: 'credential' },
	{ pattern: /^\/projects\/[^/]+\/datatables(?:\/|$)/, type: 'data-table' },
	{ pattern: /^\/projects\/[^/]+\/agents(?:\/|$)/, type: 'agent' },
];

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:/i;

function getSameOriginPathname(href: string): string | undefined {
	const isRootRelative = href.startsWith('/') && !href.startsWith('//');
	const isAbsolute = ABSOLUTE_URL_PATTERN.test(href);
	if (!isRootRelative && !isAbsolute) return undefined;

	try {
		const url = new URL(href, window.location.origin);
		return url.origin === window.location.origin ? url.pathname : undefined;
	} catch {
		return undefined;
	}
}

function decodeResourceId(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

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

/**
 * Build the real app URL for a resource. Project-scoped routes are preferred
 * when the registry knows the resource's projectId; otherwise we fall back to
 * the home view, which works for any resource the user has access to.
 */
function buildResourceUrl(type: string, id: string, projectId: string | undefined): string {
	if (projectId) {
		if (type === 'data-table') return `/projects/${projectId}/datatables/${id}`;
		if (type === 'credential') return `/projects/${projectId}/credentials/${id}`;
		if (type === 'agent') return `/projects/${projectId}/agents/${id}`;
	}
	return URL_BUILDERS[type]?.(id) ?? '#';
}

/**
 * Post-process the rendered DOM to transform resource links into
 * styled resource chips with icons. Handles both:
 * - `n8n-resource://` custom scheme links (from pre-processing)
 * - Standard links pointing to internal n8n routes (generated by the AI)
 *
 * Pure DOM decoration — clicks are handled by the delegated listener on the
 * wrapper (see `handleResourceLinkClick`), so there is nothing to clean up
 * when the markdown re-renders and replaces these elements.
 */
function enhanceResourceLinks(): void {
	if (!wrapperRef.value) return;

	const allLinks = wrapperRef.value.querySelectorAll<HTMLAnchorElement>('a');

	for (const link of allLinks) {
		// Already enhanced — skip
		if (link.dataset.resourceChip) continue;

		const href = link.getAttribute('href') ?? '';

		// 1. Handle n8n-resource:// custom scheme links
		const resourceMatch = /^n8n-resource:\/\/(workflow|credential|data-table|agent)\/(.+)$/.exec(
			href,
		);
		if (resourceMatch) {
			const [, type, encodedId] = resourceMatch;
			const id = decodeResourceId(encodedId);

			// Look up registry entry to find projectId for project-scoped routes.
			// Search the name index because it contains both produced and listed
			// resources — a user may click through to a resource the agent
			// only referenced via a list call.
			const registryEntry = [...thread.resourceNameIndex.values()].find(
				(r) => r.type === type && r.id === id,
			);

			link.href = buildResourceUrl(type, id, registryEntry?.projectId);
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
			link.dataset.resourceId = id;
			applyResourceChip(link, type);

			continue;
		}

		// 2. Handle standard links pointing to internal n8n routes
		const internalPathname = getSameOriginPathname(href);
		if (!internalPathname) continue;

		for (const { pattern, type } of INTERNAL_ROUTE_PATTERNS) {
			if (pattern.test(internalPathname)) {
				link.target = '_blank';
				link.rel = 'noopener noreferrer';
				applyResourceChip(link, type);
				break;
			}
		}
	}
}

/**
 * Delegated click handler for resource chips (anchors carrying
 * `data-resource-id`, i.e. decorated `n8n-resource://` links).
 *
 * Delegation instead of per-link listeners: the markdown is innerHTML-based
 * and re-renders both replace elements and leave them untouched depending on
 * whether the content changed — per-link listeners were silently lost on
 * same-content re-renders (cleanup removed them, the "already enhanced" skip
 * never re-attached), downgrading chips to plain new-tab links.
 *
 * Click behavior:
 * - Cmd/Ctrl+click → browser handles new-tab via target="_blank"
 * - Left-click on workflow/data-table → opens (or switches to) the inline
 *   preview tab. If the preview is already showing this resource, falls
 *   through to default `target="_blank"` and opens a new tab instead.
 * - Left-click on credential (or any chip without an available preview)
 *   → opens in a new tab.
 */
function handleResourceLinkClick(event: MouseEvent): void {
	if (event.metaKey || event.ctrlKey) return; // Let browser handle new-tab
	if (!(event.target instanceof Element)) return;

	const link = event.target.closest('a[data-resource-id]');
	if (!(link instanceof HTMLAnchorElement)) return;

	const type = link.dataset.resourceChip;
	const id = link.dataset.resourceId;
	if (!type || !id) return;

	let switched: boolean | undefined;
	if (type === 'workflow') {
		switched = openWorkflowPreview?.(id);
	} else if (type === 'data-table') {
		const registryEntry = [...thread.resourceNameIndex.values()].find(
			(r) => r.type === type && r.id === id,
		);
		if (registryEntry?.projectId) {
			switched = openDataTablePreview?.(id, registryEntry.projectId);
		}
	} else if (type === 'agent') {
		const registryEntry = [...thread.resourceNameIndex.values()].find(
			(r) => r.type === type && r.id === id,
		);
		if (registryEntry?.projectId) {
			switched = openAgentPreview?.(id, registryEntry.projectId);
		}
	}

	// Suppress default navigation only when the preview actually switched.
	// If preview was already showing this resource (switched === false) or
	// no preview is available (switched === undefined), let target="_blank"
	// open a new tab.
	if (switched === true) event.preventDefault();
}

onMounted(enhanceResourceLinks);
onUpdated(() => {
	// Runs while streaming too: decorated n8n-resource:// links can't exist yet
	// (decoration is deferred), but AI-authored internal-route links can, and
	// this walk is their only target="_blank" — without it a mid-stream click
	// navigates the SPA tab away from the live chat. O(anchors), cheap.
	enhanceResourceLinks();
});
</script>

<template>
	<div ref="wrapperRef" @click="handleResourceLinkClick">
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
