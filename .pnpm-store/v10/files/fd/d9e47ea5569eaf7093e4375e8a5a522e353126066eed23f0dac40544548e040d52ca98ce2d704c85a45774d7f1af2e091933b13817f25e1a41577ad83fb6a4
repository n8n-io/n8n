"use strict";
const {
  __pow,
  __export,
  __reExport,
  __toESM,
  __toCommonJS,
  __async,
  __forAwait
} = require('./esblib.cjs');


// src/index.ts
var index_exports = {};
__export(index_exports, {
  VERSION: () => VERSION,
  YAML: () => import_vendor2.YAML,
  argv: () => argv,
  dotenv: () => import_vendor2.dotenv,
  echo: () => echo,
  expBackoff: () => expBackoff,
  fetch: () => fetch,
  fs: () => import_vendor2.fs,
  glob: () => import_vendor2.glob,
  globby: () => import_vendor2.glob,
  minimist: () => import_vendor2.minimist,
  nothrow: () => nothrow,
  parseArgv: () => parseArgv,
  question: () => question,
  quiet: () => quiet,
  retry: () => retry,
  sleep: () => sleep,
  spinner: () => spinner,
  stdin: () => stdin,
  tempdir: () => tempdir,
  tempfile: () => tempfile,
  tmpdir: () => tempdir,
  tmpfile: () => tempfile,
  updateArgv: () => updateArgv,
  version: () => version,
  versions: () => versions
});
module.exports = __toCommonJS(index_exports);
var import_core2 = require("./core.cjs");

// src/goods.ts
var import_node_buffer = require("buffer");
var import_node_process = __toESM(require("process"), 1);
var import_node_readline = require("readline");
var import_node_stream = require("stream");
var import_core = require("./core.cjs");
var import_util = require("./util.cjs");
var import_vendor = require("./vendor.cjs");

// src/versions.ts
var versions = {
  zx: "8.8.5",
  chalk: "5.6.2",
  depseek: "0.4.3",
  dotenv: "0.2.3",
  fetch: "1.6.7",
  fs: "11.3.2",
  glob: "15.0.0",
  minimist: "1.2.8",
  ps: "1.0.0",
  which: "5.0.0",
  yaml: "2.8.1"
};

// src/goods.ts
function tempdir(prefix = `zx-${(0, import_util.randomId)()}`, mode) {
  const dirpath = import_core.path.join(import_core.os.tmpdir(), prefix);
  import_vendor.fs.mkdirSync(dirpath, { recursive: true, mode });
  return dirpath;
}
function tempfile(name, data, mode) {
  const filepath = name ? import_core.path.join(tempdir(), name) : import_core.path.join(import_core.os.tmpdir(), `zx-${(0, import_util.randomId)()}`);
  if (data === void 0) import_vendor.fs.closeSync(import_vendor.fs.openSync(filepath, "w", mode));
  else import_vendor.fs.writeFileSync(filepath, data, { mode });
  return filepath;
}
var parseArgv = (args = import_node_process.default.argv.slice(2), opts = {}, defs = {}) => Object.entries((0, import_vendor.minimist)(args, opts)).reduce(
  (m, [k, v]) => {
    const kTrans = opts.camelCase ? import_util.toCamelCase : import_util.identity;
    const vTrans = opts.parseBoolean ? import_util.parseBool : import_util.identity;
    const [_k, _v] = k === "--" || k === "_" ? [k, v] : [kTrans(k), vTrans(v)];
    m[_k] = _v;
    return m;
  },
  defs
);
function updateArgv(args, opts) {
  for (const k in argv) delete argv[k];
  parseArgv(args, opts, argv);
}
var argv = parseArgv();
function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, (0, import_util.parseDuration)(duration));
  });
}
var responseToReadable = (response, rs) => {
  var _a;
  const reader = (_a = response.body) == null ? void 0 : _a.getReader();
  if (!reader) {
    rs.push(null);
    return rs;
  }
  rs._read = () => __async(null, null, function* () {
    const result = yield reader.read();
    rs.push(result.done ? null : import_node_buffer.Buffer.from(result.value));
  });
  return rs;
};
function fetch(url, init) {
  import_core.$.log({ kind: "fetch", url, init, verbose: !import_core.$.quiet && import_core.$.verbose });
  const p = (0, import_vendor.nodeFetch)(url, init);
  return Object.assign(p, {
    pipe(dest, ...args) {
      const rs = new import_node_stream.Readable();
      const _dest = (0, import_util.isStringLiteral)(dest, ...args) ? (0, import_core.$)({
        halt: true,
        signal: init == null ? void 0 : init.signal
      })(dest, ...args) : dest;
      p.then(
        (r) => {
          var _a;
          return responseToReadable(r, rs).pipe((_a = _dest.run) == null ? void 0 : _a.call(_dest));
        },
        (err) => {
          var _a;
          return (_a = _dest.abort) == null ? void 0 : _a.call(_dest, err);
        }
      );
      return _dest;
    }
  });
}
function echo(pieces, ...args) {
  const msg = (0, import_util.isStringLiteral)(pieces, ...args) ? args.map((a, i) => pieces[i] + stringify(a)).join("") + (0, import_util.getLast)(pieces) : [pieces, ...args].map(stringify).join(" ");
  console.log(msg);
}
function stringify(arg) {
  return arg instanceof import_core.ProcessOutput ? arg.toString().trimEnd() : `${arg}`;
}
function question(_0) {
  return __async(this, arguments, function* (query, {
    choices,
    input = import_node_process.default.stdin,
    output = import_node_process.default.stdout
  } = {}) {
    const completer = Array.isArray(choices) ? (line) => {
      const hits = choices.filter((c) => c.startsWith(line));
      return [hits.length ? hits : choices, line];
    } : void 0;
    const rl = (0, import_node_readline.createInterface)({
      input,
      output,
      terminal: true,
      completer
    });
    return new Promise(
      (resolve) => rl.question(query != null ? query : "", (answer) => {
        rl.close();
        resolve(answer);
      })
    );
  });
}
function stdin() {
  return __async(this, arguments, function* (stream = import_node_process.default.stdin) {
    let buf = "";
    try {
      for (var iter = __forAwait(stream.setEncoding("utf8")), more, temp, error; more = !(temp = yield iter.next()).done; more = false) {
        const chunk = temp.value;
        buf += chunk;
      }
    } catch (temp) {
      error = [temp];
    } finally {
      try {
        more && (temp = iter.return) && (yield temp.call(iter));
      } finally {
        if (error)
          throw error[0];
      }
    }
    return buf;
  });
}
function retry(count, d, cb) {
  return __async(this, null, function* () {
    if (typeof d === "function") return retry(count, 0, d);
    if (!cb) throw new import_core.Fail("Callback is required for retry");
    const total = count;
    const gen = typeof d === "object" ? d : (function* (d2) {
      while (true) yield d2;
    })((0, import_util.parseDuration)(d));
    let attempt = 0;
    let lastErr;
    while (count-- > 0) {
      attempt++;
      try {
        return yield cb();
      } catch (err) {
        lastErr = err;
        const delay = gen.next().value;
        import_core.$.log({
          kind: "retry",
          total,
          attempt,
          delay,
          exception: err,
          verbose: !import_core.$.quiet && import_core.$.verbose,
          error: `FAIL Attempt: ${attempt}/${total}, next: ${delay}`
          // legacy
        });
        if (delay > 0) yield sleep(delay);
      }
    }
    throw lastErr;
  });
}
function* expBackoff(max = "60s", delay = "100ms") {
  const maxMs = (0, import_util.parseDuration)(max);
  const randMs = (0, import_util.parseDuration)(delay);
  let n = 0;
  while (true) {
    yield Math.min(randMs * __pow(2, n++), maxMs);
  }
}
function spinner(title, callback) {
  return __async(this, null, function* () {
    if (typeof title === "function") return spinner("", title);
    if (import_core.$.quiet || import_node_process.default.env.CI) return callback();
    let i = 0;
    const stream = import_core.$.log.output || import_node_process.default.stderr;
    const spin = () => stream.write(`  ${"\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F"[i++ % 10]} ${title}\r`);
    return (0, import_core.within)(() => __async(null, null, function* () {
      import_core.$.verbose = false;
      const id = setInterval(spin, 100);
      try {
        return yield callback();
      } finally {
        clearInterval(id);
        stream.write(" ".repeat((import_node_process.default.stdout.columns || 1) - 1) + "\r");
      }
    }));
  });
}

// src/index.ts
__reExport(index_exports, require("./core.cjs"), module.exports);
var import_vendor2 = require("./vendor.cjs");
import_core2.bus.lock();
var VERSION = versions.zx || "0.0.0";
var version = VERSION;
function nothrow(promise) {
  return promise.nothrow();
}
function quiet(promise) {
  return promise.quiet();
}
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VERSION,
  YAML,
  argv,
  dotenv,
  echo,
  expBackoff,
  fetch,
  fs,
  glob,
  globby,
  minimist,
  nothrow,
  parseArgv,
  question,
  quiet,
  retry,
  sleep,
  spinner,
  stdin,
  tempdir,
  tempfile,
  tmpdir,
  tmpfile,
  updateArgv,
  version,
  versions,
  ...require("./core.cjs")
});