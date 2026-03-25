import { createRequire } from "module";
import os from "os";

const require = createRequire(import.meta.url);
const platform = os.platform();
const arch = os.arch();

let binding: any;

if (platform === "darwin") {
  if (arch === "arm64") {
    binding = require("chromadb-js-bindings-darwin-arm64");
  } else if (arch === "x64") {
    binding = require("chromadb-js-bindings-darwin-x64");
  } else {
    throw new Error(`Unsupported architecture on macOS: ${arch}`);
  }
} else if (platform === "linux") {
  if (arch === "arm64") {
    binding = require("chromadb-js-bindings-linux-arm64-gnu");
  } else if (arch === "x64") {
    binding = require("chromadb-js-bindings-linux-x64-gnu");
  } else {
    throw new Error(`Unsupported architecture on Linux: ${arch}`);
  }
} else if (platform === "win32") {
  if (arch === "arm64") {
    binding = require("chromadb-js-bindings-win32-arm64-msvc");
  } else {
    throw new Error(
      `Unsupported Windows architecture: ${arch}. Only ARM64 is supported.`,
    );
  }
} else {
  throw new Error(`Unsupported platform: ${platform}`);
}

export default binding;
