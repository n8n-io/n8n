"use strict";
const {
  __export,
  __toCommonJS,
  __async
} = require('./esblib.cjs');


// src/deps.ts
var deps_exports = {};
__export(deps_exports, {
  installDeps: () => installDeps,
  parseDeps: () => parseDeps
});
module.exports = __toCommonJS(deps_exports);
var import_node_module = require("module");
var import_index = require("./index.cjs");
var import_vendor = require("./vendor.cjs");
function installDeps(dependencies, prefix, registry, installerType = "npm") {
  return __async(this, null, function* () {
    const installer = installers[installerType];
    const packages = Object.entries(dependencies).map(
      ([name, version]) => `${name}@${version}`
    );
    if (packages.length === 0) return;
    if (!installer) {
      throw new import_index.Fail(
        `Unsupported installer type: ${installerType}. Supported types: ${Object.keys(installers).join(", ")}`
      );
    }
    yield (0, import_index.spinner)(
      `${installerType} i ${packages.join(" ")}`,
      () => installer({ packages, prefix, registry })
    );
  });
}
var installers = {
  npm: (_0) => __async(null, [_0], function* ({ packages, prefix, registry }) {
    const flags = [
      "--no-save",
      "--no-audit",
      "--no-fund",
      prefix && `--prefix=${prefix}`,
      registry && `--registry=${registry}`
    ].filter(Boolean);
    yield import_index.$`npm install ${flags} ${packages}`.nothrow();
  })
};
var builtins = new Set(import_node_module.builtinModules);
var nameRe = new RegExp("^(?<name>(@[a-z\\d-~][\\w-.~]*\\/)?[a-z\\d-~][\\w-.~]*)\\/?.*$", "i");
var versionRe = new RegExp("^@(?<version>[~^]?(v?[\\dx*]+([-.][\\d*a-z-]+)*))", "i");
function parseDeps(content) {
  return (0, import_vendor.depseek)(content + "\n", { comments: true }).reduce((m, { type, value }, i, list) => {
    if (type === "dep") {
      const meta = list[i + 1];
      const name = parsePackageName(value);
      const version = (meta == null ? void 0 : meta.type) === "comment" && parseVersion(meta == null ? void 0 : meta.value.trim()) || "latest";
      if (name) m[name] = version;
    }
    return m;
  }, {});
}
function parsePackageName(path) {
  var _a, _b;
  if (!path) return;
  const name = (_b = (_a = nameRe.exec(path)) == null ? void 0 : _a.groups) == null ? void 0 : _b.name;
  if (name && !builtins.has(name)) return name;
}
function parseVersion(line) {
  var _a, _b;
  return ((_b = (_a = versionRe.exec(line)) == null ? void 0 : _a.groups) == null ? void 0 : _b.version) || "latest";
}
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installDeps,
  parseDeps
});