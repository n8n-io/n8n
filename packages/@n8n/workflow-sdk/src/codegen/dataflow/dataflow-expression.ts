/**
 * Expression conversion between n8n expression syntax and data-flow JS property access.
 *
 * n8n expressions: `={{ $json.email }}`, `={{ $("Node").item.json.x }}`
 * Data-flow format: `varName[0].json.email`, `nodeVar[0].json.x`
 */

// Matches a full n8n expression: ={{ ... }}
const FULL_EXPRESSION_RE = /^=\{\{(.+)\}\}$/s;

// Matches embedded {{ ... }} blocks inside mixed text
const EMBEDDED_EXPRESSION_RE = /\{\{(.+?)\}\}/g;

// Matches simple $json property access: $json.foo.bar or $json["foo bar"]
const SIMPLE_JSON_RE = /^\s*\$json((?:\.\w+|\["[^"]*"\])+)\s*$/;

// Matches $("NodeName").item.json.prop access
const NODE_REF_RE = /^\s*\$\("([^"]+)"\)\.item\.json((?:\.\w+|\["[^"]*"\])*)\s*$/;

// Matches a data-flow property access: varName[0].json.prop
const DATAFLOW_ACCESS_RE = /^(\w+)\[0\]\.json((?:\.\w+|\["[^"]*"\])*)$/;

// Matches an expr('...') wrapper
const EXPR_WRAPPER_SINGLE_RE = /^expr\('(.*)'\)$/s;
const EXPR_WRAPPER_DOUBLE_RE = /^expr\("(.*)"\)$/s;

// Matches a quoted string literal
const QUOTED_STRING_RE = /^'(.*)'$/s;

// Matches a template literal
const TEMPLATE_LITERAL_RE = /^`(.*)`$/s;

// Matches ${...} inside a template literal
const TEMPLATE_EXPR_RE = /\$\{([^}]+)\}/g;

/**
 * Convert a single n8n expression body (the content inside {{ }}) to data-flow JS.
 * Returns `undefined` if the expression doesn't match any simple pattern.
 */
function convertExpressionBody(
	body: string,
	sourceVarName: string,
	varMap?: Map<string, string>,
): string | undefined {
	// Try simple $json access
	const jsonMatch = SIMPLE_JSON_RE.exec(body);
	if (jsonMatch) {
		return `${sourceVarName}[0].json${jsonMatch[1]}`;
	}

	// Try $("NodeName").item.json access
	const nodeMatch = NODE_REF_RE.exec(body);
	if (nodeMatch) {
		const nodeName = nodeMatch[1];
		const propPath = nodeMatch[2];
		const varName = varMap?.get(nodeName);
		if (varName) {
			return `${varName}[0].json${propPath}`;
		}
		// No mapping found — fall through to expr() fallback
		return undefined;
	}

	return undefined;
}

/**
 * Escape a string for use inside single quotes.
 */
function escapeForSingleQuote(str: string): string {
	return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Convert an n8n expression string to data-flow JS property access format.
 *
 * @param expr - The n8n expression (e.g., `={{ $json.email }}`)
 * @param sourceVarName - The variable name for the source node's output
 * @param varMap - Optional map from node names to variable names
 * @returns Data-flow JS expression string
 */
export function n8nExprToDataFlow(
	expr: string,
	sourceVarName: string,
	varMap?: Map<string, string>,
): string {
	// Check if it's a full expression: ={{ ... }}
	const fullMatch = FULL_EXPRESSION_RE.exec(expr);
	if (fullMatch) {
		const body = fullMatch[1];
		const converted = convertExpressionBody(body, sourceVarName, varMap);
		if (converted !== undefined) {
			return converted;
		}
		// Complex expression — wrap in expr()
		return `expr('${escapeForSingleQuote(`{{ ${body.trim()} }}`)}')`;
	}

	// Check for mixed text + expressions: Hello {{ $json.name }}
	if (EMBEDDED_EXPRESSION_RE.test(expr)) {
		// Reset regex lastIndex
		EMBEDDED_EXPRESSION_RE.lastIndex = 0;

		let hasAllConverted = true;
		const templateParts: string[] = [];
		let lastIndex = 0;

		let match: RegExpExecArray | null;
		while ((match = EMBEDDED_EXPRESSION_RE.exec(expr)) !== null) {
			// Add text before this expression
			if (match.index > lastIndex) {
				templateParts.push(expr.slice(lastIndex, match.index));
			}

			const body = match[1];
			const converted = convertExpressionBody(body, sourceVarName, varMap);
			if (converted !== undefined) {
				templateParts.push(`\${${converted}}`);
			} else {
				hasAllConverted = false;
				break;
			}

			lastIndex = match.index + match[0].length;
		}

		if (hasAllConverted) {
			// Add trailing text
			if (lastIndex < expr.length) {
				templateParts.push(expr.slice(lastIndex));
			}
			return `\`${templateParts.join('')}\``;
		}

		// Fall through to expr() if we couldn't convert all parts
		EMBEDDED_EXPRESSION_RE.lastIndex = 0;
		return `expr('${escapeForSingleQuote(expr)}')`;
	}

	// Non-expression plain string
	return `'${escapeForSingleQuote(expr)}'`;
}

/**
 * Convert a single data-flow JS var access to n8n expression format.
 * Returns the expression body (without ={{ }}) and whether it's a node reference.
 */
function convertDataFlowAccess(
	jsExpr: string,
	varToNodeName?: Map<string, string>,
): string | undefined {
	const accessMatch = DATAFLOW_ACCESS_RE.exec(jsExpr);
	if (!accessMatch) return undefined;

	const varName = accessMatch[1];
	const propPath = accessMatch[2];

	const nodeName = varToNodeName?.get(varName);
	if (nodeName) {
		return `$("${nodeName}").item.json${propPath}`;
	}

	// Default: treat as $json (source node)
	return `$json${propPath}`;
}

/**
 * Convert a data-flow JS expression back to n8n expression format.
 *
 * @param jsExpr - The data-flow JS expression (e.g., `input[0].json.email`)
 * @param varToNodeName - Optional map from variable names to node names
 * @returns n8n expression string
 */
export function dataFlowExprToN8n(jsExpr: string, varToNodeName?: Map<string, string>): string {
	// Check for expr('...') wrapper
	const exprSingleMatch = EXPR_WRAPPER_SINGLE_RE.exec(jsExpr);
	if (exprSingleMatch) {
		const inner = exprSingleMatch[1];
		return `=${inner}`;
	}

	const exprDoubleMatch = EXPR_WRAPPER_DOUBLE_RE.exec(jsExpr);
	if (exprDoubleMatch) {
		const inner = exprDoubleMatch[1];
		return `=${inner}`;
	}

	// Check for template literal
	const templateMatch = TEMPLATE_LITERAL_RE.exec(jsExpr);
	if (templateMatch) {
		const templateBody = templateMatch[1];

		// Replace all ${var[0].json.prop} with {{ $json.prop }}
		const converted = templateBody.replace(TEMPLATE_EXPR_RE, (_match, innerExpr: string) => {
			const n8nExpr = convertDataFlowAccess(innerExpr.trim(), varToNodeName);
			if (n8nExpr) {
				return `{{ ${n8nExpr} }}`;
			}
			return `{{ ${innerExpr} }}`;
		});

		return converted;
	}

	// Check for quoted string literal
	const quotedMatch = QUOTED_STRING_RE.exec(jsExpr);
	if (quotedMatch) {
		return quotedMatch[1];
	}

	// Check for direct data-flow access: var[0].json.prop
	const n8nExpr = convertDataFlowAccess(jsExpr, varToNodeName);
	if (n8nExpr) {
		return `={{ ${n8nExpr} }}`;
	}

	// Unknown format — return as-is
	return jsExpr;
}
