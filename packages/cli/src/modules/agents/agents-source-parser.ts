import ts from 'typescript';

export interface ToolSources {
	handlerSource: string | null;
	inputSchemaSource: string | null;
	outputSchemaSource: string | null;
	suspendSchemaSource: string | null;
	resumeSchemaSource: string | null;
	toMessageSource: string | null;
	needsApprovalFnSource: string | null;
}

export interface ExtractedSources {
	tools: Map<string, ToolSources>;
	providerTools: Map<string, string>;
	memory: string | null;
	evals: Map<string, string>;
	guardrails: Map<string, string>;
	mcpConfigs: Map<string, string>;
	telemetry: string | null;
	checkpoint: string | null;
	structuredOutputSource: string | null;
}

/**
 * Extract source strings from agent TypeScript code using the TypeScript AST.
 * Given the original TypeScript source of an agent, this extracts all the source
 * strings needed to populate AgentSchema source fields.
 */
export function extractSources(source: string): ExtractedSources {
	const sourceFile = ts.createSourceFile('agent.ts', source, ts.ScriptTarget.Latest, true);

	const result: ExtractedSources = {
		tools: new Map(),
		providerTools: new Map(),
		memory: null,
		evals: new Map(),
		guardrails: new Map(),
		mcpConfigs: new Map(),
		telemetry: null,
		checkpoint: null,
		structuredOutputSource: null,
	};

	// Find the default export expression
	const exportExpr = findDefaultExportExpression(sourceFile);
	if (!exportExpr) return result;

	// Collect top-level variable declarations for variable resolution
	const varDecls = collectVariableDeclarations(sourceFile);

	// Walk the agent builder chain
	walkAgentChain(exportExpr, sourceFile, source, varDecls, result);

	return result;
}

/** Find the expression from the default export (direct or via variable). */
function findDefaultExportExpression(sf: ts.SourceFile): ts.Expression | undefined {
	for (const stmt of sf.statements) {
		// export default <expr> — but NOT a bare identifier (handled below)
		if (ts.isExportAssignment(stmt) && !stmt.isExportEquals && !ts.isIdentifier(stmt.expression)) {
			return stmt.expression;
		}
	}

	// Look for: const x = ...; export default x;
	// First find `export default <identifier>`
	let exportedName: string | undefined;
	for (const stmt of sf.statements) {
		if (ts.isExportAssignment(stmt) && !stmt.isExportEquals && ts.isIdentifier(stmt.expression)) {
			exportedName = stmt.expression.text;
			break;
		}
	}
	if (!exportedName) return undefined;

	// Then find the variable declaration
	for (const stmt of sf.statements) {
		if (ts.isVariableStatement(stmt)) {
			for (const decl of stmt.declarationList.declarations) {
				if (ts.isIdentifier(decl.name) && decl.name.text === exportedName && decl.initializer) {
					return decl.initializer;
				}
			}
		}
	}

	return undefined;
}

/** Collect all top-level const/let/var declarations for variable resolution. */
function collectVariableDeclarations(sf: ts.SourceFile): Map<string, ts.Expression> {
	const map = new Map<string, ts.Expression>();
	for (const stmt of sf.statements) {
		if (ts.isVariableStatement(stmt)) {
			for (const decl of stmt.declarationList.declarations) {
				if (ts.isIdentifier(decl.name) && decl.initializer) {
					map.set(decl.name.text, decl.initializer);
				}
			}
		}
	}
	return map;
}

/** Get the source text of a node. */
function nodeText(node: ts.Node, sf: ts.SourceFile, src: string): string {
	return src.substring(node.getStart(sf), node.getEnd());
}

/** Extract string literal value from a node, or return null. */
function getStringLiteral(node: ts.Expression): string | null {
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
		return node.text;
	}
	return null;
}

/**
 * Walk a builder method chain (series of call expressions) and invoke a callback
 * for each method call found, from innermost (first call) to outermost (last call).
 */
function walkMethodChain(
	expr: ts.Expression,
	callback: (
		methodName: string,
		args: ts.NodeArray<ts.Expression>,
		call: ts.CallExpression,
	) => void,
): void {
	// Collect calls from outer to inner
	const calls: Array<{
		methodName: string;
		args: ts.NodeArray<ts.Expression>;
		call: ts.CallExpression;
	}> = [];
	let current = expr;

	while (ts.isCallExpression(current)) {
		const callExpr = current.expression;
		if (ts.isPropertyAccessExpression(callExpr)) {
			calls.push({
				methodName: callExpr.name.text,
				args: current.arguments,
				call: current,
			});
			current = callExpr.expression;
		} else {
			// Could be a direct function call or new expression — stop walking
			break;
		}
	}

	// Process from inner to outer (reverse)
	for (let i = calls.length - 1; i >= 0; i--) {
		callback(calls[i].methodName, calls[i].args, calls[i].call);
	}
}

/**
 * Find the name from a `new Tool('name')` or `new Eval('name')` constructor.
 * Returns null if the first argument isn't a string literal.
 */
function findConstructorName(expr: ts.Expression): string | null {
	// Walk to the base of the chain to find the new expression
	let current = expr;
	while (ts.isCallExpression(current)) {
		const callExpr = current.expression;
		if (ts.isPropertyAccessExpression(callExpr)) {
			current = callExpr.expression;
		} else {
			break;
		}
	}

	// We could also have a bare `new Tool('name')` without method chain
	if (ts.isNewExpression(current) && current.arguments && current.arguments.length > 0) {
		return getStringLiteral(current.arguments[0]);
	}

	return null;
}

/** Extract tool sources from a Tool builder chain expression. */
function extractToolSources(
	expr: ts.Expression,
	sf: ts.SourceFile,
	src: string,
): { name: string | null; sources: ToolSources } {
	const sources: ToolSources = {
		handlerSource: null,
		inputSchemaSource: null,
		outputSchemaSource: null,
		suspendSchemaSource: null,
		resumeSchemaSource: null,
		toMessageSource: null,
		needsApprovalFnSource: null,
	};

	const name = findConstructorName(expr);

	walkMethodChain(expr, (methodName, args) => {
		if (args.length === 0) return;
		const argSource = nodeText(args[0], sf, src);

		switch (methodName) {
			case 'handler':
				sources.handlerSource = argSource;
				break;
			case 'input':
				sources.inputSchemaSource = argSource;
				break;
			case 'output':
				sources.outputSchemaSource = argSource;
				break;
			case 'suspend':
				sources.suspendSchemaSource = argSource;
				break;
			case 'resume':
				sources.resumeSchemaSource = argSource;
				break;
			case 'toMessage':
				sources.toMessageSource = argSource;
				break;
			case 'needsApprovalFn':
				sources.needsApprovalFnSource = argSource;
				break;
		}
	});

	return { name, sources };
}

/** Extract eval sources: the .check() or .judge() handler body. */
function extractEvalSource(
	expr: ts.Expression,
	sf: ts.SourceFile,
	src: string,
): { name: string | null; handlerSource: string | null } {
	const name = findConstructorName(expr);
	let handlerSource: string | null = null;

	walkMethodChain(expr, (methodName, args) => {
		if (args.length === 0) return;
		if (methodName === 'check' || methodName === 'judge') {
			handlerSource = nodeText(args[0], sf, src);
		}
	});

	return { name, handlerSource };
}

/** Extract MCP config sources from a `new McpClient([...configs])` expression. */
function extractMcpConfigs(
	expr: ts.Expression,
	sf: ts.SourceFile,
	src: string,
): Map<string, string> {
	const configs = new Map<string, string>();

	// Find the new McpClient(...) at the base
	let base = expr;
	while (ts.isCallExpression(base)) {
		const callExpr = base.expression;
		if (ts.isPropertyAccessExpression(callExpr)) {
			base = callExpr.expression;
		} else {
			break;
		}
	}

	if (!ts.isNewExpression(base) || !base.arguments || base.arguments.length === 0) {
		return configs;
	}

	const firstArg = base.arguments[0];
	if (!ts.isArrayLiteralExpression(firstArg)) {
		return configs;
	}

	for (const element of firstArg.elements) {
		if (ts.isObjectLiteralExpression(element)) {
			// Find the 'name' property
			let serverName: string | null = null;
			for (const prop of element.properties) {
				if (
					ts.isPropertyAssignment(prop) &&
					ts.isIdentifier(prop.name) &&
					prop.name.text === 'name' &&
					ts.isStringLiteral(prop.initializer)
				) {
					serverName = prop.initializer.text;
					break;
				}
			}
			if (serverName) {
				configs.set(serverName, nodeText(element, sf, src));
			}
		}
	}

	return configs;
}

/**
 * Resolve an expression that might be a variable reference.
 * If the expression is an identifier that matches a known variable declaration,
 * return the initializer expression. Otherwise return the expression as-is.
 */
function resolveExpression(
	expr: ts.Expression,
	varDecls: Map<string, ts.Expression>,
): ts.Expression {
	if (ts.isIdentifier(expr)) {
		const resolved = varDecls.get(expr.text);
		if (resolved) return resolved;
	}
	return expr;
}

/** Walk the agent builder chain and populate the result. */
function walkAgentChain(
	expr: ts.Expression,
	sf: ts.SourceFile,
	src: string,
	varDecls: Map<string, ts.Expression>,
	result: ExtractedSources,
): void {
	walkMethodChain(expr, (methodName, args) => {
		if (args.length === 0) return;

		switch (methodName) {
			case 'tool': {
				const toolExpr = resolveExpression(args[0], varDecls);
				// Handle both single tool and array form: .tool([tool1, tool2])
				if (ts.isArrayLiteralExpression(toolExpr)) {
					for (const element of toolExpr.elements) {
						const elementExpr = resolveExpression(element, varDecls);
						const { name, sources } = extractToolSources(elementExpr, sf, src);
						if (name) {
							result.tools.set(name, sources);
						}
					}
				} else {
					const { name, sources } = extractToolSources(toolExpr, sf, src);
					if (name) {
						result.tools.set(name, sources);
					}
				}
				break;
			}

			case 'providerTool': {
				const argSource = nodeText(args[0], sf, src);
				// Try to extract a name from the expression
				const resolved = resolveExpression(args[0], varDecls);
				// Provider tools are typically function calls like `anthropicWebSearch()`
				// Use the full source as both key and value
				const name = extractProviderToolName(resolved, sf, src);
				result.providerTools.set(name ?? argSource, argSource);
				break;
			}

			case 'memory': {
				result.memory = nodeText(args[0], sf, src);
				break;
			}

			case 'eval': {
				const evalExpr = resolveExpression(args[0], varDecls);
				const { name, handlerSource } = extractEvalSource(evalExpr, sf, src);
				if (name && handlerSource) {
					result.evals.set(name, handlerSource);
				}
				break;
			}

			case 'inputGuardrail':
			case 'outputGuardrail': {
				const argSource = nodeText(args[0], sf, src);
				// Try to find a name from the expression
				const resolved = resolveExpression(args[0], varDecls);
				const guardrailName = findConstructorName(resolved);
				result.guardrails.set(guardrailName ?? argSource, argSource);
				break;
			}

			case 'mcp': {
				const mcpExpr = resolveExpression(args[0], varDecls);
				const configs = extractMcpConfigs(mcpExpr, sf, src);
				for (const [name, configSource] of configs) {
					result.mcpConfigs.set(name, configSource);
				}
				break;
			}

			case 'telemetry': {
				result.telemetry = nodeText(args[0], sf, src);
				break;
			}

			case 'checkpoint': {
				result.checkpoint = nodeText(args[0], sf, src);
				break;
			}

			case 'structuredOutput': {
				result.structuredOutputSource = nodeText(args[0], sf, src);
				break;
			}
		}
	});
}

/** Try to extract a readable name for a provider tool expression. */
function extractProviderToolName(
	expr: ts.Expression,
	_sf: ts.SourceFile,
	_src: string,
): string | null {
	// e.g. anthropicWebSearch() — call expression with identifier
	if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
		return expr.expression.text;
	}
	// e.g. someVar (identifier)
	if (ts.isIdentifier(expr)) {
		return expr.text;
	}
	return null;
}
