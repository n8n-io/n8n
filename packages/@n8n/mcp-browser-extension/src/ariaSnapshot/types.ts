import type { Protocol } from 'devtools-protocol';

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

export interface AriaProps {
	checked?: boolean | 'mixed';
	disabled?: boolean;
	expanded?: boolean;
	level?: number;
	pressed?: boolean | 'mixed';
	selected?: boolean;
}

export interface TreeNode extends AriaProps {
	role: string;
	name: string;
	/** Stable ref string — set on interactive nodes and semantic containers */
	ref?: string;
	backendNodeId?: number;
	/** Extra indent offset (for ignored-node children) */
	indentOffset?: number;
	/** Current value for input elements (textbox, textarea, etc.) */
	value?: string;
	/** Extra properties rendered as /key: value children (url, placeholder) */
	props?: Record<string, string>;
	children: TreeNode[];
}

export interface SnapshotOutput {
	/** Structured tree — used for diff and on-demand rendering; cached per tab */
	nodes: TreeNode[];
	/** ref → CSS selector, cached per tab — never sent over WebSocket in bulk */
	refs: Map<string, string>;
}

export interface DiffResult {
	diffType: 'no-change' | 'diff' | 'full';
	content: string;
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

export function escapeAttr(val: string): string {
	return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
