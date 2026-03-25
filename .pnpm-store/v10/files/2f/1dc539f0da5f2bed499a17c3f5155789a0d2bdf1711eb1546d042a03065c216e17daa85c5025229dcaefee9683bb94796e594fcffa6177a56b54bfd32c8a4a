'use strict';

const pkgTypes = require('pkg-types');
const node_module = require('node:module');
const pathe = require('pathe');
const ufo = require('ufo');
const tinyexec = require('tinyexec');
const fs = require('node:fs');
const promises = require('node:fs/promises');

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

const fs__namespace = /*#__PURE__*/_interopNamespaceCompat(fs);

async function findup(cwd, match, options = {}) {
  const segments = pathe.normalize(cwd).split("/");
  while (segments.length > 0) {
    const path = segments.join("/") || "/";
    const result = await match(path);
    if (result || !options.includeParentDirs) {
      return result;
    }
    segments.pop();
  }
}
function cached(fn) {
  let v;
  return () => {
    if (v === void 0) {
      v = fn().then((r) => {
        v = r;
        return v;
      });
    }
    return v;
  };
}
const hasCorepack = cached(async () => {
  if (globalThis.process?.versions?.webcontainer) {
    return false;
  }
  try {
    const { exitCode } = await tinyexec.x("corepack", ["--version"]);
    return exitCode === 0;
  } catch {
    return false;
  }
});
async function executeCommand(command, args, options = {}) {
  const xArgs = command === "npm" || command === "bun" || command === "deno" || !await hasCorepack() ? [command, args] : ["corepack", [command, ...args]];
  await tinyexec.x(xArgs[0], xArgs[1], {
    nodeOptions: {
      cwd: pathe.resolve(options.cwd || process.cwd()),
      stdio: options.silent ? "pipe" : "inherit"
    }
  });
}
const NO_PACKAGE_MANAGER_DETECTED_ERROR_MSG = "No package manager auto-detected.";
async function resolveOperationOptions(options = {}) {
  const cwd = options.cwd || process.cwd();
  const packageManager = (typeof options.packageManager === "string" ? packageManagers.find((pm) => pm.name === options.packageManager) : options.packageManager) || await detectPackageManager(options.cwd || process.cwd());
  if (!packageManager) {
    throw new Error(NO_PACKAGE_MANAGER_DETECTED_ERROR_MSG);
  }
  return {
    cwd,
    silent: options.silent ?? false,
    packageManager,
    dev: options.dev ?? false,
    workspace: options.workspace,
    global: options.global ?? false
  };
}
function getWorkspaceArgs(options) {
  if (!options.workspace) {
    return [];
  }
  const workspacePkg = typeof options.workspace === "string" && options.workspace !== "" ? options.workspace : void 0;
  if (options.packageManager.name === "pnpm") {
    return workspacePkg ? ["--filter", workspacePkg] : ["--workspace-root"];
  }
  if (options.packageManager.name === "npm") {
    return workspacePkg ? ["-w", workspacePkg] : ["--workspaces"];
  }
  if (options.packageManager.name === "yarn") {
    if (!options.packageManager.majorVersion || options.packageManager.majorVersion === "1") {
      return workspacePkg ? ["--cwd", workspacePkg] : ["-W"];
    } else {
      return workspacePkg ? ["workspace", workspacePkg] : [];
    }
  }
  return [];
}
function doesDependencyExist(name, options) {
  const require = node_module.createRequire(ufo.withTrailingSlash(options.cwd));
  try {
    const resolvedPath = require.resolve(name);
    return resolvedPath.startsWith(options.cwd);
  } catch {
    return false;
  }
}
function parsePackageManagerField(packageManager) {
  const [name, _version] = (packageManager || "").split("@");
  const [version, buildMeta] = _version?.split("+") || [];
  if (name && name !== "-" && /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)) {
    return { name, version, buildMeta };
  }
  const sanitized = name.replace(/\W+/g, "");
  const warnings = [
    `Abnormal characters found in \`packageManager\` field, sanitizing from \`${name}\` to \`${sanitized}\``
  ];
  return {
    name: sanitized,
    version,
    buildMeta,
    warnings
  };
}

const packageManagers = [
  {
    name: "npm",
    command: "npm",
    lockFile: "package-lock.json"
  },
  {
    name: "pnpm",
    command: "pnpm",
    lockFile: "pnpm-lock.yaml",
    files: ["pnpm-workspace.yaml"]
  },
  {
    name: "bun",
    command: "bun",
    lockFile: ["bun.lockb", "bun.lock"]
  },
  {
    name: "yarn",
    command: "yarn",
    majorVersion: "1",
    lockFile: "yarn.lock"
  },
  {
    name: "yarn",
    command: "yarn",
    majorVersion: "3",
    lockFile: "yarn.lock",
    files: [".yarnrc.yml"]
  },
  {
    name: "deno",
    command: "deno",
    lockFile: "deno.lock",
    files: ["deno.json"]
  }
];
async function detectPackageManager(cwd, options = {}) {
  const detected = await findup(
    pathe.resolve(cwd || "."),
    async (path) => {
      if (!options.ignorePackageJSON) {
        const packageJSONPath = pathe.join(path, "package.json");
        if (fs.existsSync(packageJSONPath)) {
          const packageJSON = JSON.parse(
            await promises.readFile(packageJSONPath, "utf8")
          );
          if (packageJSON?.packageManager) {
            const {
              name,
              version = "0.0.0",
              buildMeta,
              warnings
            } = parsePackageManagerField(packageJSON.packageManager);
            if (name) {
              const majorVersion = version.split(".")[0];
              const packageManager = packageManagers.find(
                (pm) => pm.name === name && pm.majorVersion === majorVersion
              ) || packageManagers.find((pm) => pm.name === name);
              return {
                name,
                command: name,
                version,
                majorVersion,
                buildMeta,
                warnings,
                ...packageManager
              };
            }
          }
        }
        const denoJSONPath = pathe.join(path, "deno.json");
        if (fs.existsSync(denoJSONPath)) {
          return packageManagers.find((pm) => pm.name === "deno");
        }
      }
      if (!options.ignoreLockFile) {
        for (const packageManager of packageManagers) {
          const detectionsFiles = [
            packageManager.lockFile,
            packageManager.files
          ].flat().filter(Boolean);
          if (detectionsFiles.some((file) => fs.existsSync(pathe.resolve(path, file)))) {
            return {
              ...packageManager
            };
          }
        }
      }
    },
    {
      includeParentDirs: options.includeParentDirs ?? true
    }
  );
  if (!detected && !options.ignoreArgv) {
    const scriptArg = process.argv[1];
    if (scriptArg) {
      for (const packageManager of packageManagers) {
        const re = new RegExp(`[/\\\\]\\.?${packageManager.command}`);
        if (re.test(scriptArg)) {
          return packageManager;
        }
      }
    }
  }
  return detected;
}

async function installDependencies(options = {}) {
  const resolvedOptions = await resolveOperationOptions(options);
  const pmToFrozenLockfileInstallCommand = {
    npm: ["ci"],
    yarn: ["install", "--immutable"],
    bun: ["install", "--frozen-lockfile"],
    pnpm: ["install", "--frozen-lockfile"],
    deno: ["install", "--frozen"]
  };
  const commandArgs = options.frozenLockFile ? pmToFrozenLockfileInstallCommand[resolvedOptions.packageManager.name] : ["install"];
  await executeCommand(resolvedOptions.packageManager.command, commandArgs, {
    cwd: resolvedOptions.cwd,
    silent: resolvedOptions.silent
  });
}
async function addDependency(name, options = {}) {
  const resolvedOptions = await resolveOperationOptions(options);
  const names = Array.isArray(name) ? name : [name];
  if (resolvedOptions.packageManager.name === "deno") {
    for (let i = 0; i < names.length; i++) {
      if (!/^(npm|jsr|file):.+$/.test(names[i])) {
        names[i] = `npm:${names[i]}`;
      }
    }
  }
  if (names.length === 0) {
    return;
  }
  const args = (resolvedOptions.packageManager.name === "yarn" ? [
    ...getWorkspaceArgs(resolvedOptions),
    // Global is not supported in berry: yarnpkg/berry#821
    resolvedOptions.global && resolvedOptions.packageManager.majorVersion === "1" ? "global" : "",
    "add",
    resolvedOptions.dev ? "-D" : "",
    ...names
  ] : [
    resolvedOptions.packageManager.name === "npm" ? "install" : "add",
    ...getWorkspaceArgs(resolvedOptions),
    resolvedOptions.dev ? "-D" : "",
    resolvedOptions.global ? "-g" : "",
    ...names
  ]).filter(Boolean);
  await executeCommand(resolvedOptions.packageManager.command, args, {
    cwd: resolvedOptions.cwd,
    silent: resolvedOptions.silent
  });
  if (options.installPeerDependencies) {
    const existingPkg = await pkgTypes.readPackageJSON(resolvedOptions.cwd);
    const peerDeps = [];
    const peerDevDeps = [];
    for (const _name of names) {
      const pkgName = _name.match(/^(.[^@]+)/)?.[0];
      const pkg = await pkgTypes.readPackageJSON(pkgName, {
        url: resolvedOptions.cwd
      }).catch(() => ({}));
      if (!pkg.peerDependencies || pkg.name !== pkgName) {
        continue;
      }
      for (const [peerDependency, version] of Object.entries(
        pkg.peerDependencies
      )) {
        if (pkg.peerDependenciesMeta?.[peerDependency]?.optional) {
          continue;
        }
        if (existingPkg.dependencies?.[peerDependency] || existingPkg.devDependencies?.[peerDependency]) {
          continue;
        }
        const isDev = pkg.peerDependenciesMeta?.[peerDependency]?.dev;
        (isDev ? peerDevDeps : peerDeps).push(`${peerDependency}@${version}`);
      }
    }
    if (peerDeps.length > 0) {
      await addDependency(peerDeps, { ...resolvedOptions });
    }
    if (peerDevDeps.length > 0) {
      await addDevDependency(peerDevDeps, { ...resolvedOptions });
    }
  }
}
async function addDevDependency(name, options = {}) {
  await addDependency(name, { ...options, dev: true });
}
async function removeDependency(name, options = {}) {
  const resolvedOptions = await resolveOperationOptions(options);
  const args = (resolvedOptions.packageManager.name === "yarn" ? [
    // Global is not supported in berry: yarnpkg/berry#821
    resolvedOptions.global && resolvedOptions.packageManager.majorVersion === "1" ? "global" : "",
    ...getWorkspaceArgs(resolvedOptions),
    "remove",
    resolvedOptions.dev ? "-D" : "",
    resolvedOptions.global ? "-g" : "",
    name
  ] : [
    resolvedOptions.packageManager.name === "npm" ? "uninstall" : "remove",
    ...getWorkspaceArgs(resolvedOptions),
    resolvedOptions.dev ? "-D" : "",
    resolvedOptions.global ? "-g" : "",
    name
  ]).filter(Boolean);
  await executeCommand(resolvedOptions.packageManager.command, args, {
    cwd: resolvedOptions.cwd,
    silent: resolvedOptions.silent
  });
}
async function ensureDependencyInstalled(name, options = {}) {
  const resolvedOptions = await resolveOperationOptions(options);
  const dependencyExists = doesDependencyExist(name, resolvedOptions);
  if (dependencyExists) {
    return true;
  }
  await addDependency(name, resolvedOptions);
}
async function dedupeDependencies(options = {}) {
  const resolvedOptions = await resolveOperationOptions(options);
  const isSupported = !["bun", "deno"].includes(
    resolvedOptions.packageManager.name
  );
  const recreateLockfile = options.recreateLockfile ?? !isSupported;
  if (recreateLockfile) {
    const lockfiles = Array.isArray(resolvedOptions.packageManager.lockFile) ? resolvedOptions.packageManager.lockFile : [resolvedOptions.packageManager.lockFile];
    for (const lockfile of lockfiles) {
      if (lockfile)
        fs__namespace.rmSync(pathe.resolve(resolvedOptions.cwd, lockfile), { force: true });
    }
    await installDependencies(resolvedOptions);
    return;
  }
  if (isSupported) {
    await executeCommand(resolvedOptions.packageManager.command, ["dedupe"], {
      cwd: resolvedOptions.cwd,
      silent: resolvedOptions.silent
    });
    return;
  }
  throw new Error(
    `Deduplication is not supported for ${resolvedOptions.packageManager.name}`
  );
}

exports.addDependency = addDependency;
exports.addDevDependency = addDevDependency;
exports.dedupeDependencies = dedupeDependencies;
exports.detectPackageManager = detectPackageManager;
exports.ensureDependencyInstalled = ensureDependencyInstalled;
exports.installDependencies = installDependencies;
exports.packageManagers = packageManagers;
exports.removeDependency = removeDependency;
