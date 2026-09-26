import { readFileSync } from 'fs';

import type { ConfigFileValue } from './external-secrets-config-file.schema';

export function resolveConfigFileValue(value: ConfigFileValue, context: string): string {
	if (typeof value === 'string') {
		return value;
	}

	if ('fromEnv' in value) {
		const resolved = process.env[value.fromEnv];
		if (resolved === undefined) {
			throw new Error(`${context}: environment variable "${value.fromEnv}" is not set`);
		}
		return resolved;
	}

	try {
		return readFileSync(value.fromFile, 'utf8').trim();
	} catch (error) {
		throw new Error(
			`${context}: could not read file "${value.fromFile}": ${(error as Error).message}`,
		);
	}
}

export function resolveConfigFileSettings(
	settings: Record<string, ConfigFileValue>,
	context: string,
): Record<string, string> {
	const resolved: Record<string, string> = {};
	const errors: string[] = [];

	for (const [field, value] of Object.entries(settings)) {
		try {
			resolved[field] = resolveConfigFileValue(value, `${context} (field "${field}")`);
		} catch (error) {
			errors.push((error as Error).message);
		}
	}

	if (errors.length > 0) {
		throw new Error(errors.join('\n'));
	}

	return resolved;
}
