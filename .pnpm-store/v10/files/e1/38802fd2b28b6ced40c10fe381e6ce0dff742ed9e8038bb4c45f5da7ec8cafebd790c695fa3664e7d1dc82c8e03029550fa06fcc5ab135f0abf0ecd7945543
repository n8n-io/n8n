import { GeneratorOptions } from '@babel/generator';
import { Plugin } from 'vite';

declare global {
    var __coverage__: any;
}
interface IstanbulPluginOptions {
    include?: string | string[];
    exclude?: string | string[];
    extension?: string | string[];
    requireEnv?: boolean;
    cypress?: boolean;
    checkProd?: boolean;
    forceBuildInstrument?: boolean;
    cwd?: string;
    nycrcPath?: string;
    generatorOpts?: GeneratorOptions;
    onCover?: (fileName: string, fileCoverage: object) => void;
}
declare function istanbulPlugin(opts?: IstanbulPluginOptions): Plugin;

export { type IstanbulPluginOptions, istanbulPlugin as default };
