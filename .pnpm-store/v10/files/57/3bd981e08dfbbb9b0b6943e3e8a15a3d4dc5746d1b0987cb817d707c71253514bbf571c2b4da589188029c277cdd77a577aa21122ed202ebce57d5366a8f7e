import type { ChildContext, RuleContext } from './types.js';
export declare const pluginName = "import-x";
export type PluginName = typeof pluginName;
export declare function getTsconfigWithContext(context: ChildContext | RuleContext): {
    compilerOptions?: import("get-tsconfig").TsConfigJson.CompilerOptions | undefined;
    watchOptions?: import("get-tsconfig").TsConfigJson.WatchOptions | undefined;
    typeAcquisition?: import("get-tsconfig").TsConfigJson.TypeAcquisition | undefined;
    compileOnSave?: boolean | undefined;
    files?: string[] | undefined;
    exclude?: string[] | undefined;
    include?: string[] | undefined;
    references?: import("get-tsconfig").TsConfigJson.References[] | undefined;
} | null | undefined;
