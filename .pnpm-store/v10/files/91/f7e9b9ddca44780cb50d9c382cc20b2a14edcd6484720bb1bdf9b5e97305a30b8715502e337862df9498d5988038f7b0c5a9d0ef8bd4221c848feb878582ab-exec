import { Plugin } from 'rollup';
import { AsyncOpts } from 'resolve';

export const DEFAULTS: {
  customResolveOptions: {};
  dedupe: [];
  extensions: ['.mjs', '.js', '.json', '.node'];
  resolveOnly: [];
};

export interface RollupNodeResolveOptions {
  /**
   * If `true`, instructs the plugin to use the `"browser"` property in `package.json`
   * files to specify alternative files to load for bundling. This is useful when
   * bundling for a browser environment. Alternatively, a value of `'browser'` can be
   * added to the `mainFields` option. If `false`, any `"browser"` properties in
   * package files will be ignored. This option takes precedence over `mainFields`.
   * @default false
   */
  browser?: boolean;

  /**
   * An `Object` that specifies additional options that should be passed through to `node-resolve`.
   */
  customResolveOptions?: AsyncOpts;

  /**
   * An `Array` of modules names, which instructs the plugin to force resolving for the
   * specified modules to the root `node_modules`. Helps to prevent bundling the same
   * package multiple times if package is imported from dependencies.
   */
  dedupe?: string[] | ((importee: string) => boolean);

  /**
   * Specifies the extensions of files that the plugin will operate on.
   * @default [ '.mjs', '.js', '.json', '.node' ]
   */
  extensions?: readonly string[];

  /**
   * Locks the module search within specified path (e.g. chroot). Modules defined
   * outside this path will be marked as external.
   * @default '/'
   */
  jail?: string;

  /**
   * Specifies the properties to scan within a `package.json`, used to determine the
   * bundle entry point.
   * @default ['module', 'main']
   */
  mainFields?: readonly string[];

  /**
   * If `true`, inspect resolved files to assert that they are ES2015 modules.
   * @default false
   */
  modulesOnly?: boolean;

  /**
   * @deprecated use "resolveOnly" instead
   * @default null
   */
  only?: ReadonlyArray<string | RegExp> | null;

  /**
   * If `true`, the plugin will prefer built-in modules (e.g. `fs`, `path`). If `false`,
   * the plugin will look for locally installed modules of the same name.
   * @default true
   */
  preferBuiltins?: boolean;

  /**
   * An `Array` which instructs the plugin to limit module resolution to those whose
   * names match patterns in the array.
   * @default []
   */
  resolveOnly?: ReadonlyArray<string | RegExp> | null;

  /**
   * Specifies the root directory from which to resolve modules. Typically used when
   * resolving entry-point imports, and when resolving deduplicated modules.
   * @default process.cwd()
   */
  rootDir?: string;
}

/**
 * Locate modules using the Node resolution algorithm, for using third party modules in node_modules
 */
export function nodeResolve(options?: RollupNodeResolveOptions): Plugin;
export default nodeResolve;
