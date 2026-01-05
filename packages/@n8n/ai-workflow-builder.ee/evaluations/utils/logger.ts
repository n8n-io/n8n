import pc from 'picocolors';

/**
 * Simple evaluation logger with verbose mode support.
 *
 * Usage:
 *   const log = createLogger(isVerbose);
 *   log.info('Always shown');
 *   log.verbose('Only shown in verbose mode');
 */

export interface EvalLogger {
	/** Always shown - important info */
	info: (message: string) => void;
	/** Only shown in verbose mode - debug details */
	verbose: (message: string) => void;
	/** Success messages (green) */
	success: (message: string) => void;
	/** Warning messages (yellow) */
	warn: (message: string) => void;
	/** Error messages (red) */
	error: (message: string) => void;
	/** Dimmed text for secondary info */
	dim: (message: string) => void;
	/** Check if verbose mode is enabled */
	isVerbose: boolean;
}

export function createLogger(verbose: boolean = false): EvalLogger {
	return {
		isVerbose: verbose,
		info: (message: string) => console.log(pc.blue(message)),
		verbose: (message: string) => {
			if (verbose) console.log(pc.dim(message));
		},
		success: (message: string) => console.log(pc.green(message)),
		warn: (message: string) => console.log(pc.yellow(message)),
		error: (message: string) => console.log(pc.red(message)),
		dim: (message: string) => console.log(pc.dim(message)),
	};
}
