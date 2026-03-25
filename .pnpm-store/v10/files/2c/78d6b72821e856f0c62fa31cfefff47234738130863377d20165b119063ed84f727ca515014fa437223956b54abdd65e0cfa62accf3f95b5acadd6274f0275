#!/usr/bin/env node
import semver from "semver";
import binding from "./bindings";

interface NpmPackageData {
  "dist-tags": {
    latest: string;
    [tag: string]: string;
  };
}

const getLatestVersion = async (packageName: string): Promise<string> => {
  const response = await fetch(`https://registry.npmjs.org/${packageName}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch package data: ${response.statusText}`);
  }
  const data: NpmPackageData = await response.json();
  return data["dist-tags"].latest;
};

const update = async (): Promise<void> => {
  try {
    const installedVersion = process.env.CHROMADB_VERSION || "0.0.0";
    const latestVersion = await getLatestVersion("chromadb");

    if (semver.lt(installedVersion, latestVersion)) {
      console.log(`\nA new chromadb version (${latestVersion}) is available!`);
      console.log("\n\x1b[4mUpdat with npm\x1b[0m");
      console.log("npm install chromadb@latest");

      console.log("\n\x1b[4mUpdat with pnpm\x1b[0m");
      console.log("pnpm add chromadb@latest");

      console.log("\n\x1b[4mUpdat with yarn\x1b[0m");
      console.log("yarn add chromadb@latest");

      console.log("\n\x1b[4mUpdat with bun\x1b[0m");
      console.log("bun add chromadb@latest\n");
    } else {
      console.log(
        `\nYour chromadb version (${latestVersion}) is up-to-date!\n`,
      );
    }
  } catch (error) {
    console.error("Error checking versions:", error);
  }
};

const main = async () => {
  const args: string[] = process.argv.slice(2);
  if (args.length > 0 && args[0] === "update") {
    await update();
    return;
  }

  process.on("SIGINT", () => {
    process.exit(0);
  });

  binding.cli(["chroma", ...args]);
};

main().finally();
