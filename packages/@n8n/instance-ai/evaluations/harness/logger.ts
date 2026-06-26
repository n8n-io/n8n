// ---------------------------------------------------------------------------
// Simple evaluation logger with timestamp prefixes and verbosity control
// ---------------------------------------------------------------------------

export interface EvalLogger {
	info(msg: string): void;
	verbose(msg: string): void;
	success(msg: string): void;
	warn(msg: string): void;
	error(msg: string): void;
	isVerbose: boolean;
}

export function createLogger(verbose: boolean): EvalLogger {
	return {
		isVerbose: verbose,

		info(msg: string): void {
			console.log(`${timestamp()} [INFO] ${msg}`);
		},

		verbose(msg: string): void {
			if (verbose) {
				console.log(`${timestamp()} [VERBOSE] ${msg}`);
			}
		},

		success(msg: string): void {
			console.log(`${timestamp()} [OK] ${msg}`);
		},

		warn(msg: string): void {
			console.log(`${timestamp()} [WARN] ${msg}`);
		},

		error(msg: string): void {
			console.error(`${timestamp()} [ERROR] ${msg}`);
		},
	};
}

function timestamp(): string {
	return new Date().toISOString();
}
