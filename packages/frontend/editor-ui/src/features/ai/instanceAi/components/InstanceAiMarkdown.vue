<script lang="ts" setup>
import { computed, inject, onBeforeUnmount, onMounted, onUpdated, ref, useCssModule } from 'vue';
import { stripInternalInstanceAiBlocks } from '../internalBlocks';
import { useThread } from '../instanceAi.store';
import { parseInstanceAiMarkdown, type InstanceAiMarkdownChunk } from '../markdownParser';
import type { ResourceEntry } from '../useResourceRegistry';
import InstanceAiMarkdownChunkComponent from './InstanceAiMarkdownChunk.vue';

const props = defineProps<{
	content: string;
}>();

const thread = useThread();
const styles = useCssModule();
const wrapperRef = ref<HTMLElement | null>(null);
const openChatArtifact = inject<((title?: string) => void) | undefined>(
	'openChatArtifact',
	undefined,
);

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

type ResourceType = 'workflow' | 'credential' | 'data-table';

function isResourceType(value: string): value is ResourceType {
	return value === 'workflow' || value === 'credential' || value === 'data-table';
}

type SvgIconChild = {
	tag: 'path' | 'circle' | 'rect';
	attrs: Record<string, string>;
};

const ICON_DEFINITIONS: Record<ResourceType, SvgIconChild[]> = {
	workflow: [
		{
			tag: 'path',
			attrs: { d: 'M21.17 8H7.83a1.83 1.83 0 1 0 0 3.66h8.34a1.83 1.83 0 0 1 0 3.66H2.83' },
		},
		{ tag: 'path', attrs: { d: 'm18 2 4 4-4 4' } },
		{ tag: 'path', attrs: { d: 'm6 20-4-4 4-4' } },
	],
	credential: [
		{ tag: 'path', attrs: { d: 'm15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4' } },
		{ tag: 'path', attrs: { d: 'm21 2-9.6 9.6' } },
		{ tag: 'circle', attrs: { cx: '7.5', cy: '15.5', r: '5.5' } },
	],
	'data-table': [
		{ tag: 'path', attrs: { d: 'M12 3v18' } },
		{ tag: 'rect', attrs: { width: '18', height: '18', x: '3', y: '3', rx: '2' } },
		{ tag: 'path', attrs: { d: 'M3 9h18' } },
		{ tag: 'path', attrs: { d: 'M3 15h18' } },
	],
};

/** URL builders for each resource type — fallbacks when the registry has no projectId. */
const URL_BUILDERS: Record<ResourceType, (id: string) => string> = {
	workflow: (id) => `/workflow/${id}`,
	credential: (id) => `/home/credentials/${id}`,
	'data-table': () => '/home/datatables',
};

/**
 * Pre-process the raw markdown content: replace known resource names with
 * markdown links using a custom `n8n-resource://` URL scheme. These links
 * are then enhanced in the DOM after rendering.
 *
 * Only replaces names that appear as standalone words (not inside code spans
 * or existing links) and are at least 3 characters long to avoid false positives.
 */
const rawContent = computed(() => stripInternalInstanceAiBlocks(props.content));

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
	const registry = thread.resourceNameIndex;
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

const sources = computed<InstanceAiMarkdownChunk[]>(() =>
	parseInstanceAiMarkdown(rawContent.value).map((source) => {
		if (source.type === 'text') {
			return { ...source, content: decorateResourceNames(source.content) };
		}

		return source;
	}),
);

const resourceEntriesByTypeAndId = computed(() => {
	const entries = new Map<string, ResourceEntry>();
	for (const entry of thread.resourceNameIndex.values()) {
		entries.set(`${entry.type}:${entry.id}`, entry);
	}
	return entries;
});

function handleOpenArtifact(title: string): void {
	openChatArtifact?.(title);
}

type InternalResourceLink = {
	type: ResourceType;
	id?: string;
	projectId?: string;
};

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

function parseInternalResourceLink(pathname: string): InternalResourceLink | undefined {
	const workflowMatch = /^\/workflow\/([^/]+)/.exec(pathname);
	if (workflowMatch) {
		return { type: 'workflow', id: decodeResourceId(workflowMatch[1]) };
	}

	const projectCredentialMatch = /^\/projects\/([^/]+)\/credentials(?:\/([^/]+))?/.exec(pathname);
	if (projectCredentialMatch) {
		const [, projectId, id] = projectCredentialMatch;
		return {
			type: 'credential',
			projectId: decodeResourceId(projectId),
			id: id ? decodeResourceId(id) : undefined,
		};
	}

	const projectDataTableMatch = /^\/projects\/([^/]+)\/datatables(?:\/([^/]+))?/.exec(pathname);
	if (projectDataTableMatch) {
		const [, projectId, id] = projectDataTableMatch;
		return {
			type: 'data-table',
			projectId: decodeResourceId(projectId),
			id: id ? decodeResourceId(id) : undefined,
		};
	}

	const credentialMatch = /^\/(?:home\/)?credentials(?:\/([^/]+))?/.exec(pathname);
	if (credentialMatch) {
		const [, id] = credentialMatch;
		return { type: 'credential', id: id ? decodeResourceId(id) : undefined };
	}

	const dataTableMatch = /^\/(?:home\/)?data-?tables(?:\/([^/]+))?/.exec(pathname);
	if (dataTableMatch) {
		const [, id] = dataTableMatch;
		return { type: 'data-table', id: id ? decodeResourceId(id) : undefined };
	}

	return undefined;
}

function findResourceRegistryEntry(type: ResourceType, id: string) {
	return resourceEntriesByTypeAndId.value.get(`${type}:${id}`);
}

function createResourceIcon(type: ResourceType): SVGSVGElement {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	const attrs: Record<string, string> = {
		xmlns: 'http://www.w3.org/2000/svg',
		width: '14',
		height: '14',
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		'stroke-width': '2',
		'stroke-linecap': 'round',
		'stroke-linejoin': 'round',
	};
	for (const [key, value] of Object.entries(attrs)) {
		svg.setAttribute(key, value);
	}
	for (const child of ICON_DEFINITIONS[type]) {
		const el = document.createElementNS('http://www.w3.org/2000/svg', child.tag);
		for (const [key, value] of Object.entries(child.attrs)) {
			el.setAttribute(key, value);
		}
		svg.append(el);
	}
	return svg;
}

/**
 * Apply resource chip styling (icon + class) to an anchor element.
 */
function applyResourceChip(link: HTMLAnchorElement, type: ResourceType): void {
	link.dataset.resourceChip = type;
	link.classList.add(styles.resourceChip);

	const iconSpan = document.createElement('span');
	iconSpan.classList.add(styles.resourceChipIcon);
	iconSpan.append(createResourceIcon(type));
	link.prepend(iconSpan);
}

/**
 * Build the real app URL for a resource. Project-scoped routes are preferred
 * when the registry knows the resource's projectId; otherwise we fall back to
 * the home view, which works for any resource the user has access to.
 */
function buildResourceUrl(type: ResourceType, id: string, projectId: string | undefined): string {
	if (projectId) {
		if (type === 'data-table') return `/projects/${projectId}/datatables/${id}`;
		if (type === 'credential') return `/projects/${projectId}/credentials/${id}`;
	}
	return URL_BUILDERS[type]?.(id) ?? '#';
}

/** Track click handlers attached to links so they can be cleaned up. */
const linkHandlers = new WeakMap<HTMLAnchorElement, (e: MouseEvent) => void>();

function attachResourcePreviewHandler(
	link: HTMLAnchorElement,
	type: ResourceType,
	id: string,
	projectId: string | undefined,
): void {
	if (linkHandlers.has(link)) return;

	const handler = (e: MouseEvent) => {
		if (e.metaKey || e.ctrlKey) return; // Let browser handle new-tab

		let switched: boolean | undefined;
		if (type === 'workflow') {
			switched = openWorkflowPreview?.(id);
		} else if (type === 'data-table' && projectId) {
			switched = openDataTablePreview?.(id, projectId);
		}

		// Suppress default navigation only when the preview actually switched.
		// If preview was already showing this resource (switched === false) or
		// no preview is available (switched === undefined), let target="_blank"
		// open a new tab.
		if (switched === true) e.preventDefault();
	};
	link.addEventListener('click', handler);
	linkHandlers.set(link, handler);
}

/**
 * Post-process the rendered DOM to transform resource links into
 * styled resource chips with icons. Handles both:
 * - `n8n-resource://` custom scheme links (from pre-processing)
 * - Standard links pointing to internal n8n routes (generated by the AI)
 *
 * Click behavior:
 * - Cmd/Ctrl+click → browser handles new-tab via target="_blank"
 * - Left-click on workflow/data-table → opens (or switches to) the inline
 *   preview tab. If the preview is already showing this resource, falls
 *   through to default `target="_blank"` and opens a new tab instead.
 * - Left-click on credential (or any chip without an available preview)
 *   → opens in a new tab.
 */
function enhanceResourceLinks(): void {
	if (!wrapperRef.value) return;

	const allLinks = wrapperRef.value.querySelectorAll<HTMLAnchorElement>('a');

	for (const link of allLinks) {
		// Already enhanced. Vue updates can reuse the same DOM node after our
		// update cleanup removed handlers, so make sure preview clicks stay wired.
		if (link.dataset.resourceChip) {
			const type = link.dataset.resourceChip;
			if (link.dataset.resourceId && isResourceType(type)) {
				attachResourcePreviewHandler(
					link,
					type,
					link.dataset.resourceId,
					link.dataset.resourceProjectId,
				);
			}
			continue;
		}

		const href = link.getAttribute('href') ?? '';

		// 1. Handle n8n-resource:// custom scheme links
		const resourceMatch = /^n8n-resource:\/\/(workflow|credential|data-table)\/(.+)$/.exec(href);
		if (resourceMatch) {
			const [, type, encodedId] = resourceMatch;
			if (!isResourceType(type)) continue;
			const resourceType = type;
			const id = decodeResourceId(encodedId);

			// Look up registry entry to find projectId for project-scoped routes.
			// Search the name index because it contains both produced and listed
			// resources — a user may click through to a resource the agent
			// only referenced via a list call.
			const registryEntry = findResourceRegistryEntry(resourceType, id);

			link.href = buildResourceUrl(resourceType, id, registryEntry?.projectId);
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
			link.dataset.resourceId = id;
			if (registryEntry?.projectId) {
				link.dataset.resourceProjectId = registryEntry.projectId;
			}
			applyResourceChip(link, resourceType);
			attachResourcePreviewHandler(link, resourceType, id, registryEntry?.projectId);

			continue;
		}

		// 2. Handle standard links pointing to internal n8n routes
		const internalPathname = getSameOriginPathname(href);
		if (!internalPathname) continue;

		const internalResource = parseInternalResourceLink(internalPathname);
		if (internalResource) {
			const registryEntry = internalResource.id
				? findResourceRegistryEntry(internalResource.type, internalResource.id)
				: undefined;
			const projectId = internalResource.projectId ?? registryEntry?.projectId;

			link.target = '_blank';
			link.rel = 'noopener noreferrer';
			if (internalResource.id) {
				link.dataset.resourceId = internalResource.id;
				if (projectId) {
					link.dataset.resourceProjectId = projectId;
				}
			}
			applyResourceChip(link, internalResource.type);
			if (internalResource.id) {
				attachResourcePreviewHandler(link, internalResource.type, internalResource.id, projectId);
			}
		}
	}
}

/** Remove click handlers from all enhanced links. */
function cleanupLinkHandlers(): void {
	if (!wrapperRef.value) return;
	const allLinks = wrapperRef.value.querySelectorAll<HTMLAnchorElement>('a');
	for (const link of allLinks) {
		const handler = linkHandlers.get(link);
		if (handler) {
			link.removeEventListener('click', handler);
			linkHandlers.delete(link);
		}
	}
}

onMounted(enhanceResourceLinks);
onUpdated(enhanceResourceLinks);
onBeforeUnmount(cleanupLinkHandlers);
</script>

<template>
	<div ref="wrapperRef">
		<InstanceAiMarkdownChunkComponent
			v-for="(source, index) in sources"
			:key="index"
			:source="source"
			@open-artifact="handleOpenArtifact"
		/>
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
