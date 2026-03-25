import type { BeanCollection } from '../context/context';
import type { GridApi } from './gridApi';
export type ApiFunctionName = keyof GridApi;
export type ApiFunction<TName extends ApiFunctionName> = (beans: BeanCollection, ...args: Parameters<GridApi[TName]>) => ReturnType<GridApi[TName]>;
