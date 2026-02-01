import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/** @type {import('jest').Config} */
export default require('../../../jest.config');
