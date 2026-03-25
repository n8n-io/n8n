/// <reference types="node" />

import EventEmitter = require("events");

export interface Params {
    progress: number;
    eta: number;
    startTime: number;
    stopTime: number | null;
    total: number;
    value: number;
    maxWidth: number;
}

export interface Options {
    /**
     * Progress bar output format.
     * The progressbar can be customized by using the following build-in placeholders. They can be combined in any order.
     *   {bar} - the progress bar, customizable by the options barsize, barCompleteString and barIncompleteString
     *   {percentage} - the current progress in percent (0-100)
     *   {total} - the end value
     *   {value} - the current value set by last update() call
     *   {eta} - expected time of accomplishment in seconds
     *   {duration} - elapsed time in seconds
     *   {eta_formatted} - expected time of accomplishment formatted into appropriate units
     *   {duration_formatted} - elapsed time formatted into appropriate units
     *
     * Example:
     *      progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}
     *    is rendered as
     *      progress [========================================] 100% | ETA: 0s | 200/200
     */
    format?: string | GenericFormatter | undefined;

    /** A custom bar formatter function which renders the bar-element (default: format-bar.js) */
    formatBar?: BarFormatter | undefined;

    /** A custom timer formatter function which renders the formatted time elements like eta_formatted and duration-formatted (default: format-time.js) */
    formatTime?: TimeFormatter | undefined;

    /** A custom value formatter function which renders all other values (default: format-value.js) */
    formatValue?: ValueFormatter | undefined;

    /** The maximum update rate (default: 10) */
    fps?: number | undefined;

    /** Output stream to use (default: process.stderr) */
    stream?: NodeJS.WritableStream | undefined;

    /** Automatically call stop() when the value reaches the total (default: false) */
    stopOnComplete?: boolean | undefined;

    /** Clear the progress bar on complete / stop() call (default: false) */
    clearOnComplete?: boolean | undefined;

    /** The length of the progress bar in chars (default: 40) */
    barsize?: number | undefined;

    /** Position of the progress bar - 'left' (default), 'right' or 'center  */
    align?: "left" | "right" | "center" | undefined;

    /** Character to use as "complete" indicator in the bar (default: "=") */
    barCompleteString?: string | undefined;

    /** Character to use as "incomplete" indicator in the bar (default: "-") */
    barIncompleteString?: string | undefined;

    /** Character to use as "complete" indicator in the bar (default: "=") */
    barCompleteChar?: string | undefined;

    /** Character to use as "incomplete" indicator in the bar (default: "-") */
    barIncompleteChar?: string | undefined;

    /**
     * Hide the cursor during progress operation; restored on complete (default: false)
     * - pass `null` to keep terminal settings
     */
    hideCursor?: boolean | null | undefined;

    /** Glue sequence (control chars) between bar elements (default: '') */
    barGlue?: string | undefined;

    /** Number of updates with which to calculate the eta; higher numbers give a more stable eta (default: 10) */
    etaBuffer?: number | undefined;

    /**
     *  Trigger an eta calculation update during asynchronous rendering trigger using the current value
     * - should only be used for long running processes in conjunction with lof `fps` values and large `etaBuffer`
     * @default false
     */
    etaAsynchronousUpdate?: boolean | undefined;

    /** Progress calculation relative to start value ? default start at 0 (default: false) */
    progressCalculationRelative?: boolean | undefined;

    /** Disable line wrapping (default: false) - pass null to keep terminal settings; pass true to trim the output to terminal width */
    linewrap?: boolean | null | undefined;

    /** Trigger redraw during update() in case threshold time x2 is exceeded (default: true) - limited to single bar usage */
    synchronousUpdate?: boolean | undefined;

    /** Enable scheduled output to notty streams - e.g. redirect to files (default: false) */
    noTTYOutput?: boolean | undefined;

    /** Set the output schedule/interval for notty output in ms (default: 2000ms) */
    notTTYSchedule?: number | undefined;

    /** Display progress bars with 'total' of zero(0) as empty, not full (default: false) */
    emptyOnZero?: boolean | undefined;

    /** Trigger redraw on every frame even if progress remains the same; can be useful if progress bar gets overwritten by other concurrent writes to the terminal (default: false) */
    forceRedraw?: boolean | undefined;

    /** Add padding chars to formatted time and percentage to force fixed width (default: false) */
    autopadding?: boolean | undefined;

    /** The character sequence used for autopadding (default: " ") */
    autopaddingChar?: string | undefined;

    /** Stop bar on SIGINT/SIGTERM to restore cursor settings (default: true) */
    gracefulExit?: boolean | undefined;
}

export interface Preset {
    barCompleteChar: string;
    barIncompleteChar: string;

    /**
     *   Example: 'progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}'
     *
     * {bar} - the progress bar, customizable by the options barsize, barCompleteString and barIncompleteString
     *
     * {percentage} - the current progress in percent (0-100)
     *
     * {total} - the end value
     *
     * {value} - the current value set by last update() call
     *
     * {eta} -  expected time of accomplishment in seconds (limited to 115days, otherwise INF is displayed)
     *
     * {duration} - elapsed time in seconds
     *
     * {eta_formatted} - expected time of accomplishment formatted into appropriate units
     *
     * {duration_formatted} - elapsed time formatted into appropriate units
     */
    format: string;
}

export class GenericBar extends EventEmitter {
    /** Initialize a new Progress bar. An instance can be used multiple times! it's not required to re-create it! */
    constructor(opt: Options, preset?: Preset);

    /** Whether the progress bar is active */
    isActive: boolean;

    /** Internal render function */
    render(forceRendering?: boolean): void;

    /** Starts the progress bar and set the total and initial value */
    start(total: number, startValue: number, payload?: object): void;

    /** Stops the progress bar and go to next line */
    stop(): void;

    /** Sets the current progress value and optionally the payload with values of custom tokens as a second parameter */
    update(current: number, payload?: object): void;
    update(payload: object): void;

    /** Calculate the actual progress value */
    getProgress(): number;

    /** Increases the current progress value by a specified amount (default +1). Update payload optionally */
    increment(step?: number, payload?: object): void;
    increment(payload: object): void;

    /** Get the total (limit) value */
    getTotal(): number;

    /** Sets the total progress value while progressbar is active. Especially useful handling dynamic tasks. */
    setTotal(total: number): void;

    /** Force eta calculation update (long running processes) without altering the progress values. */
    updateETA(): void;
}

export class SingleBar extends GenericBar {
    /** Initialize a new Progress bar. An instance can be used multiple times! it's not required to re-create it! */
    constructor(opt: Options, preset?: Preset);

    /** Internal render function */
    render(): void;

    /** Sets the current progress value and optionally the payload with values of custom tokens as a second parameter */
    update(current: number, payload?: object): void;
    update(payload: object): void;

    /** Starts the progress bar and set the total and initial value */
    start(total: number, startValue: number, payload?: object): void;

    /** Stops the progress bar and go to next line */
    stop(): void;
}

export class MultiBar extends EventEmitter {
    constructor(opt: Options, preset?: Preset);

    /** Whether the progress bar is active */
    isActive: boolean;

    /** Add a new bar to the stack */
    create(total: number, startValue: number, payload?: any, barOptions?: Options): SingleBar;

    /** Remove a bar from the stack */
    remove(bar: SingleBar): boolean;

    /** Internal update routine */
    update(): void;

    stop(): void;

    /** Log output above the progress bars; string must end with newline character! */
    log(data: string): void;
}

export const Presets: {
    /** Styles as of cli-progress v1.3.0 */
    legacy: Preset;

    /** Unicode Rectangles */
    rect: Preset;

    /** Unicode background shades are used for the bar */
    shades_classic: Preset;

    /** Unicode background shades with grey bar */
    shades_grey: Preset;
};

export interface GenericFormatter {
    (options: Options, params: Params, payload: any): string;
}

export interface TimeFormatter {
    (t: number, options: Options, roundToMultipleOf: number): string;
}

export interface ValueFormatter {
    (v: number, options: Options, type: ValueType): string;
}

export interface BarFormatter {
    (progress: number, options: Options): string;
}

export type ValueType = "percentage" | "total" | "value" | "eta" | "duration";

declare const defaultFormatter: GenericFormatter;
declare const formatBar: BarFormatter;
declare const formatValue: ValueFormatter;
declare const formatTime: TimeFormatter;

export const Format: {
    Formatter: typeof defaultFormatter;
    BarFormat: typeof formatBar;
    ValueFormat: typeof formatValue;
    TimeFormat: typeof formatTime;
};

export class Bar extends SingleBar {}

export {};
