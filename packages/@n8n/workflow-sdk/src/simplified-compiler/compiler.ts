/**
 * Workflow JS Compiler
 *
 * Compiles plain JavaScript with `http.*` and `ai.*` globals into n8n WorkflowJSON.
 * The compiler:
 * 1. Parses JS with acorn (AST only, no evaluation)
 * 2. Finds IO boundaries (http.get, http.post, ai.chat, etc.)
 * 3. Splits code at those boundaries
 * 4. Extracts comments for sticky notes and node names
 * 5. Generates n8n-compatible WorkflowJSON
 */

import * as acorn from 'acorn';
import { v4 as uuid } from 'uuid';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CompilerResult {
	workflow: WorkflowJSON;
	errors: CompilerError[];
}

export interface CompilerError {
	message: string;
	line?: number;
	column?: number;
}

export interface WorkflowJSON {
	id: string;
	name: string;
	nodes: WorkflowNode[];
	connections: Record<string, NodeConnections>;
}

export interface WorkflowNode {
	id: string;
	name: string;
	type: string;
	typeVersion: number;
	position: [number, number];
	parameters: Record<string, unknown>;
	credentials?: Record<string, { id: string; name: string }>;
}

interface NodeConnection {
	node: string;
	type: string;
	index: number;
}

interface NodeConnections {
	[connectionType: string]: NodeConnection[][];
}

// ─── IO Boundary Analysis ────────────────────────────────────────────────────

interface IOBoundary {
	type: 'http' | 'ai';
	method: string; // get, post, put, patch, delete, chat
	/** Byte offset of the full statement (including `const x = await ...`) */
	statementStart: number;
	statementEnd: number;
	/** Byte offset of the call expression itself */
	callStart: number;
	callEnd: number;
	/** Variable name the result is assigned to, if any */
	assignedVar: string | null;
	/** Extracted arguments from the call */
	args: ExtractedArgs;
}

interface ExtractedArgs {
	url?: string;
	body?: Record<string, unknown> | null;
	/** When the body is a single variable reference, store the expression */
	bodyExpression?: string;
	options?: Record<string, unknown>;
	// AI-specific
	model?: string;
	prompt?: string;
}

// ─── Comment Attachment ──────────────────────────────────────────────────────

interface CommentAttachment {
	text: string;
	nodeName: string; // first line, truncated
}

// ─── Segment ─────────────────────────────────────────────────────────────────

interface Segment {
	type: 'code' | 'io';
	sourceCode: string;
	ioBoundary?: IOBoundary;
	comment?: CommentAttachment;
}

// ─── Metadata ────────────────────────────────────────────────────────────────

interface WorkflowMetadata {
	triggerType: string;
	triggerParams: Record<string, unknown>;
	workflowName: string;
}

// ─── Main Compiler ──────────────────────────────────────────────────────────

export function compileWorkflowJS(source: string): CompilerResult {
	const errors: CompilerError[] = [];

	// Step 1: Parse metadata from comments
	const metadata = parseMetadata(source);

	// Step 2: Parse with acorn
	let ast: acorn.Node;
	const comments: acorn.Comment[] = [];
	try {
		ast = acorn.parse(source, {
			ecmaVersion: 'latest',
			sourceType: 'module',
			locations: true,
			onComment: comments,
		});
	} catch (e) {
		const err = e as { message: string; loc?: { line: number; column: number } };
		errors.push({
			message: err.message,
			line: err.loc?.line,
			column: err.loc?.column,
		});
		return {
			workflow: { id: 'compiled', name: metadata.workflowName, nodes: [], connections: {} },
			errors,
		};
	}

	// Step 2.5: Find trigger.*() call (overrides // @trigger comment)
	const triggerStmt = findTriggerStatement(ast);
	if (triggerStmt) {
		metadata.triggerType = triggerStmt.triggerType;
		if (triggerStmt.triggerType === 'schedule') {
			metadata.triggerParams = mapScheduleOptions(triggerStmt.options);
		} else if (triggerStmt.triggerType === 'webhook') {
			metadata.triggerParams = mapWebhookOptions(triggerStmt.options);
		}
	}

	// Step 3: Find IO boundaries
	const boundaries = findIOBoundaries(ast, source);

	// Step 4: Split into segments (skip trigger statement)
	const triggerRange = triggerStmt
		? { start: triggerStmt.statementStart, end: triggerStmt.statementEnd }
		: undefined;
	const segments = splitIntoSegments(source, boundaries, ast, triggerRange);

	// Step 5: Attach comments to segments
	attachComments(segments, comments, source);

	// Step 6: Generate nodes
	const { nodes, connections } = generateWorkflow(segments, metadata);

	return {
		workflow: { id: 'compiled', name: metadata.workflowName, nodes, connections },
		errors,
	};
}

// ─── Metadata Parsing ────────────────────────────────────────────────────────

function parseMetadata(source: string): WorkflowMetadata {
	const metadata: WorkflowMetadata = {
		triggerType: 'manual',
		triggerParams: {},
		workflowName: 'Compiled Workflow',
	};

	// Legacy: // @trigger <type> still works as a fallback
	const triggerMatch = source.match(/\/\/\s*@trigger\s+(\w+)/);
	if (triggerMatch) {
		metadata.triggerType = triggerMatch[1];
	}

	const workflowMatch = source.match(/\/\/\s*@workflow\s+"([^"]+)"/);
	if (workflowMatch) {
		metadata.workflowName = workflowMatch[1];
	}

	return metadata;
}

// ─── Trigger Statement Detection ────────────────────────────────────────────

interface TriggerStatement {
	triggerType: string;
	options: Record<string, unknown>;
	statementStart: number;
	statementEnd: number;
}

/**
 * Finds a `trigger.*()` call in the top-level AST body.
 * Supports both `trigger.manual()` and `await trigger.manual()`.
 */
function findTriggerStatement(ast: acorn.Node): TriggerStatement | null {
	const program = ast as AcornNode;
	if (program.type !== 'Program' || !program.body) return null;

	for (const stmt of program.body) {
		let callExpr: AcornNode | null = null;

		if (stmt.type === 'ExpressionStatement' && stmt.expression) {
			const expr = stmt.expression;
			if (expr.type === 'CallExpression') {
				callExpr = expr;
			} else if (expr.type === 'AwaitExpression' && expr.argument?.type === 'CallExpression') {
				callExpr = expr.argument;
			}
		}

		if (!callExpr?.callee) continue;
		const callee = callExpr.callee;

		if (
			callee.type === 'MemberExpression' &&
			callee.object?.type === 'Identifier' &&
			callee.object.name === 'trigger' &&
			callee.property?.type === 'Identifier'
		) {
			const triggerType = callee.property.name ?? 'manual';
			const options = callExpr.arguments?.[0]
				? (extractObjectValue(callExpr.arguments[0]) ?? {})
				: {};

			return {
				triggerType,
				options,
				statementStart: stmt.start,
				statementEnd: stmt.end,
			};
		}
	}

	return null;
}

/**
 * Maps user-friendly schedule options to n8n ScheduleTrigger parameters.
 *
 * Supported formats:
 *   trigger.schedule({ every: '30s' })   → every 30 seconds
 *   trigger.schedule({ every: '5m' })    → every 5 minutes
 *   trigger.schedule({ every: '2h' })    → every 2 hours
 *   trigger.schedule({ every: '1d' })    → every day
 *   trigger.schedule({ every: '1w' })    → every week
 *   trigger.schedule({ cron: '0 9 * * *' }) → cron expression
 */
function mapScheduleOptions(options: Record<string, unknown>): Record<string, unknown> {
	if (typeof options.every === 'string') {
		const match = (options.every as string).match(/^(\d+)\s*(s|m|h|d|w)$/);
		if (match) {
			const value = parseInt(match[1], 10);
			const unitMap: Record<string, Record<string, unknown>> = {
				s: { field: 'seconds', secondsInterval: value },
				m: { field: 'minutes', minutesInterval: value },
				h: { field: 'hours', hoursInterval: value },
				d: { field: 'days', daysInterval: value },
				w: { field: 'weeks', weeksInterval: value },
			};
			return { rule: { interval: [unitMap[match[2]]] } };
		}
	}

	if (typeof options.cron === 'string') {
		return {
			rule: {
				interval: [{ field: 'cronExpression', expression: options.cron }],
			},
		};
	}

	// Default: daily
	return { rule: { interval: [{ field: 'days', daysInterval: 1 }] } };
}

/**
 * Maps user-friendly webhook options to n8n Webhook node parameters.
 *
 * Supported options:
 *   trigger.webhook({ method: 'POST', path: '/incoming' })
 *   trigger.webhook({ method: 'GET', path: '/status', response: 'lastNode' })
 */
function mapWebhookOptions(options: Record<string, unknown>): Record<string, unknown> {
	const params: Record<string, unknown> = {};
	if (options.method) params.httpMethod = (options.method as string).toUpperCase();
	if (options.path) params.path = options.path;
	if (options.response) params.responseMode = options.response;
	return params;
}

// ─── IO Boundary Detection ──────────────────────────────────────────────────

type AcornNode = acorn.Node & {
	type: string;
	body?: AcornNode[];
	declarations?: AcornNode[];
	expression?: AcornNode;
	argument?: AcornNode;
	callee?: AcornNode;
	object?: AcornNode;
	property?: AcornNode & { name?: string };
	arguments?: AcornNode[];
	init?: AcornNode;
	id?: AcornNode & { name?: string };
	name?: string;
	value?: unknown;
	elements?: AcornNode[];
	properties?: AcornNode[];
	key?: AcornNode & { name?: string; value?: string };
	quasis?: AcornNode[];
	expressions?: AcornNode[];
	raw?: string;
};

function findIOBoundaries(ast: acorn.Node, source: string): IOBoundary[] {
	const boundaries: IOBoundary[] = [];
	const program = ast as AcornNode;

	if (program.type !== 'Program' || !program.body) return boundaries;

	for (const stmt of program.body) {
		findIOInStatement(stmt, stmt, source, boundaries);
	}

	return boundaries;
}

function findIOInStatement(
	node: AcornNode,
	topStatement: AcornNode,
	source: string,
	boundaries: IOBoundary[],
): void {
	// Variable declaration: const x = await http.get(...)
	if (node.type === 'VariableDeclaration' && node.declarations) {
		for (const decl of node.declarations) {
			if (decl.init?.type === 'AwaitExpression' && decl.init.argument) {
				const call = decl.init.argument;
				const io = matchIOCall(call, source);
				if (io) {
					io.assignedVar = decl.id?.name ?? null;
					io.statementStart = topStatement.start;
					io.statementEnd = topStatement.end;
					boundaries.push(io);
				}
			}
		}
		return;
	}

	// Expression statement: await http.post(...)
	if (node.type === 'ExpressionStatement' && node.expression) {
		const expr = node.expression;
		if (expr.type === 'AwaitExpression' && expr.argument) {
			const io = matchIOCall(expr.argument, source);
			if (io) {
				io.statementStart = topStatement.start;
				io.statementEnd = topStatement.end;
				boundaries.push(io);
			}
		}
	}
}

function matchIOCall(callNode: AcornNode, source: string): IOBoundary | null {
	if (callNode.type !== 'CallExpression' || !callNode.callee) return null;
	const callee = callNode.callee;

	// Match http.get, http.post, etc.
	if (
		callee.type === 'MemberExpression' &&
		callee.object?.type === 'Identifier' &&
		callee.property?.type === 'Identifier'
	) {
		const obj = callee.object.name;
		const method = callee.property.name;

		if (obj === 'http' && ['get', 'post', 'put', 'patch', 'delete'].includes(method ?? '')) {
			return {
				type: 'http',
				method: method ?? '',
				statementStart: 0,
				statementEnd: 0,
				callStart: callNode.start,
				callEnd: callNode.end,
				assignedVar: null,
				args: extractHttpArgs(callNode, method ?? '', source),
			};
		}

		if (obj === 'ai' && method === 'chat') {
			return {
				type: 'ai',
				method: 'chat',
				statementStart: 0,
				statementEnd: 0,
				callStart: callNode.start,
				callEnd: callNode.end,
				assignedVar: null,
				args: extractAiArgs(callNode, source),
			};
		}
	}

	return null;
}

// ─── Argument Extraction ─────────────────────────────────────────────────────

function extractHttpArgs(callNode: AcornNode, method: string, _source: string): ExtractedArgs {
	const args = callNode.arguments ?? [];
	const result: ExtractedArgs = {};

	// First arg is always URL
	if (args[0]) {
		result.url = extractStringValue(args[0]);
	}

	if (method === 'get' || method === 'delete') {
		// get/delete: (url, options?)
		if (args[1]) {
			result.options = extractObjectValue(args[1]);
		}
	} else {
		// post/put/patch: (url, body?, options?)
		if (args[1]) {
			result.body = extractObjectValue(args[1]);
			// If body is a plain variable reference, use a $json expression
			if (!result.body && args[1].type === 'Identifier') {
				result.bodyExpression = `={{ $json.${args[1].name} }}`;
			}
		}
		if (args[2]) {
			result.options = extractObjectValue(args[2]);
		}
	}

	return result;
}

function extractAiArgs(callNode: AcornNode, _source: string): ExtractedArgs {
	const args = callNode.arguments ?? [];
	const result: ExtractedArgs = {};

	if (args[0]) {
		result.model = extractStringValue(args[0]);
	}
	if (args[1]) {
		result.prompt = extractStringValue(args[1]);
	}
	if (args[2]) {
		result.options = extractObjectValue(args[2]);
	}

	return result;
}

function extractStringValue(node: AcornNode): string | undefined {
	if (node.type === 'Literal' && typeof node.value === 'string') {
		return node.value;
	}
	if (node.type === 'Identifier') {
		return `={{ $json.${node.name} }}`;
	}
	if (node.type === 'TemplateLiteral') {
		const quasis = node.quasis ?? [];
		const expressions = node.expressions ?? [];
		const parts: string[] = [];
		for (let i = 0; i < quasis.length; i++) {
			parts.push((quasis[i].value as unknown as string) ?? quasis[i].raw ?? '');
			if (i < expressions.length) {
				parts.push(`{{ $json.${expressionToRef(expressions[i])} }}`);
			}
		}
		return `=${parts.join('')}`;
	}
	if (node.type === 'CallExpression') {
		// Handle JSON.stringify(x), x.toString(), x.join(', '), etc.
		const ref = expressionToRef(node);
		return `={{ $json.${ref} }}`;
	}
	if (node.type === 'MemberExpression') {
		const ref = expressionToRef(node);
		return `={{ $json.${ref} }}`;
	}
	if (
		node.type === 'BinaryExpression' &&
		(node as unknown as { operator: string }).operator === '+'
	) {
		const left = (node as unknown as { left: AcornNode }).left;
		const right = (node as unknown as { right: AcornNode }).right;
		const leftStr = extractStringValue(left);
		const rightStr = extractStringValue(right);
		if (leftStr !== undefined && rightStr !== undefined) {
			// Merge into a single n8n expression
			const stripLeft = leftStr.startsWith('=') ? leftStr.slice(1) : leftStr;
			const stripRight = rightStr.startsWith('=') ? rightStr.slice(1) : rightStr;
			return `=${stripLeft}${stripRight}`;
		}
	}
	// Unrecognized expression
	return undefined;
}

/** Converts an AST node to a $json reference string */
function expressionToRef(node: AcornNode): string {
	if (node.type === 'Identifier') return node.name ?? 'data';
	if (
		node.type === 'MemberExpression' &&
		node.object?.type === 'Identifier' &&
		node.property?.type === 'Identifier'
	) {
		return `${node.object.name}.${node.property.name}`;
	}
	// Handle method calls: topPosts.join(', ') → topPosts
	// and static calls: JSON.stringify(data) → data (use first arg)
	if (node.type === 'CallExpression' && node.callee) {
		const callee = node.callee;
		// Method call on a variable: x.method(...) → use x
		if (
			callee.type === 'MemberExpression' &&
			callee.object?.type === 'Identifier' &&
			callee.property?.type === 'Identifier'
		) {
			// Static utility calls like JSON.stringify(data) → use first arg
			const objName = callee.object.name ?? '';
			if (objName === 'JSON' || objName === 'Object' || objName === 'Array') {
				const callArgs = node.arguments ?? [];
				if (callArgs[0]) return expressionToRef(callArgs[0]);
			}
			return callee.object.name ?? 'data';
		}
		// Fallback: use first argument
		const callArgs = node.arguments ?? [];
		if (callArgs[0]) {
			return expressionToRef(callArgs[0]);
		}
	}
	return 'data';
}

function extractObjectValue(node: AcornNode): Record<string, unknown> | undefined {
	if (node.type === 'ObjectExpression' && node.properties) {
		const obj: Record<string, unknown> = {};
		for (const prop of node.properties) {
			if (prop.type === 'Property' && prop.key) {
				const key = prop.key.name ?? (prop.key.value as string);
				const propValueNode = (prop as unknown as { value: AcornNode }).value;
				if (key && propValueNode) {
					if (propValueNode.type === 'Literal') {
						obj[key] = propValueNode.value;
					} else if (propValueNode.type === 'Identifier') {
						obj[key] = `={{ $json.${propValueNode.name} }}`;
					} else if (propValueNode.type === 'ObjectExpression') {
						obj[key] = extractObjectValue(propValueNode);
					} else {
						// Try to extract as a string expression
						const strVal = extractStringValue(propValueNode);
						obj[key] = strVal ?? '={{$json}}';
					}
				}
			}
		}
		return obj;
	}
	if (node.type === 'Identifier') {
		return undefined;
	}
	return undefined;
}

// ─── Code Splitting ──────────────────────────────────────────────────────────

function splitIntoSegments(
	source: string,
	boundaries: IOBoundary[],
	ast: acorn.Node,
	triggerRange?: { start: number; end: number },
): Segment[] {
	if (boundaries.length === 0) {
		// No IO calls — split at comment boundaries
		const codeBody = stripMetadataComments(source);
		if (codeBody.trim()) {
			return splitCodeAtComments(codeBody.trim()).map((chunk) => ({
				type: 'code' as const,
				sourceCode: chunk,
			}));
		}
		return [];
	}

	const segments: Segment[] = [];

	// Find the first non-trigger statement to set the cursor start
	const program = ast as AcornNode;
	let cursor0 = 0;
	if (program.body) {
		for (const stmt of program.body) {
			// Skip trigger statement
			if (triggerRange && stmt.start >= triggerRange.start && stmt.end <= triggerRange.end) {
				continue;
			}
			cursor0 = stmt.start;
			break;
		}
	}

	let cursor = cursor0;

	for (const boundary of boundaries) {
		// Code before this IO boundary — split at comment boundaries
		const rawBefore = stripMetadataComments(source.slice(cursor, boundary.statementStart));
		const codeOnly = stripCommentsAndMetadata(rawBefore).trim();
		if (codeOnly) {
			for (const chunk of splitCodeAtComments(rawBefore.trim())) {
				segments.push({ type: 'code', sourceCode: chunk });
			}
		}

		// The IO boundary itself
		segments.push({
			type: 'io',
			sourceCode: source.slice(boundary.statementStart, boundary.statementEnd),
			ioBoundary: boundary,
		});

		cursor = boundary.statementEnd;
	}

	// Code after the last IO boundary — split at comment boundaries
	const rawAfter = stripMetadataComments(source.slice(cursor));
	const codeAfterOnly = stripCommentsAndMetadata(rawAfter).trim();
	if (codeAfterOnly) {
		for (const chunk of splitCodeAtComments(rawAfter.trim())) {
			segments.push({ type: 'code', sourceCode: chunk });
		}
	}

	return segments;
}

function stripMetadataComments(source: string): string {
	return source
		.replace(/\/\/\s*@trigger\s+.*/g, '')
		.replace(/\/\/\s*@workflow\s+.*/g, '')
		.replace(/(?:await\s+)?trigger\.\w+\([^)]*\);?\s*\n?/g, '')
		.trim();
}

function stripCommentsAndMetadata(source: string): string {
	// Strip metadata comments
	let result = stripMetadataComments(source);
	// Strip single-line comments (// ...)
	result = result.replace(/\/\/[^\n]*/g, '');
	// Strip multi-line comments (/* ... */)
	result = result.replace(/\/\*[\s\S]*?\*\//g, '');
	return result.trim();
}

/**
 * Splits a code block into sub-segments at comment boundaries.
 * A new sub-segment starts when a standalone `//` comment line
 * is preceded by a blank line (or is at the very start of the block).
 *
 * This produces one Code node per logical section:
 *
 *   // Filter active users         ← Code node 1
 *   const active = data.filter(…);
 *                                   ← blank line
 *   // Build summary                ← Code node 2
 *   const summary = { … };
 */
function splitCodeAtComments(sourceCode: string): string[] {
	const lines = sourceCode.split('\n');
	const chunks: string[] = [];
	let current: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		const isComment = trimmed.startsWith('//');
		const prevBlankOrStart = i === 0 || lines[i - 1].trim() === '';

		if (isComment && prevBlankOrStart) {
			// Flush accumulated lines if they contain actual code
			const accumulated = current.join('\n').trim();
			if (accumulated && stripCommentsAndMetadata(accumulated).length > 0) {
				chunks.push(accumulated);
			}
			current = [];
		}

		current.push(lines[i]);
	}

	// Flush remaining
	const remaining = current.join('\n').trim();
	if (remaining && stripCommentsAndMetadata(remaining).length > 0) {
		chunks.push(remaining);
	}

	return chunks.length > 0 ? chunks : [sourceCode];
}

// ─── Comment Attachment ──────────────────────────────────────────────────────

function attachComments(segments: Segment[], comments: acorn.Comment[], source: string): void {
	// Filter out metadata comments
	const userComments = comments.filter((c) => {
		const text = c.value.trim();
		return !text.startsWith('@trigger') && !text.startsWith('@workflow');
	});

	if (userComments.length === 0 || segments.length === 0) return;

	// Build a position map for each segment
	const segmentRanges: Array<{ segment: Segment; start: number; end: number }> = [];
	for (const segment of segments) {
		if (segment.type === 'io') {
			segmentRanges.push({
				segment,
				start: segment.ioBoundary!.statementStart,
				end: segment.ioBoundary!.statementEnd,
			});
		} else {
			// For code segments, find their position in source
			const idx = source.indexOf(segment.sourceCode);
			if (idx >= 0) {
				segmentRanges.push({
					segment,
					start: idx,
					end: idx + segment.sourceCode.length,
				});
			}
		}
	}

	// Group consecutive comments together
	const commentGroups = groupConsecutiveComments(userComments);

	// For each comment group, find the segment it belongs to
	for (const group of commentGroups) {
		const commentStart = group[0].start;
		const commentEnd = group[group.length - 1].end;
		const text = group
			.map((c) => c.value.trim())
			.filter((t) => t.length > 0)
			.join('\n');

		if (!text) continue;

		// First: check if comment falls within a code segment's range
		let bestRange = segmentRanges.find(
			(r) => r.segment.type === 'code' && commentStart >= r.start && commentEnd <= r.end,
		);

		// Second: if not inside a code segment, find the next segment after this comment
		if (!bestRange) {
			bestRange = segmentRanges.find((r) => r.start >= commentEnd);
		}

		if (bestRange && !bestRange.segment.comment) {
			const firstLine = text.split('\n')[0];
			bestRange.segment.comment = {
				text,
				nodeName: firstLine.length > 40 ? firstLine.slice(0, 37) + '...' : firstLine,
			};
		}
	}
}

function groupConsecutiveComments(comments: acorn.Comment[]): acorn.Comment[][] {
	if (comments.length === 0) return [];

	const groups: acorn.Comment[][] = [];
	let currentGroup: acorn.Comment[] = [comments[0]];

	for (let i = 1; i < comments.length; i++) {
		const prev = comments[i - 1];
		const curr = comments[i];

		// Comments are consecutive if they're on adjacent lines
		const prevLine = (prev as unknown as { loc: { end: { line: number } } }).loc?.end?.line ?? 0;
		const currLine =
			(curr as unknown as { loc: { start: { line: number } } }).loc?.start?.line ?? 0;

		if (currLine - prevLine <= 1) {
			currentGroup.push(curr);
		} else {
			groups.push(currentGroup);
			currentGroup = [curr];
		}
	}

	groups.push(currentGroup);
	return groups;
}

// ─── Node Generation ─────────────────────────────────────────────────────────

function generateId(): string {
	return uuid();
}

function generateWorkflow(
	segments: Segment[],
	metadata: WorkflowMetadata,
): { nodes: WorkflowNode[]; connections: Record<string, NodeConnections> } {
	const nodes: WorkflowNode[] = [];
	const connections: Record<string, NodeConnections> = {};

	// X position spacing
	const X_SPACING = 250;
	const Y_BASE = 300;
	const STICKY_Y_OFFSET = -160;
	let xPos = 0;

	// Generate trigger node
	const triggerNode = generateTriggerNode(metadata, xPos, Y_BASE);
	nodes.push(triggerNode);
	let prevNodeName = triggerNode.name;
	xPos += X_SPACING;

	// Track variables across boundaries
	const liveVars: Set<string> = new Set();

	for (const segment of segments) {
		let currentNode: WorkflowNode;

		if (segment.type === 'io' && segment.ioBoundary) {
			const boundary = segment.ioBoundary;

			if (boundary.type === 'http') {
				currentNode = generateHttpNode(boundary, segment.comment, xPos, Y_BASE);
			} else {
				const aiResult = generateAiNode(boundary, segment.comment, xPos, Y_BASE);
				currentNode = aiResult.agentNode;
				// Add model sub-node and connect it to the agent via ai_languageModel
				nodes.push(aiResult.modelNode);
				connections[aiResult.modelNode.name] = {
					ai_languageModel: [
						[{ node: aiResult.agentNode.name, type: 'ai_languageModel', index: 0 }],
					],
				};
			}

			if (boundary.assignedVar) {
				liveVars.add(boundary.assignedVar);
			}
		} else {
			// Code segment
			currentNode = generateCodeNode(segment.sourceCode, segment.comment, liveVars, xPos, Y_BASE);
		}

		nodes.push(currentNode);

		// Add sticky note if comment exists
		if (segment.comment) {
			const sticky = generateStickyNote(segment.comment, xPos, Y_BASE + STICKY_Y_OFFSET);
			nodes.push(sticky);
		}

		// Connect previous node to current
		if (!connections[prevNodeName]) {
			connections[prevNodeName] = {};
		}
		if (!connections[prevNodeName].main) {
			connections[prevNodeName].main = [[]];
		}
		connections[prevNodeName].main[0].push({
			node: currentNode.name,
			type: 'main',
			index: 0,
		});

		prevNodeName = currentNode.name;
		xPos += X_SPACING;
	}

	return { nodes, connections };
}

// ─── Trigger Generation ─────────────────────────────────────────────────────

function generateTriggerNode(metadata: WorkflowMetadata, x: number, y: number): WorkflowNode {
	const triggerMap: Record<string, { type: string; typeVersion: number }> = {
		manual: { type: 'n8n-nodes-base.manualTrigger', typeVersion: 1 },
		schedule: { type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2 },
		webhook: { type: 'n8n-nodes-base.webhook', typeVersion: 2 },
	};

	const trigger = triggerMap[metadata.triggerType] ?? triggerMap.manual;

	return {
		id: generateId(),
		name: 'Start',
		type: trigger.type,
		typeVersion: trigger.typeVersion,
		position: [x, y],
		parameters: { ...metadata.triggerParams },
	};
}

/**
 * Converts a body object to a jsonBody parameter value.
 *
 * If all values are static literals, returns plain JSON.
 * If any value is an n8n expression (={{ ... }}), builds an n8n expression
 * that constructs the object using $json references:
 *   { draft, social } → ={{ JSON.stringify({ draft: $json.draft, social: $json.social }) }}
 */
function bodyToJsonParam(body: Record<string, unknown>): string {
	const hasExpressions = Object.values(body).some(
		(v) => typeof v === 'string' && v.startsWith('={{'),
	);

	if (!hasExpressions) {
		return JSON.stringify(body);
	}

	// Build a JS object expression for n8n
	const props = Object.entries(body)
		.map(([key, value]) => {
			if (typeof value === 'string' && value.startsWith('={{ ') && value.endsWith(' }}')) {
				// Extract the expression: "={{ $json.draft }}" → "$json.draft"
				const expr = value.slice(4, -3);
				return `${key}: ${expr}`;
			}
			return `${key}: ${JSON.stringify(value)}`;
		})
		.join(', ');

	return `={{ JSON.stringify({ ${props} }) }}`;
}

// ─── HTTP Node Generation ───────────────────────────────────────────────────

function generateHttpNode(
	boundary: IOBoundary,
	comment: CommentAttachment | undefined,
	x: number,
	y: number,
): WorkflowNode {
	const method = boundary.method.toUpperCase();
	const url = boundary.args.url ?? '{{dynamic URL}}';

	// Generate a readable name
	let nodeName: string;
	if (comment) {
		nodeName = comment.nodeName;
	} else {
		try {
			const urlObj = new URL(url);
			nodeName = `${method} ${urlObj.hostname}${urlObj.pathname}`;
		} catch {
			nodeName = `${method} Request`;
		}
		if (nodeName.length > 40) nodeName = nodeName.slice(0, 37) + '...';
	}

	const parameters: Record<string, unknown> = {
		method,
		url,
		options: {},
	};

	// Handle body for POST/PUT/PATCH
	if (['POST', 'PUT', 'PATCH'].includes(method)) {
		if (boundary.args.bodyExpression) {
			// Body is a variable reference: use expression
			parameters.sendBody = true;
			parameters.contentType = 'json';
			parameters.specifyBody = 'json';
			parameters.jsonBody = boundary.args.bodyExpression;
		} else if (boundary.args.body) {
			parameters.sendBody = true;
			parameters.contentType = 'json';
			parameters.specifyBody = 'json';
			parameters.jsonBody = bodyToJsonParam(boundary.args.body);
		}
	}

	// Handle query params from options
	const options = boundary.args.options;
	if (options?.headers) {
		parameters.sendHeaders = true;
		parameters.headerParameters = {
			parameters: Object.entries(options.headers as Record<string, string>).map(
				([name, value]) => ({ name, value }),
			),
		};
	}
	if (options?.query) {
		parameters.sendQuery = true;
		parameters.queryParameters = {
			parameters: Object.entries(options.query as Record<string, string>).map(([name, value]) => ({
				name,
				value,
			})),
		};
	}

	const node: WorkflowNode = {
		id: generateId(),
		name: nodeName,
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.2,
		position: [x, y],
		parameters,
	};

	// Handle auth
	if (options?.auth) {
		node.parameters.authentication = 'predefinedCredentialType';
		node.credentials = {
			httpCustomAuth: { id: '', name: options.auth as string },
		};
	}

	return node;
}

// ─── AI Node Generation ─────────────────────────────────────────────────────

interface AiGenerationResult {
	agentNode: WorkflowNode;
	modelNode: WorkflowNode;
}

/**
 * Generates an AI Agent node and its required LLM Chat Model sub-node.
 *
 * Usage in Workflow JS:
 *   const result = await ai.chat('gpt-4o-mini', 'Summarize this data');
 *   const result = await ai.chat('claude-sonnet-4-5-20250929', 'Analyze this');
 */
function generateAiNode(
	boundary: IOBoundary,
	comment: CommentAttachment | undefined,
	x: number,
	y: number,
): AiGenerationResult {
	const model = boundary.args.model ?? 'gpt-4o-mini';
	const prompt = boundary.args.prompt ?? '';

	const nodeName = comment?.nodeName ?? `AI: ${prompt.slice(0, 30)}...`;
	const truncatedName = nodeName.length > 40 ? nodeName.slice(0, 37) + '...' : nodeName;

	const modelConfig = mapModelToNode(model);

	const agentNode: WorkflowNode = {
		id: generateId(),
		name: truncatedName,
		type: '@n8n/n8n-nodes-langchain.agent',
		typeVersion: 3.1,
		position: [x, y],
		parameters: {
			promptType: 'define',
			text: prompt || '={{$json.prompt}}',
			options: {},
		},
	};

	const modelNode: WorkflowNode = {
		id: generateId(),
		name: modelConfig.displayName,
		type: modelConfig.type,
		typeVersion: modelConfig.typeVersion,
		position: [x, y + 150],
		parameters: {
			model: { __rl: true, mode: 'id', value: model },
			options: {},
		},
	};

	return { agentNode, modelNode };
}

function mapModelToNode(model: string): {
	type: string;
	displayName: string;
	typeVersion: number;
} {
	if (model.includes('gpt') || model.includes('o1') || model.includes('o3')) {
		return {
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			displayName: 'OpenAI Chat Model',
			typeVersion: 1.2,
		};
	}
	if (model.includes('claude')) {
		return {
			type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
			displayName: 'Anthropic Chat Model',
			typeVersion: 1.2,
		};
	}
	if (model.includes('gemini')) {
		return {
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			displayName: 'Google Gemini Chat Model',
			typeVersion: 1,
		};
	}
	// Default to OpenAI
	return {
		type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		displayName: 'OpenAI Chat Model',
		typeVersion: 1.2,
	};
}

// ─── Code Node Generation ───────────────────────────────────────────────────

function generateCodeNode(
	sourceCode: string,
	comment: CommentAttachment | undefined,
	liveVars: Set<string>,
	x: number,
	y: number,
): WorkflowNode {
	const lines: string[] = [];

	// Input: get all items from previous node
	lines.push(`const items = $input.all();`);

	if (liveVars.size > 0) {
		const vars = Array.from(liveVars);
		lines.push(`const { ${vars.join(', ')} } = items[0].json;`);
	}

	// User's code (stripped of leading/trailing whitespace)
	lines.push(sourceCode.trim());

	// Find new variables declared in this code segment
	const declaredVars = findDeclaredVariables(sourceCode);

	// Assign new variables back to the item and return items
	for (const v of declaredVars) {
		lines.push(`items[0].json.${v} = ${v};`);
	}
	lines.push(`return items;`);

	// Update live vars with newly declared ones
	for (const v of declaredVars) {
		liveVars.add(v);
	}

	const jsCode = lines.join('\n');

	const nodeName = comment?.nodeName ?? generateCodeNodeName(sourceCode);

	return {
		id: generateId(),
		name: nodeName,
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
		position: [x, y],
		parameters: {
			mode: 'runOnceForAllItems',
			jsCode,
			language: 'javaScript',
		},
	};
}

function generateCodeNodeName(sourceCode: string): string {
	// Try to generate a meaningful name from the code
	const firstLine = sourceCode.trim().split('\n')[0];
	if (firstLine.length <= 40) return firstLine;
	return firstLine.slice(0, 37) + '...';
}

function findDeclaredVariables(code: string): Set<string> {
	const vars = new Set<string>();
	// Simple regex to find const/let/var declarations
	const regex = /\b(?:const|let|var)\s+(?:\{([^}]+)\}|(\w+))/g;
	let match;
	while ((match = regex.exec(code)) !== null) {
		if (match[1]) {
			// Destructuring: const { a, b } = ...
			for (const part of match[1].split(',')) {
				const name = part.trim().split(':')[0].trim().split('=')[0].trim();
				if (name) vars.add(name);
			}
		} else if (match[2]) {
			vars.add(match[2]);
		}
	}
	return vars;
}

// ─── Sticky Note Generation ─────────────────────────────────────────────────

function generateStickyNote(comment: CommentAttachment, x: number, y: number): WorkflowNode {
	return {
		id: generateId(),
		name: 'Note',
		type: 'n8n-nodes-base.stickyNote',
		typeVersion: 1,
		position: [x - 20, y - 40],
		parameters: {
			content: comment.text,
			width: 220,
			height: 80,
		},
	};
}
