import type { Part } from './Part';
import { PartImpl } from './Part';
import type { CoreParams } from './core/core-css';
import type { BatchEditStyleParams } from './parts/batch-edit/batch-edit-styles';
import type { ButtonStyleParams } from './parts/button-style/button-styles';
import type { WithParamTypes } from './theme-types';
export declare const FORCE_LEGACY_THEMES = false;
export type Theme<TParams = unknown> = {
    /**
     * Return a new theme that uses an theme part. The part will replace any
     * existing part of the same feature
     *
     * @param part a part, or a no-arg function that returns a part
     */
    withPart<TPartParams>(part: Part<TPartParams> | (() => Part<TPartParams>)): Theme<TParams & TPartParams>;
    /**
     * Return a new theme removes any existing part with a feature.
     *
     * @param feature the name of the part to remove, e.g. 'checkboxStyle'
     */
    withoutPart(feature: string): Theme<TParams>;
    /**
     * Return a new theme with different default values for the specified
     * params.
     *
     * @param defaults an object containing params e.g. {spacing: 10}
     */
    withParams(defaults: Partial<TParams>, mode?: string): Theme<TParams>;
};
export declare const _asThemeImpl: <TParams>(theme: Theme<TParams>) => ThemeImpl;
/**
 * Create a custom theme containing core grid styles but no parts.
 */
export declare const createTheme: () => Theme<CoreParams & ButtonStyleParams & BatchEditStyleParams>;
type GridThemeUseArgs = {
    loadThemeGoogleFonts: boolean | undefined;
    styleContainer: HTMLElement;
    cssLayer: string | undefined;
    nonce: string | undefined;
};
export declare class ThemeImpl {
    readonly parts: PartImpl[];
    constructor(parts?: PartImpl[]);
    withPart(part: Part | (() => Part)): ThemeImpl;
    withoutPart(feature: string): ThemeImpl;
    withParams(params: WithParamTypes<unknown>, mode?: string): ThemeImpl;
    /**
     * Called by a grid instance when it starts using the theme. This installs
     * the theme's parts into document head, or the shadow DOM if the provided
     * container is within a shadow root.
     */
    _startUse({ styleContainer, cssLayer, nonce, loadThemeGoogleFonts }: GridThemeUseArgs): void;
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
    _getPerGridCss(className: string): string;
}
type ParamValues = Record<string, unknown>;
type ModalParamValues = {
    [mode: string]: ParamValues;
};
export {};
