interface RGBColor {
    type: 'rgb';
    r: number;
    g: number;
    b: number;
    alpha: number;
}
interface HSLColor {
    type: 'hsl';
    h: number;
    s: number;
    l: number;
    alpha: number;
}
interface LABColor {
    type: 'lab';
    l: number;
    a: number;
    b: number;
    alpha: number;
}
interface LCHColor {
    type: 'lch';
    l: number;
    c: number;
    h: number;
    alpha: number;
}
interface FunctionColor {
    type: 'function';
    func: string;
    value: string;
}
interface TransparentColor {
    type: 'transparent';
}
interface NoColor {
    type: 'none';
}
interface CurrentColor {
    type: 'current';
}
type Color = RGBColor | HSLColor | LABColor | LCHColor | FunctionColor | TransparentColor | NoColor | CurrentColor;

export { Color, CurrentColor, FunctionColor, HSLColor, LABColor, LCHColor, NoColor, RGBColor, TransparentColor };
