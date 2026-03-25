'use strict';

const node_fs = require('node:fs');
const promises = require('node:fs/promises');
const node_os = require('node:os');
const pathe = require('pathe');
const createJiti = require('jiti');
const rc9 = require('rc9');
const defu = require('defu');
const ohash = require('ohash');
const pkgTypes = require('pkg-types');
const dotenv = require('dotenv');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

function _interopNamespaceCompat(e) {
  if (e && typeof e === 'object' && 'default' in e) return e;
  const n = Object.create(null);
  if (e) {
    for (const k in e) {
      n[k] = e[k];
    }
  }
  n.default = e;
  return n;
}

const createJiti__default = /*#__PURE__*/_interopDefaultCompat(createJiti);
const rc9__namespace = /*#__PURE__*/_interopNamespaceCompat(rc9);
const dotenv__namespace = /*#__PURE__*/_interopNamespaceCompat(dotenv);

async function setupDotenv(options) {
  const targetEnvironment = options.env ?? process.env;
  const environment = await loadDotenv({
    cwd: options.cwd,
    fileName: options.fileName ?? ".env",
    env: targetEnvironment,
    interpolate: options.interpolate ?? true
  });
  for (const key in environment) {
    if (!key.startsWith("_") && targetEnvironment[key] === void 0) {
      targetEnvironment[key] = environment[key];
    }
  }
  return environment;
}
async function loadDotenv(options) {
  const environment = /* @__PURE__ */ Object.create(null);
  const dotenvFile = pathe.resolve(options.cwd, options.fileName);
  if (node_fs.existsSync(dotenvFile)) {
    const parsed = dotenv__namespace.parse(await node_fs.promises.readFile(dotenvFile, "utf8"));
    Object.assign(environment, parsed);
  }
  if (!options.env?._applied) {
    Object.assign(environment, options.env);
    environment._applied = true;
  }
  if (options.interpolate) {
    interpolate(environment);
  }
  return environment;
}
function interpolate(target, source = {}, parse = (v) => v) {
  function getValue(key) {
    return source[key] === void 0 ? target[key] : source[key];
  }
  function interpolate2(value, parents = []) {
    if (typeof value !== "string") {
      return value;
    }
    const matches = value.match(/(.?\${?(?:[\w:]+)?}?)/g) || [];
    return parse(
      // eslint-disable-next-line unicorn/no-array-reduce
      matches.reduce((newValue, match) => {
        const parts = /(.?)\${?([\w:]+)?}?/g.exec(match) || [];
        const prefix = parts[1];
        let value2, replacePart;
        if (prefix === "\\") {
          replacePart = parts[0] || "";
          value2 = replacePart.replace(String.raw`\$`, "$");
        } else {
          const key = parts[2];
          replacePart = (parts[0] || "").slice(prefix.length);
          if (parents.includes(key)) {
            console.warn(
              `Please avoid recursive environment variables ( loop: ${parents.join(
                " > "
              )} > ${key} )`
            );
            return "";
          }
          value2 = getValue(key);
          value2 = interpolate2(value2, [...parents, key]);
        }
        return value2 === void 0 ? newValue : newValue.replace(replacePart, value2);
      }, value)
    );
  }
  for (const key in target) {
    target[key] = interpolate2(getValue(key));
  }
}

const _normalize = (p) => p?.replace(/\\/g, "/");
const ASYNC_LOADERS = {
  ".yaml": () => import('confbox/yaml').then((r) => r.parseYAML),
  ".yml": () => import('confbox/yaml').then((r) => r.parseYAML),
  ".jsonc": () => import('confbox/jsonc').then((r) => r.parseJSONC),
  ".json5": () => import('confbox/json5').then((r) => r.parseJSON5),
  ".toml": () => import('confbox/toml').then((r) => r.parseTOML)
};
const SUPPORTED_EXTENSIONS = [
  // with jiti
  ".js",
  ".ts",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".json",
  // with confbox
  ".jsonc",
  ".json5",
  ".yaml",
  ".yml",
  ".toml"
];
async function loadConfig(options) {
  options.cwd = pathe.resolve(process.cwd(), options.cwd || ".");
  options.name = options.name || "config";
  options.envName = options.envName ?? process.env.NODE_ENV;
  options.configFile = options.configFile ?? (options.name === "config" ? "config" : `${options.name}.config`);
  options.rcFile = options.rcFile ?? `.${options.name}rc`;
  if (options.extend !== false) {
    options.extend = {
      extendKey: "extends",
      ...options.extend
    };
  }
  const _merger = options.merger || defu.defu;
  options.jiti = options.jiti || createJiti__default(void 0, {
    interopDefault: true,
    requireCache: false,
    esmResolve: true,
    extensions: [...SUPPORTED_EXTENSIONS],
    ...options.jitiOptions
  });
  const r = {
    config: {},
    cwd: options.cwd,
    configFile: pathe.resolve(options.cwd, options.configFile),
    layers: []
  };
  const _configs = {
    overrides: options.overrides,
    main: void 0,
    rc: void 0,
    packageJson: void 0,
    defaultConfig: options.defaultConfig
  };
  if (options.dotenv) {
    await setupDotenv({
      cwd: options.cwd,
      ...options.dotenv === true ? {} : options.dotenv
    });
  }
  const _mainConfig = await resolveConfig(".", options);
  if (_mainConfig.configFile) {
    _configs.main = _mainConfig.config;
    r.configFile = _mainConfig.configFile;
  }
  if (options.rcFile) {
    const rcSources = [];
    rcSources.push(rc9__namespace.read({ name: options.rcFile, dir: options.cwd }));
    if (options.globalRc) {
      const workspaceDir = await pkgTypes.findWorkspaceDir(options.cwd).catch(() => {
      });
      if (workspaceDir) {
        rcSources.push(rc9__namespace.read({ name: options.rcFile, dir: workspaceDir }));
      }
      rcSources.push(rc9__namespace.readUser({ name: options.rcFile, dir: options.cwd }));
    }
    _configs.rc = _merger({}, ...rcSources);
  }
  if (options.packageJson) {
    const keys = (Array.isArray(options.packageJson) ? options.packageJson : [
      typeof options.packageJson === "string" ? options.packageJson : options.name
    ]).filter((t) => t && typeof t === "string");
    const pkgJsonFile = await pkgTypes.readPackageJSON(options.cwd).catch(() => {
    });
    const values = keys.map((key) => pkgJsonFile?.[key]);
    _configs.packageJson = _merger({}, ...values);
  }
  const configs = {};
  for (const key in _configs) {
    const value = _configs[key];
    configs[key] = await (typeof value === "function" ? value({ configs }) : value);
  }
  r.config = _merger(
    configs.overrides,
    configs.main,
    configs.rc,
    configs.packageJson,
    configs.defaultConfig
  );
  if (options.extend) {
    await extendConfig(r.config, options);
    r.layers = r.config._layers;
    delete r.config._layers;
    r.config = _merger(r.config, ...r.layers.map((e) => e.config));
  }
  const baseLayers = [
    configs.overrides && {
      config: configs.overrides,
      configFile: void 0,
      cwd: void 0
    },
    { config: configs.main, configFile: options.configFile, cwd: options.cwd },
    configs.rc && { config: configs.rc, configFile: options.rcFile },
    configs.packageJson && {
      config: configs.packageJson,
      configFile: "package.json"
    }
  ].filter((l) => l && l.config);
  r.layers = [...baseLayers, ...r.layers];
  if (options.defaults) {
    r.config = _merger(r.config, options.defaults);
  }
  if (options.omit$Keys) {
    for (const key in r.config) {
      if (key.startsWith("$")) {
        delete r.config[key];
      }
    }
  }
  return r;
}
async function extendConfig(config, options) {
  config._layers = config._layers || [];
  if (!options.extend) {
    return;
  }
  let keys = options.extend.extendKey;
  if (typeof keys === "string") {
    keys = [keys];
  }
  const extendSources = [];
  for (const key of keys) {
    extendSources.push(
      ...(Array.isArray(config[key]) ? config[key] : [config[key]]).filter(
        Boolean
      )
    );
    delete config[key];
  }
  for (let extendSource of extendSources) {
    const originalExtendSource = extendSource;
    let sourceOptions = {};
    if (extendSource.source) {
      sourceOptions = extendSource.options || {};
      extendSource = extendSource.source;
    }
    if (Array.isArray(extendSource)) {
      sourceOptions = extendSource[1] || {};
      extendSource = extendSource[0];
    }
    if (typeof extendSource !== "string") {
      console.warn(
        `Cannot extend config from \`${JSON.stringify(
          originalExtendSource
        )}\` in ${options.cwd}`
      );
      continue;
    }
    const _config = await resolveConfig(extendSource, options, sourceOptions);
    if (!_config.config) {
      console.warn(
        `Cannot extend config from \`${extendSource}\` in ${options.cwd}`
      );
      continue;
    }
    await extendConfig(_config.config, { ...options, cwd: _config.cwd });
    config._layers.push(_config);
    if (_config.config._layers) {
      config._layers.push(..._config.config._layers);
      delete _config.config._layers;
    }
  }
}
const GIGET_PREFIXES = [
  "gh:",
  "github:",
  "gitlab:",
  "bitbucket:",
  "https://",
  "http://"
];
const NPM_PACKAGE_RE = /^(@[\da-z~-][\d._a-z~-]*\/)?[\da-z~-][\d._a-z~-]*($|\/.*)/;
async function resolveConfig(source, options, sourceOptions = {}) {
  if (options.resolve) {
    const res2 = await options.resolve(source, options);
    if (res2) {
      return res2;
    }
  }
  const _merger = options.merger || defu.defu;
  if (GIGET_PREFIXES.some((prefix) => source.startsWith(prefix))) {
    const { downloadTemplate } = await import('giget');
    const cloneName = source.replace(/\W+/g, "_").split("_").splice(0, 3).join("_") + "_" + ohash.hash(source);
    let cloneDir;
    const localNodeModules = pathe.resolve(options.cwd, "node_modules");
    const parentDir = pathe.dirname(options.cwd);
    if (pathe.basename(parentDir) === ".c12") {
      cloneDir = pathe.join(parentDir, cloneName);
    } else if (node_fs.existsSync(localNodeModules)) {
      cloneDir = pathe.join(localNodeModules, ".c12", cloneName);
    } else {
      cloneDir = process.env.XDG_CACHE_HOME ? pathe.resolve(process.env.XDG_CACHE_HOME, "c12", cloneName) : pathe.resolve(node_os.homedir(), ".cache/c12", cloneName);
    }
    if (node_fs.existsSync(cloneDir) && !sourceOptions.install) {
      await promises.rm(cloneDir, { recursive: true });
    }
    const cloned = await downloadTemplate(source, {
      dir: cloneDir,
      install: sourceOptions.install,
      force: sourceOptions.install,
      auth: sourceOptions.auth,
      ...options.giget,
      ...sourceOptions.giget
    });
    source = cloned.dir;
  }
  const tryResolve = (id) => {
    try {
      return options.jiti.resolve(id, { paths: [options.cwd] });
    } catch {
    }
  };
  if (NPM_PACKAGE_RE.test(source)) {
    source = tryResolve(source) || source;
  }
  const ext = pathe.extname(source);
  const isDir = !ext || ext === pathe.basename(source);
  const cwd = pathe.resolve(options.cwd, isDir ? source : pathe.dirname(source));
  if (isDir) {
    source = options.configFile;
  }
  const res = {
    config: void 0,
    configFile: void 0,
    cwd,
    source,
    sourceOptions
  };
  res.configFile = tryResolve(pathe.resolve(cwd, source)) || tryResolve(pathe.resolve(cwd, ".config", source.replace(/\.config$/, ""))) || tryResolve(pathe.resolve(cwd, ".config", source)) || source;
  if (!node_fs.existsSync(res.configFile)) {
    return res;
  }
  const configFileExt = pathe.extname(res.configFile) || "";
  if (configFileExt in ASYNC_LOADERS) {
    const asyncLoader = await ASYNC_LOADERS[configFileExt]();
    const contents = await promises.readFile(res.configFile, "utf8");
    res.config = asyncLoader(contents);
  } else {
    res.config = options.jiti(res.configFile);
  }
  if (res.config instanceof Function) {
    res.config = await res.config();
  }
  if (options.envName) {
    const envConfig = {
      ...res.config["$" + options.envName],
      ...res.config.$env?.[options.envName]
    };
    if (Object.keys(envConfig).length > 0) {
      res.config = _merger(envConfig, res.config);
    }
  }
  res.meta = defu.defu(res.sourceOptions.meta, res.config.$meta);
  delete res.config.$meta;
  if (res.sourceOptions.overrides) {
    res.config = _merger(res.sourceOptions.overrides, res.config);
  }
  res.configFile = _normalize(res.configFile);
  res.source = _normalize(res.source);
  return res;
}

exports.SUPPORTED_EXTENSIONS = SUPPORTED_EXTENSIONS;
exports.loadConfig = loadConfig;
exports.loadDotenv = loadDotenv;
exports.setupDotenv = setupDotenv;
