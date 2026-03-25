"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var dependencies_exports = {};
__export(dependencies_exports, {
  dockerVersion: () => dockerVersion,
  installDependenciesLinux: () => installDependenciesLinux,
  installDependenciesWindows: () => installDependenciesWindows,
  readDockerVersionSync: () => readDockerVersionSync,
  transformCommandsForRoot: () => transformCommandsForRoot,
  validateDependenciesLinux: () => validateDependenciesLinux,
  validateDependenciesWindows: () => validateDependenciesWindows,
  writeDockerVersion: () => writeDockerVersion
});
module.exports = __toCommonJS(dependencies_exports);
var childProcess = __toESM(require("child_process"));
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_nativeDeps = require("./nativeDeps");
var import_ascii = require("../utils/ascii");
var import_hostPlatform = require("../utils/hostPlatform");
var import_spawnAsync = require("../utils/spawnAsync");
var import_userAgent = require("../utils/userAgent");
var import__ = require(".");
const BIN_DIRECTORY = import_path.default.join(__dirname, "..", "..", "..", "bin");
const languageBindingVersion = process.env.PW_CLI_DISPLAY_VERSION || require("../../../package.json").version;
const dockerVersionFilePath = "/ms-playwright/.docker-info";
async function writeDockerVersion(dockerImageNameTemplate) {
  await import_fs.default.promises.mkdir(import_path.default.dirname(dockerVersionFilePath), { recursive: true });
  await import_fs.default.promises.writeFile(dockerVersionFilePath, JSON.stringify(dockerVersion(dockerImageNameTemplate), null, 2), "utf8");
  await import_fs.default.promises.chmod(dockerVersionFilePath, 511);
}
function dockerVersion(dockerImageNameTemplate) {
  return {
    driverVersion: languageBindingVersion,
    dockerImageName: dockerImageNameTemplate.replace("%version%", languageBindingVersion)
  };
}
function readDockerVersionSync() {
  try {
    const data = JSON.parse(import_fs.default.readFileSync(dockerVersionFilePath, "utf8"));
    return {
      ...data,
      dockerImageNameTemplate: data.dockerImageName.replace(data.driverVersion, "%version%")
    };
  } catch (e) {
    return null;
  }
}
const checkExecutable = (filePath) => {
  if (process.platform === "win32")
    return filePath.endsWith(".exe");
  return import_fs.default.promises.access(filePath, import_fs.default.constants.X_OK).then(() => true).catch(() => false);
};
function isSupportedWindowsVersion() {
  if (import_os.default.platform() !== "win32" || import_os.default.arch() !== "x64")
    return false;
  const [major, minor] = import_os.default.release().split(".").map((token) => parseInt(token, 10));
  return major > 6 || major === 6 && minor > 1;
}
async function installDependenciesWindows(targets, dryRun) {
  if (targets.has("chromium")) {
    const command = "powershell.exe";
    const args = ["-ExecutionPolicy", "Bypass", "-File", import_path.default.join(BIN_DIRECTORY, "install_media_pack.ps1")];
    if (dryRun) {
      console.log(`${command} ${quoteProcessArgs(args).join(" ")}`);
      return;
    }
    const { code } = await (0, import_spawnAsync.spawnAsync)(command, args, { cwd: BIN_DIRECTORY, stdio: "inherit" });
    if (code !== 0)
      throw new Error("Failed to install windows dependencies!");
  }
}
async function installDependenciesLinux(targets, dryRun) {
  const libraries = [];
  const platform = import_hostPlatform.hostPlatform;
  if (!import_hostPlatform.isOfficiallySupportedPlatform)
    console.warn(`BEWARE: your OS is not officially supported by Playwright; installing dependencies for ${platform} as a fallback.`);
  for (const target of targets) {
    const info = import_nativeDeps.deps[platform];
    if (!info) {
      console.warn(`Cannot install dependencies for ${platform} with Playwright ${(0, import_userAgent.getPlaywrightVersion)()}!`);
      return;
    }
    libraries.push(...info[target]);
  }
  const uniqueLibraries = Array.from(new Set(libraries));
  if (!dryRun)
    console.log(`Installing dependencies...`);
  const commands = [];
  commands.push("apt-get update");
  commands.push([
    "apt-get",
    "install",
    "-y",
    "--no-install-recommends",
    ...uniqueLibraries
  ].join(" "));
  const { command, args, elevatedPermissions } = await transformCommandsForRoot(commands);
  if (dryRun) {
    console.log(`${command} ${quoteProcessArgs(args).join(" ")}`);
    return;
  }
  if (elevatedPermissions)
    console.log("Switching to root user to install dependencies...");
  const child = childProcess.spawn(command, args, { stdio: "inherit" });
  await new Promise((resolve, reject) => {
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Installation process exited with code: ${code}`)));
    child.on("error", reject);
  });
}
async function validateDependenciesWindows(sdkLanguage, windowsExeAndDllDirectories) {
  const directoryPaths = windowsExeAndDllDirectories;
  const lddPaths = [];
  for (const directoryPath of directoryPaths)
    lddPaths.push(...await executablesOrSharedLibraries(directoryPath));
  const allMissingDeps = await Promise.all(lddPaths.map((lddPath) => missingFileDependenciesWindows(sdkLanguage, lddPath)));
  const missingDeps = /* @__PURE__ */ new Set();
  for (const deps2 of allMissingDeps) {
    for (const dep of deps2)
      missingDeps.add(dep);
  }
  if (!missingDeps.size)
    return;
  let isCrtMissing = false;
  let isMediaFoundationMissing = false;
  for (const dep of missingDeps) {
    if (dep.startsWith("api-ms-win-crt") || dep === "vcruntime140.dll" || dep === "vcruntime140_1.dll" || dep === "msvcp140.dll")
      isCrtMissing = true;
    else if (dep === "mf.dll" || dep === "mfplat.dll" || dep === "msmpeg2vdec.dll" || dep === "evr.dll" || dep === "avrt.dll")
      isMediaFoundationMissing = true;
  }
  const details = [];
  if (isCrtMissing) {
    details.push(
      `Some of the Universal C Runtime files cannot be found on the system. You can fix`,
      `that by installing Microsoft Visual C++ Redistributable for Visual Studio from:`,
      `https://support.microsoft.com/en-us/help/2977003/the-latest-supported-visual-c-downloads`,
      ``
    );
  }
  if (isMediaFoundationMissing) {
    details.push(
      `Some of the Media Foundation files cannot be found on the system. If you are`,
      `on Windows Server try fixing this by running the following command in PowerShell`,
      `as Administrator:`,
      ``,
      `    Install-WindowsFeature Server-Media-Foundation`,
      ``,
      `For Windows N editions visit:`,
      `https://support.microsoft.com/en-us/help/3145500/media-feature-pack-list-for-windows-n-editions`,
      ``
    );
  }
  details.push(
    `Full list of missing libraries:`,
    `    ${[...missingDeps].join("\n    ")}`,
    ``
  );
  const message = `Host system is missing dependencies!

${details.join("\n")}`;
  if (isSupportedWindowsVersion()) {
    throw new Error(message);
  } else {
    console.warn(`WARNING: running on unsupported windows version!`);
    console.warn(message);
  }
}
async function validateDependenciesLinux(sdkLanguage, linuxLddDirectories, dlOpenLibraries) {
  const directoryPaths = linuxLddDirectories;
  const lddPaths = [];
  for (const directoryPath of directoryPaths)
    lddPaths.push(...await executablesOrSharedLibraries(directoryPath));
  const missingDepsPerFile = await Promise.all(lddPaths.map((lddPath) => missingFileDependencies(lddPath, directoryPaths)));
  const missingDeps = /* @__PURE__ */ new Set();
  for (const deps2 of missingDepsPerFile) {
    for (const dep of deps2)
      missingDeps.add(dep);
  }
  for (const dep of await missingDLOPENLibraries(dlOpenLibraries))
    missingDeps.add(dep);
  if (!missingDeps.size)
    return;
  const allMissingDeps = new Set(missingDeps);
  const missingPackages = /* @__PURE__ */ new Set();
  const libraryToPackageNameMapping = import_nativeDeps.deps[import_hostPlatform.hostPlatform] ? {
    ...import_nativeDeps.deps[import_hostPlatform.hostPlatform]?.lib2package || {},
    ...MANUAL_LIBRARY_TO_PACKAGE_NAME_UBUNTU
  } : {};
  for (const missingDep of missingDeps) {
    const packageName = libraryToPackageNameMapping[missingDep];
    if (packageName) {
      missingPackages.add(packageName);
      missingDeps.delete(missingDep);
    }
  }
  const maybeSudo = process.getuid?.() && import_os.default.platform() !== "win32" ? "sudo " : "";
  const dockerInfo = readDockerVersionSync();
  const errorLines = [
    `Host system is missing dependencies to run browsers.`
  ];
  if (dockerInfo && !dockerInfo.driverVersion.startsWith((0, import_userAgent.getPlaywrightVersion)(
    true
    /* majorMinorOnly */
  ) + ".")) {
    const pwVersion = (0, import_userAgent.getPlaywrightVersion)();
    const requiredDockerImage = dockerInfo.dockerImageName.replace(dockerInfo.driverVersion, pwVersion);
    errorLines.push(...[
      `This is most likely due to Docker image version not matching Playwright version:`,
      `- Playwright  : ${pwVersion}`,
      `- Docker image: ${dockerInfo.driverVersion}`,
      ``,
      `Either:`,
      `- (recommended) use Docker image "${requiredDockerImage}"`,
      `- (alternative 1) run the following command inside Docker to install missing dependencies:`,
      ``,
      `    ${maybeSudo}${(0, import__.buildPlaywrightCLICommand)(sdkLanguage, "install-deps")}`,
      ``,
      `- (alternative 2) use apt inside Docker:`,
      ``,
      `    ${maybeSudo}apt-get install ${[...missingPackages].join("\\\n        ")}`,
      ``,
      `<3 Playwright Team`
    ]);
  } else if (missingPackages.size && !missingDeps.size) {
    errorLines.push(...[
      `Please install them with the following command:`,
      ``,
      `    ${maybeSudo}${(0, import__.buildPlaywrightCLICommand)(sdkLanguage, "install-deps")}`,
      ``,
      `Alternatively, use apt:`,
      `    ${maybeSudo}apt-get install ${[...missingPackages].join("\\\n        ")}`,
      ``,
      `<3 Playwright Team`
    ]);
  } else {
    errorLines.push(...[
      `Missing libraries:`,
      ...[...allMissingDeps].map((dep) => "    " + dep)
    ]);
  }
  throw new Error("\n" + (0, import_ascii.wrapInASCIIBox)(errorLines.join("\n"), 1));
}
function isSharedLib(basename) {
  switch (import_os.default.platform()) {
    case "linux":
      return basename.endsWith(".so") || basename.includes(".so.");
    case "win32":
      return basename.endsWith(".dll");
    default:
      return false;
  }
}
async function executablesOrSharedLibraries(directoryPath) {
  if (!import_fs.default.existsSync(directoryPath))
    return [];
  const allPaths = (await import_fs.default.promises.readdir(directoryPath)).map((file) => import_path.default.resolve(directoryPath, file));
  const allStats = await Promise.all(allPaths.map((aPath) => import_fs.default.promises.stat(aPath)));
  const filePaths = allPaths.filter((aPath, index) => allStats[index].isFile());
  const executablersOrLibraries = (await Promise.all(filePaths.map(async (filePath) => {
    const basename = import_path.default.basename(filePath).toLowerCase();
    if (isSharedLib(basename))
      return filePath;
    if (await checkExecutable(filePath))
      return filePath;
    return false;
  }))).filter(Boolean);
  return executablersOrLibraries;
}
async function missingFileDependenciesWindows(sdkLanguage, filePath) {
  const executable = import__.registry.findExecutable("winldd").executablePathOrDie(sdkLanguage);
  const dirname = import_path.default.dirname(filePath);
  const { stdout, code } = await (0, import_spawnAsync.spawnAsync)(executable, [filePath], {
    cwd: dirname,
    env: {
      ...process.env,
      LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH ? `${process.env.LD_LIBRARY_PATH}:${dirname}` : dirname
    }
  });
  if (code !== 0)
    return [];
  const missingDeps = stdout.split("\n").map((line) => line.trim()).filter((line) => line.endsWith("not found") && line.includes("=>")).map((line) => line.split("=>")[0].trim().toLowerCase());
  return missingDeps;
}
async function missingFileDependencies(filePath, extraLDPaths) {
  const dirname = import_path.default.dirname(filePath);
  let LD_LIBRARY_PATH = extraLDPaths.join(":");
  if (process.env.LD_LIBRARY_PATH)
    LD_LIBRARY_PATH = `${process.env.LD_LIBRARY_PATH}:${LD_LIBRARY_PATH}`;
  const { stdout, code } = await (0, import_spawnAsync.spawnAsync)("ldd", [filePath], {
    cwd: dirname,
    env: {
      ...process.env,
      LD_LIBRARY_PATH
    }
  });
  if (code !== 0)
    return [];
  const missingDeps = stdout.split("\n").map((line) => line.trim()).filter((line) => line.endsWith("not found") && line.includes("=>")).map((line) => line.split("=>")[0].trim());
  return missingDeps;
}
async function missingDLOPENLibraries(libraries) {
  if (!libraries.length)
    return [];
  const { stdout, code, error } = await (0, import_spawnAsync.spawnAsync)("/sbin/ldconfig", ["-p"], {});
  if (code !== 0 || error)
    return [];
  const isLibraryAvailable = (library) => stdout.toLowerCase().includes(library.toLowerCase());
  return libraries.filter((library) => !isLibraryAvailable(library));
}
const MANUAL_LIBRARY_TO_PACKAGE_NAME_UBUNTU = {
  // libgstlibav.so (the only actual library provided by gstreamer1.0-libav) is not
  // in the ldconfig cache, so we detect the actual library required for playing h.264
  // and if it's missing recommend installing missing gstreamer lib.
  // gstreamer1.0-libav -> libavcodec57 -> libx264-152
  "libx264.so": "gstreamer1.0-libav"
};
function quoteProcessArgs(args) {
  return args.map((arg) => {
    if (arg.includes(" "))
      return `"${arg}"`;
    return arg;
  });
}
async function transformCommandsForRoot(commands) {
  const isRoot = process.getuid?.() === 0;
  if (isRoot)
    return { command: "sh", args: ["-c", `${commands.join("&& ")}`], elevatedPermissions: false };
  const sudoExists = await (0, import_spawnAsync.spawnAsync)("which", ["sudo"]);
  if (sudoExists.code === 0)
    return { command: "sudo", args: ["--", "sh", "-c", `${commands.join("&& ")}`], elevatedPermissions: true };
  return { command: "su", args: ["root", "-c", `${commands.join("&& ")}`], elevatedPermissions: true };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  dockerVersion,
  installDependenciesLinux,
  installDependenciesWindows,
  readDockerVersionSync,
  transformCommandsForRoot,
  validateDependenciesLinux,
  validateDependenciesWindows,
  writeDockerVersion
});
