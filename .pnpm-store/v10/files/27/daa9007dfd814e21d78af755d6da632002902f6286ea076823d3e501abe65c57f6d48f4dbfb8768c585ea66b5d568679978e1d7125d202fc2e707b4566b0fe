/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const semver = require('semver')
const utils = require('../utils')

/**
 * @typedef {object} SyntaxRule
 * @property {string} supported
 * @property { (context: RuleContext) => TemplateListener } [createTemplateBodyVisitor]
 * @property { (context: RuleContext) => RuleListener } [createScriptVisitor]
 */

const FEATURES = {
  // Vue.js 2.5.0+
  'slot-scope-attribute': require('./syntaxes/slot-scope-attribute'),
  // Vue.js 2.6.0+
  'dynamic-directive-arguments': require('./syntaxes/dynamic-directive-arguments'),
  'v-slot': require('./syntaxes/v-slot'),
  // Vue.js 2.7.0+
  'script-setup': require('./syntaxes/script-setup'),
  'style-css-vars-injection': require('./syntaxes/style-css-vars-injection'),
  // Vue.js 3.0.0+
  'v-model-argument': require('./syntaxes/v-model-argument'),
  'v-model-custom-modifiers': require('./syntaxes/v-model-custom-modifiers'),
  'v-is': require('./syntaxes/v-is'),
  // Vue.js 3.1.0+
  'is-attribute-with-vue-prefix': require('./syntaxes/is-attribute-with-vue-prefix'),
  // Vue.js 3.2.0+
  'v-memo': require('./syntaxes/v-memo'),
  'v-bind-prop-modifier-shorthand': require('./syntaxes/v-bind-prop-modifier-shorthand'),
  'v-bind-attr-modifier': require('./syntaxes/v-bind-attr-modifier'),
  // Vue.js 3.3.0+
  'define-options': require('./syntaxes/define-options'),
  'define-slots': require('./syntaxes/define-slots'),
  // Vue.js 3.4.0+
  'define-model': require('./syntaxes/define-model'),
  'v-bind-same-name-shorthand': require('./syntaxes/v-bind-same-name-shorthand')
}

const SYNTAX_NAMES = /** @type {(keyof FEATURES)[]} */ (Object.keys(FEATURES))

const cache = new Map()
/**
 * Get the `semver.Range` object of a given range text.
 * @param {string} x The text expression for a semver range.
 * @returns {semver.Range} The range object of a given range text.
 * It's null if the `x` is not a valid range text.
 */
function getSemverRange(x) {
  const s = String(x)
  let ret = cache.get(s) || null

  if (!ret) {
    try {
      ret = new semver.Range(s)
    } catch (_error) {
      // Ignore parsing error.
    }
    cache.set(s, ret)
  }

  return ret
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'disallow unsupported Vue.js syntax on the specified version',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-unsupported-features.html'
    },
    // eslint-disable-next-line eslint-plugin/require-meta-fixable -- fixer is not recognized
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          version: {
            type: 'string'
          },
          ignores: {
            type: 'array',
            items: {
              enum: SYNTAX_NAMES
            },
            uniqueItems: true
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      // Vue.js 2.5.0+
      forbiddenSlotScopeAttribute:
        '`slot-scope` are not supported except Vue.js ">=2.5.0 <3.0.0".',
      // Vue.js 2.6.0+
      forbiddenDynamicDirectiveArguments:
        'Dynamic arguments are not supported until Vue.js "2.6.0".',
      forbiddenVSlot: '`v-slot` are not supported until Vue.js "2.6.0".',
      // Vue.js 2.7.0+
      forbiddenScriptSetup:
        '`<script setup>` is not supported until Vue.js "2.7.0".',
      forbiddenStyleCssVarsInjection:
        'SFC CSS variable injection is not supported until Vue.js ">=3.0.3 || >=2.7.0 <3.0.0".',
      // Vue.js 3.0.0+
      forbiddenVModelArgument:
        'Argument on `v-model` is not supported until Vue.js "3.0.0".',
      forbiddenVModelCustomModifiers:
        'Custom modifiers on `v-model` are not supported until Vue.js "3.0.0".',
      forbiddenVIs: '`v-is` are not supported until Vue.js "3.0.0".',
      // Vue.js 3.1.0+
      forbiddenIsAttributeWithVuePrefix:
        '`is="vue:"` are not supported until Vue.js "3.1.0".',
      // Vue.js 3.2.0+
      forbiddenVMemo: '`v-memo` are not supported until Vue.js "3.2.0".',
      forbiddenVBindPropModifierShorthand:
        '`.prop` shorthand are not supported until Vue.js "3.2.0".',
      forbiddenVBindAttrModifier:
        '`.attr` modifiers on `v-bind` are not supported until Vue.js "3.2.0".',
      // Vue.js 3.3.0+
      forbiddenDefineOptions:
        '`defineOptions()` macros are not supported until Vue.js "3.3.0".',
      forbiddenDefineSlots:
        '`defineSlots()` macros are not supported until Vue.js "3.3.0".',
      // Vue.js 3.4.0+
      forbiddenDefineModel:
        '`defineModel()` macros are not supported until Vue.js "3.4.0".',
      forbiddenVBindSameNameShorthand:
        '`v-bind` same-name shorthand is not supported until Vue.js "3.4.0".'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const { version, ignores } = Object.assign(
      {
        version: null,
        ignores: []
      },
      context.options[0] || {}
    )
    if (!version) {
      // version is not set.
      return {}
    }
    const versionRange = getSemverRange(version)

    /**
     * Check whether a given case object is full-supported on the configured node version.
     * @param {SyntaxRule} aCase The case object to check.
     * @returns {boolean} `true` if it's supporting.
     */
    function isNotSupportingVersion(aCase) {
      return !semver.subset(versionRange, getSemverRange(aCase.supported))
    }

    /** @type {TemplateListener} */
    let templateBodyVisitor = {}
    /** @type {RuleListener} */
    let scriptVisitor = {}

    for (const syntaxName of SYNTAX_NAMES) {
      /** @type {SyntaxRule} */
      const syntax = FEATURES[syntaxName]
      if (ignores.includes(syntaxName) || !isNotSupportingVersion(syntax)) {
        continue
      }
      if (syntax.createTemplateBodyVisitor) {
        const visitor = syntax.createTemplateBodyVisitor(context)
        templateBodyVisitor = utils.compositingVisitors(
          templateBodyVisitor,
          visitor
        )
      }
      if (syntax.createScriptVisitor) {
        const visitor = syntax.createScriptVisitor(context)
        scriptVisitor = utils.compositingVisitors(scriptVisitor, visitor)
      }
    }

    return utils.defineTemplateBodyVisitor(
      context,
      templateBodyVisitor,
      scriptVisitor
    )
  }
}
