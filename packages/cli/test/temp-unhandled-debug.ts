// TEMP DEBUG (do not commit): name the source of an unhandled rejection.
import { expect } from 'vitest';

process.on('unhandledRejection', (reason) => {
	const worker = (globalThis as { __vitest_worker__?: { filepath?: string } }).__vitest_worker__;
	let detail: string;
	try {
		detail = reason instanceof Error ? (reason.stack ?? reason.message) : JSON.stringify(reason);
	} catch {
		detail = String(reason);
	}
	console.error(
		`[TEMP unhandled] file=${worker?.filepath} test=${expect.getState().currentTestName} ` +
			`type=${typeof reason} ctor=${(reason as object | null)?.constructor?.name} detail=${detail}`,
	);
});
