import type { Part } from './part';
import { PartImpl } from './partImpl';
import type { SharedThemeParams } from './shared/shared-css';
import type { Theme } from './theme';
import type { ThemeLogger } from './themeLogger';
import type { WithParamTypes } from './themeTypes';
export declare const _asThemeImpl: <TParams>(theme: Theme<TParams>) => ThemeImpl;
export declare const createSharedTheme: <TParams extends SharedThemeParams>(themeLogger: ThemeLogger) => Theme<TParams>;
type themeUseArgs = {
    loadThemeGoogleFonts: boolean | undefined;
    styleContainer: HTMLElement;
    cssLayer: string | undefined;
    nonce: string | undefined;
    moduleCss: Map<string, string[]> | undefined;
};
export declare class ThemeImpl {
    private readonly themeLogger;
    readonly parts: PartImpl[];
    constructor(themeLogger: ThemeLogger, parts?: PartImpl[]);
    withPart(part: Part | (() => Part)): ThemeImpl;
    withoutPart(feature: string): ThemeImpl;
    withParams(params: WithParamTypes<unknown>, mode?: string): ThemeImpl;
    /**
     * Called by a grid instance when it starts using the theme. This installs
     * the theme's parts into document head, or the shadow DOM if the provided
     * container is within a shadow root.
     */
    _startUse({ styleContainer, cssLayer, nonce, loadThemeGoogleFonts, moduleCss }: themeUseArgs): void;
    private _cssClassCache?;
    /**
     * Return CSS that that applies the params of this theme to elements with
     * the provided class name
     */
    _getCssClass(this: ThemeImpl): string;
    private _paramsCache?;
    _getModeParams(): ModalParamValues;
    private _paramsCssCache?;
    /**
     * Return the CSS chunk that is inserted into the grid DOM, and will
     * therefore be removed automatically when the grid is destroyed or it
     * starts to use a new theme.
     *
     * @param className a unique class name on the grid wrapper used to scope the returned CSS to the grid instance
     */
    _getPerInstanceCss(className: string): string;
}
type ParamValues = Record<string, unknown>;
type ModalParamValues = {
    [mode: string]: ParamValues;
};
export {};
