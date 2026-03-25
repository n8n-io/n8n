import { Plugin, ViteDevServer } from 'vite';
import * as _compiler from 'vue/compiler-sfc';
import { SFCScriptCompileOptions, SFCTemplateCompileOptions, SFCStyleCompileOptions } from 'vue/compiler-sfc';

interface VueQuery {
    vue?: boolean;
    src?: string;
    type?: 'script' | 'template' | 'style' | 'custom';
    index?: number;
    lang?: string;
    raw?: boolean;
    url?: boolean;
    scoped?: boolean;
    id?: string;
}
declare function parseVueRequest(id: string): {
    filename: string;
    query: VueQuery;
};

interface Options {
    include?: string | RegExp | (string | RegExp)[];
    exclude?: string | RegExp | (string | RegExp)[];
    /**
     * In Vite, this option follows Vite's config.
     */
    isProduction?: boolean;
    script?: Partial<Omit<SFCScriptCompileOptions, 'id' | 'isProd' | 'inlineTemplate' | 'templateOptions' | 'sourceMap' | 'genDefaultAs' | 'customElement' | 'defineModel' | 'propsDestructure'>> & {
        /**
         * @deprecated defineModel is now a stable feature and always enabled if
         * using Vue 3.4 or above.
         */
        defineModel?: boolean;
        /**
         * @deprecated moved to `features.propsDestructure`.
         */
        propsDestructure?: boolean;
    };
    template?: Partial<Omit<SFCTemplateCompileOptions, 'id' | 'source' | 'ast' | 'filename' | 'scoped' | 'slotted' | 'isProd' | 'inMap' | 'ssr' | 'ssrCssVars' | 'preprocessLang'>>;
    style?: Partial<Omit<SFCStyleCompileOptions, 'filename' | 'id' | 'isProd' | 'source' | 'scoped' | 'cssDevSourcemap' | 'postcssOptions' | 'map' | 'postcssPlugins' | 'preprocessCustomRequire' | 'preprocessLang' | 'preprocessOptions'>>;
    /**
     * Use custom compiler-sfc instance. Can be used to force a specific version.
     */
    compiler?: typeof _compiler;
    /**
     * Requires @vitejs/plugin-vue@^5.1.0
     */
    features?: {
        /**
         * Enable reactive destructure for `defineProps`.
         * - Available in Vue 3.4 and later.
         * - **default:** `false` in Vue 3.4 (**experimental**), `true` in Vue 3.5+
         */
        propsDestructure?: boolean;
        /**
         * Transform Vue SFCs into custom elements.
         * - `true`: all `*.vue` imports are converted into custom elements
         * - `string | RegExp`: matched files are converted into custom elements
         * - **default:** /\.ce\.vue$/
         */
        customElement?: boolean | string | RegExp | (string | RegExp)[];
        /**
         * Set to `false` to disable Options API support and allow related code in
         * Vue core to be dropped via dead-code elimination in production builds,
         * resulting in smaller bundles.
         * - **default:** `true`
         */
        optionsAPI?: boolean;
        /**
         * Set to `true` to enable devtools support in production builds.
         * Results in slightly larger bundles.
         * - **default:** `false`
         */
        prodDevtools?: boolean;
        /**
         * Set to `true` to enable detailed information for hydration mismatch
         * errors in production builds. Results in slightly larger bundles.
         * - **default:** `false`
         */
        prodHydrationMismatchDetails?: boolean;
        /**
         * Customize the component ID generation strategy.
         * - `'filepath'`: hash the file path (relative to the project root)
         * - `'filepath-source'`: hash the file path and the source code
         * - `function`: custom function that takes the file path, source code,
         *   whether in production mode, and the default hash function as arguments
         * - **default:** `'filepath'` in development, `'filepath-source'` in production
         */
        componentIdGenerator?: 'filepath' | 'filepath-source' | ((filepath: string, source: string, isProduction: boolean | undefined, getHash: (text: string) => string) => string);
    };
    /**
     * @deprecated moved to `features.customElement`.
     */
    customElement?: boolean | string | RegExp | (string | RegExp)[];
}
interface ResolvedOptions extends Options {
    compiler: typeof _compiler;
    root: string;
    sourceMap: boolean;
    cssDevSourcemap: boolean;
    devServer?: ViteDevServer;
    devToolsEnabled?: boolean;
}
interface Api {
    get options(): ResolvedOptions;
    set options(value: ResolvedOptions);
    version: string;
}
declare function vuePlugin(rawOptions?: Options): Plugin<Api>;

export { type Api, type Options, type ResolvedOptions, type VueQuery, vuePlugin as default, parseVueRequest };
