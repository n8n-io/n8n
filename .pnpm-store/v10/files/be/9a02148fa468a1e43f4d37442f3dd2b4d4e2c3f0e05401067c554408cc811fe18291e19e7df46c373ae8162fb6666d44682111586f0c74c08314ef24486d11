import type { ThemeLogger } from './themeLogger';
import type { BorderValue, ColorValue, DurationValue, FontFamilyValue, ImageValue, LengthValue, ShadowValue } from './themeTypes';
export declare const paramTypes: readonly ["colorScheme", "color", "length", "scale", "borderStyle", "border", "shadow", "image", "fontFamily", "fontWeight", "duration"];
export type ParamType = (typeof paramTypes)[number];
/**
 * Return the ParamType for a given param name,
 */
export declare const getParamType: (arg: string) => "length" | "image" | "colorScheme" | "fontFamily" | "color" | "scale" | "borderStyle" | "border" | "shadow" | "fontWeight" | "duration";
export declare const colorValueToCss: (value: ColorValue) => string | false;
export declare const colorSchemeValueToCss: (value: string | number | {
    ref: string;
}) => string | false;
export declare const lengthValueToCss: (value: LengthValue) => string | false;
export declare const scaleValueToCss: (value: string | number | {
    ref: string;
}) => string | false;
export declare const borderValueToCss: (value: BorderValue, param: string) => string;
export declare const shadowValueToCss: (value: ShadowValue) => string | false;
export declare const borderStyleValueToCss: (value: string | number | {
    ref: string;
}) => string | false;
export declare const fontFamilyValueToCss: (value: FontFamilyValue) => string | false;
export declare const fontWeightValueToCss: (value: string | number | {
    ref: string;
}) => string | false;
export declare const imageValueToCss: (value: ImageValue) => string | false;
export declare const durationValueToCss: (value: DurationValue, param: string, themeLogger: ThemeLogger) => string | false;
export declare const paramValueToCss: (param: string, value: unknown, themeLogger: ThemeLogger) => string | false;
