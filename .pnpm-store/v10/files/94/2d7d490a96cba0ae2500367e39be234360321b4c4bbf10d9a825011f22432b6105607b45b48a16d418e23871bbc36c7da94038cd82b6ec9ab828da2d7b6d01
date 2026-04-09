import React from 'react';
import { AnyComponent } from '../types';
/**
 * Adapted from hoist-non-react-statics to avoid the react-is dependency.
 */
declare const REACT_STATICS: {
    childContextTypes: boolean;
    contextType: boolean;
    contextTypes: boolean;
    defaultProps: boolean;
    displayName: boolean;
    getDefaultProps: boolean;
    getDerivedStateFromError: boolean;
    getDerivedStateFromProps: boolean;
    mixins: boolean;
    propTypes: boolean;
    type: boolean;
};
declare const KNOWN_STATICS: {
    name: boolean;
    length: boolean;
    prototype: boolean;
    caller: boolean;
    callee: boolean;
    arguments: boolean;
    arity: boolean;
};
declare const FORWARD_REF_STATICS: {
    $$typeof: boolean;
    render: boolean;
    defaultProps: boolean;
    displayName: boolean;
    propTypes: boolean;
};
declare const MEMO_STATICS: {
    $$typeof: boolean;
    compare: boolean;
    defaultProps: boolean;
    displayName: boolean;
    propTypes: boolean;
    type: boolean;
};
type OmniComponent = AnyComponent;
type ExcludeList = {
    [key: string]: true;
};
export type NonReactStatics<S extends OmniComponent, C extends ExcludeList = {}> = {
    [key in Exclude<keyof S, S extends React.MemoExoticComponent<any> ? keyof typeof MEMO_STATICS | keyof C : S extends React.ForwardRefExoticComponent<any> ? keyof typeof FORWARD_REF_STATICS | keyof C : keyof typeof REACT_STATICS | keyof typeof KNOWN_STATICS | keyof C>]: S[key];
};
export default function hoistNonReactStatics<T extends OmniComponent, S extends OmniComponent, C extends ExcludeList = {}>(targetComponent: T, sourceComponent: S, excludelist?: C | undefined): T & NonReactStatics<S, C>;
export {};
