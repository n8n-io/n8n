interface ThemeVars extends ThemeVarsBase, ThemeVarsColors {
}
interface ThemeVarsPartial extends ThemeVarsBase, Partial<ThemeVarsColors> {
}
interface ThemeVarsBase {
    base: 'light' | 'dark';
}
interface ThemeVarsColors {
    colorPrimary: string;
    colorSecondary: string;
    appBg: string;
    appContentBg: string;
    appPreviewBg: string;
    appBorderColor: string;
    appBorderRadius: number;
    fontBase: string;
    fontCode: string;
    textColor: string;
    textInverseColor: string;
    textMutedColor: string;
    barTextColor: string;
    barHoverColor: string;
    barSelectedColor: string;
    barBg: string;
    buttonBg: string;
    buttonBorder: string;
    booleanBg: string;
    booleanSelectedBg: string;
    inputBg: string;
    inputBorder: string;
    inputTextColor: string;
    inputBorderRadius: number;
    brandTitle?: string;
    brandUrl?: string;
    brandImage?: string;
    brandTarget?: string;
    gridCellSize?: number;
}

declare const themes: {
    light: ThemeVars;
    dark: ThemeVars;
    normal: ThemeVars;
};
interface Rest {
    [key: string]: any;
}
declare const create: (vars?: ThemeVarsPartial, rest?: Rest) => ThemeVars;

export { create, themes };
