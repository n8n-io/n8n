/**
 * Lazy loader for `@daytonaio/sdk`.
 *
 * Eagerly importing the Daytona SDK pulls in the SDK itself (~0.30 MiB),
 * `@daytona/api-client` (1.18 MiB, 207 files), and `@daytona/toolbox-api-client`
 * (0.37 MiB, 101 files) — ~333 source files of REST API client code, schemas,
 * and auto-generated typescript-axios bindings. None of this is needed until a
 * user actually starts a Daytona sandbox (i.e. real workflow-builder run).
 *
 * The require-cache probe (bench/probe-require-cache.mjs) confirmed these
 * three packages are loaded only in the `instance_ai` boot condition and
 * contribute the largest remaining slice after the jsdom win.
 *
 * `SandboxState` is a string-literal const object (not a TS enum), so its
 * values are stable across SDK versions and safe to inline at call sites
 * that would otherwise force eager evaluation (the static field initializer
 * in `DaytonaSandbox.DEAD_STATES`).
 */

let _daytonaMod: typeof import('@daytonaio/sdk') | undefined;

export function loadDaytona(): typeof import('@daytonaio/sdk') {
	if (!_daytonaMod) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		_daytonaMod = require('@daytonaio/sdk');
	}
	return _daytonaMod!;
}
