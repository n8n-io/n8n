import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2015',
    lib: {
      entry: resolve(__dirname, 'index.js'),
      name: 'psl',
      formats: ['es', 'cjs', 'umd'],
      fileName: format => (
        format === 'umd'
          ? 'psl.umd.cjs'
          : format === 'cjs'
            ? 'psl.cjs'
            : 'psl.mjs'
      ),
    },
  },
});
