export declare const modifierNames: string[];
export declare const foregroundColorNames: string[];
export declare const backgroundColorNames: string[];
export declare const colorNames: string[];
export declare const codes: Map<number, number>;
export declare const ansiStyles: {
    [x: string]: unknown;
    codes: Map<number, number>;
    modifier: {
        [k: string]: {
            open: string;
            close: string;
        };
    };
    color: {
        close: string;
        ansi: (code: number) => string;
        ansi256: (code: number) => string;
        ansi16m: (red: number, green: number, blue: number) => string;
    };
    bgColor: {
        close: string;
        ansi: (code: number) => string;
        ansi256: (code: number) => string;
        ansi16m: (red: number, green: number, blue: number) => string;
    };
    rgbToAnsi256(red: number, green: number, blue: number): number;
    hexToRgb(hex: number): [number, number, number];
    hexToAnsi256(hex: number): number;
    ansi256ToAnsi(code: number): number;
    rgbToAnsi(red: number, green: number, blue: number): number;
    hexToAnsi(hex: number): number;
};
//# sourceMappingURL=index.d.ts.map