import type * as ts from 'typescript';
import type { Service } from '../index';
/**
 * Third-party transpilers are implemented as a CommonJS module with a
 * named export "create"
 *
 * @category Transpiler
 */
export interface TranspilerModule {
    create: TranspilerFactory;
}
/**
 * Called by ts-node to create a custom transpiler.
 *
 * @category Transpiler
 */
export declare type TranspilerFactory = (options: CreateTranspilerOptions) => Transpiler;
/** @category Transpiler */
export interface CreateTranspilerOptions {
    service: Pick<Service, Extract<'config' | 'options' | 'projectLocalResolveHelper', keyof Service>>;
}
/** @category Transpiler */
export interface Transpiler {
    transpile(input: string, options: TranspileOptions): TranspileOutput;
}
/** @category Transpiler */
export interface TranspileOptions {
    fileName: string;
}
/** @category Transpiler */
export interface TranspileOutput {
    outputText: string;
    diagnostics?: ts.Diagnostic[];
    sourceMapText?: string;
}
