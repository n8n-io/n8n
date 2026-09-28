import ts from 'typescript';

/** One page derived from a router route entry. Shaped like `PageNode` so the same tree logic applies. */
type DerivedRoute = {
	id: string;
	parentPageId: string | null;
	route: string;
};

const stripSlashes = (path: string) => path.replace(/^\/+|\/+$/g, '');

/** "/success/:type" -> ["success", ":type"]; "/" or "" (the index route) -> []. */
function splitSegments(path: string): string[] {
	const stripped = stripSlashes(path);
	return stripped === '' ? [] : stripped.split('/');
}

/** The index route's stand-in id: base64url of its (empty) path is itself empty. */
const INDEX_ID = '__index__';

/**
 * `id` doubles as vue-router's `:pageId` param on the frontend, which can't
 * contain '/' — base64url-encoding the node's full path keeps it a single
 * URL segment regardless of nesting depth, and is deterministic across
 * requests (this is recomputed from source on every read, not stored).
 */
function nodeId(fullSegments: string[]): string {
	const path = fullSegments.join('/');
	return path === '' ? INDEX_ID : Buffer.from(path).toString('base64url');
}

/**
 * Builds the page tree from full URL paths, trie-merged on shared prefixes —
 * so "/success" and "/success/:type" end up as parent and child here
 * regardless of whether `router.ts` declared the second via `children` or
 * as an unrelated flat entry that merely happens to extend the first one's
 * path. A prefix with no route of its own (e.g. only "/success/:type" is
 * declared, no bare "/success") still gets a synthetic node, since the UI
 * needs somewhere to attach the child.
 */
class RouteTree {
	private readonly nodes = new Map<string, DerivedRoute>();

	add(fullSegments: string[]): void {
		this.getOrCreate(fullSegments);
	}

	toList(): DerivedRoute[] {
		return [...this.nodes.values()];
	}

	private getOrCreate(fullSegments: string[]): DerivedRoute {
		const path = fullSegments.join('/');
		const existing = this.nodes.get(path);
		if (existing) return existing;

		const parentSegments = fullSegments.slice(0, -1);
		const parentPageId = parentSegments.length > 0 ? this.getOrCreate(parentSegments).id : null;
		const node: DerivedRoute = {
			id: nodeId(fullSegments),
			parentPageId,
			route: fullSegments[fullSegments.length - 1] ?? '',
		};
		this.nodes.set(path, node);
		return node;
	}
}

const stringLiteralValue = (node: ts.Expression): string | undefined =>
	ts.isStringLiteralLike(node) ? node.text : undefined;

function findProperty(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
	for (const property of object.properties) {
		if (
			ts.isPropertyAssignment(property) &&
			ts.isIdentifier(property.name) &&
			property.name.text === name
		) {
			return property.initializer;
		}
	}
	return undefined;
}

function walkRoutes(
	elements: ts.NodeArray<ts.Expression>,
	parentSegments: string[],
	tree: RouteTree,
): void {
	for (const element of elements) {
		if (!ts.isObjectLiteralExpression(element)) continue;
		const pathExpr = findProperty(element, 'path');
		const path = pathExpr && stringLiteralValue(pathExpr);
		if (path === undefined) continue;

		const fullSegments = [...parentSegments, ...splitSegments(path)];
		tree.add(fullSegments);

		const childrenExpr = findProperty(element, 'children');
		if (childrenExpr && ts.isArrayLiteralExpression(childrenExpr)) {
			walkRoutes(childrenExpr.elements, fullSegments, tree);
		}
	}
}

/**
 * Parses the `routes` array passed to `createRouter(...)` in an app's
 * `src/router.ts` — without executing any code — into the same
 * `{ id, parentPageId, route }` tree shape the (unused) DB `Page` model used.
 *
 * Only understands the literal shape the `app-builder` skill instructs the
 * AI to write: a flat array of `{ path, component }` objects, optionally
 * nested under `children`. A `router.ts` that isn't in this shape (or isn't
 * there at all) yields `[]`, not an error — arbitrary dynamic route
 * construction isn't supported, and doesn't need to be.
 */
export function deriveRoutesFromRouterSource(source: string): DerivedRoute[] {
	const sourceFile = ts.createSourceFile(
		'router.ts',
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const tree = new RouteTree();

	function visit(node: ts.Node): void {
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === 'createRouter' &&
			node.arguments.length > 0 &&
			ts.isObjectLiteralExpression(node.arguments[0])
		) {
			const routesExpr = findProperty(node.arguments[0], 'routes');
			if (routesExpr && ts.isArrayLiteralExpression(routesExpr)) {
				walkRoutes(routesExpr.elements, [], tree);
			}
			return;
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return tree.toList();
}
