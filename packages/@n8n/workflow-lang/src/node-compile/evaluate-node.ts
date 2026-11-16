import { runInNewContext } from 'node:vm';

export function evaluateInSandbox(code: string): unknown {
	return runInNewContext(code, Object.create(null), { timeout: 100 });
}
