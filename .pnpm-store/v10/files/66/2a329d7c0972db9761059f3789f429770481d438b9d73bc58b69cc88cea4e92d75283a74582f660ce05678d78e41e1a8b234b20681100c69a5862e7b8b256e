import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { babel } from '@rollup/plugin-babel';

export default {
  input: 'index.js',
  plugins: [
    resolve({
      preferBuiltins: true,
      browser: false
    }),
    commonjs(),
    json(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    })
  ],
  output: {
    file: 'dist/index.cjs.js',
    format: 'cjs',
    exports: 'auto'
  }
};
