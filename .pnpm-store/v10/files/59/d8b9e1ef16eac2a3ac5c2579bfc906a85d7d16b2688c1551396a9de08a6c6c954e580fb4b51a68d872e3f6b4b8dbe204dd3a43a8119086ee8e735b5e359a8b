interface ColorOptions {
    enableAlpha: boolean;
    format: string;
    value?: string;
}
export default class Color {
    private _hue;
    private _saturation;
    private _value;
    _alpha: number;
    enableAlpha: boolean;
    format: string;
    value: string;
    selected?: boolean;
    constructor(options?: Partial<ColorOptions>);
    set(prop: {
        [key: string]: any;
    } | any, value?: number): void;
    get(prop: string): any;
    toRgb(): {
        r: number;
        g: number;
        b: number;
    };
    fromString(value: string): void;
    compare(color: this): boolean;
    doOnChange(): void;
}
export {};
