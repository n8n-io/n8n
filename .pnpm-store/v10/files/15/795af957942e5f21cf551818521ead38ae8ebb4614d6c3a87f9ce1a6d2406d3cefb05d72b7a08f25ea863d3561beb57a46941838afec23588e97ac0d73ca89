import * as bt from '@babel/types';
interface ImportedVariable {
    filePath: string[];
    exportName: string;
}
/**
 * A set of imported variables
 * key: local variable name
 * value: ImportedVariable
 */
export interface ImportedVariableSet {
    [varname: string]: ImportedVariable;
}
/**
 *
 * @param ast
 * @param varNameFilter
 */
export default function resolveRequired(ast: bt.File, varNameFilter?: string[]): ImportedVariableSet;
export {};
