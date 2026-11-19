import { parse } from 'yaml';

function withoutCycles(value: unknown, ancestors: object[] = []): unknown {
	if (typeof value !== 'object' || value === null) return value;
	if (ancestors.includes(value)) return {};
	const path = [...ancestors, value];
	if (Array.isArray(value)) return value.map((item: unknown) => withoutCycles(item, path));
	return Object.fromEntries(
		Object.entries(value).map(([key, item]) => [key, withoutCycles(item, path)]),
	);
}

export function parseYaml(text: string): unknown {
	const document: unknown = parse(text, { maxAliasCount: -1 });
	return withoutCycles(document);
}
