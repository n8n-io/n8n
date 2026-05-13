// Emits a single deterministic readiness marker to stdout. Container
// orchestrators (and the user) can grep for the exact string `headless: ready`
// to know that import + activate have completed and the workflow set is live.
// This is the only deliberate write to stdout in the headless command — all
// other diagnostics go through the n8n Logger (stderr).

const READY_LINE = 'headless: ready\n';

export function signalReady(): void {
	process.stdout.write(READY_LINE);
}
