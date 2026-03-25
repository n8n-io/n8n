'use strict';

const fs = require('fs');
const path = require('path');
const process = require('process');
const { debuglog } = require('util');
const getModuleType = require('module-definition');
const Walker = require('node-source-walk');
const detectiveAmd = require('detective-amd');
const detectiveCjs = require('detective-cjs');
const detectiveEs6 = require('detective-es6');
const detectiveLess = require('@dependents/detective-less');
const detectivePostcss = require('detective-postcss');
const detectiveSass = require('detective-sass');
const detectiveScss = require('detective-scss');
const detectiveStylus = require('detective-stylus');
const detectiveTypeScript = require('detective-typescript');
const detectiveVue = require('detective-vue2');

const debug = debuglog('precinct');
// eslint-disable-next-line n/no-deprecated-api
const natives = process.binding('natives');

/**
 * Finds the list of dependencies for the given file
 *
 * @param {String|Object} content - File's content or AST
 * @param {Object} [options]
 * @param {String} [options.type] - The type of content being passed in. Useful if you want to use a non-js detective
 * @return {String[]}
 */
function precinct(content, options = {}) {
  debug('options given: %o', options);

  let ast;

  // We assume we're dealing with a JS file
  if (!options.type && typeof content !== 'object') {
    debug('we assume this is JS');
    const walker = new Walker();

    try {
      // Parse once and distribute the AST to all detectives
      ast = walker.parse(content);
      debug('parsed the file content into an ast');
      precinct.ast = ast;
    } catch (error) {
      // In case a previous call had it populated
      precinct.ast = null;
      debug('could not parse content: %s', error.message);
      return [];
    }
  // SASS files shouldn't be parsed by Acorn
  } else {
    ast = content;

    if (typeof content === 'object') {
      precinct.ast = content;
    }
  }

  const type = options.type ?? getModuleType.fromSource(ast);
  debug('module type: %s', type);

  const detective = getDetective(type, options);
  let dependencies = [];

  if (detective) {
    dependencies = detective(ast, options[type]);
  } else {
    debug('no detective found for: %s', type);
  }

  // For non-JS files that we don't parse
  if (detective?.ast) {
    precinct.ast = detective.ast;
  }

  return dependencies;
}

/**
 * Returns the dependencies for the given file path
 *
 * @param {String} filename
 * @param {Object} [options]
 * @param {Boolean} [options.includeCore=true] - Whether or not to include core modules in the dependency list
 * @param {Object} [options.fileSystem=undefined] - An alternative fs implementation to use for reading the file path.
 * @return {String[]}
 */
precinct.paperwork = (filename, options = {}) => {
  options = { includeCore: true, ...options };

  const fileSystem = options.fileSystem || fs;
  const content = fileSystem.readFileSync(filename, 'utf8');
  const ext = path.extname(filename);
  let type;

  if (ext === '.styl') {
    debug('paperwork: converting .styl into the stylus type');
    type = 'stylus';
  } else if (ext === '.cjs') {
    debug('paperwork: converting .cjs into the commonjs type');
    type = 'commonjs';
  // We need to sniff the JS module to find its type, not by extension.
  // Other possible types pass through normally
  } else if (!['.js', '.jsx'].includes(ext)) {
    debug('paperwork: stripping the dot from the extension to serve as the type');
    type = ext.replace('.', '');
  }

  if (type) {
    debug('paperwork: setting the module type');
    options.type = type;
  }

  debug('paperwork: invoking precinct');
  const dependencies = precinct(content, options);

  if (!options.includeCore) {
    return dependencies.filter(dependency => {
      if (dependency.startsWith('node:')) return false;

      // In Node.js 18, node:test is a builtin but shows up under natives["test"],
      // but can only be imported by "node:test." We're correcting this so "test"
      // isn't unnecessarily stripped from the imports
      if (dependency === 'test') {
        debug('paperwork: allowing test import to avoid builtin/natives consideration');
        return true;
      }

      return !natives[dependency];
    });
  }

  debug('paperwork: got these results\n', dependencies);
  return dependencies;
};

function getDetective(type, options) {
  const mixedMode = options.es6?.mixedImports;

  switch (type) {
    case 'cjs':
    case 'commonjs': {
      return mixedMode ? detectiveEs6Cjs : detectiveCjs;
    }

    case 'css': {
      return detectivePostcss;
    }

    case 'amd': {
      return detectiveAmd;
    }

    case 'mjs':
    case 'esm':
    case 'es6': {
      return mixedMode ? detectiveEs6Cjs : detectiveEs6;
    }

    case 'sass': {
      return detectiveSass;
    }

    case 'less': {
      return detectiveLess;
    }

    case 'scss': {
      return detectiveScss;
    }

    case 'stylus': {
      return detectiveStylus;
    }

    case 'ts': {
      return detectiveTypeScript;
    }

    case 'tsx': {
      return detectiveTypeScript.tsx;
    }

    case 'vue': {
      return detectiveVue;
    }

    default:
      // nothing
  }
}

function detectiveEs6Cjs(ast, detectiveOptions) {
  return [
    ...detectiveEs6(ast, detectiveOptions),
    ...detectiveCjs(ast, detectiveOptions)
  ];
}

module.exports = precinct;
