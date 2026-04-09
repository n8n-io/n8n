import ts from 'typescript';
type ExtendedTranspileOptions = Omit<ts.TranspileOptions, 'transformers'> & {
    transformers?: (program: ts.Program) => ts.CustomTransformers;
};
type ExtendedTsTranspileModuleFn = (fileContent: string, transpileOptions: ExtendedTranspileOptions) => ts.TranspileOutput;
export declare const isModernNodeModuleKind: (module: ts.ModuleKind | undefined) => boolean;
export declare const tsTranspileModule: ExtendedTsTranspileModuleFn;
export {};
