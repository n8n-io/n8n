/**
 * Pure accessibility snapshot pipeline for the Chrome extension.
 *
 * No browser APIs, no Node.js APIs — inputs are plain CDP data objects so this
 * module can be unit-tested on Node.js without a browser.
 *
 * Flow:
 *   buildSnapshot(axNodes, fetchAttributes) → { nodes, refs }
 *   renderSnapshot(nodes)                   → YAML-like text (on demand)
 *   computeSnapshotDiff(prev, next)         → { diffType, content }
 */

import type { Protocol } from 'devtools-protocol';

// ---------------------------------------------------------------------------
// Role sets
// ---------------------------------------------------------------------------

const INTERACTIVE_ROLES = new Set([
	'button',
	'link',
	'textbox',
	'combobox',
	'searchbox',
	'checkbox',
	'radio',
	'slider',
	'spinbutton',
	'switch',
	'menuitem',
	'menuitemcheckbox',
	'menuitemradio',
	'option',
	'tab',
	'treeitem',
	'img',
	'video',
	'audio',
]);

const CONTEXT_ROLES = new Set([
	'navigation',
	'main',
	'contentinfo',
	'banner',
	'form',
	'section',
	'region',
	'list',
	'listitem',
	'table',
	'rowgroup',
	'row',
	'cell',
]);

const SKIP_WRAPPER_ROLES = new Set(['generic', 'group', 'none', 'presentation']);
const LABEL_ROLES = new Set(['labeltext']);

const TEST_ID_ATTRS = [
	'data-testid',
	'data-test-id',
	'data-test',
	'data-test-label',
	'data-cy',
	'data-pw',
	'data-qa',
	'data-e2e',
	'data-automation-id',
];

const ROLE_ABBREVIATIONS: Record<string, string> = {
	button: 'btn',
	link: 'lnk',
	textbox: 'txt',
	combobox: 'cmb',
	checkbox: 'chk',
	radio: 'rdo',
	select: 'sel',
	listbox: 'sel',
	heading: 'hdg',
	img: 'img',
	tab: 'tab',
	menuitem: 'mnu',
	menuitemcheckbox: 'mnu',
	menuitemradio: 'mnu',
	switch: 'swt',
	slider: 'sld',
	searchbox: 'srch',
	spinbutton: 'spn',
	option: 'opt',
	treeitem: 'tri',
};

function abbreviateRole(role: string): string {
	return ROLE_ABBREVIATIONS[role] ?? role.slice(0, 3);
}

function deriveBaseRef(
	role: string,
	name: string,
	stableId: string | undefined,
	nextFallback: () => number,
): string {
	if (stableId) return stableId;
	if (name) return `${abbreviateRole(role)}-${slugifyName(name)}`;
	return `${abbreviateRole(role)}-${nextFallback()}`;
}

const MAX_SLUG_LENGTH = 20;

function slugifyName(name: string): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	if (slug.length <= MAX_SLUG_LENGTH) return slug;
	const truncated = slug.slice(0, MAX_SLUG_LENGTH);
	const lastDash = truncated.lastIndexOf('-');
	return lastDash > 0 ? truncated.slice(0, lastDash) : truncated;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SnapshotInput {
	axNodes: Protocol.Accessibility.AXNode[];
	/**
	 * Called lazily during tree traversal for nodes that need DOM attributes:
	 * - interactive nodes: to build stable locators + refs
	 * - generic/group nodes: to detect contenteditable → promote to textbox
	 * Returns raw interleaved [name, value, ...] pairs (DOM.getAttributes format).
	 * In tests: provide a simple mock returning a pre-set array.
	 */
	fetchAttributes: (backendNodeId: number) => Promise<string[]>;
	/**
	 * 'interactive' (default): compact snapshot with refs on interactive elements and
	 * semantic containers. 'full': all page content including headings and text.
	 */
	type?: 'interactive' | 'full';
	/** Max nesting depth for structural elements. Interactive elements always shown. Default: 6 */
	maxDepth?: number;
	/** AX nodeId of the subtree root to scope the snapshot to */
	scopeNodeId?: string;
}

export interface TreeNode {
	role: string;
	name: string;
	/** Stable ref string — set on interactive nodes and semantic containers */
	ref?: string;
	backendNodeId?: number;
	/** Extra indent offset (for ignored-node children) */
	indentOffset?: number;
	children: TreeNode[];
}

export interface SnapshotOutput {
	/** Structured tree — used for diff and on-demand rendering; cached per tab */
	nodes: TreeNode[];
	/** ref → CSS selector, cached per tab — never sent over WebSocket in bulk */
	refs: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Extends TreeNode with the `ignored` flag from the raw AX tree. Internal only. */
interface RawNode extends TreeNode {
	ignored?: boolean;
	children: RawNode[];
}

type FilterMode = 'interactive' | 'full';

// ---------------------------------------------------------------------------
// RefRegistry — encapsulates ref generation state
// ---------------------------------------------------------------------------

class RefRegistry {
	private readonly refCounts = new Map<string, number>();
	private fallbackCounter = 0;
	private readonly _refs = new Map<string, string>();

	register({
		role,
		name,
		locator,
		stableId,
	}: {
		role: string;
		name: string;
		locator: string;
		stableId?: string;
	}): string {
		const baseRef = deriveBaseRef(role, name, stableId, () => ++this.fallbackCounter);

		const count = this.refCounts.get(baseRef) ?? 0;
		this.refCounts.set(baseRef, count + 1);
		const ref = count === 0 ? baseRef : `${baseRef}-${count + 1}`;

		this._refs.set(ref, locator);
		return ref;
	}

	getRefs(): Map<string, string> {
		return this._refs;
	}
}

// ---------------------------------------------------------------------------
// buildSnapshot
// ---------------------------------------------------------------------------

export async function buildSnapshot(input: SnapshotInput): Promise<SnapshotOutput> {
	const { axNodes, fetchAttributes, type = 'interactive', maxDepth = 6, scopeNodeId } = input;

	// Index AX nodes by nodeId
	const axById = new Map<string, Protocol.Accessibility.AXNode>(
		axNodes.map((node) => [node.nodeId, node]),
	);

	// Find root: use scopeNodeId if given, otherwise find rootwebarea/webarea
	const rootId = scopeNodeId ?? findRootNodeId(axNodes);
	if (!rootId) {
		return { nodes: [], refs: new Map() };
	}

	// Build raw tree (pure, AX data only)
	const rawRoot = buildRawTree(rootId, axById);
	if (!rawRoot) {
		return { nodes: [], refs: new Map() };
	}

	// If root is rootwebarea/webarea, process children directly
	const rawRoots =
		rawRoot.role === 'rootwebarea' || rawRoot.role === 'webarea' ? rawRoot.children : [rawRoot];

	const registry = new RefRegistry();

	const filteredResults = await Promise.all(
		rawRoots.map(
			async (root) =>
				await filterNode({
					node: root,
					ancestorNames: [],
					labelContext: false,
					fetchAttributes,
					registry,
					maxDepth,
					currentDepth: 0,
					mode: type,
				}),
		),
	);
	const nodes = filteredResults.flatMap((r) => r.nodes);

	// Apply nth deduplication to locators in refs map
	const refs = registry.getRefs();
	applyNthDedup(refs);

	return { nodes, refs };
}

// ---------------------------------------------------------------------------
// renderSnapshot — called on demand (only for diffType: 'full')
// ---------------------------------------------------------------------------

export function renderSnapshot(nodes: TreeNode[], indent = 0): string {
	return nodes
		.map((node) => {
			const nodeIndent = indent + (node.indentOffset ?? 0);
			const prefix = '  '.repeat(nodeIndent);
			let line: string;
			if (node.role === 'text') {
				line = `${prefix}- text: "${escapeAttr(node.name)}"`;
			} else {
				const namePart = node.name ? ` "${escapeAttr(node.name)}"` : '';
				const refPart = node.ref ? ` [ref=${node.ref}]` : '';
				line = `${prefix}- ${node.role}${namePart}${refPart}`;
			}
			const childrenText = renderSnapshot(node.children, nodeIndent + 1);
			if (node.children.length > 0) {
				line += ':';
				return `${line}\n${childrenText}`;
			}
			return line;
		})
		.join('\n');
}

// ---------------------------------------------------------------------------
// computeSnapshotDiff
// ---------------------------------------------------------------------------

export interface DiffResult {
	diffType: 'no-change' | 'diff' | 'full';
	content: string;
}

export function computeSnapshotDiff(
	previous: TreeNode[],
	next: TreeNode[],
	threshold = 0.5,
): DiffResult {
	if (previous.length === 0) {
		return { diffType: 'full', content: renderSnapshot(next) };
	}

	const prevFlat = flattenTree(previous);
	const nextFlat = flattenTree(next);

	// Build lookup maps for matching
	const prevByRef = new Map<string, FlatNode>();
	const prevByRoleName = new Map<string, FlatNode>();
	for (const node of prevFlat) {
		if (node.ref) prevByRef.set(node.ref, node);
		prevByRoleName.set(nodeKey(node), node);
	}

	const changes: Array<{ type: '+' | '-' | '~'; node: FlatNode; prev?: FlatNode }> = [];

	// Find added/changed nodes in next
	const matchedPrevKeys = new Set<string>();
	for (const node of nextFlat) {
		const prev = node.ref ? prevByRef.get(node.ref) : prevByRoleName.get(nodeKey(node));
		if (!prev) {
			changes.push({ type: '+', node });
		} else {
			matchedPrevKeys.add(nodeKey(node));
			// Check if name changed (ref matched but name differs — ref was stable ID, name label changed)
			if (prev.name !== node.name) {
				changes.push({ type: '~', node, prev });
			}
		}
	}

	// Find removed nodes
	for (const node of prevFlat) {
		if (!matchedPrevKeys.has(nodeKey(node))) {
			changes.push({ type: '-', node });
		}
	}

	if (changes.length === 0) {
		return { diffType: 'no-change', content: '' };
	}

	// Only count structural changes (+/-) against the threshold — modifications (~) are always compact
	const structuralChanges = changes.filter((c) => c.type !== '~').length;
	const totalNodes = Math.max(prevFlat.length, nextFlat.length, 1);
	if (structuralChanges / totalNodes > threshold) {
		return { diffType: 'full', content: renderSnapshot(next) };
	}

	// Build breadcrumb diff lines
	const lines = changes.map(({ type, node, prev }) => {
		const breadcrumb = node.breadcrumb.length > 0 ? `${node.breadcrumb.join(' > ')} > ` : '';
		const nameLabel = node.name ? ` "${node.name}"` : '';
		const prevLabel = prev && prev.name !== node.name ? ` (was "${prev.name}")` : '';
		return `${breadcrumb}${type} ${node.role}${nameLabel}${prevLabel}`;
	});

	return { diffType: 'diff', content: lines.join('\n') };
}

// ---------------------------------------------------------------------------
// Internal — raw tree building (pure, AX data only)
// ---------------------------------------------------------------------------

function findRootNodeId(axNodes: Protocol.Accessibility.AXNode[]): string | undefined {
	const rootWebArea = axNodes.find((n) => getRole(n) === 'rootwebarea');
	if (rootWebArea) return rootWebArea.nodeId;
	const webArea = axNodes.find((n) => getRole(n) === 'webarea');
	if (webArea) return webArea.nodeId;
	return axNodes.find((n) => !n.parentId)?.nodeId;
}

function buildRawTree(
	nodeId: string,
	axById: Map<string, Protocol.Accessibility.AXNode>,
): RawNode | null {
	const node = axById.get(nodeId);
	if (!node) return null;

	const children = (node.childIds ?? [])
		.map((childId) => buildRawTree(childId, axById))
		.filter((n): n is RawNode => n !== null);

	return {
		role: getRole(node),
		name: getAxString(node.name),
		backendNodeId: node.backendDOMNodeId,
		ignored: node.ignored,
		children,
	};
}

// ---------------------------------------------------------------------------
// Internal — filter tree (async, fetches attrs lazily)
// ---------------------------------------------------------------------------

interface FilterOptions {
	node: RawNode;
	ancestorNames: readonly string[];
	labelContext: boolean;
	fetchAttributes: (backendNodeId: number) => Promise<string[]>;
	registry: RefRegistry;
	maxDepth: number;
	currentDepth: number;
	mode: FilterMode;
}

interface FilterResult {
	nodes: TreeNode[];
	names: Set<string>;
}

async function filterNode(options: FilterOptions): Promise<FilterResult> {
	const { node, fetchAttributes, registry, mode } = options;
	const rawRole = node.role;
	const name = node.name;
	const hasName = name.length > 0;
	const nextAncestors = hasName ? [...options.ancestorNames, name] : options.ancestorNames;

	// Lazy attribute fetcher — fetches once per node, cached for reuse
	let cachedAttrs: Map<string, string> | undefined;
	const getAttrs = async (): Promise<Map<string, string>> => {
		cachedAttrs ??=
			typeof node.backendNodeId === 'number'
				? toAttrMap(await fetchAttributes(node.backendNodeId))
				: new Map();
		return cachedAttrs;
	};

	// Promote contenteditable generic/group nodes to textbox
	let role = rawRole;
	if (SKIP_WRAPPER_ROLES.has(rawRole) && typeof node.backendNodeId === 'number') {
		const attrMap = await getAttrs();
		if (isContentEditable(attrMap.get('contenteditable'))) {
			role = 'textbox';
		}
	}

	const isInteractiveRole = INTERACTIVE_ROLES.has(role);
	const isContextRole = CONTEXT_ROLES.has(role);

	// Depth limit: beyond maxDepth, skip structural nodes but surface interactive descendants
	if (!isInteractiveRole && options.currentDepth >= options.maxDepth) {
		const childResults = await Promise.all(
			node.children.map(
				async (child) =>
					await filterNode({
						...options,
						node: child,
						ancestorNames: nextAncestors,
						// Keep currentDepth unchanged so interactive children continue surfacing
						currentDepth: options.currentDepth,
					}),
			),
		);
		return {
			nodes: childResults.flatMap((r) => r.nodes),
			names: mergeNameSets(childResults),
		};
	}

	const isLabel = LABEL_ROLES.has(role);
	const nextLabelContext = mode === 'interactive' ? options.labelContext || isLabel : false;

	const childResults = await Promise.all(
		node.children.map(
			async (child) =>
				await filterNode({
					...options,
					node: child,
					ancestorNames: nextAncestors,
					labelContext: nextLabelContext,
					currentDepth: options.currentDepth + 1,
				}),
		),
	);
	const childNodes = childResults.flatMap((r) => r.nodes);
	const childNames = mergeNameSets(childResults);

	if (node.ignored) {
		return { nodes: shiftIndent(childNodes, 1), names: childNames };
	}

	// Text node handling differs by mode
	if (isTextRole(role)) {
		const skipInInteractive = mode === 'interactive' && !options.labelContext;
		if (!hasName || skipInInteractive) return { nodes: childNodes, names: childNames };
		if (options.ancestorNames.some((a) => a.includes(name) || name.includes(a))) {
			return { nodes: childNodes, names: childNames };
		}
		return { nodes: [{ role: 'text', name, children: [] }], names: buildNames(childNames, name) };
	}

	const hasChildren = childNodes.length > 0;
	const nameToUse =
		hasName && (childNames.has(name) || isSubstringOfAny(name, childNames)) ? '' : name;
	const isWrapper = SKIP_WRAPPER_ROLES.has(role);
	const isHeading = role === 'heading';

	// shouldInclude qualifying roles differ by mode
	const shouldInclude =
		isInteractiveRole ||
		(mode === 'interactive' ? isLabel : isHeading) ||
		isContextRole ||
		hasChildren;

	if (!shouldInclude) return { nodes: childNodes, names: childNames };

	if (mode === 'interactive') {
		// Strip wrapper when inclusion was only due to hasChildren (no semantic role)
		if (!isInteractiveRole && !isLabel && !isContextRole) {
			return hasChildren
				? { nodes: childNodes, names: childNames }
				: { nodes: [], names: childNames };
		}
	} else {
		// full: only evict empty wrappers
		if (isWrapper && !nameToUse && !hasChildren) return { nodes: [], names: childNames };
	}

	if (isWrapper && !nameToUse) {
		return hasChildren
			? { nodes: childNodes, names: childNames }
			: { nodes: [], names: childNames };
	}

	let ref: string | undefined;

	const effectiveName = nameToUse || name;
	if (isInteractiveRole) {
		const isPromoted = rawRole !== role; // role was promoted from a wrapper (e.g. generic → textbox)
		const attrs = isPromoted ? new Map<string, string>() : await getAttrs();
		const { locator, stableId } = buildLocator({ role, name: effectiveName, attrs, isPromoted });
		ref = registry.register({ role, name: effectiveName, locator, stableId });
	} else if (isContextRole && typeof node.backendNodeId === 'number') {
		// Semantic containers get refs so agents can scope targeted snapshots to them
		const attrs = await getAttrs();
		const { locator, stableId } = buildLocator({
			role,
			name: effectiveName,
			attrs,
			isPromoted: false,
		});
		ref = registry.register({ role, name: effectiveName, locator, stableId });
	}

	return {
		nodes: [
			{ role, name: nameToUse, ref, backendNodeId: node.backendNodeId, children: childNodes },
		],
		names: buildNames(childNames, nameToUse),
	};
}

// ---------------------------------------------------------------------------
// Internal — locator building
// ---------------------------------------------------------------------------

interface LocatorResult {
	locator: string;
	/** The raw attribute value when a stable DOM identifier was used (test-ID or id attr). */
	stableId?: string;
}

function buildLocator({
	role,
	name,
	attrs,
	isPromoted,
}: {
	role: string;
	name: string;
	attrs: Map<string, string>;
	isPromoted: boolean;
}): LocatorResult {
	// Test-ID attrs take highest priority
	for (const attr of TEST_ID_ATTRS) {
		const val = attrs.get(attr);
		if (val) return { locator: `[${attr}="${escapeAttr(val)}"]`, stableId: val };
	}
	// id attribute
	const id = attrs.get('id');
	if (id) return { locator: `[id="${escapeAttr(id)}"]`, stableId: id };
	// Promoted contenteditable (bare div)
	if (isPromoted) return { locator: '[contenteditable="true"]' };
	// Role + name
	const trimmedName = name.trim();
	if (trimmedName) return { locator: `role=${role}[name="${escapeAttr(trimmedName)}"]` };
	return { locator: `role=${role}` };
}

// ---------------------------------------------------------------------------
// Internal — nth deduplication
// ---------------------------------------------------------------------------

function applyNthDedup(refs: Map<string, string>): void {
	// Count locator occurrences across all refs
	const counts = new Map<string, number>();
	for (const locator of refs.values()) {
		counts.set(locator, (counts.get(locator) ?? 0) + 1);
	}

	// Collect nth= updates for duplicate locators, then apply after iteration
	const indices = new Map<string, number>();
	const updates: Array<[string, string]> = [];
	for (const [ref, locator] of refs) {
		if ((counts.get(locator) ?? 1) <= 1) continue;
		const idx = indices.get(locator) ?? 0;
		updates.push([ref, `${locator} >> nth=${idx}`]);
		indices.set(locator, idx + 1);
	}
	for (const [ref, locator] of updates) refs.set(ref, locator);
}

// ---------------------------------------------------------------------------
// Internal — diff helpers
// ---------------------------------------------------------------------------

interface FlatNode {
	role: string;
	name: string;
	ref?: string;
	breadcrumb: string[];
}

function flattenTree(
	nodes: TreeNode[],
	breadcrumb: string[] = [],
	into: FlatNode[] = [],
): FlatNode[] {
	for (const node of nodes) {
		into.push({ role: node.role, name: node.name, ref: node.ref, breadcrumb });
		if (node.children.length > 0) {
			const crumb = node.name ? [...breadcrumb, node.name] : breadcrumb;
			flattenTree(node.children, crumb, into);
		}
	}
	return into;
}

function nodeKey(node: FlatNode): string {
	return node.ref ?? `${node.role}::${node.name}`;
}

// ---------------------------------------------------------------------------
// Internal — small utilities
// ---------------------------------------------------------------------------

function getRole(node: Protocol.Accessibility.AXNode): string {
	const val = node.role?.value;
	return typeof val === 'string' ? val.toLowerCase() : '';
}

function getAxString(value?: Protocol.Accessibility.AXValue): string {
	if (!value) return '';
	const raw = value.value;
	if (typeof raw === 'string') return raw.trim();
	if (raw === null || raw === undefined) return '';
	return String(raw).trim();
}

function toAttrMap(attrs: string[]): Map<string, string> {
	const map = new Map<string, string>();
	for (let i = 0; i < attrs.length; i += 2) {
		const key = attrs[i];
		if (key) map.set(key, attrs[i + 1] ?? '');
	}
	return map;
}

function isContentEditable(val: string | undefined): boolean {
	return val === 'true' || val === '' || val === 'plaintext-only';
}

function isTextRole(role: string): boolean {
	return role === 'statictext' || role === 'text';
}

function isSubstringOfAny(str: string, set: Set<string>): boolean {
	for (const s of set) {
		if (s.includes(str) || str.includes(s)) return true;
	}
	return false;
}

function escapeAttr(val: string): string {
	return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function shiftIndent(nodes: TreeNode[], offset: number): TreeNode[] {
	return nodes.map((n) => ({ ...n, indentOffset: (n.indentOffset ?? 0) + offset }));
}

function mergeNameSets(results: FilterResult[]): Set<string> {
	const merged = new Set<string>();
	for (const r of results) for (const n of r.names) merged.add(n);
	return merged;
}

function buildNames(base: Set<string>, nameToAdd: string): Set<string> {
	if (!nameToAdd) return base;
	const result = new Set(base);
	result.add(nameToAdd);
	return result;
}
