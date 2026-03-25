export declare enum SgrParameterAttribute {
    BlackForeground = 30,
    RedForeground = 31,
    GreenForeground = 32,
    YellowForeground = 33,
    BlueForeground = 34,
    MagentaForeground = 35,
    CyanForeground = 36,
    WhiteForeground = 37,
    GrayForeground = 90,
    DefaultForeground = 39,
    BlackBackground = 40,
    RedBackground = 41,
    GreenBackground = 42,
    YellowBackground = 43,
    BlueBackground = 44,
    MagentaBackground = 45,
    CyanBackground = 46,
    WhiteBackground = 47,
    GrayBackground = 100,
    DefaultBackground = 49,
    Bold = 1,
    Dim = 2,
    NormalColorOrIntensity = 22,
    Underline = 4,
    UnderlineOff = 24,
    Blink = 5,
    BlinkOff = 25,
    InvertColor = 7,
    InvertColorOff = 27,
    Hidden = 8,
    HiddenOff = 28
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
//# sourceMappingURL=Colorize.d.ts.map