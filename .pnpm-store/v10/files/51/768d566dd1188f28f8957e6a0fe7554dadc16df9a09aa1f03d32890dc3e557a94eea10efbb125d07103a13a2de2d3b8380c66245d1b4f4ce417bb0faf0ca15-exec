#!/usr/bin/env node
"use strict";
const {
  __export,
  __toESM,
  __toCommonJS,
  __async
} = require('./esblib.cjs');

const import_meta_url =
  typeof document === 'undefined'
    ? new (require('url').URL)('file:' + __filename).href
    : (document.currentScript && document.currentScript.src) ||
      new URL('main.js', document.baseURI).href


// src/cli.ts
var cli_exports = {};
__export(cli_exports, {
  argv: () => argv,
  injectGlobalRequire: () => injectGlobalRequire,
  isMain: () => isMain,
  main: () => main,
  normalizeExt: () => normalizeExt,
  printUsage: () => printUsage,
  transformMarkdown: () => transformMarkdown
});
module.exports = __toCommonJS(cli_exports);
var import_node_url = __toESM(require("url"), 1);
var import_node_process2 = __toESM(require("process"), 1);
var import_index = require("./index.cjs");
var import_deps = require("./deps.cjs");

// src/repl.ts
var import_node_process = __toESM(require("process"), 1);
var import_node_repl = __toESM(require("repl"), 1);
var import_node_util = require("util");
var import_core = require("./core.cjs");
var _a;
var HISTORY = (_a = import_node_process.default.env.ZX_REPL_HISTORY) != null ? _a : import_core.path.join(import_core.os.homedir(), ".zx_repl_history");
function startRepl() {
  return __async(this, arguments, function* (history = HISTORY) {
    import_core.defaults.verbose = false;
    const r = import_node_repl.default.start({
      prompt: import_core.chalk.greenBright.bold("\u276F "),
      useGlobal: true,
      preview: false,
      writer(output) {
        return output instanceof import_core.ProcessOutput ? output.toString().trimEnd() : (0, import_node_util.inspect)(output, { colors: true });
      }
    });
    r.setupHistory(history, () => {
    });
  });
}

// src/cli.ts
var import_util2 = require("./util.cjs");

// src/md.ts
var import_util = require("./util.cjs");
function transformMarkdown(buf) {
  var _a2;
  const output = [];
  const tabRe = /^(  +|\t)/;
  const codeBlockRe = new RegExp("^(?<fence>(`{3,20}|~{3,20}))(?:(?<js>(js|javascript|ts|typescript))|(?<bash>(sh|shell|bash))|.*)$");
  let state = "root";
  let codeBlockEnd = "";
  let prevLineIsEmpty = true;
  for (const line of (0, import_util.bufToString)(buf).split(/\r?\n/)) {
    switch (state) {
      case "root":
        if (tabRe.test(line) && prevLineIsEmpty) {
          output.push(line);
          state = "tab";
          continue;
        }
        const { fence, js, bash } = ((_a2 = line.match(codeBlockRe)) == null ? void 0 : _a2.groups) || {};
        if (!fence) {
          prevLineIsEmpty = line === "";
          output.push("// " + line);
          continue;
        }
        codeBlockEnd = fence;
        if (js) {
          state = "js";
          output.push("");
        } else if (bash) {
          state = "bash";
          output.push("await $`");
        } else {
          state = "other";
          output.push("");
        }
        break;
      case "tab":
        if (line === "") {
          output.push("");
        } else if (tabRe.test(line)) {
          output.push(line);
        } else {
          output.push("// " + line);
          state = "root";
        }
        break;
      case "js":
        if (line === codeBlockEnd) {
          output.push("");
          state = "root";
        } else {
          output.push(line);
        }
        break;
      case "bash":
        if (line === codeBlockEnd) {
          output.push("`");
          state = "root";
        } else {
          output.push(line);
        }
        break;
      case "other":
        if (line === codeBlockEnd) {
          output.push("");
          state = "root";
        } else {
          output.push("// " + line);
        }
        break;
    }
  }
  return output.join("\n");
}

// src/cli.ts
var import_vendor = require("./vendor.cjs");
var import_meta = {};
var EXT = ".mjs";
var EXT_RE = /^\.[mc]?[jt]sx?$/;
var argv = (0, import_index.parseArgv)(import_node_process2.default.argv.slice(2), {
  default: (0, import_index.resolveDefaults)({ ["prefer-local"]: false }, "ZX_", import_node_process2.default.env, /* @__PURE__ */ new Set(["env", "install", "registry"])),
  // exclude 'prefer-local' to let minimist infer the type
  string: ["shell", "prefix", "postfix", "eval", "cwd", "ext", "registry", "env"],
  boolean: ["version", "help", "quiet", "verbose", "install", "repl", "experimental"],
  alias: { e: "eval", i: "install", v: "version", h: "help", l: "prefer-local", "env-file": "env" },
  stopEarly: true,
  parseBoolean: true,
  camelCase: true
});
isMain() && main().catch((err) => {
  if (err instanceof import_index.ProcessOutput) {
    console.error("Error:", err.message);
  } else {
    console.error(err);
  }
  import_node_process2.default.exitCode = 1;
});
function printUsage() {
  console.log(`
 ${import_index.chalk.bold("zx " + import_index.VERSION)}
   A tool for writing better scripts

 ${import_index.chalk.bold("Usage")}
   zx [options] <script>

 ${import_index.chalk.bold("Options")}
   --quiet              suppress any outputs
   --verbose            enable verbose mode
   --shell=<path>       custom shell binary
   --prefix=<command>   prefix all commands
   --postfix=<command>  postfix all commands
   --prefer-local, -l   prefer locally installed packages and binaries
   --cwd=<path>         set current directory
   --eval=<js>, -e      evaluate script
   --ext=<.mjs>         script extension
   --install, -i        install dependencies
   --registry=<URL>     npm registry, defaults to https://registry.npmjs.org/
   --version, -v        print current zx version
   --help, -h           print help
   --repl               start repl
   --env=<path>         path to env file
   --experimental       enables experimental features (deprecated)

 ${import_index.chalk.italic("Full documentation:")} ${import_index.chalk.underline(import_index.Fail.DOCS_URL)}
`);
}
function main() {
  return __async(this, null, function* () {
    var _a2;
    if (argv.version) {
      console.log(import_index.VERSION);
      return;
    }
    if (argv.help) {
      printUsage();
      return;
    }
    if (argv.cwd) import_index.$.cwd = argv.cwd;
    if (argv.env) {
      const envfile = import_index.path.resolve((_a2 = import_index.$.cwd) != null ? _a2 : import_node_process2.default.cwd(), argv.env);
      import_index.dotenv.config(envfile);
      (0, import_index.resolveDefaults)();
    }
    if (argv.verbose) import_index.$.verbose = true;
    if (argv.quiet) import_index.$.quiet = true;
    if (argv.shell) import_index.$.shell = argv.shell;
    if (argv.prefix) import_index.$.prefix = argv.prefix;
    if (argv.postfix) import_index.$.postfix = argv.postfix;
    if (argv.preferLocal) import_index.$.preferLocal = argv.preferLocal;
    yield require("./globals.cjs");
    if (argv.repl) {
      yield startRepl();
      return;
    }
    argv.ext = normalizeExt(argv.ext);
    const { script, scriptPath, tempPath } = yield readScript();
    yield runScript(script, scriptPath, tempPath);
  });
}
var rmrf = (p) => {
  var _a2;
  if (!p) return;
  ((_a2 = lstat(p)) == null ? void 0 : _a2.isSymbolicLink()) ? import_index.fs.unlinkSync(p) : import_index.fs.rmSync(p, { force: true, recursive: true });
};
function runScript(script, scriptPath, tempPath) {
  return __async(this, null, function* () {
    let nmLink = "";
    const rmTemp = () => {
      rmrf(tempPath);
      rmrf(nmLink);
    };
    try {
      if (tempPath) {
        scriptPath = tempPath;
        yield import_index.fs.writeFile(tempPath, script);
      }
      const cwd = import_index.path.dirname(scriptPath);
      if (typeof argv.preferLocal === "string") {
        nmLink = linkNodeModules(cwd, argv.preferLocal);
      }
      if (argv.install) {
        yield (0, import_deps.installDeps)((0, import_deps.parseDeps)(script), cwd, argv.registry);
      }
      injectGlobalRequire(scriptPath);
      import_node_process2.default.once("exit", rmTemp);
      yield import(import_node_url.default.pathToFileURL(scriptPath).toString());
    } finally {
      rmTemp();
    }
  });
}
function linkNodeModules(cwd, external) {
  const nm = "node_modules";
  const alias = import_index.path.resolve(cwd, nm);
  const target = import_index.path.basename(external) === nm ? import_index.path.resolve(external) : import_index.path.resolve(external, nm);
  const aliasStat = lstat(alias);
  const targetStat = lstat(target);
  if (!(targetStat == null ? void 0 : targetStat.isDirectory()))
    throw new import_index.Fail(
      `Can't link node_modules: ${target} doesn't exist or is not a directory`
    );
  if ((aliasStat == null ? void 0 : aliasStat.isDirectory()) && alias !== target)
    throw new import_index.Fail(`Can't link node_modules: ${alias} already exists`);
  if (aliasStat) return "";
  import_index.fs.symlinkSync(target, alias, "junction");
  return alias;
}
function lstat(p) {
  try {
    return import_index.fs.lstatSync(p);
  } catch (e) {
  }
}
function readScript() {
  return __async(this, null, function* () {
    const [firstArg] = argv._;
    let script = "";
    let scriptPath = "";
    let tempPath = "";
    let argSlice = 1;
    if (argv.eval) {
      argSlice = 0;
      script = argv.eval;
      tempPath = getFilepath(import_index.$.cwd, "zx", argv.ext);
    } else if (!firstArg || firstArg === "-") {
      script = yield readScriptFromStdin();
      tempPath = getFilepath(import_index.$.cwd, "zx", argv.ext);
      if (script.length === 0) {
        printUsage();
        import_node_process2.default.exitCode = 1;
        throw new import_index.Fail("No script provided");
      }
    } else if (/^https?:/.test(firstArg)) {
      const { name, ext: ext2 = argv.ext } = import_index.path.parse(new URL(firstArg).pathname);
      script = yield readScriptFromHttp(firstArg);
      tempPath = getFilepath(import_index.$.cwd, name, ext2);
    } else {
      script = yield import_index.fs.readFile(firstArg, "utf8");
      scriptPath = firstArg.startsWith("file:") ? import_node_url.default.fileURLToPath(firstArg) : import_index.path.resolve(firstArg);
    }
    const { ext, base, dir } = import_index.path.parse(tempPath || scriptPath);
    if (ext === "" || argv.ext && !EXT_RE.test(ext)) {
      tempPath = getFilepath(dir, base);
    }
    if (ext === ".md") {
      script = transformMarkdown(script);
      tempPath = getFilepath(dir, base);
    }
    if (argSlice) (0, import_index.updateArgv)(argv._.slice(argSlice));
    return { script, scriptPath, tempPath };
  });
}
function readScriptFromStdin() {
  return __async(this, null, function* () {
    return import_node_process2.default.stdin.isTTY ? "" : (0, import_index.stdin)();
  });
}
function readScriptFromHttp(remote) {
  return __async(this, null, function* () {
    const res = yield (0, import_index.fetch)(remote);
    if (!res.ok) {
      console.error(`Error: Can't get ${remote}`);
      import_node_process2.default.exit(1);
    }
    return res.text();
  });
}
function injectGlobalRequire(origin) {
  const __filename = import_index.path.resolve(origin);
  const __dirname = import_index.path.dirname(__filename);
  const require2 = (0, import_vendor.createRequire)(origin);
  Object.assign(globalThis, { __filename, __dirname, require: require2 });
}
function isMain(metaurl = import_meta_url, scriptpath = import_node_process2.default.argv[1]) {
  if (metaurl.startsWith("file:")) {
    const modulePath = import_node_url.default.fileURLToPath(metaurl).replace(/\.\w+$/, "");
    const mainPath = import_index.fs.realpathSync(scriptpath).replace(/\.\w+$/, "");
    return mainPath === modulePath;
  }
  return false;
}
function normalizeExt(ext) {
  return ext ? import_index.path.parse(`foo.${ext}`).ext : ext;
}
function getFilepath(cwd = ".", name = "zx", _ext) {
  const ext = _ext || argv.ext || EXT;
  return [
    name + ext,
    name + "-" + (0, import_util2.randomId)() + ext
  ].map((f) => import_index.path.resolve(import_node_process2.default.cwd(), cwd, f)).find((f) => !import_index.fs.existsSync(f));
}
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  argv,
  injectGlobalRequire,
  isMain,
  main,
  normalizeExt,
  printUsage,
  transformMarkdown
});