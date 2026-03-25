import { SpawnSyncOptions } from "child_process";

export = ezSpawn;
export as namespace ezSpawn;

declare namespace ezSpawn {
  // Sync signatures without options
  function sync(command: string | string[]): Process;
  function sync(command: string, args: string[]): Process;
  function sync(command: string, ...args: string[]): Process;

  // Sync signatures with options
  function sync(command: string | string[], options: Options): Process;
  function sync(command: string, args: string[], options: Options): Process;
  function sync(command: string, arg1: string, options: Options): Process;
  function sync(command: string, arg1: string, arg2: string, options: Options): Process;
  function sync(command: string, arg1: string, arg2: string, arg3: string, options: Options): Process;
  function sync(command: string, arg1: string, arg2: string, arg3: string, arg4: string, options: Options): Process;
  function sync(command: string, arg1: string, arg2: string, arg3: string, arg4: string, arg5: string, options: Options): Process;

  // Sync signatures with options and encoding="buffer"
  function sync(command: string | string[], options: BufferOptions): Process<Buffer>;
  function sync(command: string, args: string[], options: BufferOptions): Process<Buffer>;
  function sync(command: string, arg1: string, options: BufferOptions): Process<Buffer>;
  function sync(command: string, arg1: string, arg2: string, options: BufferOptions): Process<Buffer>;
  function sync(command: string, arg1: string, arg2: string, arg3: string, options: BufferOptions): Process<Buffer>;
  function sync(command: string, arg1: string, arg2: string, arg3: string, arg4: string, options: BufferOptions): Process<Buffer>;
  function sync(command: string, arg1: string, arg2: string, arg3: string, arg4: string, arg5: string, options: BufferOptions): Process<Buffer>;

  // Promise signatures without options
  function async(command: string | string[]): Promise<Process>;
  function async(command: string, args: string[]): Promise<Process>;
  function async(command: string, ...args: string[]): Promise<Process>;

  // Promise signatures with options
  function async(command: string | string[], options: Options): Promise<Process>;
  function async(command: string, args: string[], options: Options): Promise<Process>;
  function async(command: string, arg1: string, options: Options): Promise<Process>;
  function async(command: string, arg1: string, arg2: string, options: Options): Promise<Process>;
  function async(command: string, arg1: string, arg2: string, arg3: string, options: Options): Promise<Process>;
  function async(command: string, arg1: string, arg2: string, arg3: string, arg4: string, options: Options): Promise<Process>;
  function async(command: string, arg1: string, arg2: string, arg3: string, arg4: string, arg5: string, options: Options): Promise<Process>;

  // Promise signatures with options and encoding="buffer"
  function async(command: string | string[], options: BufferOptions): Promise<Process<Buffer>>;
  function async(command: string, args: string[], options: BufferOptions): Promise<Process<Buffer>>;
  function async(command: string, arg1: string, options: BufferOptions): Promise<Process<Buffer>>;
  function async(command: string, arg1: string, arg2: string, options: BufferOptions): Promise<Process<Buffer>>;
  function async(command: string, arg1: string, arg2: string, arg3: string, options: BufferOptions): Promise<Process<Buffer>>;
  function async(command: string, arg1: string, arg2: string, arg3: string, arg4: string, options: BufferOptions): Promise<Process<Buffer>>;
  function async(command: string, arg1: string, arg2: string, arg3: string, arg4: string, arg5: string, options: BufferOptions): Promise<Process<Buffer>>;

  // Callback signatures without options
  function async(command: string | string[], callback: Callback): void;
  function async(command: string, args: string[], callback: Callback): void;
  function async(command: string, arg1: string, callback: Callback): void;
  function async(command: string, arg1: string, arg2: string, callback: Callback): void;
  function async(command: string, arg1: string, arg2: string, arg3: string, callback: Callback): void;
  function async(command: string, arg1: string, arg2: string, arg3: string, arg4: string, callback: Callback): void;
  function async(command: string, arg1: string, arg2: string, arg3: string, arg4: string, arg5: string, callback: Callback): void;

  // Callback signatures with options
  function async(command: string | string[], options: Options, callback: Callback): void;
  function async(command: string, args: string[], options: Options, callback: Callback): void;
  function async(command: string, arg1: string, options: Options, callback: Callback): void;
  function async(command: string, arg1: string, arg2: string, options: Options, callback: Callback): void;
  function async(command: string, arg1: string, arg2: string, arg3: string, options: Options, callback: Callback): void;
  function async(command: string, arg1: string, arg2: string, arg3: string, arg4: string, options: Options, callback: Callback): void;
  function async(command: string, arg1: string, arg2: string, arg3: string, arg4: string, arg5: string, options: Options, callback: Callback): void;

  // Callback signatures with options and encoding="buffer"
  function async(command: string | string[], options: BufferOptions, callback: Callback<Buffer>): void;
  function async(command: string, args: string[], options: BufferOptions, callback: Callback<Buffer>): void;
  function async(command: string, arg1: string, options: BufferOptions, callback: Callback<Buffer>): void;
  function async(command: string, arg1: string, arg2: string, options: BufferOptions, callback: Callback<Buffer>): void;
  function async(command: string, arg1: string, arg2: string, arg3: string, options: BufferOptions, callback: Callback<Buffer>): void;
  function async(command: string, arg1: string, arg2: string, arg3: string, arg4: string, options: BufferOptions, callback: Callback<Buffer>): void;
  function async(command: string, arg1: string, arg2: string, arg3: string, arg4: string, arg5: string, options: BufferOptions, callback: Callback<Buffer>): void;

  interface Options extends SpawnSyncOptions {
    encoding?: "ascii" | "utf8" | "utf16le" | "ucs2" | "base64" | "latin1" | "binary" | "hex";
  }

  interface BufferOptions extends SpawnSyncOptions {
    encoding: "buffer";
  }

  type Callback<T = string> = (err: Error | undefined, process: Process<T>) => void;

  interface Process<T = string> {
    command: string;
    args: string[];
    pid: number;
    stdout: T;
    stderr: T;
    output: [T | null, T, T];
    status: number;
    signal: string | null;

    /**
     * Returns the command and arguments used to spawn the process
     */
    toString(): string;
  }

  interface ProcessError<T = string> {
    name: "ProcessError";
    message: string;
    stack: string;
    command: string;
    args: string[];
    pid: number;
    stdout: T;
    stderr: T;
    output: [T | null, T, T];
    status: number | null;
    signal: string | null;
  }
}
