import { runInNewContext } from 'node:vm';

import {
	CREDENTIAL_FLAG_NAME,
	credentialFlagKey,
	MAX_CREDENTIAL_FLAGS,
} from '../credentials/flags.ts';
import type { CredentialDerivation } from './specialise.ts';

const MAX_SLOT_FLAGS = MAX_CREDENTIAL_FLAGS * 64;

export function evaluateInSandbox(code: string): unknown {
	return runInNewContext(code, Object.create(null), { timeout: 100 });
}

export function evaluateDerivation(
	code: string,
	data: Record<string, unknown>,
): string | undefined {
	const result: unknown = runInNewContext(
		`(${code})(data)`,
		{ data: structuredClone(data), Buffer, btoa },
		{ timeout: 100 },
	);
	return typeof result === 'string' ? result : undefined;
}

export function evaluateFlag(code: string, data: Record<string, unknown>): boolean | undefined {
	try {
		const result: unknown = runInNewContext(
			`(${code})(data)`,
			{ data: structuredClone(data), Buffer, btoa },
			{ timeout: 100 },
		);
		return typeof result === 'boolean' ? result : undefined;
	} catch {
		return undefined;
	}
}

export interface CredentialFlagResult {
	flags: Record<string, boolean>;
	withheld: string[];
}

export function evaluateCredentialFlags(
	derivations: CredentialDerivation[],
	data: Record<string, unknown>,
): CredentialFlagResult {
	const values: Record<string, boolean> = {};
	const named = derivations
		.filter((d) => d.kind === 'flag' && CREDENTIAL_FLAG_NAME.test(d.name))
		.slice(0, MAX_SLOT_FLAGS);
	for (const { name, code } of named) {
		const value = evaluateFlag(code, data);
		if (value !== undefined) values[name] = value;
	}
	const allowed = new Set<string>();
	const refused = new Set<string>();
	for (const guard of derivations) {
		if (guard.kind !== 'guard') continue;
		const names = guard.flags ?? [];
		const known = names.length > 0 && names.every((name) => Object.hasOwn(values, name));
		const checked = known && (guard.allowed ?? []).includes(credentialFlagKey(names, values));
		for (const name of names) (checked ? allowed : refused).add(name);
	}
	const flags: Record<string, boolean> = {};
	const withheld: string[] = [];
	for (const { name } of named) {
		if (allowed.has(name) && !refused.has(name)) flags[name] = values[name];
		else withheld.push(name);
	}
	return { flags, withheld };
}
