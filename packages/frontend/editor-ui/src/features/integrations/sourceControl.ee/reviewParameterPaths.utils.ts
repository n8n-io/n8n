import type { INodeParameters } from 'n8n-workflow';

/** Lists dot-paths under `parameters.*` for PR comment anchoring. */
export function listParameterJsonPaths(parameters: INodeParameters | undefined): string[] {
	if (!parameters) return [];

	const paths: string[] = [];

	const walk = (value: unknown, prefix: string) => {
		if (value === null || typeof value !== 'object' || Array.isArray(value)) {
			paths.push(prefix);
			return;
		}

		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) {
			paths.push(prefix);
			return;
		}

		for (const [key, nested] of entries) {
			walk(nested, `${prefix}.${key}`);
		}
	};

	for (const [key, value] of Object.entries(parameters)) {
		walk(value, `parameters.${key}`);
	}

	return paths.sort();
}
