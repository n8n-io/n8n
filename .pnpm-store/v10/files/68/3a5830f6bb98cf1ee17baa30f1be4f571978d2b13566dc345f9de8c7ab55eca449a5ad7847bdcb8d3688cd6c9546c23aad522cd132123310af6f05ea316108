import React from 'react';
import type stylis from 'stylis';
import StyleSheet from '../sheet';
import { InsertionTarget, ShouldForwardProp, Stringifier } from '../types';
export declare const mainSheet: StyleSheet;
export declare const mainStylis: Stringifier;
export type IStyleSheetContext = {
    shouldForwardProp?: ShouldForwardProp<'web'> | undefined;
    styleSheet: StyleSheet;
    stylis: Stringifier;
};
export declare const StyleSheetContext: React.Context<IStyleSheetContext>;
export declare const StyleSheetConsumer: React.Consumer<IStyleSheetContext>;
export type IStylisContext = Stringifier | void;
export declare const StylisContext: React.Context<IStylisContext>;
export declare const StylisConsumer: React.Consumer<IStylisContext>;
export declare function useStyleSheetContext(): IStyleSheetContext;
export type IStyleSheetManager = React.PropsWithChildren<{
    /**
     * If desired, you can pass this prop to disable "speedy" insertion mode, which
     * uses the browser [CSSOM APIs](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet).
     * When disabled, rules are inserted as simple text into style blocks.
     */
    disableCSSOMInjection?: undefined | boolean;
    /**
     * If you are working exclusively with modern browsers, vendor prefixes can often be omitted
     * to reduce the weight of CSS on the page.
     */
    enableVendorPrefixes?: undefined | boolean;
    /**
     * Provide an optional selector to be prepended to all generated style rules.
     */
    namespace?: undefined | string;
    /**
     * Create and provide your own `StyleSheet` if necessary for advanced SSR scenarios.
     */
    sheet?: undefined | StyleSheet;
    /**
     * Starting in v6, styled-components no longer does its own prop validation
     * and recommends use of transient props "$prop" to pass style-only props to
     * components. If for some reason you are not able to use transient props, a
     * prop validation function can be provided via `StyleSheetManager`, such as
     * `@emotion/is-prop-valid`.
     *
     * When the return value is `true`, props will be forwarded to the DOM/underlying
     * component. If return value is `false`, the prop will be discarded after styles
     * are calculated.
     *
     * Manually composing `styled.{element}.withConfig({shouldForwardProp})` will
     * override this default.
     */
    shouldForwardProp?: undefined | IStyleSheetContext['shouldForwardProp'];
    /**
     * An array of plugins to be run by stylis (style processor) during compilation.
     * Check out [what's available on npm*](https://www.npmjs.com/search?q=keywords%3Astylis).
     *
     * \* The plugin(s) must be compatible with stylis v4 or above.
     */
    stylisPlugins?: undefined | stylis.Middleware[];
    /**
     * Provide an alternate DOM node to host generated styles; useful for iframes.
     */
    target?: undefined | InsertionTarget;
}>;
export declare function StyleSheetManager(props: IStyleSheetManager): React.JSX.Element;
