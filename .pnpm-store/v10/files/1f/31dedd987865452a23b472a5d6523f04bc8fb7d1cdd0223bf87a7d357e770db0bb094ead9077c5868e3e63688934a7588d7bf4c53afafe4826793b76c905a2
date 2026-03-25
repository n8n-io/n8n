import { Plugin } from "vite";

//#region src/types.d.ts
interface Options {
  /**
   * default: 'defaults'
   */
  targets?: string | string[] | Record<string, string>;
  /**
   * default: 'edge>=79, firefox>=67, chrome>=64, safari>=12, chromeAndroid>=64, iOS>=12'
   */
  modernTargets?: string | string[];
  /**
   * default: true
   */
  polyfills?: boolean | string[];
  additionalLegacyPolyfills?: string[];
  additionalModernPolyfills?: string[];
  /**
   * default: false
   */
  modernPolyfills?: boolean | string[];
  /**
   * default: true
   */
  renderLegacyChunks?: boolean;
  /**
   * default: false
   */
  externalSystemJS?: boolean;
  /**
   * default: true
   */
  renderModernChunks?: boolean;
  /**
   * @see https://babeljs.io/docs/assumptions
   *
   * default: {}
   */
  assumptions?: Record<string, boolean>;
}
//#endregion
//#region src/index.d.ts
declare function viteLegacyPlugin(options?: Options): Plugin[];
declare function detectPolyfills(code: string, targets: any, assumptions: Record<string, boolean>, list: Set<string>): Promise<void>;
declare const cspHashes: string[];
declare function viteLegacyPluginCjs(this: unknown, options: Options): Plugin[];
//#endregion
export { type Options, cspHashes, viteLegacyPlugin as default, detectPolyfills, viteLegacyPluginCjs as "module.exports" };