import { LoadOptions } from './interfaces/config';
import { Logger } from './interfaces/logger';
/**
 * Returns a logger instance for the given namespace.
 * If a namespace is provided, a child logger is returned.
 * If no namespace is provided, the root logger is returned.
 */
export declare function getLogger(namespace?: string): Logger;
/**
 * Convenience function to create a debug function for a specific namespace
 */
export declare function makeDebug(namespace: string): Logger['debug'];
export declare function setLogger(loadOptions: LoadOptions): void;
export declare function clearLoggers(): void;
