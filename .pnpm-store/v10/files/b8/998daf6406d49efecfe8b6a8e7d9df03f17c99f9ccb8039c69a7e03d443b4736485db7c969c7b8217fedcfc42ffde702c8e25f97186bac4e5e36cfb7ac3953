import React from 'react';
import { AnyComponent, ExecutionProps } from '../types';
import { NonReactStatics } from '../utils/hoist';
type WithThemeOuterProps<T extends AnyComponent> = Omit<React.ComponentPropsWithRef<T>, keyof ExecutionProps> & ExecutionProps;
export default function withTheme<T extends AnyComponent>(Component: T): React.ForwardRefExoticComponent<React.PropsWithoutRef<WithThemeOuterProps<T>> & React.RefAttributes<any>> & NonReactStatics<T>;
export {};
