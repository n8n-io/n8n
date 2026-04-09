import type { Logger } from "../types.js";

let globalLogger: Logger = console;

export function setLogger(logger: Logger): void {
	globalLogger = logger;
}

export function getLogger(): Logger {
	return globalLogger;
}
