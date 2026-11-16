import { runInNewContext } from 'node:vm';

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
