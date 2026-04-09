import React from 'react';
type DefaultThemeAsObject<T = object> = Record<keyof T, any>;
/**
 * Override DefaultTheme to get accurate typings for your project.
 *
 * ```
 * // create styled-components.d.ts in your project source
 * // if it isn't being picked up, check tsconfig compilerOptions.types
 * import type { CSSProp } from "styled-components";
 * import Theme from './theme';
 *
 * type ThemeType = typeof Theme;
 *
 * declare module "styled-components" {
 *  export interface DefaultTheme extends ThemeType {}
 * }
 *
 * declare module "react" {
 *  interface DOMAttributes<T> {
 *    css?: CSSProp;
 *  }
 * }
 * ```
 */
export interface DefaultTheme extends DefaultThemeAsObject {
}
type ThemeFn = (outerTheme?: DefaultTheme | undefined) => DefaultTheme;
type ThemeArgument = DefaultTheme | ThemeFn;
type Props = {
    children?: React.ReactNode;
    theme: ThemeArgument;
};
export declare const ThemeContext: React.Context<DefaultTheme | undefined>;
export declare const ThemeConsumer: React.Consumer<DefaultTheme | undefined>;
/**
 * Returns the current theme (as provided by the closest ancestor `ThemeProvider`.)
 *
 * If no `ThemeProvider` is found, the function will error. If you need access to the theme in an
 * uncertain composition scenario, `React.useContext(ThemeContext)` will not emit an error if there
 * is no `ThemeProvider` ancestor.
 */
export declare function useTheme(): DefaultTheme;
/**
 * Provide a theme to an entire react component tree via context
 */
export default function ThemeProvider(props: Props): React.JSX.Element | null;
export {};
