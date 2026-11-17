import ts from 'typescript';

type Path = string[];

const MAX_PATHS = 32;
const STOP_VALUES: unknown[] = [false, null, '', [], 0];
export const NEXT_PAGE = 'page2';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

function pathOf(node: ts.Expression): Path | undefined {
	if (ts.isIdentifier(node)) return [];
	if (ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node) || ts.isAsExpression(node))
		return pathOf(node.expression);
	if (ts.isPropertyAccessExpression(node)) {
		const head = pathOf(node.expression);
		return head === undefined ? undefined : [...head, node.name.text];
	}
	if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
		const head = pathOf(node.expression);
		return head === undefined ? undefined : [...head, node.argumentExpression.text];
	}
	return undefined;
}

function rootOf(node: ts.Expression): string | undefined {
	if (ts.isIdentifier(node)) return node.text;
	if (
		ts.isParenthesizedExpression(node) ||
		ts.isNonNullExpression(node) ||
		ts.isAsExpression(node) ||
		ts.isPropertyAccessExpression(node) ||
		ts.isElementAccessExpression(node)
	)
		return rootOf(node.expression);
	return undefined;
}

export function loopPaths(source: string): Path[] {
	const file = ts.createSourceFile('node.ts', source, ts.ScriptTarget.ES2022, true);
	const found = new Map<string, Path>();
	const names = new Set<string>();
	const keep = (path: Path) => {
		const members = path.at(-1) === 'length' ? path.slice(0, -1) : path;
		if (members.length > 0 && found.size < MAX_PATHS) found.set(members.join('\n'), members);
	};
	const read = (node: ts.Node, follow: boolean): void => {
		if (
			ts.isIdentifier(node) ||
			ts.isPropertyAccessExpression(node) ||
			ts.isElementAccessExpression(node)
		) {
			const path = pathOf(node);
			const root = rootOf(node);
			if (path !== undefined) {
				keep(path);
				if (follow && root !== undefined) names.add(root);
				return;
			}
		}
		ts.forEachChild(node, (child) => read(child, follow));
	};
	const conditions = (node: ts.Node): void => {
		if (ts.isDoStatement(node) || ts.isWhileStatement(node)) read(node.expression, true);
		if (ts.isForStatement(node) && node.condition) read(node.condition, true);
		ts.forEachChild(node, conditions);
	};
	conditions(file);
	const sources = (node: ts.Node): void => {
		if (
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			ts.isIdentifier(node.left) &&
			names.has(node.left.text)
		)
			read(node.right, false);
		if (ts.isVariableDeclaration(node) && node.initializer) {
			if (ts.isIdentifier(node.name) && names.has(node.name.text)) read(node.initializer, false);
			if (ts.isObjectBindingPattern(node.name)) {
				const head = pathOf(node.initializer);
				for (const element of node.name.elements) {
					const member = element.propertyName ?? element.name;
					if (
						head !== undefined &&
						ts.isIdentifier(element.name) &&
						names.has(element.name.text) &&
						ts.isIdentifier(member)
					)
						keep([...head, member.text]);
				}
			}
		}
		ts.forEachChild(node, sources);
	};
	sources(file);
	return [...found.values()];
}

function withMember(body: unknown, path: Path, value: (now: unknown) => unknown): unknown {
	const [name, ...rest] = path;
	if (name === undefined) return value(body);
	if (!isRecord(body)) return body;
	if (rest.length > 0 && !isRecord(body[name])) {
		const made = withMember({}, rest, value);
		return isRecord(made) && Object.keys(made).length === 0 ? body : { ...body, [name]: made };
	}
	const next = withMember(body[name], rest, value);
	if (next === undefined) {
		const { [name]: _dropped, ...others } = body;
		return others;
	}
	return { ...body, [name]: next };
}

const withAll = (body: unknown, paths: Path[], value: (now: unknown) => unknown): unknown =>
	paths.reduce((made, path) => withMember(made, path, value), body);

function withoutLists(body: unknown): unknown {
	if (Array.isArray(body)) return [];
	if (!isRecord(body)) return body;
	return Object.fromEntries(Object.entries(body).map(([key, value]) => [key, withoutLists(value)]));
}

export function nextPageOf(body: unknown, paths: Path[]): unknown {
	return withAll(body, paths, (now) =>
		now === undefined || now === null || typeof now !== 'object' ? NEXT_PAGE : now,
	);
}

export function lastPagesOf(body: unknown, paths: Path[]): unknown[] {
	const made = [
		...STOP_VALUES.map((stop) => withAll(body, paths, () => stop)),
		withAll(body, paths, () => undefined),
		withoutLists(body),
		{},
		[],
	];
	const seen = new Set<string>();
	return made.filter((answer) => {
		const text = JSON.stringify(answer);
		if (seen.has(text)) return false;
		seen.add(text);
		return true;
	});
}
