/**
 * This library implements a system for processing human readable text that
 * will be output by console applications.
 *
 * @remarks
 * See the {@link TerminalWritable} documentation for an overview of the major concepts.
 *
 * @packageDocumentation
 */

/// <reference types="node" />

import type { Brand } from '@rushstack/node-core-library';
import { NewlineKind } from '@rushstack/node-core-library';
import { Writable } from 'stream';
import { WritableOptions } from 'stream';

/**
 * Operations for working with text strings that contain
 * {@link https://en.wikipedia.org/wiki/ANSI_escape_code | ANSI escape codes}.
 * The most commonly used escape codes set the foreground/background color for console output.
 * @public
 */
export declare class AnsiEscape {
    private static readonly _csiRegExp;
    private static readonly _sgrRegExp;
    private static readonly _backslashNRegExp;
    private static readonly _backslashRRegExp;
    static getEscapeSequenceForAnsiCode(code: number): string;
    /**
     * Returns the input text with all ANSI escape codes removed.  For example, this is useful when saving
     * colorized console output to a log file.
     */
    static removeCodes(text: string): string;
    /**
     * Replaces ANSI escape codes with human-readable tokens.  This is useful for unit tests
     * that compare text strings in test assertions or snapshot files.
     */
    static formatForTests(text: string, options?: IAnsiEscapeConvertForTestsOptions): string;
    private static _tryGetSgrFriendlyName;
}

/**
 * This class enables very basic {@link TerminalWritable.onWriteChunk} operations to be implemented
 * as a callback function, avoiding the need to define a subclass of `TerminalWritable`.
 *
 * @remarks
 * `CallbackWritable` is provided as a convenience for very simple situations. For most cases,
 * it is generally preferable to create a proper subclass.
 *
 * @privateRemarks
 * We intentionally do not expose a callback for {@link TerminalWritable.onClose}; if special
 * close behavior is required, it is better to create a subclass.
 *
 * @public
 */
export declare class CallbackWritable extends TerminalWritable {
    private readonly _callback;
    constructor(options: ICallbackWritableOptions);
    protected onWriteChunk(chunk: ITerminalChunk): void;
}

/**
 * The static functions on this class are used to produce colored text
 * for use with a terminal that supports ANSI escape codes.
 *
 * Note that this API always generates color codes, regardless of whether
 * the process's stdout is a TTY. The reason is that, in a complex program, the
 * code that is generating strings often does not know were those strings will end
 * up. In some cases, the same log message may get printed both to a shell
 * that supports color AND to a log file that does not.
 *
 * @example
 * ```ts
 * console.log(Colorize.red('Red Text!'))
 * terminal.writeLine(Colorize.green('Green Text!'), ' ', Colorize.blue('Blue Text!'));
 *```
 *
 * @public
 */
export declare class Colorize {
    static black(text: string): string;
    static red(text: string): string;
    static green(text: string): string;
    static yellow(text: string): string;
    static blue(text: string): string;
    static magenta(text: string): string;
    static cyan(text: string): string;
    static white(text: string): string;
    static gray(text: string): string;
    static blackBackground(text: string): string;
    static redBackground(text: string): string;
    static greenBackground(text: string): string;
    static yellowBackground(text: string): string;
    static blueBackground(text: string): string;
    static magentaBackground(text: string): string;
    static cyanBackground(text: string): string;
    static whiteBackground(text: string): string;
    static grayBackground(text: string): string;
    static bold(text: string): string;
    static dim(text: string): string;
    static underline(text: string): string;
    static blink(text: string): string;
    static invertColor(text: string): string;
    static hidden(text: string): string;
    static rainbow(text: string): string;
    private static _applyColorSequence;
    private static _wrapTextInAnsiEscapeCodes;
}

/**
 * Terminal provider that prints to STDOUT (for log- and verbose-level messages) and
 * STDERR (for warning- and error-level messages).
 *
 * @beta
 */
export declare class ConsoleTerminalProvider implements ITerminalProvider {
    static readonly supportsColor: boolean;
    /**
     * If true, verbose-level messages should be written to the console.
     */
    verboseEnabled: boolean;
    /**
     * If true, debug-level messages should be written to the console.
     */
    debugEnabled: boolean;
    /**
     * {@inheritDoc ITerminalProvider.supportsColor}
     */
    readonly supportsColor: boolean;
    constructor(options?: Partial<IConsoleTerminalProviderOptions>);
    /**
     * {@inheritDoc ITerminalProvider.write}
     */
    write(data: string, severity: TerminalProviderSeverity): void;
    /**
     * {@inheritDoc ITerminalProvider.eolCharacter}
     */
    get eolCharacter(): string;
}

/**
 * A sensible fallback column width for consoles.
 *
 * @public
 */
export declare const DEFAULT_CONSOLE_WIDTH: number;

/**
 * `DiscardStdoutTransform` discards `stdout` chunks while fixing up malformed `stderr` lines.
 *
 * @remarks
 * Suppose that a poorly behaved process produces output like this:
 *
 * ```ts
 * process.stdout.write('Starting operation...\n');
 * process.stderr.write('An error occurred');
 * process.stdout.write('\nFinishing up\n');
 * process.stderr.write('The process completed with errors\n');
 * ```
 *
 * When `stdout` and `stderr` are combined on the console, the mistake in the output would not be noticeable:
 * ```
 * Starting operation...
 * An error occurred
 * Finishing up
 * The process completed with errors
 * ```
 *
 * However, if we discard `stdout`, then `stderr` is missing a newline:
 * ```
 * An error occurredThe process completed with errors
 * ```
 *
 * Tooling scripts can introduce these sorts of problems via edge cases that are difficult to find and fix.
 * `DiscardStdoutTransform` can discard the `stdout` stream and fix up `stderr`:
 *
 * ```
 * An error occurred
 * The process completed with errors
 * ```
 *
 * @privateRemarks
 * This class is experimental and marked as `@beta`.  The algorithm may need some fine-tuning, or there may
 * be better solutions to this problem.
 *
 * @beta
 */
export declare class DiscardStdoutTransform extends TerminalTransform {
    private _state;
    constructor(options: IDiscardStdoutTransformOptions);
    protected onWriteChunk(chunk: ITerminalChunk): void;
}

/**
 * Options for {@link AnsiEscape.formatForTests}.
 * @public
 */
export declare interface IAnsiEscapeConvertForTestsOptions {
    /**
     * If true then `\n` will be replaced by `[n]`, and `\r` will be replaced by `[r]`.
     */
    encodeNewlines?: boolean;
}

/**
 * Constructor options for {@link CallbackWritable}.
 * @public
 */
export declare interface ICallbackWritableOptions {
    onWriteChunk: (chunk: ITerminalChunk) => void;
}

/**
 * Options to be provided to a {@link ConsoleTerminalProvider}
 *
 * @beta
 */
export declare interface IConsoleTerminalProviderOptions {
    /**
     * If true, print verbose logging messages.
     */
    verboseEnabled: boolean;
    /**
     * If true, print debug logging messages. Note that "verbose" and "debug" are considered
     * separate message filters; if you want debug to imply verbose, it is up to your
     * application code to enforce that.
     */
    debugEnabled: boolean;
}

/**
 * Constructor options for {@link DiscardStdoutTransform}
 *
 * @beta
 */
export declare interface IDiscardStdoutTransformOptions extends ITerminalTransformOptions {
}

/**
 * Options for {@link PrefixProxyTerminalProvider}.
 *
 * @beta
 */
export declare interface IDynamicPrefixProxyTerminalProviderOptions extends IPrefixProxyTerminalProviderOptionsBase {
    /**
     * A function that returns the prefix that should be added to each line of output. This is useful
     * for prefixing each line with a timestamp.
     */
    getPrefix: () => string;
}

/**
 * Constructor options for {@link NormalizeNewlinesTextRewriter}
 *
 * @public
 */
export declare interface INormalizeNewlinesTextRewriterOptions {
    /**
     * Specifies how newlines should be represented in the output stream.
     */
    newlineKind: NewlineKind;
    /**
     * If `true`, then `NormalizeNewlinesTextRewriter.close()` will append a newline to
     * the output if it ends with an incomplete line.
     *
     * @remarks
     * If the output is an empty string, then a newline will NOT be appended,
     * because writing an empty string does not produce an incomplete line.
     */
    ensureNewlineAtEnd?: boolean;
}

/**
 * @beta
 */
export declare type IPrefixProxyTerminalProviderOptions = IStaticPrefixProxyTerminalProviderOptions | IDynamicPrefixProxyTerminalProviderOptions;

/**
 * @beta
 */
export declare interface IPrefixProxyTerminalProviderOptionsBase {
    /**
     * The {@link ITerminalProvider} that will be wrapped.
     */
    terminalProvider: ITerminalProvider;
}

/**
 * Constructor options for {@link SplitterTransform}.
 *
 * @public
 */
export declare interface ISplitterTransformOptions extends ITerminalWritableOptions {
    /**
     * Each input chunk will be passed to each destination in the array.
     */
    destinations: TerminalWritable[];
}

/**
 * Options for {@link PrefixProxyTerminalProvider}, with a static prefix.
 *
 * @beta
 */
export declare interface IStaticPrefixProxyTerminalProviderOptions extends IPrefixProxyTerminalProviderOptionsBase {
    /**
     * The prefix that should be added to each line of output.
     */
    prefix: string;
}

/**
 * Constructor options for {@link StderrLineTransform}
 * @beta
 */
export declare interface IStdioLineTransformOptions extends ITerminalTransformOptions {
    /**
     * Specifies the kind of newline for the output.
     */
    newlineKind?: NewlineKind;
}

/**
 * Constructor options for {@link StdioSummarizer}.
 * @beta
 */
export declare interface IStdioSummarizerOptions extends ITerminalWritableOptions {
    /**
     * Specifies the maximum number of leading lines to include in the summary.
     * @defaultValue `10`
     */
    leadingLines?: number;
    /**
     * Specifies the maximum number of trailing lines to include in the summary.
     * @defaultValue `10`
     */
    trailingLines?: number;
}

/**
 * @beta
 */
export declare interface IStringBufferOutputOptions {
    /**
     * If set to true, special characters like \\n, \\r, and the \\u001b character
     * in color control tokens will get normalized to [-n-], [-r-], and [-x-] respectively
     *
     * This option defaults to `true`
     */
    normalizeSpecialCharacters: boolean;
}

/**
 * @beta
 */
export declare interface ITerminal {
    /**
     * Subscribe a new terminal provider.
     */
    registerProvider(provider: ITerminalProvider): void;
    /**
     * Unsubscribe a terminal provider. If the provider isn't subscribed, this function does nothing.
     */
    unregisterProvider(provider: ITerminalProvider): void;
    /**
     * Write a generic message to the terminal
     */
    write(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a generic message to the terminal, followed by a newline
     */
    writeLine(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a warning message to the console with yellow text.
     *
     * @remarks
     * The yellow color takes precedence over any other foreground colors set.
     */
    writeWarning(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a warning message to the console with yellow text, followed by a newline.
     *
     * @remarks
     * The yellow color takes precedence over any other foreground colors set.
     */
    writeWarningLine(...messageParts: TerminalWriteParameters): void;
    /**
     * Write an error message to the console with red text.
     *
     * @remarks
     * The red color takes precedence over any other foreground colors set.
     */
    writeError(...messageParts: TerminalWriteParameters): void;
    /**
     * Write an error message to the console with red text, followed by a newline.
     *
     * @remarks
     * The red color takes precedence over any other foreground colors set.
     */
    writeErrorLine(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a verbose-level message.
     */
    writeVerbose(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a verbose-level message followed by a newline.
     */
    writeVerboseLine(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a debug-level message.
     */
    writeDebug(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a debug-level message followed by a newline.
     */
    writeDebugLine(...messageParts: TerminalWriteParameters): void;
}

/**
 * Represents a chunk of output that will ultimately be written to a {@link TerminalWritable}.
 *
 * @remarks
 * Today `ITerminalChunk` represents the `stdout` and `stderr` text streams.  In the future,
 * we plan to expand it to include other console UI elements such as instructions for displaying
 * an interactive progress bar.  We may also add other metadata, for example tracking whether
 * the `text` string is known to contain color codes or not.
 *
 * The `ITerminalChunk` object should be considered to be immutable once it is created.
 * For example, {@link SplitterTransform} may pass the same chunk to multiple destinations.
 *
 * @public
 */
export declare interface ITerminalChunk {
    /**
     * Indicates the kind of information stored in this chunk.
     *
     * @remarks
     * More kinds will be introduced in the future.  Implementors of
     * {@link TerminalWritable.onWriteChunk} should ignore unrecognized `TerminalChunkKind`
     * values.  `TerminalTransform` implementors should pass along unrecognized chunks
     * rather than discarding them.
     */
    kind: TerminalChunkKind;
    /**
     * The next chunk of text from the `stderr` or `stdout` stream.
     */
    text: string;
}

/**
 * Implement the interface to create a terminal provider. Terminal providers
 * can be registered to a {@link Terminal} instance to receive messages.
 *
 * @beta
 */
export declare interface ITerminalProvider {
    /**
     * This property should return true only if the terminal provider supports
     * rendering console colors.
     */
    supportsColor: boolean;
    /**
     * This property should return the newline character the terminal provider
     * expects.
     */
    eolCharacter: string;
    /**
     * This function gets called on every terminal provider upon every
     * message function call on the terminal instance.
     *
     * @param data - The terminal message.
     * @param severity - The message severity. Terminal providers can
     * route different kinds of messages to different streams and may choose
     * to ignore verbose or debug messages.
     */
    write(data: string, severity: TerminalProviderSeverity): void;
}

/**
 * Options for {@link TerminalStreamWritable}.
 *
 * @beta
 */
export declare interface ITerminalStreamWritableOptions {
    /**
     * The {@link ITerminal} that the Writable will write to.
     */
    terminal: ITerminal;
    /**
     * The severity of the messages that will be written to the {@link ITerminal}.
     */
    severity: TerminalProviderSeverity;
    /**
     * Options for the underlying Writable.
     */
    writableOptions?: WritableOptions;
}

/**
 * Constructor options for {@link TerminalTransform}.
 *
 * @public
 */
export declare interface ITerminalTransformOptions extends ITerminalWritableOptions {
    /**
     * The target `TerminalWritable` that the `TerminalTransform` will write its
     * output to.
     */
    destination: TerminalWritable;
    /**
     * Prevents the {@link TerminalTransform.destination} object from being
     * closed automatically when the transform is closed.
     *
     * @remarks
     * When a transform is closed, normally it will automatically close its destination
     * `TerminalWritable` object.  There are two ways to prevent that: either by setting
     * `preventDestinationAutoclose` to `true` for the transform, or by setting
     * {@link TerminalWritable.preventAutoclose} to `true` for the `destination` object.
     */
    preventDestinationAutoclose?: boolean;
}

/**
 * Constructor options for {@link TerminalWritable}
 *
 * @public
 */
export declare interface ITerminalWritableOptions {
    /**
     * When this object is the {@link TerminalTransform.destination} for a transform,
     * the transform will automatically close this object.  Set `preventAutoclose` to `true`
     * to prevent that behavior.
     *
     * @remarks
     * When a transform is closed, normally it will automatically close its destination
     * `TerminalWritable` object.  There are two ways to prevent that: either by setting
     * `preventDestinationAutoclose` to `true` for the transform, or by setting
     * {@link TerminalWritable.preventAutoclose} to `true` for the `destination` object.
     */
    preventAutoclose?: boolean;
}

/**
 * @beta
 */
export declare interface ITerminalWriteOptions {
    /**
     * If set to true, SGR parameters will not be replaced by the terminal
     * standard (i.e. - red for errors, yellow for warnings).
     */
    doNotOverrideSgrCodes?: boolean;
}

/**
 * Constructor options for {@link TextRewriterTransform}.
 *
 * @public
 */
export declare interface ITextRewriterTransformOptions extends ITerminalTransformOptions {
    /**
     * A list of rewriters to be applied.  More items may be appended to the list, for example
     * if {@link ITextRewriterTransformOptions.removeColors} is specified.
     *
     * @remarks
     * The final list must contain at least one item.
     */
    textRewriters?: TextRewriter[];
    /**
     * If specified, a {@link RemoveColorsTextRewriter} will be appended to the list of rewriters.
     */
    removeColors?: boolean;
    /**
     * If `normalizeNewlines` or `ensureNewlineAtEnd` is specified, a {@link NormalizeNewlinesTextRewriter}
     * will be appended to the list of rewriters with the specified settings.
     *
     * @remarks
     * See {@link INormalizeNewlinesTextRewriterOptions} for details.
     */
    normalizeNewlines?: NewlineKind;
    /**
     * If `normalizeNewlines` or `ensureNewlineAtEnd` is specified, a {@link NormalizeNewlinesTextRewriter}
     * will be appended to the list of rewriters with the specified settings.
     *
     * @remarks
     * See {@link INormalizeNewlinesTextRewriterOptions} for details.
     */
    ensureNewlineAtEnd?: boolean;
}

/**
 * A {@link TerminalWritable} subclass for use by unit tests.
 *
 * @beta
 */
export declare class MockWritable extends TerminalWritable {
    readonly chunks: ITerminalChunk[];
    protected onWriteChunk(chunk: ITerminalChunk): void;
    reset(): void;
    getAllOutput(): string;
    getFormattedChunks(): ITerminalChunk[];
}

/**
 * Terminal provider that stores written data in buffers separated by severity.
 * This terminal provider is designed to be used when code that prints to a terminal
 * is being unit tested.
 *
 * @beta
 */
export declare class NoOpTerminalProvider implements ITerminalProvider {
    /**
     * {@inheritDoc ITerminalProvider.write}
     */
    write(data: string, severity: TerminalProviderSeverity): void;
    /**
     * {@inheritDoc ITerminalProvider.eolCharacter}
     */
    get eolCharacter(): string;
    /**
     * {@inheritDoc ITerminalProvider.supportsColor}
     */
    get supportsColor(): boolean;
}

/**
 * For use with {@link TextRewriterTransform}, this rewriter converts all newlines to
 * a standard format.
 *
 * @public
 */
export declare class NormalizeNewlinesTextRewriter extends TextRewriter {
    /** {@inheritDoc INormalizeNewlinesTextRewriterOptions.newlineKind} */
    readonly newlineKind: NewlineKind;
    /**
     * The specific character sequence that will be used when appending newlines.
     */
    readonly newline: string;
    /** {@inheritDoc INormalizeNewlinesTextRewriterOptions.ensureNewlineAtEnd} */
    readonly ensureNewlineAtEnd: boolean;
    constructor(options: INormalizeNewlinesTextRewriterOptions);
    initialize(): TextRewriterState;
    process(unknownState: TextRewriterState, text: string): string;
    close(unknownState: TextRewriterState): string;
}

/**
 * Wraps an existing {@link ITerminalProvider} that prefixes each line of output with a specified
 * prefix string.
 *
 * @beta
 */
export declare class PrefixProxyTerminalProvider implements ITerminalProvider {
    private readonly _parentTerminalProvider;
    private readonly _getPrefix;
    private readonly _newlineRegex;
    private _isOnNewline;
    constructor(options: IPrefixProxyTerminalProviderOptions);
    /** @override */
    get supportsColor(): boolean;
    /** @override */
    get eolCharacter(): string;
    /** @override */
    write(data: string, severity: TerminalProviderSeverity): void;
}

/**
 * A collection of utilities for printing messages to the console.
 *
 * @public
 */
export declare class PrintUtilities {
    /**
     * Returns the width of the console, measured in columns
     */
    static getConsoleWidth(): number | undefined;
    /**
     * Applies word wrapping.
     *
     * @param text - The text to wrap
     * @param maxLineLength - The maximum length of a line, defaults to the console width
     * @param indent - The number of spaces to indent the wrapped lines, defaults to 0
     */
    static wrapWords(text: string, maxLineLength?: number, indent?: number): string;
    /**
     * Applies word wrapping.
     *
     * @param text - The text to wrap
     * @param maxLineLength - The maximum length of a line, defaults to the console width
     * @param linePrefix - The string to prefix each line with, defaults to ''
     */
    static wrapWords(text: string, maxLineLength?: number, linePrefix?: string): string;
    /**
     * Applies word wrapping.
     *
     * @param text - The text to wrap
     * @param maxLineLength - The maximum length of a line, defaults to the console width
     * @param indentOrLinePrefix - The number of spaces to indent the wrapped lines or the string to prefix
     * each line with, defaults to no prefix
     */
    static wrapWords(text: string, maxLineLength?: number, indentOrLinePrefix?: number | string): string;
    /**
     * Applies word wrapping and returns an array of lines.
     *
     * @param text - The text to wrap
     * @param maxLineLength - The maximum length of a line, defaults to the console width
     * @param indent - The number of spaces to indent the wrapped lines, defaults to 0
     */
    static wrapWordsToLines(text: string, maxLineLength?: number, indent?: number): string[];
    /**
     * Applies word wrapping and returns an array of lines.
     *
     * @param text - The text to wrap
     * @param maxLineLength - The maximum length of a line, defaults to the console width
     * @param linePrefix - The string to prefix each line with, defaults to ''
     */
    static wrapWordsToLines(text: string, maxLineLength?: number, linePrefix?: string): string[];
    /**
     * Applies word wrapping and returns an array of lines.
     *
     * @param text - The text to wrap
     * @param maxLineLength - The maximum length of a line, defaults to the console width
     * @param indentOrLinePrefix - The number of spaces to indent the wrapped lines or the string to prefix
     * each line with, defaults to no prefix
     */
    static wrapWordsToLines(text: string, maxLineLength?: number, indentOrLinePrefix?: number | string): string[];
    /**
     * Displays a message in the console wrapped in a box UI.
     *
     * @param message - The message to display.
     * @param terminal - The terminal to write the message to.
     * @param boxWidth - The width of the box, defaults to half of the console width.
     */
    static printMessageInBox(message: string, terminal: ITerminal, boxWidth?: number): void;
}

/**
 * For use with {@link TextRewriterTransform}, this rewriter removes ANSI escape codes
 * including colored text.
 *
 * @remarks
 * The implementation also removes other ANSI escape codes such as cursor positioning.
 * The specific set of affected codes may be adjusted in the future.
 *
 * @public
 */
export declare class RemoveColorsTextRewriter extends TextRewriter {
    initialize(): TextRewriterState;
    process(unknownState: TextRewriterState, text: string): string;
    close(unknownState: TextRewriterState): string;
}

/**
 * Use this instead of {@link TerminalTransform} if you need to output `ITerminalChunk`
 * data to more than one destination.
 *
 * @remarks
 *
 * Splitting streams complicates the pipeline topology and can make debugging more difficult.
 * For this reason, it is modeled as an explicit `SplitterTransform` node, rather than
 * as a built-in feature of `TerminalTransform`.
 *
 * @public
 */
export declare class SplitterTransform extends TerminalWritable {
    readonly destinations: ReadonlyArray<TerminalWritable>;
    constructor(options: ISplitterTransformOptions);
    protected onWriteChunk(chunk: ITerminalChunk): void;
    protected onClose(): void;
}

/**
 * `StderrLineTransform` normalizes lines that mix characters from `stdout` and `stderr`,
 * so that each output line is routed entirely to `stdout` or `stderr`.
 *
 * @remarks
 * IMPORTANT: This transform assumes that its input has been normalized to use `"\n"` newlines.
 *
 * IMPORTANT: This transform does not produce realtime output, because lines are buffered
 * until a newline character is encountered.
 *
 * Suppose that a poorly behaved process produces output like this:
 *
 * ```ts
 * process.stderr.write('An error occurred, cleaning up');
 * process.stdout.write('.'); // (delay)
 * process.stdout.write('.'); // (delay)
 * process.stdout.write('.');
 * process.stdout.write('\n');
 * process.stderr.write('The process completed with errors\n');
 * ```
 *
 * When `stdout` and `stderr` are combined on the console, the mistake in the output would not be noticeable:
 * ```
 * An error occurred, cleaning up...
 * The process completed with errors
 * ```
 *
 * However, if we discard `stdout`, then `stderr` is malformed:
 * ```
 * An error occurred, cleaning upThe process completed with errors
 * ```
 *
 * Tooling scripts can introduce these sorts of problems via edge cases that are difficult to find and fix.
 *
 * `StderrLineTransform` normalizes the output so that if a combined line contains any `stderr` characters,
 * then the entire line is routed to `stderr`.  Later, if we discard `stdout`, then the output will
 * preserve the appropriate context:
 *
 * ```
 * An error occurred, cleaning up...
 * The process completed with errors
 * ```
 *
 * @privateRemarks
 * This class is experimental and marked as `@beta`.  The algorithm may need some fine-tuning, or there may
 * be better solutions to this problem.
 *
 * @beta
 */
export declare class StderrLineTransform extends TerminalTransform {
    private _accumulatedLine;
    private _accumulatedStderr;
    readonly newline: string;
    constructor(options: IStdioLineTransformOptions);
    protected onWriteChunk(chunk: ITerminalChunk): void;
    protected onClose(): void;
    private _processAccumulatedLine;
}

/**
 * Summarizes the results of a failed build task by returning a subset of `stderr` output not to exceed
 * a specified maximum number of lines.
 *
 * @remarks
 * IMPORTANT: This transform assumes that its input was prepared by {@link StderrLineTransform}, so that each
 * {@link ITerminalChunk.text} item is a single line terminated by a `"\n"` character.
 *
 * The {@link IStdioSummarizerOptions.leadingLines} and {@link IStdioSummarizerOptions.trailingLines}
 * counts specify the maximum number of lines to be returned. Any additional lines will be omitted.
 * For example, if `leadingLines` and `trailingLines` were set to `3`, then the summary of 16 `stderr` lines might
 * look like this:
 *
 * ```
 * Line 1
 * Line 2
 * Line 3
 *   ...10 lines omitted...
 * Line 14
 * Line 15
 * Line 16
 * ```
 *
 * If the `stderr` output is completely empty, then the `stdout` output will be summarized instead.
 *
 * @beta
 */
export declare class StdioSummarizer extends TerminalWritable {
    private _leadingLines;
    private _trailingLines;
    private readonly _abridgedLeading;
    private readonly _abridgedTrailing;
    private _abridgedOmittedLines;
    private _abridgedStderr;
    constructor(options?: IStdioSummarizerOptions);
    /**
     * Returns the summary report.
     *
     * @remarks
     * The `close()` method must be called before `getReport()` can be used.
     */
    getReport(): string;
    onWriteChunk(chunk: ITerminalChunk): void;
}

/**
 * A {@link TerminalWritable} subclass that writes its output directly to the process `stdout` and `stderr`
 * streams.
 *
 * @remarks
 * This is the standard output target for a process.  You normally do not need to construct
 * this class; the {@link StdioWritable."instance"} singleton can be used instead.
 *
 * @public
 */
export declare class StdioWritable extends TerminalWritable {
    static instance: StdioWritable;
    protected onWriteChunk(chunk: ITerminalChunk): void;
}

/**
 * Terminal provider that stores written data in buffers separated by severity.
 * This terminal provider is designed to be used when code that prints to a terminal
 * is being unit tested.
 *
 * @beta
 */
export declare class StringBufferTerminalProvider implements ITerminalProvider {
    private _standardBuffer;
    private _verboseBuffer;
    private _debugBuffer;
    private _warningBuffer;
    private _errorBuffer;
    private _supportsColor;
    constructor(supportsColor?: boolean);
    /**
     * {@inheritDoc ITerminalProvider.write}
     */
    write(data: string, severity: TerminalProviderSeverity): void;
    /**
     * {@inheritDoc ITerminalProvider.eolCharacter}
     */
    get eolCharacter(): string;
    /**
     * {@inheritDoc ITerminalProvider.supportsColor}
     */
    get supportsColor(): boolean;
    /**
     * Get everything that has been written at log-level severity.
     */
    getOutput(options?: IStringBufferOutputOptions): string;
    /**
     * @deprecated - use {@link StringBufferTerminalProvider.getVerboseOutput}
     */
    getVerbose(options?: IStringBufferOutputOptions): string;
    /**
     * Get everything that has been written at verbose-level severity.
     */
    getVerboseOutput(options?: IStringBufferOutputOptions): string;
    /**
     * Get everything that has been written at debug-level severity.
     */
    getDebugOutput(options?: IStringBufferOutputOptions): string;
    /**
     * Get everything that has been written at error-level severity.
     */
    getErrorOutput(options?: IStringBufferOutputOptions): string;
    /**
     * Get everything that has been written at warning-level severity.
     */
    getWarningOutput(options?: IStringBufferOutputOptions): string;
    private _normalizeOutput;
}

/**
 * This class facilitates writing to a console.
 *
 * @beta
 */
export declare class Terminal implements ITerminal {
    private _providers;
    constructor(provider: ITerminalProvider);
    /**
     * {@inheritdoc ITerminal.registerProvider}
     */
    registerProvider(provider: ITerminalProvider): void;
    /**
     * {@inheritdoc ITerminal.unregisterProvider}
     */
    unregisterProvider(provider: ITerminalProvider): void;
    /**
     * {@inheritdoc ITerminal.write}
     */
    write(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeLine}
     */
    writeLine(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeWarning}
     */
    writeWarning(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeWarningLine}
     */
    writeWarningLine(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeError}
     */
    writeError(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeErrorLine}
     */
    writeErrorLine(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeVerbose}
     */
    writeVerbose(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeVerboseLine}
     */
    writeVerboseLine(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeDebug}
     */
    writeDebug(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeDebugLine}
     */
    writeDebugLine(...messageParts: TerminalWriteParameters): void;
    private _writeSegmentsToProviders;
    private _serializeLegacyColorableSequence;
    private _normalizeWriteParameters;
}

/**
 * Specifies the kind of data represented by a {@link ITerminalChunk} object.
 * @public
 */
export declare enum TerminalChunkKind {
    /**
     * Indicates a `ITerminalChunk` object representing `stdout` console output.
     */
    Stdout = "O",
    /**
     * Indicates a `ITerminalChunk` object representing `stderr` console output.
     */
    Stderr = "E"
}

/**
 * Similar to many popular logging packages, terminal providers support a range of message
 * severities. These severities have built-in formatting defaults in the Terminal object
 * (warnings are yellow, errors are red, etc.).
 *
 * Terminal providers may choose to suppress certain messages based on their severity,
 * or to route some messages to other providers or not based on severity.
 *
 *   Severity  | Purpose
 *   --------- | -------
 *   error     | Build errors and fatal issues
 *   warning   | Not necessarily fatal, but indicate a problem the user should fix
 *   log       | Informational messages
 *   verbose   | Additional information that may not always be necessary
 *   debug     | Highest detail level, best used for troubleshooting information
 *
 * @beta
 */
export declare enum TerminalProviderSeverity {
    log = 0,
    warning = 1,
    error = 2,
    verbose = 3,
    debug = 4
}

/**
 * A adapter to allow writing to a provided terminal using Writable streams.
 *
 * @beta
 */
export declare class TerminalStreamWritable extends Writable {
    private _writeMethod;
    constructor(options: ITerminalStreamWritableOptions);
    _write(chunk: string | Buffer | Uint8Array, encoding: string, callback: (error?: Error | null) => void): void;
}

/**
 * The abstract base class for {@link TerminalWritable} objects that receive an input,
 * transform it somehow, and then write the output to another `TerminalWritable`.
 *
 * @remarks
 *
 * The `TerminalTransform` and {@link SplitterTransform} base classes formalize the idea
 * of modeling data flow as a directed acyclic graph of reusable transforms, whose
 * final outputs are `TerminalWritable` objects.
 *
 * The design is based loosely on the `WritableStream` and `TransformStream` classes from
 * the system {@link https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts
 * | Streams API}, except that instead of asynchronous byte streams, the `TerminalWritable`
 * system synchronously transmits human readable messages intended to be rendered on a
 * text console or log file.
 *
 * The main feature of the `TerminalTransform` class is its {@link TerminalTransform.destination}
 * property, which tracks the next link in the graph.
 *
 * @public
 */
export declare abstract class TerminalTransform extends TerminalWritable {
    /** {@inheritDoc ITerminalTransformOptions.destination} */
    readonly destination: TerminalWritable;
    /** {@inheritDoc ITerminalTransformOptions.preventDestinationAutoclose} */
    readonly preventDestinationAutoclose: boolean;
    constructor(options: ITerminalTransformOptions);
    /** @override */
    protected onClose(): void;
    /**
     * The default implementation of {@link TerminalTransform.onClose} calls this
     * method, which closes the {@link TerminalTransform.destination} if appropriate.
     *
     * @remarks
     * The destination will not be closed if its {@link TerminalWritable.preventAutoclose}
     * property is `true`.  The destination will not be closed if
     * {@link ITerminalTransformOptions.preventDestinationAutoclose}
     * is `true`.
     *
     * @sealed
     */
    protected autocloseDestination(): void;
}

/**
 * The abstract base class for objects that can present, route, or process text output for
 * a console application.  This output is typically prepared using
 * the {@link Terminal} API.
 *
 * @remarks
 *
 * The design is based loosely on the `WritableStream` and `TransformStream` classes from
 * the system {@link https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts
 * | Streams API}, except that instead of asynchronous byte streams, the `TerminalWritable`
 * system synchronously transmits human readable messages intended to be rendered on a text
 * console or log file.
 *
 * Consider a console application whose output may need to be processed in different ways
 * before finally being output.  The conceptual block diagram might look like this:
 *
 * ```
 *          [Terminal API]
 *                 |
 *                 V
 *        [normalize newlines]
 *                 |
 *                 V
 *       +----[splitter]-------+
 *       |                     |
 *       V                     V
 *   [shell console]     [remove ANSI colors]
 *                             |
 *                             V
 *                       [write to build.log]
 * ```
 *
 * The application uses the `Terminal` API to print `stdout` and `stderr` messages, for example with standardized
 * formatting for errors and warnings, and ANSI escapes to make nice colors.  Maybe it also includes text
 * received from external processes, whose newlines may be inconsistent.  Ultimately we want to write the
 * output to the shell console and a `build.log` file, but we don't want to put ANSI colors in the build log.
 *
 * For the above example, `[shell console]` and `[write to build.log]` would be modeled as subclasses of
 * `TerminalWritable`.  The `[normalize newlines]` and `[remove ANSI colors]` steps are modeled as subclasses
 * of {@link TerminalTransform}, because they output to a "destination" object.  The `[splitter]` would be
 * implemented using {@link SplitterTransform}.
 *
 * The stream of messages are {@link ITerminalChunk} objects, which can represent both `stdout` and `stderr`
 * channels.  The pipeline operates synchronously on each chunk, but by processing one chunk at a time,
 * it avoids storing the entire output in memory.  This means that operations like `[remove ANSI colors]`
 * cannot be simple regular expressions -- they must be implemented as state machines ({@link TextRewriter}
 * subclasses) capable of matching substrings that span multiple chunks.
 *
 * @public
 */
export declare abstract class TerminalWritable {
    private _isOpen;
    readonly preventAutoclose: boolean;
    constructor(options?: ITerminalWritableOptions);
    /**
     * This property is initially `true` when the object is constructed, and becomes `false`
     * when `close()` is called.
     * @sealed
     */
    get isOpen(): boolean;
    /**
     * Upstream objects call this method to provide inputs to this object.
     *
     * @remarks
     * The subclass provides its implementation via the the {@link TerminalWritable.onWriteChunk}
     * method, which is called by `writeChunk()`.
     *
     * The object that calls `writeChunk()` must call `close()` when it is finished;
     * failing to do so may introduce a resource leak, or may prevent some buffered data from
     * being written.
     *
     * @sealed
     */
    writeChunk(chunk: ITerminalChunk): void;
    /**
     * Subclasses should implement this `abstract` method to process the chunk.
     */
    protected abstract onWriteChunk(chunk: ITerminalChunk): void;
    /**
     * Calling this method flushes any remaining outputs and permanently transitions the
     * `TerminalWritable` to a "closed" state, where no further chunks can be written.
     *
     * @remarks
     * The subclass provides its implementation via the the {@link TerminalWritable.onClose}
     * method, which is called by `close()`.
     *
     * If this method is called more than once, the additional calls are ignored;
     * `TerminalWritable.onClose` will be called at most once.
     *
     * @sealed
     */
    close(): void;
    /**
     * Subclasses can override this empty method to perform additional operations
     * such as closing a file handle.
     *
     * @remarks
     * It is guaranteed that this method will be called at most once during the lifetime
     * of a `TerminalWritable` object.
     *
     * @virtual
     */
    protected onClose(): void;
}

/**
 * @beta
 */
export declare type TerminalWriteParameters = string[] | [...string[], ITerminalWriteOptions];

/**
 * The abstract base class for operations that can be applied by {@link TextRewriterTransform}.
 *
 * @remarks
 * The {@link TextRewriterTransform} applies one or more character rewriting operations to its
 * chunk stream.  Since these operations are applied separately to `stderr` and `stdout`, the
 * state is stored in an opaque `TextRewriterState` object.
 *
 * Conceptually, a `TextRewriter` subclass is very similar to a regular expression, with the difference
 * that `RegExp` operates on a text string, whereas `TextRewriter` operates on a stream of characters.
 *
 * The two most common subclasses are {@link NormalizeNewlinesTextRewriter} and {@link RemoveColorsTextRewriter}.
 *
 * A rewriting operation starts with `initialize()`, followed by any number of `process()` calls, and
 * then finishes with `close()`.  For example:
 *
 * ```ts
 * const rewriter: NormalizeNewlinesTextRewriter = new NormalizeNewlinesTextRewriter(NewlineKind.Lf);
 * const state: TextRewriterState = rewriter.initialize();
 * let output: string = rewriter.process(state, 'line 1\r');
 * output += rewriter.process(state, '\nline 2\r\n');
 * output += rewriter.close(state);
 *
 * // The final "output" value is: "line 1\nline 2\n"
 * ```
 *
 * After `close()` has been called, the `TextRewriterState` state should not be reused.
 *
 * @public
 */
export declare abstract class TextRewriter {
    /**
     * Create a new `TextRewriterState` object that can be used to process a stream of characters.
     */
    abstract initialize(): TextRewriterState;
    /**
     * Rewrite the next sequence of characters from the input stream, returning the modified output.
     */
    abstract process(state: TextRewriterState, input: string): string;
    /**
     * Close the `TextRewriterState` object and return any buffered output.
     */
    abstract close(state: TextRewriterState): string;
}

/**
 * Represents the internal state of a {@link TextRewriter} subclass.
 *
 * @remarks
 * For example, suppose that {@link NormalizeNewlinesTextRewriter} will be used to rewrite
 * the input `"line 1\r\nline 2\r\n"` to become `"line 1\nline 2\n"`.  But suppose that the `"\r\n"`
 * pair is split across two chunks:
 *
 * ```ts
 * const rewriter: NormalizeNewlinesTextRewriter = new NormalizeNewlinesTextRewriter(NewlineKind.Lf);
 * const state: TextRewriterState = rewriter.initialize();
 * let output: string = rewriter.process(state, 'line 1\r');
 * output += rewriter.process(state, '\nline 2\r\n');
 * output += rewriter.close(state);
 *
 * // The final "output" value is: "line 1\nline 2\n"
 * ```
 *
 * The `TextRewriterState` keeps track of this context, so that split `"\r"` and `"\n"` are
 * interpreted as a single newline.
 *
 * @public
 */
export declare type TextRewriterState = Brand<unknown, 'TextRewriterState'>;

/**
 * A {@link TerminalTransform} subclass that performs one or more {@link TextRewriter} operations.
 * The most common operations are {@link NormalizeNewlinesTextRewriter} and {@link RemoveColorsTextRewriter}.
 *
 * @remarks
 * The `TextRewriter` operations are applied separately to the `stderr` and `stdout` streams.
 * If multiple {@link ITextRewriterTransformOptions.textRewriters} are configured, they are applied
 * in the order that they appear in the array.
 *
 * @public
 */
export declare class TextRewriterTransform extends TerminalTransform {
    private readonly _stderrStates;
    private readonly _stdoutStates;
    readonly textRewriters: ReadonlyArray<TextRewriter>;
    constructor(options: ITextRewriterTransformOptions);
    protected onWriteChunk(chunk: ITerminalChunk): void;
    private _processText;
    private _closeRewriters;
    protected onClose(): void;
}

export { }
