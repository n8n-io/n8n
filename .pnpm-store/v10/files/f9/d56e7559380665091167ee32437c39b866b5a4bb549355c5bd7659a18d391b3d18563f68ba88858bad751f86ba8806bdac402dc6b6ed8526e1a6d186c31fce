/**
 * @fileoverview Disallow use other than available `lang`
 * @author Yosuke Ota
 */
'use strict'
const utils = require('../utils')

/**
 * @typedef {object} BlockOptions
 * @property {Set<string>} lang
 * @property {boolean} allowNoLang
 */
/**
 * @typedef { { [element: string]: BlockOptions | undefined } } Options
 */
/**
 * @typedef {object} UserBlockOptions
 * @property {string[] | string} [lang]
 * @property {boolean} [allowNoLang]
 */
/**
 * @typedef { { [element: string]: UserBlockOptions | undefined } } UserOptions
 */

/**
 * https://vuejs.github.io/vetur/guide/highlighting.html
 * <template lang="html"></template>
 * <style lang="css"></style>
 * <script lang="js"></script>
 * <script lang="javascript"></script>
 * @type {Record<string, string[] | undefined>}
 */
const DEFAULT_LANGUAGES = {
  template: ['html'],
  style: ['css'],
  script: ['js', 'javascript']
}

/**
 * @param {NonNullable<BlockOptions['lang']>} lang
 */
function getAllowsLangPhrase(lang) {
  const langs = [...lang].map((s) => `"${s}"`)
  switch (langs.length) {
    case 1: {
      return langs[0]
    }
    default: {
      return `${langs.slice(0, -1).join(', ')}, and ${langs[langs.length - 1]}`
    }
  }
}

/**
 * Normalizes a given option.
 * @param {string} blockName The block name.
 * @param {UserBlockOptions} option An option to parse.
 * @returns {BlockOptions} Normalized option.
 */
function normalizeOption(blockName, option) {
  /** @type {Set<string>} */
  let lang

  if (Array.isArray(option.lang)) {
    lang = new Set(option.lang)
  } else if (typeof option.lang === 'string') {
    lang = new Set([option.lang])
  } else {
    lang = new Set()
  }

  let hasDefault = false
  for (const def of DEFAULT_LANGUAGES[blockName] || []) {
    if (lang.has(def)) {
      lang.delete(def)
      hasDefault = true
    }
  }
  if (lang.size === 0) {
    return {
      lang,
      allowNoLang: true
    }
  }
  return {
    lang,
    allowNoLang: hasDefault || Boolean(option.allowNoLang)
  }
}
/**
 * Normalizes a given options.
 * @param { UserOptions } options An option to parse.
 * @returns {Options} Normalized option.
 */
function normalizeOptions(options) {
  if (!options) {
    return {}
  }

  /** @type {Options} */
  const normalized = {}

  for (const blockName of Object.keys(options)) {
    const value = options[blockName]
    if (value) {
      normalized[blockName] = normalizeOption(blockName, value)
    }
  }

  return normalized
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow use other than available `lang`',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/block-lang.html'
    },
    schema: [
      {
        type: 'object',
        patternProperties: {
          '^(?:\\S+)$': {
            oneOf: [
              {
                type: 'object',
                properties: {
                  lang: {
                    oneOf: [
                      { type: 'string' },
                      {
                        type: 'array',
                        items: {
                          type: 'string'
                        },
                        uniqueItems: true,
                        additionalItems: false
                      }
                    ]
                  },
                  allowNoLang: { type: 'boolean' }
                },
                additionalProperties: false
              }
            ]
          }
        },
        minProperties: 1,
        additionalProperties: false
      }
    ],
    messages: {
      expected:
        "Only {{allows}} can be used for the 'lang' attribute of '<{{tag}}>'.",
      missing: "The 'lang' attribute of '<{{tag}}>' is missing.",
      unexpected: "Do not specify the 'lang' attribute of '<{{tag}}>'.",
      useOrNot:
        "Only {{allows}} can be used for the 'lang' attribute of '<{{tag}}>'. Or, not specifying the `lang` attribute is allowed.",
      unexpectedDefault:
        "Do not explicitly specify the default language for the 'lang' attribute of '<{{tag}}>'."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = normalizeOptions(
      context.options[0] || {
        script: { allowNoLang: true },
        template: { allowNoLang: true },
        style: { allowNoLang: true }
      }
    )
    if (Object.keys(options).length === 0) {
      return {}
    }

    /**
     * @param {VElement} element
     * @returns {void}
     */
    function verify(element) {
      const tag = element.name
      const option = options[tag]
      if (!option) {
        return
      }
      const lang = utils.getAttribute(element, 'lang')
      if (lang == null || lang.value == null) {
        if (!option.allowNoLang) {
          context.report({
            node: element.startTag,
            messageId: 'missing',
            data: {
              tag
            }
          })
        }
        return
      }
      if (!option.lang.has(lang.value.value)) {
        let messageId
        if (!option.allowNoLang) {
          messageId = 'expected'
        } else if (option.lang.size === 0) {
          messageId = (DEFAULT_LANGUAGES[tag] || []).includes(lang.value.value)
            ? 'unexpectedDefault'
            : 'unexpected'
        } else {
          messageId = 'useOrNot'
        }
        context.report({
          node: lang,
          messageId,
          data: {
            tag,
            allows: getAllowsLangPhrase(option.lang)
          }
        })
      }
    }

    return utils.defineDocumentVisitor(context, {
      'VDocumentFragment > VElement': verify
    })
  }
}
