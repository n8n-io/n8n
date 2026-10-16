// TEMP DEBUG (do not merge): name the source of an unhandled rejection.
// Writes straight to fd 2, because worker console output can be dropped after a file ends.
import { writeSync } from 'node:fs';

const key = Symbol.for('n8n.tempUnhandledDebug');
const state = globalThis as unknown as Record<symbol, boolean>;

function describe(reason: unknown): string {
	if (reason instanceof Error) return reason.stack ?? reason.message;
	try {
		return `${typeof reason} ${(reason as object | null)?.constructor?.name} ${JSON.stringify(reason)}`;
	} catch {
		return `${typeof reason} ${String(reason)}`;
	}
}

export function register(): void {
	if (state[key]) return;
	const where = '__vitest_worker__' in globalThis ? 'worker' : 'main';
	state[key] = true;
	writeSync(2, `[TEMP unhandled] listener registered in ${where} pid=${process.pid}\n`);
	process.on('unhandledRejection', (reason) => {
		const worker = (
			globalThis as { __vitest_worker__?: { filepath?: string; current?: { name?: string } } }
		).__vitest_worker__;
		writeSync(
			2,
			`[TEMP unhandled] REJECTION in ${where} pid=${process.pid} file=${worker?.filepath} ` +
				`test=${worker?.current?.name} reason=${describe(reason)}\n`,
		);
	});
}

register();
