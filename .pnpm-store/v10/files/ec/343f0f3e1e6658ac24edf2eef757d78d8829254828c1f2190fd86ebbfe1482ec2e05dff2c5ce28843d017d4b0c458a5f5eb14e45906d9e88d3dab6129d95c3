// index.ts
import * as path2 from "node:path";
import * as fs2 from "node:fs";

// lib/helper.ts
import * as fs from "node:fs";
var statOrNull = (p) => {
  try {
    return fs.statSync(p);
  } catch (e) {
    return null;
  }
};
var statIsFile = (p) => statOrNull(p)?.isFile() ?? false;
var isLocal = (p) => p === "." || p.startsWith("./");

// index.ts
import { createRequire } from "node:module";

// lib/node.ts
import * as path from "node:path";
var alwaysConstraints = ["module", "import"];
function matchModuleNodePath(exports, rest) {
  if (typeof exports !== "object") {
    return { node: exports };
  }
  let fallback;
  for (const key in exports) {
    if (!key.startsWith("#") && !isLocal(key)) {
      fallback = exports;
      continue;
    }
    if (key === rest) {
      return { node: exports[key] };
    }
    if (!key.endsWith("/*")) {
      continue;
    }
    const prefix = key.substring(0, key.length - 1);
    if (!(rest.startsWith(prefix) && rest.length > prefix.length)) {
      continue;
    }
    const subpath = rest.substring(prefix.length);
    if (path.normalize(subpath) !== subpath) {
      continue;
    }
    return { node: exports[key], subpath };
  }
  if (fallback) {
    return { node: fallback };
  }
  return {};
}
function matchModuleNode(exports, rest, constraints) {
  let { node, subpath } = matchModuleNodePath(exports, rest);
  restart:
    while (node && typeof node !== "string") {
      for (const key in node) {
        if (alwaysConstraints.includes(key) || constraints.includes(key)) {
          node = node[key];
          continue restart;
        }
      }
      node = node["default"];
    }
  if (!node) {
    return;
  }
  if (subpath) {
    node = node.replace(/\*/g, subpath);
  }
  return node;
}

// index.ts
var defaults = {
  isDir: false,
  resolveToAbsolute: false,
  constraints: ["browser"],
  allowMissing: false,
  rewritePeerTypes: true,
  allowExportFallback: true,
  matchNakedMjs: false,
  allowImportingExtraExtensions: false,
  includeMainFallback: true,
  checkNestedPackages: true
};
var relativeRegexp = /^\.{0,2}\//;
var matchJsSuffixRegexp = /\.js$/;
var zeroJsDefinitionsImport = "data:text/javascript;charset=utf-8,/* was .d.ts only */";
var modulePackageNames = ["module", "esnext:main", "esnext", "jsnext:main", "jsnext"];
var Resolver = class {
  importerDir;
  require;
  options;
  constraints;
  constructor(importer, options) {
    this.options = Object.assign({}, defaults, options);
    this.constraints = [this.options.constraints].flat();
    importer = path2.resolve(importer);
    const importerDir = this.options.isDir ? path2.join(importer, "/") : path2.join(importer, "..", path2.sep);
    this.importerDir = new URL(`file://${importerDir}`);
    this.require = createRequire(importerDir);
  }
  loadSelfPackage() {
    let candidatePath = this.require.resolve.paths(".")?.[0];
    if (candidatePath === void 0) {
      return;
    }
    for (; ; ) {
      const selfPackagePath = path2.join(candidatePath, "package.json");
      try {
        const info = JSON.parse(fs2.readFileSync(selfPackagePath, "utf-8"));
        return { info, resolved: candidatePath };
      } catch (e) {
      }
      const next = path2.dirname(candidatePath);
      if (next === candidatePath) {
        return;
      }
      candidatePath = next;
    }
  }
  loadPackage(name) {
    const candidatePaths = this.require.resolve.paths(name);
    if (!candidatePaths?.length) {
      return;
    }
    const self = this.loadSelfPackage();
    if (self?.info["name"] === name) {
      return { resolved: self.resolved, info: self.info };
    }
    let packagePath;
    for (const p of candidatePaths) {
      const check = path2.join(p, name, "package.json");
      if (fs2.existsSync(check)) {
        packagePath = check;
        break;
      }
    }
    if (!packagePath) {
      return;
    }
    const info = JSON.parse(fs2.readFileSync(packagePath, "utf-8"));
    return { resolved: path2.dirname(packagePath), info };
  }
  confirmPath(pathname) {
    const stat = statOrNull(pathname);
    if (stat && !stat.isDirectory()) {
      return pathname;
    }
    const extToCheck = [".js"];
    if (this.options.matchNakedMjs) {
      extToCheck.push(".mjs");
    }
    if (this.options.allowImportingExtraExtensions) {
      if (Array.isArray(this.options.allowImportingExtraExtensions)) {
        extToCheck.push(
          ...this.options.allowImportingExtraExtensions.map((x) => {
            return x.startsWith(".") ? x : "." + x;
          })
        );
      } else {
        extToCheck.push(".ts", ".tsx", ".jsx");
      }
    }
    if (stat === null) {
      for (const ext of extToCheck) {
        const check = pathname + ext;
        if (statIsFile(check)) {
          return check;
        }
      }
      if (this.options.rewritePeerTypes) {
        const tsCheck = [pathname + ".d.ts", pathname.replace(matchJsSuffixRegexp, ".d.ts")];
        for (const check of tsCheck) {
          if (statIsFile(check)) {
            return zeroJsDefinitionsImport;
          }
        }
      }
      const { name, dir } = path2.parse(pathname);
      const naked = path2.join(dir, name);
      for (const ext of extToCheck) {
        const check = naked + ext;
        if (statIsFile(check)) {
          return check;
        }
      }
    } else if (stat.isDirectory()) {
      for (const ext of extToCheck) {
        const check = path2.join(pathname, `index${ext}`);
        if (statIsFile(check)) {
          return check;
        }
      }
      if (this.options.rewritePeerTypes && statIsFile(path2.join(pathname, "index.d.ts"))) {
        return zeroJsDefinitionsImport;
      }
    }
  }
  nodeResolve(importee) {
    if (importee.startsWith("#")) {
      const self = this.loadSelfPackage();
      if (!self) {
        return;
      }
      const matched = matchModuleNode(self.info.imports ?? {}, importee, this.constraints);
      if (!matched) {
        return;
      } else if (isLocal(matched)) {
        return `file://${path2.join(self.resolved, matched)}`;
      }
      importee = matched;
    }
    const pathComponents = importee.split("/");
    let index = pathComponents[0].startsWith("@") ? 2 : 1;
    let fallbackBest = void 0;
    do {
      const name = pathComponents.slice(0, index).join("/");
      const rest = [".", ...pathComponents.slice(index)].join("/");
      const pkg = this.loadPackage(name);
      if (!pkg) {
        continue;
      }
      if (pkg.info.exports) {
        const matched = matchModuleNode(pkg.info.exports, rest, this.constraints);
        if (matched && isLocal(matched)) {
          return `file://${path2.join(pkg.resolved, matched)}`;
        }
        if (!this.options.allowExportFallback) {
          return;
        }
      }
      let simple = rest;
      if (simple === ".") {
        let found = false;
        for (const key of modulePackageNames) {
          const cand = pkg.info[key];
          if (typeof cand === "string") {
            simple = cand;
            found = true;
            break;
          }
        }
        if (!found && (this.options.includeMainFallback || pkg.info["type"] === "module") && typeof pkg.info["main"] === "string") {
          simple = pkg.info["main"];
        }
        return `file://${path2.join(pkg.resolved, simple)}`;
      }
      if (!fallbackBest) {
        fallbackBest = `file://${path2.join(pkg.resolved, rest)}`;
      }
    } while (this.options.checkNestedPackages && ++index <= pathComponents.length);
    return fallbackBest;
  }
  resolve(importee) {
    try {
      new URL(importee);
      return;
    } catch {
    }
    let url;
    const resolved = this.nodeResolve(importee);
    if (resolved !== void 0) {
      url = new URL(resolved);
      if (url.protocol !== "file:") {
        throw new Error(`expected file:, was: ${url.toString()}`);
      }
    } else {
      url = new URL(importee, this.importerDir);
    }
    let { pathname } = url;
    const suffix = url.search + url.hash;
    const confirmed = this.confirmPath(pathname);
    if (confirmed !== void 0) {
      pathname = confirmed;
    } else if (!this.options.allowMissing) {
      return;
    }
    try {
      new URL(pathname);
      return pathname;
    } catch (e) {
    }
    if (this.options.resolveToAbsolute) {
      return pathname;
    }
    let out = path2.relative(this.importerDir.pathname, pathname);
    if (!relativeRegexp.test(out)) {
      out = `./${out}`;
    }
    return out + suffix;
  }
};
function buildResolver(importer, options) {
  let handler = (importee) => {
    const r = new Resolver(importer, options);
    handler = r.resolve.bind(r);
    return handler(importee);
  };
  return (importee) => handler(importee);
}
export {
  buildResolver,
  buildResolver as default
};
