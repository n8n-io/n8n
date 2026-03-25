import { EventEmitter } from 'events';
import fs from 'fs';
import pa from 'path';

/**
 * Interface for nodes fs module
 */
export interface VMFS {
  /** Implements fs.statSync */
  statSync: typeof fs.statSync;
  /** Implements fs.readFileSync */
  readFileSync: typeof fs.readFileSync;
}

/**
 * Interface for nodes path module
 */
export interface VMPath {
  /** Implements path.resolve */
  resolve: typeof pa.resolve;
  /** Implements path.isAbsolute */
  isAbsolute: typeof pa.isAbsolute;
  /** Implements path.join */
  join: typeof pa.join;
  /** Implements path.basename */
  basename: typeof pa.basename;
  /** Implements path.dirname */
  dirname: typeof pa.dirname;
}

/**
 * Custom file system which abstracts functions from node's fs and path modules.
 */
export interface VMFileSystemInterface extends VMFS, VMPath {
  /** Implements (sep) => sep === path.sep */
  isSeparator(char: string): boolean;
}

/**
 * Implementation of a default file system.
 */
export class VMFileSystem implements VMFileSystemInterface {
  constructor(options?: { fs?: VMFS, path?: VMPath });
  /** Implements fs.statSync */
  statSync: typeof fs.statSync;
  /** Implements fs.readFileSync */
  readFileSync: typeof fs.readFileSync;
  /** Implements path.resolve */
  resolve: typeof pa.resolve;
  /** Implements path.isAbsolute */
  isAbsolute: typeof pa.isAbsolute;
  /** Implements path.join */
  join: typeof pa.join;
  /** Implements path.basename */
  basename: typeof pa.basename;
  /** Implements path.dirname */
  dirname: typeof pa.dirname;
  /** Implements (sep) => sep === path.sep */
  isSeparator(char: string): boolean;
}

/**
 * Function that will be called to load a built-in into a vm.
 */
export type BuiltinLoad = (vm: NodeVM) => any;
/**
 * Either a function that will be called to load a built-in into a vm or an object with a init method and a load method to load the built-in.
 */
export type Builtin = BuiltinLoad | {init: (vm: NodeVM)=>void, load: BuiltinLoad};
/**
 * Require method
 */
export type HostRequire = (id: string) => any;

/**
 * This callback will be called to specify the context to use "per" module. Defaults to 'sandbox' if no return value provided.
 */
export type PathContextCallback = (modulePath: string, extensionType: string) => 'host' | 'sandbox';

/**
 *  Require options for a VM
 */
export interface VMRequire {
  /**
   * Array of allowed built-in modules, accepts ["*"] for all. Using "*" increases the attack surface and potential
   * new modules allow to escape the sandbox. (default: none)
   */
  builtin?: readonly string[];
  /*
   * `host` (default) to require modules in host and proxy them to sandbox. `sandbox` to load, compile and
   * require modules in sandbox or a callback which chooses the context based on the filename.
   * Built-in modules except `events` always required in host and proxied to sandbox
   */
  context?: "host" | "sandbox" | PathContextCallback;
  /** `true`, an array of allowed external modules or an object with external options (default: `false`) */
  external?: boolean | readonly string[] | { modules: readonly string[], transitive: boolean };
  /** Array of modules to be loaded into NodeVM on start. */
  import?: readonly string[];
  /** Restricted path(s) where local modules can be required (default: every path). */
  root?: string | readonly string[];
  /** Collection of mock modules (both external or built-in). */
  mock?: any;
  /* An additional lookup function in case a module wasn't found in one of the traditional node lookup paths. */
  resolve?: (moduleName: string, parentDirname: string) => string | { path: string, module?: string } | undefined;
  /** Custom require to require host and built-in modules. */
  customRequire?: HostRequire;
  /** Load modules in strict mode. (default: true) */
  strict?: boolean;
  /** FileSystem to load files from */
  fs?: VMFileSystemInterface;
}

/**
 * A custom compiler function for all of the JS that comes
 * into the VM
 */
export type CompilerFunction = (code: string, filename: string) => string;

export abstract class Resolver {
  private constructor(fs: VMFileSystemInterface, globalPaths: readonly string[], builtins: Map<string, Builtin>);
}

/**
 * Create a resolver as normal `NodeVM` does given `VMRequire` options.
 *
 * @param options The options that would have been given to `NodeVM`.
 * @param override Custom overrides for built-ins.
 * @param compiler Compiler to be used for loaded modules.
 */
export function makeResolverFromLegacyOptions(options: VMRequire, override?: {[key: string]: Builtin}, compiler?: CompilerFunction): Resolver;

/**
 *  Options for creating a VM
 */
export interface VMOptions {
  /**
   * `javascript` (default), `typescript`, `coffeescript` or custom compiler function (which receives the code, and it's file path).
   *  The library expects you to have compiler pre-installed if the value is set to `typescript` or `coffeescript`.
   */
  compiler?: "javascript" | "typescript" | "coffeescript" | CompilerFunction;
  /**
   * Compiler options.
   */
  compilerOptions?: Record<string, any>;
  /** VM's global object. */
  sandbox?: any;
  /**
   * Script timeout in milliseconds. Timeout is only effective on code you run through `run`.
   * Timeout is NOT effective on any method returned by VM.
   */
  timeout?: number;
  /**
   * If set to `false` any calls to eval or function constructors (`Function`, `GeneratorFunction`, etc.) will throw an
   * `EvalError` (default: `true`).
   */
  eval?: boolean;
  /**
   * If set to `false` any attempt to compile a WebAssembly module will throw a `WebAssembly.CompileError` (default: `true`).
   */
  wasm?: boolean;
  /**
   * If set to `true` any attempt to run code using async will throw a `VMError` (default: `false`).
   * @deprecated Use `allowAsync` instead.
   */
  fixAsync?: boolean;

  /**
   * If set to `false` any attempt to run code using async will throw a `VMError` (default: `true`).
   */
  allowAsync?: boolean;
}

/**
 *  Options for creating a NodeVM
 */
export interface NodeVMOptions extends VMOptions {
  /** `inherit` to enable console, `redirect` to redirect to events, `off` to disable console (default: `inherit`). */
  console?: "inherit" | "redirect" | "off";
  /** `true` or an object to enable `require` options (default: `false`). */
  require?: boolean | VMRequire | Resolver;
  /**
   * **WARNING**: This should be disabled. It allows to create a NodeVM form within the sandbox which could return any host module.
   * `true` to enable VMs nesting (default: `false`).
   */
  nesting?: boolean;
  /** `commonjs` (default) to wrap script into CommonJS wrapper, `none` to retrieve value returned by the script. */
  wrapper?: "commonjs" | "none";
  /** File extensions that the internal module resolver should accept. */
  sourceExtensions?: readonly string[];
  /**
   * Array of arguments passed to `process.argv`.
   * This object will not be copied and the script can change this object.
   */
  argv?: string[];
  /**
   * Environment map passed to `process.env`.
   * This object will not be copied and the script can change this object.
   */
  env?: any;
  /** Run modules in strict mode. Required modules are always strict. */
  strict?: boolean;
}

/**
 * VM is a simple sandbox, without `require` feature, to synchronously run an untrusted code.
 * Only JavaScript built-in objects + Buffer are available. Scheduling functions
 * (`setInterval`, `setTimeout` and `setImmediate`) are not available by default.
 */
export class VM {
  constructor(options?: VMOptions);
  /** Direct access to the global sandbox object */
  readonly sandbox: any;
  /** Timeout to use for the run methods */
  timeout?: number;
  /** Runs the code */
  run(script: string | VMScript, options?: string | { filename?: string }): any;
  /** Runs the code in the specific file */
  runFile(filename: string): any;
  /** Loads all the values into the global object with the same names */
  setGlobals(values: any): this;
  /** Make a object visible as a global with a specific name */
  setGlobal(name: string, value: any): this;
  /** Get the global object with the specific name */
  getGlobal(name: string): any;
  /** Freezes the object inside VM making it read-only. Not available for primitive values. */
  freeze(object: any, name?: string): any;
  /** Freezes the object inside VM making it read-only. Not available for primitive values. */
  readonly(object: any): any;
  /** Protects the object inside VM making impossible to set functions as it's properties. Not available for primitive values */
  protect(object: any, name?: string): any;
}

/**
 * A VM with behavior more similar to running inside Node.
 */
export class NodeVM extends EventEmitter implements VM {
  constructor(options?: NodeVMOptions);

  /** Require a module in VM and return it's exports. */
  require(module: string): any;

  /**
   * Create NodeVM and run code inside it.
   *
   * @param {string} script JavaScript code.
   * @param {string} [filename] File name (used in stack traces only).
   * @param {Object} [options] VM options.
   */
  static code(script: string, filename?: string, options?: NodeVMOptions): any;

  /**
   * Create NodeVM and run script from file inside it.
   *
   * @param {string} [filename] File name (used in stack traces only).
   * @param {Object} [options] VM options.
   */
  static file(filename: string, options?: NodeVMOptions): any;

  /** Direct access to the global sandbox object */
  readonly sandbox: any;
  /** Only here because of implements VM. Does nothing. */
  timeout?: number;
  /** The resolver used to resolve modules */
  readonly resolver: Resolver;
  /** Runs the code */
  run(js: string | VMScript, options?: string | { filename?: string, wrapper?: "commonjs" | "none", strict?: boolean }): any;
  /** Runs the code in the specific file */
  runFile(filename: string): any;
  /** Loads all the values into the global object with the same names */
  setGlobals(values: any): this;
  /** Make a object visible as a global with a specific name */
  setGlobal(name: string, value: any): this;
  /** Get the global object with the specific name */
  getGlobal(name: string): any;
  /** Freezes the object inside VM making it read-only. Not available for primitive values. */
  freeze(object: any, name?: string): any;
  /** Freezes the object inside VM making it read-only. Not available for primitive values. */
  readonly(object: any): any;
  /** Protects the object inside VM making impossible to set functions as it's properties. Not available for primitive values */
  protect(object: any, name?: string): any;
}

/**
 * You can increase performance by using pre-compiled scripts.
 * The pre-compiled VMScript can be run later multiple times. It is important to note that the code is not bound
 * to any VM (context); rather, it is bound before each run, just for that run.
 */
export class VMScript {
  constructor(code: string, path: string, options?: {
    lineOffset?: number;
    columnOffset?: number;
    compiler?: "javascript" | "typescript" | "coffeescript" | CompilerFunction;
    compilerOptions?: Record<string, any>;
  });
  constructor(code: string, options?: {
    filename?: string,
    lineOffset?: number;
    columnOffset?: number;
    compiler?: "javascript" | "typescript" | "coffeescript" | CompilerFunction;
    compilerOptions?: Record<string, any>;
  });
  readonly code: string;
  readonly filename: string;
  readonly lineOffset: number;
  readonly columnOffset: number;
  readonly compiler: "javascript" | "typescript" | "coffeescript" | CompilerFunction;
  readonly compilerOptions: Record<string, any> | undefined;
  /**
   * Wraps the code
   * @deprecated
   */
  wrap(prefix: string, postfix: string): this;
  /** Compiles the code. If called multiple times, the code is only compiled once. */
  compile(): this;
}

/** Custom Error class */
export class VMError extends Error { }
