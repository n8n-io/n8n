var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};

// index.js
__export(exports, {
  default: () => buildResolver
});
var path2 = __toModule(require("path"));
var fs2 = __toModule(require("fs"));

// lib/helper.js
var fs = __toModule(require("fs"));
var statOrNull = (p) => {
  try {
    return fs.statSync(p);
  } catch (e) {
    return null;
  }
};
var statIsFile = (p) => {
  var _a, _b;
  return (_b = (_a = statOrNull(p)) == null ? void 0 : _a.isFile()) != null ? _b : false;
};
var isLocal = (p) => p === "." || p.startsWith("./");

// index.js
var import_module = __toModule(require("module"));

// lib/node.js
var path = __toModule(require("path"));
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
    const prefix = key.substr(0, key.length - 1);
    if (!(rest.startsWith(prefix) && rest.length > prefix.length)) {
      continue;
    }
    const subpath = rest.substr(prefix.length);
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

// index.js
var defaults = {
  constraints: ["browser"],
  allowMissing: false,
  rewritePeerTypes: true,
  allowExportFallback: true,
  matchNakedMjs: false,
  includeMainFallback: true,
  checkNestedPackages: true
};
var relativeRegexp = /^\.{0,2}\//;
var matchJsSuffixRegexp = /\.js$/;
var zeroJsDefinitionsImport = "data:text/javascript;charset=utf-8,/* was .d.ts only */";
var modulePackageNames = [
  "module",
  "esnext:main",
  "esnext",
  "jsnext:main",
  "jsnext"
];
var _importerDir, _require, _options, _constraints;
var Resolver = class {
  constructor(importer, options) {
    __privateAdd(this, _importerDir, void 0);
    __privateAdd(this, _require, void 0);
    __privateAdd(this, _options, void 0);
    __privateAdd(this, _constraints, void 0);
    __privateSet(this, _options, Object.assign({}, defaults, options));
    __privateSet(this, _constraints, [__privateGet(this, _options).constraints].flat());
    const importerDir = path2.join(path2.resolve(importer), "..", path2.sep);
    __privateSet(this, _importerDir, new URL(`file://${importerDir}`));
    __privateSet(this, _require, (0, import_module.createRequire)(importerDir));
  }
  loadSelfPackage() {
    var _a;
    let candidatePath = (_a = __privateGet(this, _require).resolve.paths(".")) == null ? void 0 : _a[0];
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
    const candidatePaths = __privateGet(this, _require).resolve.paths(name);
    if (!(candidatePaths == null ? void 0 : candidatePaths.length)) {
      return;
    }
    const self = this.loadSelfPackage();
    if ((self == null ? void 0 : self.info["name"]) === name) {
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
    const extToCheck = __privateGet(this, _options).matchNakedMjs ? [".js", ".mjs"] : [".js"];
    if (stat === null) {
      for (const ext of extToCheck) {
        const check = pathname + ext;
        if (statIsFile(check)) {
          return check;
        }
      }
      if (__privateGet(this, _options).rewritePeerTypes) {
        const tsCheck = [pathname + ".d.ts", pathname.replace(matchJsSuffixRegexp, ".d.ts")];
        for (const check of tsCheck) {
          if (statIsFile(check)) {
            return zeroJsDefinitionsImport;
          }
        }
      }
    } else if (stat.isDirectory()) {
      for (const ext of extToCheck) {
        const check = path2.join(pathname, `index${ext}`);
        if (statIsFile(check)) {
          return check;
        }
      }
      if (__privateGet(this, _options).rewritePeerTypes && statIsFile(path2.join(pathname, "index.d.ts"))) {
        return zeroJsDefinitionsImport;
      }
    }
  }
  nodeResolve(importee) {
    var _a;
    if (importee.startsWith("#")) {
      const self = this.loadSelfPackage();
      if (!self) {
        return;
      }
      const matched = matchModuleNode((_a = self.info.imports) != null ? _a : {}, importee, __privateGet(this, _constraints));
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
        const matched = matchModuleNode(pkg.info.exports, rest, __privateGet(this, _constraints));
        if (matched && isLocal(matched)) {
          return `file://${path2.join(pkg.resolved, matched)}`;
        }
        if (!__privateGet(this, _options).allowExportFallback) {
          return;
        }
      }
      let simple = rest;
      if (simple === ".") {
        let found = false;
        for (const key of modulePackageNames) {
          if (typeof pkg.info[key] === "string") {
            simple = pkg.info[key];
            found = true;
            break;
          }
        }
        if (!found && (__privateGet(this, _options).includeMainFallback || pkg.info["type"] === "module") && typeof pkg.info["main"] === "string") {
          simple = pkg.info["main"];
        }
        return `file://${path2.join(pkg.resolved, simple)}`;
      }
      if (!fallbackBest) {
        fallbackBest = `file://${path2.join(pkg.resolved, rest)}`;
      }
    } while (__privateGet(this, _options).checkNestedPackages && ++index <= pathComponents.length);
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
      url = new URL(importee, __privateGet(this, _importerDir));
    }
    let { pathname } = url;
    const suffix = url.search + url.hash;
    const confirmed = this.confirmPath(pathname);
    if (confirmed !== void 0) {
      pathname = confirmed;
    } else if (!__privateGet(this, _options).allowMissing) {
      return;
    }
    try {
      new URL(pathname);
      return pathname;
    } catch (e) {
    }
    let out = path2.relative(__privateGet(this, _importerDir).pathname, pathname);
    if (!relativeRegexp.test(out)) {
      out = `./${out}`;
    }
    return out + suffix;
  }
};
_importerDir = new WeakMap();
_require = new WeakMap();
_options = new WeakMap();
_constraints = new WeakMap();
function buildResolver(importer, options) {
  let handler = (importee) => {
    const r = new Resolver(importer, options);
    handler = r.resolve.bind(r);
    return handler(importee);
  };
  return (importee) => handler(importee);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
