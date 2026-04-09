// src/detect.ts
import process from "process";
import { detect } from "package-manager-detector/detect";
async function detectPackageManager(cwd = process.cwd()) {
  const result = await detect({
    cwd,
    onUnknown(packageManager) {
      console.warn("[@antfu/install-pkg] Unknown packageManager:", packageManager);
      return void 0;
    }
  });
  return result?.agent || null;
}

// src/install.ts
import { existsSync } from "fs";
import process2 from "process";
import { resolve } from "path";
import { x } from "tinyexec";
async function installPackage(names, options = {}) {
  const detectedAgent = options.packageManager || await detectPackageManager(options.cwd) || "npm";
  const [agent] = detectedAgent.split("@");
  if (!Array.isArray(names))
    names = [names];
  const args = options.additionalArgs || [];
  if (options.preferOffline) {
    if (detectedAgent === "yarn@berry")
      args.unshift("--cached");
    else
      args.unshift("--prefer-offline");
  }
  if (agent === "pnpm" && existsSync(resolve(options.cwd ?? process2.cwd(), "pnpm-workspace.yaml")))
    args.unshift("-w");
  return x(
    agent,
    [
      agent === "yarn" ? "add" : "install",
      options.dev ? "-D" : "",
      ...args,
      ...names
    ].filter(Boolean),
    {
      nodeOptions: {
        stdio: options.silent ? "ignore" : "inherit",
        cwd: options.cwd
      },
      throwOnError: true
    }
  );
}
export {
  detectPackageManager,
  installPackage
};
