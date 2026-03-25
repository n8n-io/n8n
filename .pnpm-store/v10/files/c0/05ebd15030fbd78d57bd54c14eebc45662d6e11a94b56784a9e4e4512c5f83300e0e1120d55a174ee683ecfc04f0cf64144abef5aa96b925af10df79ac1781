import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(fileURLToPath(import.meta.url));

// TODO why use require() here?  I think we can just `import`
/** @type {import('./dist/child-loader')} */
const childLoader = require('./dist/child/child-loader');
export const { resolve, load, getFormat, transformSource } = childLoader;
