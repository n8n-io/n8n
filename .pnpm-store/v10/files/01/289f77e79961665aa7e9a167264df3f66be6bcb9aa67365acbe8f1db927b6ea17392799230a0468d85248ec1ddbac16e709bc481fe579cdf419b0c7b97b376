import type * as CSS from 'csstype';
import React from 'react';
import ComponentStyle from './models/ComponentStyle';
import { DefaultTheme } from './models/ThemeProvider';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';
import type { SupportedHTMLElements } from './utils/domElements';
export { CSS, DefaultTheme, SupportedHTMLElements };
interface ExoticComponentWithDisplayName<P extends object = {}> extends React.ExoticComponent<P> {
    defaultProps?: Partial<P> | undefined;
    displayName?: string | undefined;
}
/**
 * Use this type to disambiguate between a styled-component instance
 * and a StyleFunction or any other type of function.
 */
export type StyledComponentBrand = {
    readonly _sc: symbol;
};
export type BaseObject = {};
export type OmitNever<T> = {
    [K in keyof T as T[K] extends never ? never : K]: T[K];
};
export type FastOmit<T extends object, U extends string | number | symbol> = {
    [K in keyof T as K extends U ? never : K]: T[K];
};
export type Runtime = 'web' | 'native';
export type AnyComponent<P extends object = any> = ExoticComponentWithDisplayName<P> | React.ComponentType<P>;
export type KnownTarget = SupportedHTMLElements | AnyComponent;
export type WebTarget = string | KnownTarget;
export type NativeTarget = AnyComponent;
export type StyledTarget<R extends Runtime> = R extends 'web' ? WebTarget : NativeTarget;
export interface StyledOptions<R extends Runtime, Props extends object> {
    attrs?: Attrs<Props>[] | undefined;
    componentId?: (R extends 'web' ? string : never) | undefined;
    displayName?: string | undefined;
    parentComponentId?: (R extends 'web' ? string : never) | undefined;
    shouldForwardProp?: ShouldForwardProp<R> | undefined;
}
export type Dict<T = any> = {
    [key: string]: T;
};
/**
 * This type is intended for when data attributes are composed via
 * the `.attrs` API:
 *
 * ```tsx
 * styled.div.attrs<DataAttributes>({ 'data-testid': 'foo' })``
 * ```
 *
 * Would love to figure out how to support this natively without having to
 * manually compose the type, but haven't figured out a way to do so yet that
 * doesn't cause specificity loss (see `test/types.tsx` if you attempt to embed
 * `DataAttributes` directly in the `Attrs<>` type.)
 */
export type DataAttributes = {
    [key: `data-${string}`]: any;
};
export type ExecutionProps = {
    /**
     * Dynamically adjust the rendered component or HTML tag, e.g.
     * ```
     * const StyledButton = styled.button``
     *
     * <StyledButton as="a" href="/foo">
     *   I'm an anchor now
     * </StyledButton>
     * ```
     */
    as?: KnownTarget | undefined;
    forwardedAs?: KnownTarget | undefined;
    theme?: DefaultTheme | undefined;
};
/**
 * ExecutionProps but with `theme` required.
 */
export interface ExecutionContext extends ExecutionProps {
    theme: DefaultTheme;
}
export interface StyleFunction<Props extends object> {
    (executionContext: ExecutionContext & Props): Interpolation<Props>;
}
export type Interpolation<Props extends object> = StyleFunction<Props> | StyledObject<Props> | TemplateStringsArray | string | number | false | undefined | null | Keyframes | StyledComponentBrand | RuleSet<Props> | Interpolation<Props>[];
export type Attrs<Props extends object = BaseObject> = (ExecutionProps & Partial<Props>) | ((props: ExecutionContext & Props) => ExecutionProps & Partial<Props>);
export type RuleSet<Props extends object = BaseObject> = Interpolation<Props>[];
export type Styles<Props extends object> = TemplateStringsArray | StyledObject<Props> | StyleFunction<Props>;
export type NameGenerator = (hash: number) => string;
export interface StyleSheet {
    create: Function;
}
export interface Keyframes {
    id: string;
    name: string;
    rules: string;
}
export interface Flattener<Props extends object> {
    (chunks: Interpolation<Props>[], executionContext: object | null | undefined, styleSheet: StyleSheet | null | undefined): Interpolation<Props>[];
}
export interface Stringifier {
    (css: string, selector?: string | undefined, prefix?: string | undefined, componentId?: string | undefined): string[];
    hash: string;
}
export interface ShouldForwardProp<R extends Runtime> {
    (prop: string, elementToBeCreated: StyledTarget<R>): boolean;
}
export interface CommonStatics<R extends Runtime, Props extends object> {
    attrs: Attrs<Props>[];
    target: StyledTarget<R>;
    shouldForwardProp?: ShouldForwardProp<R> | undefined;
}
export interface IStyledStatics<R extends Runtime, OuterProps extends object> extends CommonStatics<R, OuterProps> {
    componentStyle: R extends 'web' ? ComponentStyle : never;
    foldedComponentIds: R extends 'web' ? string : never;
    inlineStyle: R extends 'native' ? InstanceType<IInlineStyleConstructor<OuterProps>> : never;
    target: StyledTarget<R>;
    styledComponentId: R extends 'web' ? string : never;
    warnTooManyClasses?: (R extends 'web' ? ReturnType<typeof createWarnTooManyClasses> : never) | undefined;
}
/**
 * Used by PolymorphicComponent to define prop override cascading order.
 */
export type PolymorphicComponentProps<R extends Runtime, BaseProps extends object, AsTarget extends StyledTarget<R> | void, ForwardedAsTarget extends StyledTarget<R> | void, AsTargetProps extends object = AsTarget extends KnownTarget ? React.ComponentPropsWithRef<AsTarget> : {}, ForwardedAsTargetProps extends object = ForwardedAsTarget extends KnownTarget ? React.ComponentPropsWithRef<ForwardedAsTarget> : {}> = NoInfer<FastOmit<Substitute<BaseProps, Substitute<ForwardedAsTargetProps, AsTargetProps>>, keyof ExecutionProps>> & FastOmit<ExecutionProps, 'as' | 'forwardedAs'> & {
    as?: AsTarget;
    forwardedAs?: ForwardedAsTarget;
};
/**
 * This type forms the signature for a forwardRef-enabled component
 * that accepts the "as" prop to dynamically change the underlying
 * rendered JSX. The interface will automatically attempt to extract
 * props from the given rendering target to get proper typing for
 * any specialized props in the target component.
 */
export interface PolymorphicComponent<R extends Runtime, BaseProps extends object> extends React.ForwardRefExoticComponent<BaseProps> {
    <AsTarget extends StyledTarget<R> | void = void, ForwardedAsTarget extends StyledTarget<R> | void = void>(props: PolymorphicComponentProps<R, BaseProps, AsTarget, ForwardedAsTarget>): JSX.Element;
}
export interface IStyledComponent<R extends Runtime, Props extends object = BaseObject> extends PolymorphicComponent<R, Props>, IStyledStatics<R, Props>, StyledComponentBrand {
    defaultProps?: (ExecutionProps & Partial<Props>) | undefined;
    toString: () => string;
}
export interface IStyledComponentFactory<R extends Runtime, Target extends StyledTarget<R>, OuterProps extends object, OuterStatics extends object = BaseObject> {
    <Props extends object = BaseObject, Statics extends object = BaseObject>(target: Target, options: StyledOptions<R, OuterProps & Props>, rules: RuleSet<OuterProps & Props>): IStyledComponent<R, Substitute<OuterProps, Props>> & OuterStatics & Statics;
}
export interface IInlineStyleConstructor<Props extends object> {
    new (rules: RuleSet<Props>): IInlineStyle<Props>;
}
export interface IInlineStyle<Props extends object> {
    rules: RuleSet<Props>;
    generateStyleObject(executionContext: ExecutionContext & Props): object;
}
export type CSSProperties = CSS.Properties<number | (string & {})>;
export type CSSPseudos = {
    [K in CSS.Pseudos]?: CSSObject;
};
export type CSSKeyframes = object & {
    [key: string]: CSSObject;
};
export type CSSObject<Props extends object = BaseObject> = StyledObject<Props>;
export interface StyledObject<Props extends object = BaseObject> extends CSSProperties, CSSPseudos {
    [key: string]: StyledObject<Props> | string | number | StyleFunction<Props> | RuleSet<any> | undefined;
}
/**
 * The `css` prop is not declared by default in the types as it would cause `css` to be present
 * on the types of anything that uses styled-components indirectly, even if they do not use the
 * babel plugin.
 *
 * To enable support for the `css` prop in TypeScript, create a `styled-components.d.ts` file in
 * your project source with the following contents:
 *
 * ```ts
 * import type { CSSProp } from "styled-components";
 *
 * declare module "react" {
 *  interface Attributes {
 *    css?: CSSProp;
 *  }
 * }
 * ```
 *
 * In order to get accurate typings for `props.theme` in `css` interpolations, see
 * {@link DefaultTheme}.
 */
export type CSSProp = Interpolation<any>;
export type NoInfer<T> = [T][T extends any ? 0 : never];
export type Substitute<A extends object, B extends object> = FastOmit<A, keyof B> & B;
