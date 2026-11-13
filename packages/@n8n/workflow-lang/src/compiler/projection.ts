import ts from 'typescript';

import {
	calledFunction,
	getProperty,
	isEffectCall,
	isFunctionLike,
	isPromiseAll,
	promiseAllMap,
	propertyName,
	skipOuter,
	sourceText,
} from './analysis.ts';
import type { LoweredModule, StepSite } from './lower.ts';

export interface CanvasNode {
	id: string;
	name: string;
	type: string;
	typeVersion: number;
	position: [number, number];
	parameters: Record<string, unknown>;
	sourceRange: { start: number; end: number };
	/** False for glue that runs without a durable step. */
	durable: boolean;
	onError?: 'continueErrorOutput';
	notes?: string;
}

export interface CanvasConnection {
	node: string;
	/** `main`, or an n8n AI connection type such as `ai_languageModel`. */
	type: string;
	index: number;
}

/** The connections of one node, by connection type, then by output index. */
export interface CanvasNodeConnections {
	main: CanvasConnection[][];
	[type: string]: CanvasConnection[][];
}

export interface Canvas {
	nodes: CanvasNode[];
	connections: Record<string, CanvasNodeConnections>;
}

interface Exit {
	node: CanvasNode;
	output: number;
}

/**
 * Projects the workflow to a v1-shaped canvas: one node for each step or
 * control construct. The projection reads the structured source, so loops,
 * branches and try regions keep their shape.
 */
export function project(
	checker: ts.TypeChecker,
	sf: ts.SourceFile,
	def: { options: ts.ObjectLiteralExpression; run: ts.FunctionLikeDeclaration },
	lowered: LoweredModule,
): Canvas {
	const builder = new CanvasBuilder(checker, lowered.stepSites, lowered.libraryTypes);
	const trigger = builder.trigger(def.options);
	const body = def.run.body;
	let exits: Exit[] = [{ node: trigger, output: 0 }];
	if (body && ts.isBlock(body)) {
		const moduleStatements = sf.statements.filter((s) => ts.isVariableStatement(s));
		exits = builder.statements([...moduleStatements, ...body.statements], exits);
	}
	builder.layout(trigger);
	return builder.canvas;
}

class CanvasBuilder {
	readonly canvas: Canvas = { nodes: [], connections: {} };

	private readonly steps = new Map<ts.Node, StepSite>();

	private readonly stepNodes = new Map<number, CanvasNode>();

	private readonly counters = new Map<string, number>();

	private readonly hasStepsMemo = new Map<ts.Node, boolean>();

	private readonly inlining = new Set<ts.Node>();

	/** Exits that go to the error handler of the enclosing try. */
	private errorExits: Exit[][] = [];

	private readonly backEdges = new Set<string>();

	private readonly checker: ts.TypeChecker;

	private readonly libraryTypes: Map<string, { version: number }>;

	/**
	 * Data flow of host steps with several outputs (`outputs: 'all'`). The
	 * statements run one after the other, but each output list feeds its own
	 * branch: the exits that a list holds items from.
	 */
	private readonly listSources = new Map<ts.Symbol, Exit[]>();

	/** The result variables of steps with `outputs: 'all'`, and their canvas node. */
	private readonly multiResults = new Map<ts.Symbol, CanvasNode>();

	private readonly multiNodes = new Set<CanvasNode>();

	/** The lists whose data source an enclosing `if` already connected. */
	private readonly guarded: Array<Set<ts.Symbol>> = [];

	constructor(
		checker: ts.TypeChecker,
		stepSites: StepSite[],
		libraryTypes: Map<string, { version: number }>,
	) {
		this.checker = checker;
		this.libraryTypes = libraryTypes;
		for (const s of stepSites) this.steps.set(s.call, s);
	}

	private uniqueName(base: string): string {
		const n = (this.counters.get(base) ?? 0) + 1;
		this.counters.set(base, n);
		return n === 1 ? base : `${base} ${n}`;
	}

	private addNode(node: Omit<CanvasNode, 'position'>): CanvasNode {
		const full: CanvasNode = { ...node, position: [0, 0] };
		this.canvas.nodes.push(full);
		return full;
	}

	private connect(from: Exit, to: CanvasNode, input = 0, back = false) {
		const entry = (this.canvas.connections[from.node.name] ??= { main: [] });
		while (entry.main.length <= from.output) entry.main.push([]);
		entry.main[from.output].push({ node: to.name, type: 'main', index: input });
		if (back) this.backEdges.add(`${from.node.name}->${to.name}`);
	}

	private connectAll(exits: Exit[], to: CanvasNode, input = 0) {
		for (const e of exits) this.connect(e, to, input);
	}

	private control(
		kind: string,
		type: string,
		node: ts.Node,
		parameters: Record<string, unknown>,
		typeVersion = 1,
	) {
		const start = node.getStart();
		const sf = node.getSourceFile();
		const pos = sf.getLineAndCharacterOfPosition(start);
		return this.addNode({
			id: `${kind.toLowerCase()}:${pos.line + 1}:${pos.character + 1}`,
			name: this.uniqueName(kind),
			type,
			typeVersion,
			parameters,
			sourceRange: { start, end: node.getEnd() },
			durable: kind !== 'Transform',
		});
	}

	trigger(options: ts.ObjectLiteralExpression): CanvasNode {
		const triggers = getProperty(options, 'triggers')?.initializer;
		let parameters: Record<string, unknown> = {};
		let kind = 'webhook';
		const range = options;
		if (triggers && ts.isArrayLiteralExpression(skipOuter(triggers))) {
			const arr = skipOuter(triggers);
			if (ts.isArrayLiteralExpression(arr) && arr.elements[0]) {
				const first = skipOuter(arr.elements[0]);
				if (ts.isCallExpression(first) && first.arguments[0]) {
					parameters = jsonOf(first.arguments[0]);
					if (ts.isIdentifier(first.expression)) kind = first.expression.text;
				}
			}
		}
		if (kind === 'schedule') {
			return this.addNode({
				id: 'trigger',
				name: 'Schedule Trigger',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1.2,
				parameters: { rule: { interval: [scheduleInterval(parameters)] } },
				sourceRange: { start: range.getStart(), end: range.getEnd() },
				durable: true,
			});
		}
		return this.addNode({
			id: 'trigger',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			parameters: {
				httpMethod: parameters.method ?? 'POST',
				path: parameters.path ?? '',
				...parameters,
			},
			sourceRange: { start: range.getStart(), end: range.getEnd() },
			durable: true,
		});
	}

	/** True when the node contains a step, also through called local functions. */
	private hasSteps(node: ts.Node): boolean {
		const memo = this.hasStepsMemo.get(node);
		if (memo !== undefined) return memo;
		this.hasStepsMemo.set(node, false);
		let found = false;
		const visit = (n: ts.Node) => {
			if (found) return;
			if (isEffectCall(this.checker, n)) {
				found = true;
				return;
			}
			if (ts.isCallExpression(n)) {
				const fn = calledFunction(this.checker, n);
				if (fn && this.hasSteps(fn)) {
					found = true;
					return;
				}
			}
			if (n !== node && isFunctionLike(n) && !isMapCallback(n)) return;
			ts.forEachChild(n, visit);
		};
		visit(node);
		this.hasStepsMemo.set(node, found);
		return found;
	}

	statements(list: readonly ts.Statement[], incoming: Exit[]): Exit[] {
		let exits = incoming;
		let glue: ts.Statement[] = [];
		const flush = (next: ts.Statement | null) => {
			if (glue.length === 0) return;
			const group = glue;
			glue = [];
			if (next && this.onlyFeeds(group, next)) {
				this.pendingNotes = group.map((g) => sourceText(g)).join('\n');
				return;
			}
			const first = group[0];
			const last = group[group.length - 1];
			const node = this.addNode({
				id: `transform:${first.getSourceFile().getLineAndCharacterOfPosition(first.getStart()).line + 1}`,
				name: this.uniqueName('Transform'),
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				parameters: { jsCode: group.map((g) => g.getText()).join('\n') },
				sourceRange: { start: first.getStart(), end: last.getEnd() },
				durable: false,
			});
			this.connectAll(exits, node);
			exits = [{ node, output: 0 }];
		};
		for (const st of list) {
			if (
				ts.isFunctionDeclaration(st) ||
				ts.isInterfaceDeclaration(st) ||
				ts.isTypeAliasDeclaration(st)
			)
				continue;
			if (!this.hasSteps(st) && !ts.isReturnStatement(st) && !ts.isThrowStatement(st)) {
				this.recordSources(st);
				glue.push(st);
				continue;
			}
			if (!this.hasSteps(st)) {
				glue.push(st);
				flush(null);
				return [];
			}
			flush(st);
			exits = this.statement(st, exits);
		}
		flush(null);
		return exits;
	}

	private pendingNotes: string | null = null;

	/** True when every variable that `group` declares is used only in `next`. */
	private onlyFeeds(group: ts.Statement[], next: ts.Statement): boolean {
		const declared = new Set<ts.Symbol>();
		for (const g of group) {
			if (!ts.isVariableStatement(g)) return false;
			for (const d of g.declarationList.declarations) {
				if (!ts.isIdentifier(d.name)) return false;
				const s = this.checker.getSymbolAtLocation(d.name);
				if (s) declared.add(s);
			}
		}
		const scope = next.parent;
		let usedElsewhere = false;
		let usedInNext = false;
		const visit = (n: ts.Node) => {
			if (ts.isIdentifier(n)) {
				const s = this.checker.getSymbolAtLocation(n);
				if (s && declared.has(s) && !group.some((g) => n.pos >= g.pos && n.end <= g.end)) {
					if (n.pos >= next.pos && n.end <= next.end) usedInNext = true;
					else usedElsewhere = true;
				}
			}
			ts.forEachChild(n, visit);
		};
		visit(scope);
		return usedInNext && !usedElsewhere;
	}

	private statement(st: ts.Statement, incoming: Exit[]): Exit[] {
		if (ts.isBlock(st)) return this.statements(st.statements, incoming);
		if (ts.isIfStatement(st)) {
			const node = this.control(
				'If',
				'n8n-nodes-base.if',
				st,
				{ condition: `={{ ${sourceText(st.expression)} }}` },
				2,
			);
			const found = this.sourcesOf(st.expression);
			// Only outputs of a step with several outputs change the order of the statements.
			const data = found && this.fromMulti(found.exits) ? found : null;
			this.connectAll(data?.exits ?? incoming, node);
			this.guarded.push(data?.symbols ?? new Set());
			const thenExits = this.statement(st.thenStatement, [{ node, output: 0 }]);
			this.guarded.pop();
			const elseExits = st.elseStatement
				? this.statement(st.elseStatement, [{ node, output: 1 }])
				: [{ node, output: 1 }];
			return [...thenExits, ...elseExits];
		}
		if (ts.isSwitchStatement(st)) {
			const rules = st.caseBlock.clauses.map((c) =>
				ts.isDefaultClause(c)
					? 'default'
					: `={{ ${sourceText(st.expression)} === ${sourceText(c.expression)} }}`,
			);
			const node = this.control('Switch', 'n8n-nodes-base.switch', st, { rules }, 3);
			this.connectAll(incoming, node);
			const out: Exit[] = [];
			st.caseBlock.clauses.forEach((c, i) => {
				out.push(...this.statements(c.statements, [{ node, output: i }]));
			});
			return out;
		}
		if (
			ts.isForStatement(st) ||
			ts.isForOfStatement(st) ||
			ts.isWhileStatement(st) ||
			ts.isDoStatement(st)
		) {
			const header = ts.isForOfStatement(st)
				? `${sourceText(st.initializer)} of ${sourceText(st.expression)}`
				: ts.isForStatement(st)
					? `${st.initializer ? sourceText(st.initializer) : ''}; ${st.condition ? sourceText(st.condition) : ''}; ${st.incrementor ? sourceText(st.incrementor) : ''}`
					: sourceText(st.expression);
			const node = this.control('Loop', 'n8n-nodes-base.splitInBatches', st, { loop: header }, 3);
			this.connectAll(incoming, node);
			const bodyExits = this.statement(st.statement, [{ node, output: 1 }]);
			for (const e of bodyExits) this.connect(e, node, 0, true);
			return [{ node, output: 0 }];
		}
		if (ts.isTryStatement(st)) {
			this.errorExits.push([]);
			const tryExits = this.statements(st.tryBlock.statements, incoming);
			const errors = this.errorExits.pop() ?? [];
			let catchExits: Exit[] = [];
			if (st.catchClause) {
				catchExits =
					errors.length > 0 ? this.statements(st.catchClause.block.statements, errors) : [];
				if (
					errors.length > 0 &&
					catchExits.length === 0 &&
					st.catchClause.block.statements.length === 0
				) {
					catchExits = errors;
				}
			} else {
				catchExits = errors;
			}
			const all = [...tryExits, ...catchExits];
			if (st.finallyBlock) return this.statements(st.finallyBlock.statements, all);
			return all;
		}
		if (ts.isReturnStatement(st) || ts.isThrowStatement(st)) {
			if (st.expression) this.expression(st.expression, incoming);
			return [];
		}
		if (ts.isVariableStatement(st)) {
			let exits = incoming;
			for (const d of st.declarationList.declarations) {
				if (d.initializer) exits = this.expression(d.initializer, exits);
			}
			return exits;
		}
		if (ts.isExpressionStatement(st)) return this.expression(st.expression, incoming);
		return incoming;
	}

	/** Adds the steps of an expression in evaluation order. */
	private expression(expr: ts.Node, incoming: Exit[]): Exit[] {
		let exits = incoming;
		const visit = (n: ts.Node) => {
			if (isPromiseAll(n)) {
				exits = this.promiseAll(n, exits);
				return;
			}
			if (isFunctionLike(n)) return;
			ts.forEachChild(n, visit);
			if (isEffectCall(this.checker, n)) {
				exits = [{ node: this.stepNode(n, exits), output: 0 }];
				return;
			}
			if (ts.isCallExpression(n)) {
				const fn = calledFunction(this.checker, n);
				if (fn?.body && this.hasSteps(fn) && !this.inlining.has(fn)) {
					this.inlining.add(fn);
					exits = ts.isBlock(fn.body)
						? this.statements(fn.body.statements, exits)
						: this.expression(fn.body, exits);
					this.inlining.delete(fn);
				}
			}
		};
		visit(expr);
		return exits;
	}

	private promiseAll(call: ts.CallExpression, incoming: Exit[]): Exit[] {
		const branches: Exit[][] = [];
		const arg = call.arguments[0];
		if (arg && ts.isArrayLiteralExpression(arg)) {
			for (const el of arg.elements) branches.push(this.expression(el, incoming));
		} else {
			const m = promiseAllMap(call);
			if (m?.mapper.body) {
				const body = m.mapper.body;
				branches.push(
					ts.isBlock(body)
						? this.statements(body.statements, incoming)
						: this.expression(body, incoming),
				);
			}
		}
		const merge = this.control(
			'Merge',
			'n8n-nodes-base.merge',
			call,
			{
				mode: 'append',
				numberInputs: Math.max(branches.length, 1),
			},
			3,
		);
		branches.forEach((b, i) => this.connectAll(b, merge, i));
		return [{ node: merge, output: 0 }];
	}

	private stepNode(call: ts.CallExpression, incomingExits: Exit[]): CanvasNode {
		let incoming = incomingExits;
		const site = this.steps.get(call);
		if (site) {
			const existing = this.stepNodes.get(site.index);
			if (existing) {
				this.connectAll(incoming, existing);
				return existing;
			}
		}
		const opts = call.arguments[0] ? skipOuter(call.arguments[0]) : undefined;
		const obj = opts && ts.isObjectLiteralExpression(opts) ? opts : undefined;
		const name = obj ? (jsonOf(obj).name ?? 'Step') : 'Step';
		const id = obj ? (jsonOf(obj).id ?? name) : name;
		const method = site?.method ?? 'node';
		const params = obj ? jsonOf(obj) : {};
		delete params.name;
		delete params.id;
		let type = 'n8n-nodes-base.noOp';
		let typeVersion = 1;
		let parameters: Record<string, unknown> = params;
		switch (method) {
			case 'node': {
				type = typeof params.type === 'string' ? params.type : type;
				const lib = this.libraryTypes.get(type);
				typeVersion =
					typeof params.typeVersion === 'number' ? params.typeVersion : (lib?.version ?? 1);
				const p = params.parameters;
				parameters = typeof p === 'object' && p !== null && !Array.isArray(p) ? { ...p } : {};
				if (params.credential !== undefined) parameters.credential = params.credential;
				break;
			}
			case 'http':
				type = 'n8n-nodes-base.httpRequest';
				typeVersion = 4;
				break;
			case 'code':
				type = 'n8n-nodes-base.code';
				typeVersion = 2;
				parameters = { jsCode: params.code ?? '' };
				break;
			case 'wait':
				type = 'n8n-nodes-base.wait';
				break;
			case 'approval':
				type = 'n8n-nodes-base.wait';
				parameters = { resume: 'approval', ...params };
				break;
			case 'respond':
				type = 'n8n-nodes-base.respondToWebhook';
				parameters = { respondWith: 'json', ...params };
				break;
			default:
				break;
		}
		const node = this.addNode({
			id: typeof id === 'string' ? id : String(site?.index ?? 'step'),
			name: typeof name === 'string' ? name : 'Step',
			type,
			typeVersion,
			parameters,
			sourceRange: { start: call.getStart(), end: call.getEnd() },
			durable: true,
		});
		if (method === 'node' && obj) {
			this.recordResult(call, node, params.outputs === 'all');
			this.subNodes(params.subNodes, node, call);
			incoming = this.dataIncoming(obj, node, incoming);
		}
		if (this.pendingNotes) {
			node.notes = this.pendingNotes;
			this.pendingNotes = null;
		}
		const handler = this.errorExits[this.errorExits.length - 1];
		if (handler) {
			node.onError = 'continueErrorOutput';
			handler.push({ node, output: 1 });
		}
		if (site) this.stepNodes.set(site.index, node);
		this.connectAll(incoming, node);
		return node;
	}

	// ---- Data flow of host steps ------------------------------------------------

	private symbolOf(n: ts.Node): ts.Symbol | undefined {
		return this.checker.getSymbolAtLocation(n);
	}

	/**
	 * Remembers the variable of a step result: `const x = await ctx.node(...)`,
	 * also behind `list.length > 0 ? … : []`. A result with `outputs: 'all'`
	 * holds one list for each output.
	 */
	private recordResult(call: ts.CallExpression, node: CanvasNode, multi: boolean) {
		let p: ts.Node = call.parent;
		while (
			ts.isAwaitExpression(p) ||
			ts.isParenthesizedExpression(p) ||
			(ts.isConditionalExpression(p) && p.condition !== call)
		) {
			p = p.parent;
		}
		if (!ts.isVariableDeclaration(p) || !ts.isIdentifier(p.name)) return;
		const symbol = this.symbolOf(p.name);
		if (!symbol) return;
		if (multi) {
			this.multiResults.set(symbol, node);
			this.multiNodes.add(node);
		} else {
			this.listSources.set(symbol, [{ node, output: 0 }]);
		}
	}

	/** True when the exits come from a step with several outputs. */
	private fromMulti(exits: Exit[]): boolean {
		return exits.some((e) => this.multiNodes.has(e.node));
	}

	/** The exits and list symbols that an expression reads, or null when it reads none. */
	private sourcesOf(node: ts.Node): { exits: Exit[]; symbols: Set<ts.Symbol> } | null {
		const exits: Exit[] = [];
		const symbols = new Set<ts.Symbol>();
		const visit = (n: ts.Node) => {
			if (ts.isIdentifier(n)) {
				const symbol = this.symbolOf(n);
				const found = symbol ? this.listSources.get(symbol) : undefined;
				if (symbol && found) {
					symbols.add(symbol);
					for (const e of found) {
						if (!exits.some((x) => x.node === e.node && x.output === e.output)) exits.push(e);
					}
				}
			}
			ts.forEachChild(n, visit);
		};
		visit(node);
		return exits.length > 0 ? { exits, symbols } : null;
	}

	/**
	 * Records where the lists of a statement without steps get their items:
	 * `for (const r of result[k]?.items ?? []) list.push(r)` takes output k of a
	 * step, and code that reads lists with a source passes the source on to the
	 * lists that it writes.
	 */
	private recordSources(st: ts.Statement) {
		const output = ts.isForOfStatement(st) ? this.multiOutput(st.expression) : null;
		const read: Exit[] = output ? [output] : (this.sourcesOf(st)?.exits ?? []);
		if (read.length === 0) return;
		for (const symbol of this.writtenLists(st)) {
			const list = this.listSources.get(symbol) ?? [];
			for (const e of read) {
				if (!list.some((x) => x.node === e.node && x.output === e.output)) list.push(e);
			}
			this.listSources.set(symbol, list);
		}
	}

	/** Output k of a step for `result[k]?.items ?? []`, else null. */
	private multiOutput(expr: ts.Expression): Exit | null {
		let e = skipOuter(expr);
		if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
			e = skipOuter(e.left);
		}
		if (!ts.isPropertyAccessExpression(e) || e.name.text !== 'items') return null;
		const access = skipOuter(e.expression);
		if (!ts.isElementAccessExpression(access) || !ts.isNumericLiteral(access.argumentExpression)) {
			return null;
		}
		const symbol = this.symbolOf(access.expression);
		const node = symbol ? this.multiResults.get(symbol) : undefined;
		return node ? { node, output: Number(access.argumentExpression.text) } : null;
	}

	/** The variables that a statement declares with a value, assigns, or pushes to. */
	private writtenLists(st: ts.Statement): ts.Symbol[] {
		const out: ts.Symbol[] = [];
		const add = (n: ts.Node) => {
			const symbol = this.symbolOf(n);
			if (symbol && !out.includes(symbol)) out.push(symbol);
		};
		const visit = (n: ts.Node) => {
			if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) add(n.name);
			if (
				ts.isBinaryExpression(n) &&
				n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
				ts.isIdentifier(n.left)
			) {
				add(n.left);
			}
			if (
				ts.isCallExpression(n) &&
				ts.isPropertyAccessExpression(n.expression) &&
				n.expression.name.text === 'push' &&
				ts.isIdentifier(n.expression.expression)
			) {
				add(n.expression.expression);
			}
			if (isFunctionLike(n)) return;
			ts.forEachChild(n, visit);
		};
		visit(st);
		return out;
	}

	/**
	 * The incoming exits of a step from the lists that it reads: each list of
	 * `inputs` goes to its input index; `items` goes to input 0 unless an
	 * enclosing `if` already connected its source.
	 */
	private dataIncoming(
		obj: ts.ObjectLiteralExpression,
		node: CanvasNode,
		incoming: Exit[],
	): Exit[] {
		const inputs = getProperty(obj, 'inputs')?.initializer;
		const list = inputs ? skipOuter(inputs) : undefined;
		if (list && ts.isArrayLiteralExpression(list)) {
			const per = list.elements.map((el) => this.sourcesOf(el));
			if (per.some((x) => x !== null)) {
				per.forEach((x, k) => {
					if (x && k > 0) this.connectAll(x.exits, node, k);
				});
				return per[0]?.exits ?? incoming;
			}
			return incoming;
		}
		const items = getProperty(obj, 'items')?.initializer;
		const data = items ? this.sourcesOf(items) : null;
		if (!data || !this.fromMulti(data.exits)) return incoming;
		const guard = this.guarded[this.guarded.length - 1];
		if (guard && [...data.symbols].every((s) => guard.has(s))) return incoming;
		return data.exits;
	}

	// ---- AI sub-nodes -------------------------------------------------------------

	/** Canvas nodes for the `subNodes` of a step, with their `ai_*` connections. */
	private subNodes(value: unknown, root: CanvasNode, call: ts.CallExpression) {
		if (!Array.isArray(value)) return;
		const names = new Map<string, string>([[root.name, root.name]]);
		const subs = value.filter(
			(v): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v),
		);
		for (const sub of subs) {
			const name = typeof sub.name === 'string' ? sub.name : 'Sub-node';
			const p = sub.parameters;
			const parameters: Record<string, unknown> =
				typeof p === 'object' && p !== null && !Array.isArray(p) ? { ...p } : {};
			if (sub.credential !== undefined) parameters.credential = sub.credential;
			const node = this.addNode({
				id: `${root.id}/${name}`,
				name: this.canvas.nodes.some((n) => n.name === name) ? this.uniqueName(name) : name,
				type: typeof sub.type === 'string' ? sub.type : 'n8n-nodes-base.noOp',
				typeVersion: typeof sub.typeVersion === 'number' ? sub.typeVersion : 1,
				parameters,
				sourceRange: { start: call.getStart(), end: call.getEnd() },
				durable: false,
			});
			names.set(name, node.name);
		}
		for (const sub of subs) {
			const from = names.get(typeof sub.name === 'string' ? sub.name : '');
			const to = names.get(typeof sub.target === 'string' ? sub.target : '');
			const type = typeof sub.connection === 'string' ? sub.connection : '';
			if (!from || !to || type === '') continue;
			const entry = (this.canvas.connections[from] ??= { main: [] });
			// The entry can already hold an empty list for the type (a `main` sub-node
			// connection, for example), so the first output list is made when it is missing.
			const outputs = (entry[type] ??= []);
			const first = (outputs[0] ??= []);
			first.push({
				node: to,
				type,
				index: typeof sub.targetIndex === 'number' ? sub.targetIndex : 0,
			});
		}
	}

	/** Places nodes in layers by their longest distance from the trigger. */
	layout(trigger: CanvasNode) {
		const depth = new Map<string, number>([[trigger.name, 0]]);
		const byName = new Map(this.canvas.nodes.map((n) => [n.name, n]));
		for (let round = 0; round < this.canvas.nodes.length; round++) {
			let changed = false;
			for (const [from, { main }] of Object.entries(this.canvas.connections)) {
				const d = depth.get(from);
				if (d === undefined) continue;
				for (const out of main) {
					for (const c of out) {
						if (this.backEdges.has(`${from}->${c.node}`)) continue;
						if ((depth.get(c.node) ?? -1) < d + 1) {
							depth.set(c.node, d + 1);
							changed = true;
						}
					}
				}
			}
			if (!changed) break;
		}
		// A sub-node sits in the layer of the node that it supplies.
		for (const [from, types] of Object.entries(this.canvas.connections)) {
			for (const [type, outputs] of Object.entries(types)) {
				if (type === 'main') continue;
				const target = outputs[0]?.[0]?.node;
				const d = target === undefined ? undefined : depth.get(target);
				if (d !== undefined && !depth.has(from)) depth.set(from, d);
			}
		}
		const rows = new Map<number, number>();
		for (const n of this.canvas.nodes) {
			const d = depth.get(n.name) ?? 0;
			const row = rows.get(d) ?? 0;
			rows.set(d, row + 1);
			n.position = [d * 220, row * 160];
		}
		void byName;
	}
}

function isMapCallback(n: ts.Node): boolean {
	const p = n.parent;
	return (
		p !== undefined &&
		ts.isCallExpression(p) &&
		p.parent !== undefined &&
		isPromiseAll(p.parent) &&
		promiseAllMap(p.parent)?.mapper === n
	);
}

/** JSON of an object literal. Non-literal values become `={{ source }}` expressions. */
function jsonOf(expr: ts.Expression): Record<string, unknown> {
	const value = toJson(expr);
	return typeof value === 'object' && value !== null && !Array.isArray(value) ? { ...value } : {};
}

function toJson(expr: ts.Expression): unknown {
	const e = skipOuter(expr);
	if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
	if (ts.isNumericLiteral(e)) return Number(e.text);
	if (e.kind === ts.SyntaxKind.TrueKeyword) return true;
	if (e.kind === ts.SyntaxKind.FalseKeyword) return false;
	if (e.kind === ts.SyntaxKind.NullKeyword) return null;
	if (ts.isArrayLiteralExpression(e) && e.elements.every((x) => !ts.isSpreadElement(x))) {
		return e.elements.map((x) => toJson(x));
	}
	if (ts.isObjectLiteralExpression(e)) {
		const out: Record<string, unknown> = {};
		for (const p of e.properties) {
			if (ts.isPropertyAssignment(p)) {
				const key = propertyName(p.name);
				if (key !== null) out[key] = toJson(p.initializer);
			} else if (ts.isShorthandPropertyAssignment(p)) {
				out[p.name.text] = `={{ ${p.name.text} }}`;
			}
		}
		return out;
	}
	return `={{ ${sourceText(e)} }}`;
}

/** The Schedule Trigger `rule.interval` entry for `schedule(...)` options (spec section 1.4). */
function scheduleInterval(options: Record<string, unknown>): Record<string, unknown> {
	if (typeof options.cron === 'string')
		return { field: 'cronExpression', expression: options.cron };
	const every = options.every;
	if (typeof every !== 'object' || every === null || Array.isArray(every)) return {};
	const e: Record<string, unknown> = { ...every };
	const unit = typeof e.unit === 'string' ? e.unit : 'days';
	const out: Record<string, unknown> = { field: unit, [`${unit}Interval`]: e.value };
	if (e.atHour !== undefined) out.triggerAtHour = e.atHour;
	if (e.atMinute !== undefined) out.triggerAtMinute = e.atMinute;
	if (e.onWeekdays !== undefined) out.triggerAtDay = e.onWeekdays;
	if (e.onDayOfMonth !== undefined) out.triggerAtDayOfMonth = e.onDayOfMonth;
	return out;
}
