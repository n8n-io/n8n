import { Command } from '../command';
import * as Interfaces from '../interfaces';
export type HelpSectionKeyValueTable = {
    description: string;
    name: string;
}[];
export type HelpSection = {
    body: [string, string | undefined][] | HelpSectionKeyValueTable | string | undefined;
    header: string;
} | undefined;
export type HelpSectionRenderer = (data: {
    args: Command.Arg.Any[];
    cmd: Command.Loadable;
    flags: Command.Flag.Any[];
}, header: string) => HelpSection | HelpSection[] | string | undefined;
export declare class HelpFormatter {
    protected config: Interfaces.Config;
    indentSpacing: number;
    protected opts: Interfaces.HelpOptions;
    /**
     * Takes a string and replaces `<%= prop =>` with the value of prop, where prop is anything on
     * `config=Interfaces.Config` or `opts=Interface.HelpOptions`.
     *
     * ```javascript
     * `<%= config.bin =>` // will resolve to the bin defined in `pjson.oclif`.
     * ```
     */
    render: (input: string) => string;
    constructor(config: Interfaces.Config, opts?: Partial<Interfaces.HelpOptions>);
    /**
     * Indent by `this.indentSpacing`. The text should be wrap based on terminal width before indented.
     *
     * In order to call indent multiple times on the same set or text, the caller must wrap based on
     * the number of times the text has been indented. For example.
     *
     * ```javascript
     * const body = `main line\n${indent(wrap('indented example line', 4))}`
     * const header = 'SECTION'
     * console.log(`${header}\n${indent(wrap(body))}`
     * ```
     * will output
     * ```
     * SECTION
     *   main line
     *     indented example line
     * ```
     *
     * If the terminal width was 24 and the `4` was not provided in the first wrap, it would like like the following.
     * ```
     * SECTION
     *   main line
     *     indented example
     *   line
     * ```
     * @param body the text to indent
     * @param spacing the final number of spaces this text will be indented
     * @return the formatted indented text
     */
    indent(body: string, spacing?: number): string;
    renderList(input: (string | undefined)[][], opts: {
        indentation: number;
        multiline?: boolean | undefined;
        spacer?: string | undefined;
        stripAnsi?: boolean | undefined;
    }): string;
    section(header: string, body: [string, string | undefined][] | HelpSection | HelpSectionKeyValueTable | string): string;
    /**
     * Wrap text according to `opts.maxWidth` which is typically set to the terminal width. All text
     * will be rendered before bring wrapped, otherwise it could mess up the lengths.
     *
     * A terminal will automatically wrap text, so this method is primarily used for indented
     * text. For indented text, specify the indentation so it is taken into account during wrapping.
     *
     * Here is an example of wrapping with indentation.
     * ```
     * <------ terminal window width ------>
     * <---------- no indentation --------->
     * This is my text that will be wrapped
     * once it passes maxWidth.
     *
     * <- indent -><------ text space ----->
     *             This is my text that will
     *             be wrapped once it passes
     *             maxWidth.
     *
     * <-- indent not taken into account ->
     *             This is my text that will
     * be wrapped
     *             once it passes maxWidth.
     * ```
     * @param body the text to wrap
     * @param spacing the indentation size to subtract from the terminal width
     * @returns the formatted wrapped text
     */
    wrap(body: string, spacing?: number): string;
}
