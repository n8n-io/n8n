export type DiffObject = object | string;

export interface ColorizeOptions {
    theme?: Theme;
    color?: boolean;
}

export type Theme = Record<ThemeType, ThemeFunction>;
export type ThemeType = " " | "+" | "-";
export type ThemeFunction = (str: string) => string;

export interface OutputCallback {
    (color: ThemeType, line: string): void;
}

export function colorizeToCallback(diff: DiffObject, options: ColorizeOptions, output: OutputCallback): void;
export function colorize(diff: DiffObject, options?: ColorizeOptions): string;
export function colorizeToArray(diff: DiffObject, options: ColorizeOptions): string[];
