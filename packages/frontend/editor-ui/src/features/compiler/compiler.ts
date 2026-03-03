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

interface NodeConnections {
	main: Array<Array<{ node: string; type: string; index: number }>>;
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
	triggerOptions?: Record<string, unknown>;
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
			workflow: { name: metadata.workflowName, nodes: [], connections: {} },
			errors,
		};
	}

	// Step 3: Find IO boundaries
	const boundaries = findIOBoundaries(ast, source);

	// Step 4: Split into segments
	const segments = splitIntoSegments(source, boundaries, ast);

	// Step 5: Attach comments to segments
	attachComments(segments, comments, source);

	// Step 6: Generate nodes
	const { nodes, connections } = generateWorkflow(segments, metadata);

	return {
		workflow: { name: metadata.workflowName, nodes, connections },
		errors,
	};
}

// ─── Metadata Parsing ────────────────────────────────────────────────────────

function parseMetadata(source: string): WorkflowMetadata {
	const metadata: WorkflowMetadata = {
		triggerType: 'manual',
		workflowName: 'Compiled Workflow',
	};

	const triggerMatch = source.match(/\/\/\s*@trigger\s+(\w+)(?:\s*\(([^)]*)\))?/);
	if (triggerMatch) {
		metadata.triggerType = triggerMatch[1];
		if (triggerMatch[2]) {
			try {
				// Parse options like { cron: '0 9 * * *' }
				metadata.triggerOptions = JSON.parse(
					triggerMatch[2].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'),
				);
			} catch {
				// ignore parse errors in trigger options
			}
		}
	}

	const workflowMatch = source.match(/\/\/\s*@workflow\s+"([^"]+)"/);
	if (workflowMatch) {
		metadata.workflowName = workflowMatch[1];
	}

	return metadata;
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
	if (node.type === 'TemplateLiteral') {
		// For template literals, join quasis with placeholder markers
		const quasis = node.quasis ?? [];
		const parts: string[] = [];
		for (let i = 0; i < quasis.length; i++) {
			parts.push((quasis[i].value as unknown as string) ?? quasis[i].raw ?? '');
			if (i < quasis.length - 1) {
				parts.push('{{expression}}');
			}
		}
		return parts.join('');
	}
	// For identifiers and complex expressions, return undefined (dynamic)
	return undefined;
}

function extractObjectValue(node: AcornNode): Record<string, unknown> | undefined {
	if (node.type === 'ObjectExpression' && node.properties) {
		const obj: Record<string, unknown> = {};
		for (const prop of node.properties) {
			if (prop.type === 'Property' && prop.key) {
				const key = prop.key.name ?? (prop.key.value as string);
				if (key && prop.value) {
					if (prop.value.type === 'Literal') {
						obj[key] = prop.value.value;
					} else if (prop.value.type === 'ObjectExpression') {
						obj[key] = extractObjectValue(prop.value);
					} else {
						obj[key] = '{{dynamic}}';
					}
				}
			}
		}
		return obj;
	}
	// For identifiers (variable references), return undefined
	if (node.type === 'Identifier') {
		return undefined;
	}
	return undefined;
}

// ─── Code Splitting ──────────────────────────────────────────────────────────

function splitIntoSegments(source: string, boundaries: IOBoundary[], ast: acorn.Node): Segment[] {
	if (boundaries.length === 0) {
		// No IO calls — entire script is one code segment
		const codeBody = stripMetadataComments(source);
		if (codeBody.trim()) {
			return [{ type: 'code', sourceCode: codeBody }];
		}
		return [];
	}

	const segments: Segment[] = [];
	const program = ast as AcornNode;
	const statements = program.body ?? [];

	// Find the first non-metadata statement
	let codeStart = 0;
	for (const stmt of statements) {
		if (isMetadataOnlyStatement(stmt, source)) {
			codeStart = stmt.end;
			continue;
		}
		break;
	}

	let cursor = codeStart;

	for (const boundary of boundaries) {
		// Code before this IO boundary
		const codeBefore = source.slice(cursor, boundary.statementStart).trim();
		if (codeBefore) {
			segments.push({ type: 'code', sourceCode: codeBefore });
		}

		// The IO boundary itself
		segments.push({
			type: 'io',
			sourceCode: source.slice(boundary.statementStart, boundary.statementEnd),
			ioBoundary: boundary,
		});

		cursor = boundary.statementEnd;
	}

	// Code after the last IO boundary
	const codeAfter = source.slice(cursor).trim();
	if (codeAfter) {
		segments.push({ type: 'code', sourceCode: codeAfter });
	}

	return segments;
}

function isMetadataOnlyStatement(stmt: AcornNode, _source: string): boolean {
	// Empty expression statements that only contain metadata comments
	// Metadata is in comments, not statements, so this checks for truly empty lines
	return stmt.type === 'EmptyStatement';
}

function stripMetadataComments(source: string): string {
	return source
		.replace(/\/\/\s*@trigger\s+.*/g, '')
		.replace(/\/\/\s*@workflow\s+.*/g, '')
		.trim();
}

// ─── Comment Attachment ──────────────────────────────────────────────────────

function attachComments(segments: Segment[], comments: acorn.Comment[], _source: string): void {
	// Filter out metadata comments
	const userComments = comments.filter((c) => {
		const text = c.value.trim();
		return !text.startsWith('@trigger') && !text.startsWith('@workflow');
	});

	if (userComments.length === 0 || segments.length === 0) return;

	// Group consecutive comments together
	const commentGroups = groupConsecutiveComments(userComments);

	// For each comment group, find the segment it attaches to
	for (const group of commentGroups) {
		const commentEnd = group[group.length - 1].end;
		const text = group
			.map((c) => c.value.trim())
			.filter((t) => t.length > 0)
			.join('\n');

		if (!text) continue;

		// Find the first segment that starts after this comment
		let bestSegment: Segment | null = null;
		for (const segment of segments) {
			const segStart =
				segment.type === 'io'
					? segment.ioBoundary!.statementStart
					: findSegmentStart(segment, segments, _source);
			if (segStart >= commentEnd) {
				bestSegment = segment;
				break;
			}
		}

		if (bestSegment && !bestSegment.comment) {
			const firstLine = text.split('\n')[0];
			bestSegment.comment = {
				text,
				nodeName: firstLine.length > 40 ? firstLine.slice(0, 37) + '...' : firstLine,
			};
		}
	}
}

function findSegmentStart(segment: Segment, segments: Segment[], source: string): number {
	// Find position in source where this code segment starts
	const idx = source.indexOf(segment.sourceCode);
	return idx >= 0 ? idx : 0;
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

let nodeIdCounter = 0;

function generateId(): string {
	return `node_${++nodeIdCounter}`;
}

function resetIdCounter(): void {
	nodeIdCounter = 0;
}

function generateWorkflow(
	segments: Segment[],
	metadata: WorkflowMetadata,
): { nodes: WorkflowNode[]; connections: Record<string, NodeConnections> } {
	resetIdCounter();

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
				currentNode = generateAiNode(boundary, segment.comment, xPos, Y_BASE);
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
			connections[prevNodeName] = { main: [[]] };
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
	const parameters: Record<string, unknown> = {};

	if (metadata.triggerType === 'schedule' && metadata.triggerOptions) {
		parameters.rule = metadata.triggerOptions;
	}
	if (metadata.triggerType === 'webhook' && metadata.triggerOptions) {
		if (metadata.triggerOptions.path) {
			parameters.path = metadata.triggerOptions.path;
		}
	}

	return {
		id: generateId(),
		name: 'Start',
		type: trigger.type,
		typeVersion: trigger.typeVersion,
		position: [x, y],
		parameters,
	};
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
	if (['POST', 'PUT', 'PATCH'].includes(method) && boundary.args.body) {
		parameters.sendBody = true;
		parameters.contentType = 'json';
		parameters.specifyBody = 'json';
		parameters.jsonBody = JSON.stringify(boundary.args.body);
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

function generateAiNode(
	boundary: IOBoundary,
	comment: CommentAttachment | undefined,
	x: number,
	y: number,
): WorkflowNode {
	const model = boundary.args.model ?? 'gpt-4o-mini';
	const prompt = boundary.args.prompt ?? '';

	const nodeName = comment?.nodeName ?? `AI: ${prompt.slice(0, 30)}...`;

	// Map model name to provider
	const modelConfig = mapModelToNode(model);

	return {
		id: generateId(),
		name: nodeName.length > 40 ? nodeName.slice(0, 37) + '...' : nodeName,
		type: '@n8n/n8n-nodes-langchain.agent',
		typeVersion: 2,
		position: [x, y],
		parameters: {
			promptType: 'define',
			text: prompt || '={{$json.prompt}}',
			options: {},
			// Include model info as a hint (the actual subnode setup
			// requires more complex JSON but this captures the intent)
			_modelType: modelConfig.type,
			_modelName: model,
		},
	};
}

function mapModelToNode(model: string): { type: string; provider: string } {
	if (model.includes('gpt') || model.includes('o1') || model.includes('o3')) {
		return { type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', provider: 'openai' };
	}
	if (model.includes('claude')) {
		return {
			type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
			provider: 'anthropic',
		};
	}
	if (model.includes('gemini')) {
		return {
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			provider: 'google',
		};
	}
	// Default to OpenAI
	return { type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', provider: 'openai' };
}

// ─── Code Node Generation ───────────────────────────────────────────────────

function generateCodeNode(
	sourceCode: string,
	comment: CommentAttachment | undefined,
	liveVars: Set<string>,
	x: number,
	y: number,
): WorkflowNode {
	// Build the code node's jsCode:
	// 1. Prepend: destructure live variables from $input
	// 2. The user's code
	// 3. Append: return all live variables + new ones

	const lines: string[] = [];

	// Input: get data from previous node
	if (liveVars.size > 0) {
		const vars = Array.from(liveVars);
		lines.push(`const { ${vars.join(', ')} } = $input.first().json;`);
	}

	// User's code (stripped of leading/trailing whitespace)
	lines.push(sourceCode.trim());

	// Find new variables declared in this code segment
	const declaredVars = findDeclaredVariables(sourceCode);
	const allVars = new Set([...liveVars, ...declaredVars]);

	// Output: return all variables
	if (allVars.size > 0) {
		const returnVars = Array.from(allVars).join(', ');
		lines.push(`return [{ json: { ${returnVars} } }];`);
	} else {
		lines.push('return [{ json: {} }];');
	}

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
		name: `Note`,
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
