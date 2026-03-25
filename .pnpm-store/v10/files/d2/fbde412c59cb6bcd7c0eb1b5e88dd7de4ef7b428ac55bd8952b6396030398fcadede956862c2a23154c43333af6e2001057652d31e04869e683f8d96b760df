import type { Compiler } from 'webpack';
declare class VirtualModulesPlugin {
    private _staticModules;
    private _compiler;
    private _watcher;
    constructor(modules?: Record<string, string>);
    writeModule(filePath: string, contents: string): void;
    apply(compiler: Compiler): void;
}
export = VirtualModulesPlugin;
