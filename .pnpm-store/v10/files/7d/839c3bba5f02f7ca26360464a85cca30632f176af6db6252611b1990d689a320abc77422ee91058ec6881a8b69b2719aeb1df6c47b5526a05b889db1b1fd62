import type { Terminal } from '@xterm/xterm';
export interface ShellOptions {
    /**
     * The terminal associated with the context
     */
    terminal: Terminal;
    /**
     * The prompt to use, can be a getter.
     */
    readonly prompt?: string;
    /**
     * The length to use for the prompt. Useful if escape sequences are used in the prompt.
     */
    readonly promptLength?: number;
    /**
     * The handler for when a line is parsed
     */
    onLine?(this: void, line: string): unknown;
}
export interface ShellContext extends Required<ShellOptions> {
    /**
     * The input currently being shown
     */
    input: string;
    /**
     * The index for which input is being shown
     */
    index: number;
    /**
     * The current, uncached input
     */
    currentInput: string;
    /**
     * array of previous inputs
     */
    inputs: string[];
}
/**
 * Creates a new shell using the provided options
 */
export declare function createShell(options: ShellOptions): ShellContext;
