import type { IFilterOptionDef, ISimpleFilterModelType, JoinOperator, Tuple } from './iSimpleFilter';
import type { OptionsFactory } from './optionsFactory';
export declare function removeItems<T>(items: T[], startPosition: number, deleteCount?: number): T[];
export declare function isBlank<V>(cellValue: V): boolean;
export declare function getDefaultJoinOperator(defaultJoinOperator?: JoinOperator): JoinOperator;
export declare function evaluateCustomFilter<V>(customFilterOption: IFilterOptionDef | undefined, values: Tuple<V>, cellValue: V | null | undefined): boolean | undefined;
export declare function validateAndUpdateConditions<M>(conditions: M[], maxNumConditions: number): number;
export declare function getNumberOfInputs(type: ISimpleFilterModelType | null | undefined, optionsFactory: OptionsFactory): number;
