import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(fileURLToPath(import.meta.url));

/** @type {import('../dist/esm')} */
const esm = require('../dist/esm');
export const { resolve, load, getFormat, transformSource } =
  esm.registerAndCreateEsmHooks({ transpileOnly: true });
