type ColorExtend = Record<string, string | { open: string, close: string }>
declare const ansis: Ansis;
interface Ansis {
  isSupported: () => boolean;
  (string: string): string;
  (string: TemplateStringsArray, ...parameters: string[]): string;
  ansi256: (code: number) => this;
  fg: (code: number) => this;
  bgAnsi256: (code: number) => this;
  bg: (code: number) => this;
  rgb: (red: number, green: number, blue: number) => this;
  hex: (color: string) => this;
  bgRgb: (red: number, green: number, blue: number) => this;
  bgHex: (color: string) => this;
  strip: (string: string) => string;
  extend: (colors: ColorExtend) => void;
  readonly open: string;
  readonly close: string;
  readonly reset: this;
  readonly inverse: this;
  readonly hidden: this;
  readonly visible: this;
  readonly bold: this;
  readonly dim: this;
  readonly italic: this;
  readonly underline: this;
  readonly strikethrough: this;
  readonly strike: this;
  readonly black: this;
  readonly red: this;
  readonly green: this;
  readonly yellow: this;
  readonly blue: this;
  readonly magenta: this;
  readonly cyan: this;
  readonly white: this;
  readonly grey: this;
  readonly gray: this;
  readonly blackBright: this;
  readonly redBright: this;
  readonly greenBright: this;
  readonly yellowBright: this;
  readonly blueBright: this;
  readonly magentaBright: this;
  readonly cyanBright: this;
  readonly whiteBright: this;
  readonly bgBlack: this;
  readonly bgRed: this;
  readonly bgGreen: this;
  readonly bgYellow: this;
  readonly bgBlue: this;
  readonly bgMagenta: this;
  readonly bgCyan: this;
  readonly bgWhite: this;
  readonly bgGrey: this;
  readonly bgGray: this;
  readonly bgBlackBright: this;
  readonly bgRedBright: this;
  readonly bgGreenBright: this;
  readonly bgYellowBright: this;
  readonly bgBlueBright: this;
  readonly bgMagentaBright: this;
  readonly bgCyanBright: this;
  readonly bgWhiteBright: this;
}
declare const Ansis: new () => Ansis;
type AnsiStyles = (
  | 'reset'
  | 'inverse'
  | 'hidden'
  | 'visible'
  | 'bold'
  | 'dim'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'strike'
  );
type AnsiColors = (
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'grey'
  | 'gray'
  | 'blackBright'
  | 'redBright'
  | 'greenBright'
  | 'yellowBright'
  | 'blueBright'
  | 'magentaBright'
  | 'cyanBright'
  | 'whiteBright'
  | 'bgBlack'
  | 'bgRed'
  | 'bgGreen'
  | 'bgYellow'
  | 'bgBlue'
  | 'bgMagenta'
  | 'bgCyan'
  | 'bgWhite'
  | 'bgGrey'
  | 'bgGray'
  | 'bgBlackBright'
  | 'bgRedBright'
  | 'bgGreenBright'
  | 'bgYellowBright'
  | 'bgBlueBright'
  | 'bgMagentaBright'
  | 'bgCyanBright'
  | 'bgWhiteBright'
  );
type StringUnion<T, B extends string> = T | (B & Record<never, never>);
type AnsiColorsExtend<T extends string> = StringUnion<AnsiColors, T>;

declare function ansi256(code: number): Ansis;
declare function fg(code: number): Ansis;
declare function bgAnsi256(code: number): Ansis;
declare function bg(code: number): Ansis;
declare function rgb(red: number, green: number, blue: number): Ansis;
declare function bgRgb(red: number, green: number, blue: number): Ansis;
declare function hex(code: string): Ansis;
declare function bgHex(code: string): Ansis;
declare const reset: Ansis;
declare const inverse: Ansis;
declare const hidden: Ansis;
declare const visible: Ansis;
declare const bold: Ansis;
declare const dim: Ansis;
declare const italic: Ansis;
declare const underline: Ansis;
declare const strikethrough: Ansis;
declare const strike: Ansis;
declare const black: Ansis;
declare const red: Ansis;
declare const green: Ansis;
declare const yellow: Ansis;
declare const blue: Ansis;
declare const magenta: Ansis;
declare const cyan: Ansis;
declare const white: Ansis;
declare const gray: Ansis;
declare const grey: Ansis;
declare const blackBright: Ansis;
declare const redBright: Ansis;
declare const greenBright: Ansis;
declare const yellowBright: Ansis;
declare const blueBright: Ansis;
declare const magentaBright: Ansis;
declare const cyanBright: Ansis;
declare const whiteBright: Ansis;
declare const bgBlack: Ansis;
declare const bgRed: Ansis;
declare const bgGreen: Ansis;
declare const bgYellow: Ansis;
declare const bgBlue: Ansis;
declare const bgMagenta: Ansis;
declare const bgCyan: Ansis;
declare const bgWhite: Ansis;
declare const bgBlackBright: Ansis;
declare const bgRedBright: Ansis;
declare const bgGreenBright: Ansis;
declare const bgYellowBright: Ansis;
declare const bgBlueBright: Ansis;
declare const bgMagentaBright: Ansis;
declare const bgCyanBright: Ansis;
declare const bgWhiteBright: Ansis;

export { type AnsiColors, type AnsiColorsExtend, type AnsiStyles, Ansis, ansi256, bg, bgAnsi256, bgBlack, bgBlackBright, bgBlue, bgBlueBright, bgCyan, bgCyanBright, bgGreen, bgGreenBright, bgHex, bgMagenta, bgMagentaBright, bgRed, bgRedBright, bgRgb, bgWhite, bgWhiteBright, bgYellow, bgYellowBright, black, blackBright, blue, blueBright, bold, cyan, cyanBright, ansis as default, dim, fg, gray, green, greenBright, grey, hex, hidden, inverse, italic, magenta, magentaBright, red, redBright, reset, rgb, strike, strikethrough, underline, visible, white, whiteBright, yellow, yellowBright };
