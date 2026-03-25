import { posix, sep } from 'node:path';
import { dirname } from '@sentry/core';

/** normalizes Windows paths */
function normalizeWindowsPath(path) {
  return path
    .replace(/^[A-Z]:/, '') // remove Windows-style prefix
    .replace(/\\/g, '/'); // replace all `\` instances with `/`
}

/** Creates a function that gets the module name from a filename */
function createGetModuleFromFilename(
  basePath = process.argv[1] ? dirname(process.argv[1]) : process.cwd(),
  isWindows = sep === '\\',
) {
  const normalizedBase = isWindows ? normalizeWindowsPath(basePath) : basePath;

  return (filename) => {
    if (!filename) {
      return;
    }

    const normalizedFilename = isWindows ? normalizeWindowsPath(filename) : filename;

    // eslint-disable-next-line prefer-const
    let { dir, base: file, ext } = posix.parse(normalizedFilename);

    if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
      file = file.slice(0, ext.length * -1);
    }

    // The file name might be URI-encoded which we want to decode to
    // the original file name.
    const decodedFile = decodeURIComponent(file);

    if (!dir) {
      // No dirname whatsoever
      dir = '.';
    }

    const n = dir.lastIndexOf('/node_modules');
    if (n > -1) {
      return `${dir.slice(n + 14).replace(/\//g, '.')}:${decodedFile}`;
    }

    // Let's see if it's a part of the main module
    // To be a part of main module, it has to share the same base
    if (dir.startsWith(normalizedBase)) {
      const moduleName = dir.slice(normalizedBase.length + 1).replace(/\//g, '.');
      return moduleName ? `${moduleName}:${decodedFile}` : decodedFile;
    }

    return decodedFile;
  };
}

export { createGetModuleFromFilename };
//# sourceMappingURL=module.js.map
