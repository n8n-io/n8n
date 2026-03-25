'use strict';

const compiler = require('@vue/compiler-sfc');
const detectiveTypeScript = require('detective-typescript');
const detectiveEs6 = require('detective-es6');
const detectiveScss = require('detective-scss');
const detectiveStylus = require('detective-stylus');
const detectiveSass = require('detective-sass');
const detectiveLess = require('@dependents/detective-less');

/**
 * Extracts the dependencies of the supplied Vue module
 */
function detectiveVue(content, options) {
  if (content === undefined) throw new Error('content not given');
  if (typeof content !== 'string') throw new Error('content is not a string');

  const result = compiler.parse(content, { sourceMap: false });
  const { styles, script, scriptSetup } = result.descriptor;

  const dependencies = [];

  for (const usedScript of [script, scriptSetup]) {
    if (usedScript?.content) {
      if (usedScript.attrs?.lang === 'ts') {
        dependencies.push(...detectiveTypeScript(usedScript.content, options));
      } else {
        dependencies.push(...detectiveEs6(usedScript.content, options));
      }
    }
  }

  if (!styles) return dependencies;

  for (const style of styles) {
    switch (style.attrs.lang) {
      case 'scss': {
        dependencies.push(...detectiveScss(style.content, options));

        break;
      }

      case 'stylus': {
        dependencies.push(...detectiveStylus(style.content, options));

        break;
      }

      case 'sass': {
        dependencies.push(...detectiveSass(style.content, options));

        break;
      }

      case 'less': {
        dependencies.push(...detectiveLess(style.content, options));

        break;
      }

      default:
      // css has no deps
    }
  }

  return dependencies;
}

module.exports = detectiveVue;
