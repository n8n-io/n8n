import * as tty from 'tty';
/**
 * Handles figuring out if we can use ANSI colours and handing out the escape codes.
 *
 * This is for package-internal use only, and may change at any time.
 *
 * @private
 * @internal
 */
export declare class Colours {
    static enabled: boolean;
    static reset: string;
    static bright: string;
    static dim: string;
    static red: string;
    static green: string;
    static yellow: string;
    static blue: string;
    static magenta: string;
    static cyan: string;
    static white: string;
    static grey: string;
    /**
     * @param stream The stream (e.g. process.stderr)
     * @returns true if the stream should have colourization enabled
     */
    static isEnabled(stream: tty.WriteStream): boolean;
    static refresh(): void;
}
