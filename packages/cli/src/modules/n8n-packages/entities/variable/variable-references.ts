export interface VariableReferenceSource {
	nodes?: Array<{ parameters?: unknown }>;
	settings?: unknown;
}

const VARS_REFERENCE_PATTERN =
	/\$vars\s*(?:\.\s*([A-Za-z_][A-Za-z0-9_]*)|\[\s*(?:'([^']+)'|"([^"]+)")\s*\])/g;

export function extractVariableNames(source: VariableReferenceSource): string[] {
	const names = new Set<string>();
	for (const node of source.nodes ?? []) scan(node.parameters, names);
	scan(source.settings, names);
	return [...names];
}

function scan(value: unknown, names: Set<string>): void {
	if (typeof value === 'string') {
		for (const match of value.matchAll(VARS_REFERENCE_PATTERN)) {
			const name = match[1] ?? match[2] ?? match[3];
			if (name) names.add(name);
		}
		return;
	}
	if (Array.isArray(value)) {
		for (const item of value) scan(item, names);
		return;
	}
	if (value !== null && typeof value === 'object') {
		for (const nested of Object.values(value)) scan(nested, names);
	}
}
