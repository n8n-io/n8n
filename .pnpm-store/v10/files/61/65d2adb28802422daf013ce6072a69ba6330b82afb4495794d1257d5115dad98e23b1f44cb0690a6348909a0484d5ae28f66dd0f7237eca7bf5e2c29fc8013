// src/detect.ts
import process from "node:process";
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
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process2 from "node:process";
import { x } from "tinyexec";
async function installPackage(names, options = {}) {
  const detectedAgent = options.packageManager || await detectPackageManager(options.cwd) || "npm";
  const [agent] = detectedAgent.split("@");
  if (!Array.isArray(names))
    names = [names];
  const args = (typeof options.additionalArgs === "function" ? options.additionalArgs(agent, detectedAgent) : options.additionalArgs) || [];
  if (options.preferOffline) {
    if (detectedAgent === "yarn@berry")
      args.unshift("--cached");
    else
      args.unshift("--prefer-offline");
  }
  if (agent === "pnpm") {
    args.unshift(
      /**
       * Prevent pnpm from removing installed devDeps while `NODE_ENV` is `production`
       * @see https://pnpm.io/cli/install#--prod--p
       */
      "--prod=false"
    );
    if (existsSync(resolve(options.cwd ?? process2.cwd(), "pnpm-workspace.yaml"))) {
      args.unshift("-w");
    }
  }
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

// src/uninstall.ts
import { existsSync as existsSync2 } from "node:fs";
import process3 from "node:process";
import { resolve as resolve2 } from "node:path";
import { x as x2 } from "tinyexec";
async function uninstallPackage(names, options = {}) {
  const detectedAgent = options.packageManager || await detectPackageManager(options.cwd) || "npm";
  const [agent] = detectedAgent.split("@");
  if (!Array.isArray(names))
    names = [names];
  const args = options.additionalArgs || [];
  if (agent === "pnpm" && existsSync2(resolve2(options.cwd ?? process3.cwd(), "pnpm-workspace.yaml")))
    args.unshift("-w");
  return x2(
    agent,
    [
      agent === "yarn" ? "remove" : "uninstall",
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
  installPackage,
  uninstallPackage
};
