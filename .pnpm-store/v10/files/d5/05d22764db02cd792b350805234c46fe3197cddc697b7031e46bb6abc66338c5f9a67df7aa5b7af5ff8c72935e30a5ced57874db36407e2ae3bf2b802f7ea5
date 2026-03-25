import { resolvePath } from 'mlly';
import { S as SUPPORTED_EXTENSIONS } from './shared/c12.cab0c9da.mjs';
import { join } from 'pathe';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import 'node:fs';
import 'node:os';
import 'jiti';
import 'rc9';
import 'defu';
import 'ohash';
import 'pkg-types';
import 'dotenv';

const UPDATABLE_EXTS = [".js", ".ts", ".mjs", ".cjs", ".mts", ".cts"];
async function updateConfig(opts) {
  const { parseModule } = await import('magicast');
  let configFile = await _tryResolve(
    `./${opts.configFile}`,
    opts.cwd,
    SUPPORTED_EXTENSIONS
  ) || await _tryResolve(
    `./.config/${opts.configFile}`,
    opts.cwd,
    SUPPORTED_EXTENSIONS
  );
  let created = false;
  if (!configFile) {
    configFile = join(
      opts.cwd,
      opts.configFile + (opts.createExtension || ".ts")
    );
    const createResult = await opts.onCreate?.({ configFile }) ?? true;
    if (!createResult) {
      throw new Error("Config file creation aborted.");
    }
    const content = typeof createResult === "string" ? createResult : `export default {}
`;
    await mkdir(dirname(configFile), { recursive: true });
    await writeFile(configFile, content, "utf8");
    created = true;
  }
  const ext = extname(configFile);
  if (!UPDATABLE_EXTS.includes(ext)) {
    throw new Error(
      `Unsupported config file extension: ${ext} (${configFile}) (supported: ${UPDATABLE_EXTS.join(", ")})`
    );
  }
  const contents = await readFile(configFile, "utf8");
  const _module = parseModule(contents, opts.magicast);
  const defaultExport = _module.exports.default;
  if (!defaultExport) {
    throw new Error("Default export is missing in the config file!");
  }
  const configObj = defaultExport.$type === "function-call" ? defaultExport.$args[0] : defaultExport;
  await opts.onUpdate?.(configObj);
  await writeFile(configFile, _module.generate().code);
  return {
    configFile,
    created
  };
}
function _tryResolve(path, cwd, exts) {
  return resolvePath(path, {
    url: join(cwd, "_index.js"),
    extensions: exts
  }).catch(() => void 0);
}

export { updateConfig };
