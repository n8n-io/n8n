import { createMatchPath } from "./match-path-sync";
import { configLoader, ExplicitParams } from "./config-loader";

const noOp = (): void => void 0;

function getCoreModules(
  builtinModules: string[] | undefined
): { [key: string]: boolean } {
  builtinModules = builtinModules || [
    "assert",
    "buffer",
    "child_process",
    "cluster",
    "crypto",
    "dgram",
    "dns",
    "domain",
    "events",
    "fs",
    "http",
    "https",
    "net",
    "os",
    "path",
    "punycode",
    "querystring",
    "readline",
    "stream",
    "string_decoder",
    "tls",
    "tty",
    "url",
    "util",
    "v8",
    "vm",
    "zlib",
  ];

  const coreModules: { [key: string]: boolean } = {};
  for (let module of builtinModules) {
    coreModules[module] = true;
  }

  return coreModules;
}

export interface RegisterParams extends ExplicitParams {
  /**
   * Defaults to `--project` CLI flag or `process.cwd()`
   */
  cwd?: string;
}

/**
 * Installs a custom module load function that can adhere to paths in tsconfig.
 * Returns a function to undo paths registration.
 */
export function register(params?: RegisterParams): () => void {
  let cwd: string | undefined;
  let explicitParams: ExplicitParams | undefined;
  if (params) {
    cwd = params.cwd;
    if (params.baseUrl || params.paths) {
      explicitParams = params;
    }
  } else {
    // eslint-disable-next-line
    const minimist = require("minimist");
    const argv = minimist(process.argv.slice(2), {
      // eslint-disable-next-line id-denylist
      string: ["project"],
      alias: {
        project: ["P"],
      },
    });
    cwd = argv.project;
  }

  const configLoaderResult = configLoader({
    cwd: cwd ?? process.cwd(),
    explicitParams,
  });

  if (configLoaderResult.resultType === "failed") {
    console.warn(
      `${configLoaderResult.message}. tsconfig-paths will be skipped`
    );

    return noOp;
  }

  const matchPath = createMatchPath(
    configLoaderResult.absoluteBaseUrl,
    configLoaderResult.paths,
    configLoaderResult.mainFields,
    configLoaderResult.addMatchAll
  );

  // Patch node's module loading
  // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
  const Module = require("module");
  // eslint-disable-next-line no-underscore-dangle
  const originalResolveFilename = Module._resolveFilename;
  const coreModules = getCoreModules(Module.builtinModules);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,no-underscore-dangle
  Module._resolveFilename = function (request: string, _parent: any): string {
    const isCoreModule = coreModules.hasOwnProperty(request);
    if (!isCoreModule) {
      const found = matchPath(request);
      if (found) {
        const modifiedArguments = [found, ...[].slice.call(arguments, 1)]; // Passes all arguments. Even those that is not specified above.
        return originalResolveFilename.apply(this, modifiedArguments);
      }
    }
    return originalResolveFilename.apply(this, arguments);
  };

  return () => {
    // Return node's module loading to original state.
    // eslint-disable-next-line no-underscore-dangle
    Module._resolveFilename = originalResolveFilename;
  };
}
