import * as storybook_internal_csf from 'storybook/internal/csf';
import { Renderer, DecoratorFunction, StoryContext } from 'storybook/internal/types';

interface ThemesParameters$1 {
    /**
     * Themes configuration
     *
     * @see https://github.com/storybookjs/storybook/blob/next/code/addons/themes/README.md
     */
    themes?: {
        /** Remove the addon panel and disable the addon's behavior */
        disable?: boolean;
        /** Which theme to override for the story */
        themeOverride?: string;
    };
}
interface ThemesGlobals {
    /** Which theme to override for the story */
    theme?: string;
}
interface ThemesTypes {
    parameters: ThemesParameters$1;
    globals: ThemesGlobals;
}

interface ClassNameStrategyConfiguration {
    themes: Record<string, string>;
    defaultTheme: string;
    parentSelector?: string;
}
declare const withThemeByClassName: <TRenderer extends Renderer = Renderer>({ themes, defaultTheme, parentSelector, }: ClassNameStrategyConfiguration) => DecoratorFunction<TRenderer>;

interface DataAttributeStrategyConfiguration {
    themes: Record<string, string>;
    defaultTheme: string;
    parentSelector?: string;
    attributeName?: string;
}
declare const withThemeByDataAttribute: <TRenderer extends Renderer = any>({ themes, defaultTheme, parentSelector, attributeName, }: DataAttributeStrategyConfiguration) => DecoratorFunction<TRenderer>;

type Theme = Record<string, any>;
type ThemeMap = Record<string, Theme>;
interface ProviderStrategyConfiguration {
    Provider?: any;
    GlobalStyles?: any;
    defaultTheme?: string;
    themes?: ThemeMap;
}
declare const withThemeFromJSXProvider: <TRenderer extends Renderer = any>({ Provider, GlobalStyles, defaultTheme, themes, }: ProviderStrategyConfiguration) => DecoratorFunction<TRenderer>;

type ThemesParameters = ThemesParameters$1['themes'];
/**
 * @param StoryContext
 * @returns The global theme name set for your stories
 */
declare function pluckThemeFromContext({ globals }: StoryContext): string;
declare function useThemeParameters(context?: StoryContext): ThemesParameters;
declare function initializeThemeState(themeNames: string[], defaultTheme: string): void;

declare const helpers_initializeThemeState: typeof initializeThemeState;
declare const helpers_pluckThemeFromContext: typeof pluckThemeFromContext;
declare const helpers_useThemeParameters: typeof useThemeParameters;
declare namespace helpers {
  export { helpers_initializeThemeState as initializeThemeState, helpers_pluckThemeFromContext as pluckThemeFromContext, helpers_useThemeParameters as useThemeParameters };
}

declare const _default: () => storybook_internal_csf.PreviewAddon<ThemesTypes>;

export { type ClassNameStrategyConfiguration, type DataAttributeStrategyConfiguration, helpers as DecoratorHelpers, type ProviderStrategyConfiguration, type ThemesTypes, _default as default, withThemeByClassName, withThemeByDataAttribute, withThemeFromJSXProvider };
