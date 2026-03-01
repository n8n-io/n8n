import type { CallExpression, Identifier, Node, Program } from 'acorn';
import { parse } from 'acorn';
import { ancestor } from 'acorn-walk';
import type { Result } from 'n8n-workflow';
import { toResult } from 'n8n-workflow';

import {
	isAssignmentExpression,
	isIdentifier,
	isLiteral,
	isMemberExpression,
	isVariableDeclarator,
} from './acorn-helpers';
import { BuiltInsParserState } from './built-ins-parser-state';

/**
 * Class for parsing Code Node code to identify which built-in variables
 * are accessed
 */
export class BuiltInsParser {
	/**
	 * Parses which built-in variables are accessed in the given code
	 */
	parseUsedBuiltIns(code: string): Result<BuiltInsParserState, Error> {
		return toResult(() => {
			const wrappedCode = `async function VmCodeWrapper() { ${code} }`;
			const ast = parse(wrappedCode, { ecmaVersion: 2025, sourceType: 'module' });

			return this.identifyBuiltInsByWalkingAst(ast);
		});
	}

	/** Traverse the AST of the script and mark any data needed for it to run. */
	private identifyBuiltInsByWalkingAst(ast: Program) {
		const accessedBuiltIns = new BuiltInsParserState();

		ancestor(
			ast,
			{
				CallExpression: this.visitCallExpression,
				Identifier: this.visitIdentifier,
			},
			undefined,
			accessedBuiltIns,
		);

		return accessedBuiltIns;
	}

	private visitCallExpression = (
		node: CallExpression,
		state: BuiltInsParserState,
		ancestors: Node[],
	) => {
		// $(...)
		const isDollar = node.callee.type === 'Identifier' && node.callee.name === '$';
		const isItems = node.callee.type === 'Identifier' && node.callee.name === '$items';
		if (isDollar) {
			this.visitDollarCallExpression(node, state, ancestors);
		} else if (isItems) {
			// $items(...) is a legacy syntax that is not documented but we still
			// need to support it for backwards compatibility
			this.visitDollarItemsCallExpression(node, state);
		}
	};

	/** $(...) */
	private visitDollarCallExpression(
		node: CallExpression,
		state: BuiltInsParserState,
		ancestors: Node[],
	) {
		// $(): This is not valid, ignore
		if (node.arguments.length === 0) {
			return;
		}

		const firstArg = node.arguments[0];
		if (!isLiteral(firstArg)) {
			// $(variable): Can't easily determine statically, mark all nodes as needed
			state.markNeedsAllNodes();
			return;
		}

		if (typeof firstArg.value !== 'string') {
			// $(123): Static value, but not a string --> invalid code --> ignore
			return;
		}

		// $("node"): Static value, mark 'nodeName' as needed
		state.markNodeAsNeeded(firstArg.value);

		// Determine how $("node") is used
		this.handlePrevNodeCall(node, state, ancestors);
	}

	/** $items(...) */
	private visitDollarItemsCallExpression(node: CallExpression, state: BuiltInsParserState) {
		// $items(): This gets items from the previous node
		if (node.arguments.length === 0) {
			state.markInputAsNeeded();
			return;
		}

		const firstArg = node.arguments[0];
		if (!isLiteral(firstArg)) {
			// $items(variable): Can't easily determine statically, mark all nodes as needed
			state.markNeedsAllNodes();
			return;
		}

		if (typeof firstArg.value !== 'string') {
			// $items(123): Static value, but not a string --> unsupported code --> ignore
			return;
		}

		// $items(nodeName): Static value, mark 'nodeName' as needed
		state.markNodeAsNeeded(firstArg.value);
	}

	private handlePrevNodeCall(_node: CallExpression, state: BuiltInsParserState, ancestors: Node[]) {
		// $("node").item, .pairedItem or .itemMatching: In a case like this, the execution
		// engine will traverse back from current node (i.e. the Code Node) to
		// the "node" node and use `pairedItem`s to find which item is linked
		// to the current item. So, we need to mark all nodes as needed.
		// TODO: We could also mark all the nodes between the current node and
		// the "node" node as needed, but that would require more complex logic.
		const directParent = ancestors[ancestors.length - 2];
		if (isMemberExpression(directParent)) {
			const accessedProperty = directParent.property;

			if (directParent.computed) {
				// $("node")["item"], ["pairedItem"] or ["itemMatching"]
				if (isLiteral(accessedProperty)) {
					if (this.isPairedItemProperty(accessedProperty.value)) {
						state.markNeedsAllNodes();
					}
					// Else: $("node")[123]: Static value, but not any of the ones above --> ignore
				}
				// $("node")[variable]
				else if (isIdentifier(accessedProperty)) {
					state.markNeedsAllNodes();
				}
			}
			// $("node").item, .pairedItem or .itemMatching
			else if (isIdentifier(accessedProperty) && this.isPairedItemProperty(accessedProperty.name)) {
				state.markNeedsAllNodes();
			}
		} else if (isVariableDeclarator(directParent) || isAssignmentExpression(directParent)) {
			// const variable = $("node") or variable = $("node"):
			// In this case we would need to track down all the possible use sites
			// of 'variable' and determine if `.item` is accessed on it. This is
			// more complex and skipped for now.
			// TODO: Optimize for this case
			state.markNeedsAllNodes();
		} else {
			// Something else than the cases above. Mark all nodes as needed as it
			// could be a dynamic access.
			state.markNeedsAllNodes();
		}
	}

	private visitIdentifier = (node: Identifier, state: BuiltInsParserState) => {
		if (node.name === '$env') {
			state.markEnvAsNeeded();
		} else if (node.name === '$item') {
			// $item is legacy syntax that is basically an alias for WorkflowDataProxy
			// and allows accessing any data. We need to support it for backwards
			// compatibility, but we're not gonna implement any optimizations
			state.markNeedsAllNodes();
		} else if (
			node.name === '$input' ||
			node.name === '$json' ||
			node.name === 'items' ||
			// item is deprecated but we still need to support it
			node.name === 'item'
		) {
			state.markInputAsNeeded();
		} else if (node.name === '$node') {
			// $node is legacy way of accessing any node's output. We need to
			// support it for backward compatibility, but we're not gonna
			// implement any optimizations
			state.markNeedsAllNodes();
		} else if (node.name === '$execution') {
			state.markExecutionAsNeeded();
		} else if (node.name === '$prevNode') {
			state.markPrevNodeAsNeeded();
		}
	};

	private isPairedItemProperty(
		property?: string | boolean | null | number | RegExp | bigint,
	): boolean {
		return property === 'item' || property === 'pairedItem' || property === 'itemMatching';
	}
}
