import {MethodDefinition} from '../service-definitions';

export type MethodRequestIn<
  Definition extends MethodDefinition<any, any, any, any>,
> = Definition extends MethodDefinition<infer T, any, any, any> ? T : never;
export type MethodRequestOut<
  Definition extends MethodDefinition<any, any, any, any>,
> = Definition extends MethodDefinition<any, infer T, any, any> ? T : never;
export type MethodResponseIn<
  Definition extends MethodDefinition<any, any, any, any>,
> = Definition extends MethodDefinition<any, any, infer T, any> ? T : never;
export type MethodResponseOut<
  Definition extends MethodDefinition<any, any, any, any>,
> = Definition extends MethodDefinition<any, any, any, infer T> ? T : never;
