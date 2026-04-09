import * as React from 'react';
import { BaseObject, KnownTarget, WebTarget } from '../types';
import { SupportedHTMLElements } from '../utils/domElements';
import { Styled as StyledInstance } from './constructWithOptions';
declare const baseStyled: <Target extends WebTarget, InjectedProps extends object = BaseObject>(tag: Target) => StyledInstance<"web", Target, Target extends KnownTarget ? React.ComponentPropsWithRef<Target> & InjectedProps : InjectedProps, BaseObject>;
declare const styled: typeof baseStyled & { [E in SupportedHTMLElements]: StyledInstance<"web", E, React.JSX.IntrinsicElements[E]>; };
export default styled;
export { StyledInstance };
/**
 * This is the type of the `styled` HOC.
 */
export type Styled = typeof styled;
/**
 * Use this higher-order type for scenarios where you are wrapping `styled`
 * and providing extra props as a third-party library.
 */
export type LibraryStyled<LibraryProps extends object = BaseObject> = <Target extends WebTarget>(tag: Target) => typeof baseStyled<Target, LibraryProps>;
