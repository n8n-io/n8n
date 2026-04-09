import type { ColorValue, FontFamilyValue, FontWeightValue, ImageValue } from '../../../../agStack/theming/themeTypes';
type IconSetOverridesImage = {
    type: 'image';
    mask?: boolean;
    cssImports?: string[];
    icons: {
        [key: string]: ImageValue;
    };
};
type IconSetOverridesFont = {
    type: 'font';
    weight?: FontWeightValue;
    family?: FontFamilyValue;
    color?: ColorValue;
    cssImports?: string[];
    icons: {
        [key: string]: string;
    };
};
type IconSetOverridesArgs = IconSetOverridesImage | IconSetOverridesFont;
export declare const iconOverrides: (args: IconSetOverridesArgs) => import("../../../../main-umd-noStyles").Part<{}>;
export {};
