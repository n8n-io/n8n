import type { WatchOptions } from 'chokidar';

export type NodemonEventHandler =
  | 'start'
  | 'crash'
  | 'exit'
  | 'quit'
  | 'restart'
  | 'config:update'
  | 'log'
  | 'readable'
  | 'stdout'
  | 'stderr';

export type NodemonEventListener = {
  on(event: 'start' | 'crash' | 'readable', listener: () => void): Nodemon;
  on(event: 'log', listener: (e: NodemonEventLog) => void): Nodemon;
  on(event: 'stdout' | 'stderr', listener: (e: string) => void): Nodemon;
  on(event: 'restart', listener: (files?: string[]) => void): Nodemon;
  on(event: 'quit', listener: (e?: NodemonEventQuit) => void): Nodemon;
  on(event: 'exit', listener: (e?: number) => void): Nodemon;
  on(
    event: 'config:update',
    listener: (e?: NodemonEventConfig) => void,
  ): Nodemon;
};

export type NodemonEventLog = {
  /**
    - detail: what you get with nodemon --verbose.
    - status: subprocess starting, restarting.
    - fail: is the subprocess crashing.
    - error: is a nodemon system error.
  */
  type: 'detail' | 'log' | 'status' | 'error' | 'fail';
  /** the plain text message */
  message: string;
  /** contains the terminal escape codes to add colour, plus the "[nodemon]" prefix */
  colour: string;
};

export type NodemonEventQuit = 143 | 130;

export type NodemonEventConfig = {
  run: boolean;
  system: {
    cwd: string;
  };
  required: boolean;
  dirs: string[];
  timeout: number;
  options: NodemonConfig;
  lastStarted: number;
  loaded: string[];
  load: (
    settings: NodemonSettings,
    ready: (config: NodemonEventConfig) => void,
  ) => void;
  reset: () => void;
};

export interface NodemonExecOptions {
  script: string;
  scriptPosition?: number;
  args?: string[];
  ext?: string; // "js,mjs" etc (should really support an array of strings, but I don't think it does right now)
  exec?: string; // node, python, etc
  execArgs?: string[]; // args passed to node, etc,
  nodeArgs?: string[]; // args passed to node, etc,
}

export interface NodemonConfig {
  /** restartable defaults to "rs" as a string the user enters */
  restartable?: false | string;
  colours?: boolean;
  execMap?: { [key: string]: string };
  ignoreRoot?: string[];
  watch?: string[];
  ignore?: string[];
  stdin?: boolean;
  runOnChangeOnly?: boolean;
  verbose?: boolean;
  signal?: string;
  stdout?: boolean;
  watchOptions?: WatchOptions;
  help?: string;
  version?: boolean;
  cwd?: string;
  dump?: boolean;
  delay?: number;
  monitor?: string[];
  spawn?: boolean;
  noUpdateNotifier?: boolean;
  legacyWatch?: boolean;
  pollingInterval?: number;
  /** @deprecated as this is "on" by default */
  js?: boolean;
  quiet?: boolean;
  configFile?: string;
  exitCrash?: boolean;
  execOptions?: NodemonExecOptions;
}

export interface NodemonSettings extends NodemonConfig, NodemonExecOptions {
  events?: Record<string, string>;
  env?: Record<string, string>;
}

export type Nodemon = {
  (settings: NodemonSettings): Nodemon;
  removeAllListeners(event: NodemonEventHandler): Nodemon;
  emit(type: NodemonEventHandler, event?: any): Nodemon;
  reset(callback: Function): Nodemon;
  restart(): Nodemon;
  config: NodemonSettings;
} & NodemonEventListener & {
    [K in keyof NodemonEventListener as 'addListener']: NodemonEventListener[K];
  } & {
    [K in keyof NodemonEventListener as 'once']: NodemonEventListener[K];
  };

declare const nodemon: Nodemon;

export = nodemon;
