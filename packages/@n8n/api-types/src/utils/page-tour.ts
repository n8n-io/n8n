import type { PageNodeReference } from '../schemas/page.schema';
import { parseResourcePath } from './page-resource-path';

/** The query parameter of a workflow address that starts the tour of a page. Its value is the page id. */
export const PAGE_TOUR_QUERY_PARAMETER = 'pageTour';

/** One stop of a tour: the nodes that a block of the page mentions, and the text of that block. */
export type PageTourStep = { nodeIds: string[]; text: string };

/** A visit of one workflow, in the order of the page text. */
export type PageTour = { workflowId: string; steps: PageTourStep[] };

/** Gives the name of a node of the toured workflow. `undefined` means that the name is not known. */
export type NodeNameLookup = (nodeId: string) => string | undefined;

type BlockScan = { blocks: string[]; isBlockOpen: boolean; isInCode: boolean };

type Block = { markdown: string; nodes: PageNodeReference[] };

const CODE_FENCE = /^\s*(?:```|~~~)/;
const HEADING = /^\s*#{1,6}\s/;
const BLOCK_START = /^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\|)/;
const BLOCK_MARKER = /^(?:#{1,6}\s+|(?:>\s*)+|(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)/;
const MARKDOWN_LINK = /!?\[((?:\\.|[^\]\\])*)\]\(\s*<?([^)\s>]+)>?[^)]*\)/g;
const STRONG_OR_CODE_MARK = /\*\*|__|~~|`/g;
const EMPHASIS = /(^|[^\w*])([*_])(\S(?:.*?\S)?)\2(?=[^\w*]|$)/g;
const ESCAPED_CHARACTER = /\\([\\`*_{}[\]()#+\-.!>~|])/g;

function withoutLastBlock(blocks: string[]): string[] {
	return blocks.slice(0, -1);
}

/** Adds a line of text. The line continues the open block or starts a new one. */
function addTextLine(scan: BlockScan, line: string): BlockScan {
	const continuesBlock = scan.isBlockOpen && !BLOCK_START.test(line);
	const blocks = continuesBlock
		? [...withoutLastBlock(scan.blocks), `${scan.blocks.at(-1)} ${line.trim()}`]
		: [...scan.blocks, line.trim()];
	return { blocks, isBlockOpen: !HEADING.test(line), isInCode: false };
}

function addLine(scan: BlockScan, line: string): BlockScan {
	if (CODE_FENCE.test(line)) {
		return { ...scan, isBlockOpen: false, isInCode: !scan.isInCode };
	}
	if (scan.isInCode || line.trim() === '') {
		return { ...scan, isBlockOpen: false };
	}
	return addTextLine(scan, line);
}

/**
 * Splits a markdown text into its blocks: one heading, one paragraph, one list item,
 * one quote line or one table row each. Code blocks are left out.
 */
export function splitIntoBlocks(markdown: string): string[] {
	return markdown
		.split(/\r?\n/)
		.reduce<BlockScan>(addLine, { blocks: [], isBlockOpen: false, isInCode: false }).blocks;
}

function toNodeReference(destination: string): PageNodeReference | undefined {
	const reference = parseResourcePath(destination);
	return reference?.resourceType === 'node' ? reference : undefined;
}

/** Lists the nodes that a block links to, in the order of the text. */
function nodesOf(block: string): PageNodeReference[] {
	return [...block.matchAll(MARKDOWN_LINK)]
		.map(([, , destination]) => toNodeReference(destination))
		.filter((reference) => reference !== undefined);
}

/** The text that replaces a link: its label, or the name of the node when the label is empty. */
function toLinkText(label: string, destination: string, toNodeName: NodeNameLookup): string {
	const node = label === '' ? toNodeReference(destination) : undefined;
	return node === undefined ? label : (toNodeName(node.resourceId) ?? '');
}

/** Turns a markdown block into the text that a reader sees, without markdown syntax. */
export function toPlainText(block: string, toNodeName: NodeNameLookup): string {
	return block
		.replace(BLOCK_MARKER, '')
		.replace(MARKDOWN_LINK, (_link, label: string, destination: string) =>
			toLinkText(label, destination, toNodeName),
		)
		.replace(STRONG_OR_CODE_MARK, '')
		.replace(EMPHASIS, '$1$3')
		.replace(ESCAPED_CHARACTER, '$1')
		.replace(/\s+/g, ' ')
		.trim();
}

function unique(ids: string[]): string[] {
	return [...new Set(ids)];
}

/**
 * Builds the tour that a page describes.
 * The tour visits `tourWorkflowId`. Without it, it visits the workflow of the first node that the text links to.
 * Each block of the text that links to a node of that workflow gives one step, in the order of the text.
 * A link with an empty label reads as the name that `toNodeName` gives.
 * Returns `undefined` when the text links to no node of the workflow.
 */
export function extractTourSteps(
	markdown: string,
	toNodeName: NodeNameLookup = () => undefined,
	tourWorkflowId?: string,
): PageTour | undefined {
	const blocks = splitIntoBlocks(markdown).map(
		(block): Block => ({ markdown: block, nodes: nodesOf(block) }),
	);
	const workflowId = tourWorkflowId ?? blocks.flatMap(({ nodes }) => nodes).at(0)?.workflowId;

	const steps = blocks
		.map((block) => ({
			nodeIds: unique(
				block.nodes.filter((node) => node.workflowId === workflowId).map((node) => node.resourceId),
			),
			text: toPlainText(block.markdown, toNodeName),
		}))
		.filter(({ nodeIds }) => nodeIds.length > 0);

	return workflowId === undefined || steps.length === 0 ? undefined : { workflowId, steps };
}
