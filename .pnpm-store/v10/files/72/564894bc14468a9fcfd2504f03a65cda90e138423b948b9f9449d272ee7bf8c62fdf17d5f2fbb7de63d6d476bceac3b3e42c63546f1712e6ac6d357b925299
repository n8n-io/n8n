import pkg from '../package.json';
import handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import cleanup from 'rollup-plugin-cleanup';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';
import {minify} from 'uglify-es';

// Shared config
const output = {
    name: (() => {
      const str = pkg.name.split('/').pop().replace('.js', '');
      return str.charAt(0).toUpperCase() + str.slice(1);
    })(),
    file: pkg.main,
    format: 'umd',
    extend: true,
    banner: handlebars.compile(fs.readFileSync(path.join(
      __dirname, 'templates/copyright.hbs'
    ), 'utf8'))({
      name: pkg.name.split('/').pop(),
      version: `v${pkg.version}`,
      homepage: pkg.homepage,
      author: pkg.author.name,
      license: pkg.license,
      year: (() => {
        const startYear = 2014,
          year = new Date().getFullYear();
        return year > startYear ? `${startYear}–${year}` : year;
      })()
    })
  },
  outputJquery = Object.assign({}, output, {
    file: (() => {
      const spl = pkg.main.split('/');
      spl[spl.length - 1] = `jquery.${spl[spl.length - 1]}`;
      return spl.join('/');
    })(),
    globals: {
      'jquery': 'jQuery'
    }
  }),
  externalJquery = ['jquery'],
  plugins = [
    // for external dependencies (just in case)
    resolve(),
    commonjs(),
    // remove non-license comments
    cleanup({
      comments: /^!/,
      maxEmptyLines: 0
    })
  ],
  pluginsES5 = (() => {
    const newPlugins = plugins.slice();
    newPlugins.push(babel({
      exclude: 'node_modules/**',
      'presets': [
        ['env', {
          'modules': false
        }]
      ],
      'plugins': [
        'external-helpers',
        'transform-object-assign'
      ]
    }));
    return newPlugins;
  })(),
  minifyPlugins = (() => {
    const newPlugins = plugins.slice();
    newPlugins.push(uglify({
      warnings: true,
      output: {
        comments: /^!/
      }
    }, minify));
    return newPlugins;
  })(),
  minifyPluginsES5 = (() => {
    const newPlugins = pluginsES5.slice();
    newPlugins.push(uglify({
      warnings: true,
      output: {
        comments: /^!/
      }
    }, minify));
    return newPlugins;
  })();

// Actual config export
export default [{
  input: 'src/vanilla.js',
  output: Object.assign({}, output, {
    file: output.file.replace('.js', '.es6.js')
  }),
  plugins
}, {
  input: 'src/jquery.js',
  output: Object.assign({}, outputJquery, {
    file: outputJquery.file.replace('.js', '.es6.js')
  }),
  plugins,
  external: externalJquery
}, {
  input: 'src/vanilla.js',
  output,
  plugins: pluginsES5
}, {
  input: 'src/jquery.js',
  output: outputJquery,
  plugins: pluginsES5,
  external: externalJquery
}, {
  input: 'src/vanilla.js',
  output: Object.assign({}, output, {
    file: output.file.replace('.js', '.es6.min.js')
  }),
  plugins: minifyPlugins,
}, {
  input: 'src/jquery.js',
  output: Object.assign({}, outputJquery, {
    file: outputJquery.file.replace('.js', '.es6.min.js')
  }),
  plugins: minifyPlugins,
  external: externalJquery
}, {
  input: 'src/vanilla.js',
  output: Object.assign({}, output, {
    file: output.file.replace('.js', '.min.js')
  }),
  plugins: minifyPluginsES5
}, {
  input: 'src/jquery.js',
  output: Object.assign({}, outputJquery, {
    file: outputJquery.file.replace('.js', '.min.js')
  }),
  plugins: minifyPluginsES5,
  external: externalJquery
}];