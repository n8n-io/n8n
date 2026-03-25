/**
 * @author ItMaga <https://github.com/ItMaga>
 * See LICENSE file in root directory for full license.
 */
'use strict'

/**
 * @typedef {import('../utils').ComponentProp} ComponentProp
 * @typedef {import('../utils').ComponentEmit} ComponentEmit
 * @typedef {import('../utils').GroupName} GroupName
 */

const utils = require('../utils')
const { isCommentToken } = require('@eslint-community/eslint-utils')

const AvailablePaddingOptions = {
  Never: 'never',
  Always: 'always',
  Ignore: 'ignore'
}
const OptionKeys = {
  BetweenOptions: 'betweenOptions',
  WithinOption: 'withinOption',
  BetweenItems: 'betweenItems',
  WithinEach: 'withinEach',
  GroupSingleLineProperties: 'groupSingleLineProperties'
}

/**
 * @param {Token} node
 */
function isComma(node) {
  return node.type === 'Punctuator' && node.value === ','
}

/**
 * @typedef {Exclude<ComponentProp | ComponentEmit, {type:'infer-type'}> & { node: {type: 'Property' | 'SpreadElement'} }} ValidComponentPropOrEmit
 */
/**
 * @template {ComponentProp | ComponentEmit} T
 * @param {T} propOrEmit
 * @returns {propOrEmit is ValidComponentPropOrEmit & T}
 */
function isValidProperties(propOrEmit) {
  return Boolean(
    propOrEmit.type !== 'infer-type' &&
      propOrEmit.node &&
      ['Property', 'SpreadElement'].includes(propOrEmit.node.type)
  )
}

/**
 * Split the source code into multiple lines based on the line delimiters.
 * @param {string} text Source code as a string.
 * @returns {string[]} Array of source code lines.
 */
function splitLines(text) {
  return text.split(/\r\n|[\r\n\u2028\u2029]/gu)
}

/**
 * @param {any} initialOption
 * @param {string} optionKey
 * @private
 * */
function parseOption(initialOption, optionKey) {
  return typeof initialOption === 'string'
    ? initialOption
    : initialOption[optionKey]
}

/**
 * @param {any} initialOption
 * @param {string} optionKey
 * @private
 * */
function parseBooleanOption(initialOption, optionKey) {
  if (typeof initialOption === 'string') {
    if (initialOption === AvailablePaddingOptions.Always) return true
    if (initialOption === AvailablePaddingOptions.Never) return false
  }
  return initialOption[optionKey]
}

/**
 * @param {(Property | SpreadElement)} currentProperty
 * @param {(Property | SpreadElement)} nextProperty
 * @param {boolean} option
 * @returns {boolean}
 * @private
 * */
function needGroupSingleLineProperties(currentProperty, nextProperty, option) {
  const isSingleCurrentProperty =
    currentProperty.loc.start.line === currentProperty.loc.end.line
  const isSingleNextProperty =
    nextProperty.loc.start.line === nextProperty.loc.end.line

  return isSingleCurrentProperty && isSingleNextProperty && option
}

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description: 'require or disallow padding lines in component definition',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/padding-lines-in-component-definition.html'
    },
    fixable: 'whitespace',
    schema: [
      {
        oneOf: [
          {
            enum: [
              AvailablePaddingOptions.Always,
              AvailablePaddingOptions.Never
            ]
          },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              [OptionKeys.BetweenOptions]: {
                enum: Object.values(AvailablePaddingOptions)
              },
              [OptionKeys.WithinOption]: {
                oneOf: [
                  {
                    enum: Object.values(AvailablePaddingOptions)
                  },
                  {
                    type: 'object',
                    patternProperties: {
                      '^[a-zA-Z]*$': {
                        oneOf: [
                          {
                            enum: Object.values(AvailablePaddingOptions)
                          },
                          {
                            type: 'object',
                            properties: {
                              [OptionKeys.BetweenItems]: {
                                enum: Object.values(AvailablePaddingOptions)
                              },
                              [OptionKeys.WithinEach]: {
                                enum: Object.values(AvailablePaddingOptions)
                              }
                            },
                            additionalProperties: false
                          }
                        ]
                      }
                    },
                    minProperties: 1,
                    additionalProperties: false
                  }
                ]
              },
              [OptionKeys.GroupSingleLineProperties]: {
                type: 'boolean'
              }
            }
          }
        ]
      }
    ],
    messages: {
      never: 'Unexpected blank line before this definition.',
      always: 'Expected blank line before this definition.',
      groupSingleLineProperties:
        'Unexpected blank line between single line properties.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0] || AvailablePaddingOptions.Always
    const sourceCode = context.getSourceCode()

    /**
     * @param {(Property | SpreadElement)} currentProperty
     * @param {(Property | SpreadElement | Token)} nextProperty
     * @param {RuleFixer} fixer
     * */
    function replaceLines(currentProperty, nextProperty, fixer) {
      const commaToken = sourceCode.getTokenAfter(currentProperty, isComma)

      const start = commaToken ? commaToken.range[1] : currentProperty.range[1]
      const end = nextProperty.range[0]

      const paddingText = sourceCode.text.slice(start, end)
      const newText = `\n${splitLines(paddingText).pop()}`

      return fixer.replaceTextRange([start, end], newText)
    }

    /**
     * @param {(Property | SpreadElement)} currentProperty
     * @param {(Property | SpreadElement | Token)} nextProperty
     * @param {RuleFixer} fixer
     * @param {number} betweenLinesRange
     * */
    function insertLines(
      currentProperty,
      nextProperty,
      fixer,
      betweenLinesRange
    ) {
      const commaToken = sourceCode.getTokenAfter(currentProperty, isComma)

      const lineBeforeNextProperty =
        sourceCode.lines[nextProperty.loc.start.line - 1]
      const lastSpaces = /** @type {RegExpExecArray} */ (
        /^\s*/.exec(lineBeforeNextProperty)
      )[0]

      const newText = betweenLinesRange === 0 ? `\n\n${lastSpaces}` : '\n'
      return fixer.insertTextAfter(commaToken || currentProperty, newText)
    }

    /**
     * @param {(Property | SpreadElement)[]} properties
     * @param {any} option
     * @param {any} nextOption
     * */
    function verify(properties, option, nextOption) {
      const groupSingleLineProperties = parseBooleanOption(
        options,
        OptionKeys.GroupSingleLineProperties
      )

      for (const [i, currentProperty] of properties.entries()) {
        const nextProperty = properties[i + 1]

        if (nextProperty && option !== AvailablePaddingOptions.Ignore) {
          const tokenBeforeNext = sourceCode.getTokenBefore(nextProperty, {
            includeComments: true
          })
          const isCommentBefore = isCommentToken(tokenBeforeNext)
          const reportNode = isCommentBefore ? tokenBeforeNext : nextProperty

          const betweenLinesRange =
            reportNode.loc.start.line - currentProperty.loc.end.line

          if (
            needGroupSingleLineProperties(
              currentProperty,
              nextProperty,
              groupSingleLineProperties
            )
          ) {
            if (betweenLinesRange > 1) {
              context.report({
                node: reportNode,
                messageId: 'groupSingleLineProperties',
                loc: reportNode.loc,
                fix(fixer) {
                  return replaceLines(currentProperty, reportNode, fixer)
                }
              })
            }
            continue
          }

          if (
            betweenLinesRange <= 1 &&
            option === AvailablePaddingOptions.Always
          ) {
            context.report({
              node: reportNode,
              messageId: 'always',
              loc: reportNode.loc,
              fix(fixer) {
                return insertLines(
                  currentProperty,
                  reportNode,
                  fixer,
                  betweenLinesRange
                )
              }
            })
          } else if (
            betweenLinesRange > 1 &&
            option === AvailablePaddingOptions.Never
          ) {
            context.report({
              node: reportNode,
              messageId: 'never',
              loc: reportNode.loc,
              fix(fixer) {
                return replaceLines(currentProperty, reportNode, fixer)
              }
            })
          }
        }

        if (!nextOption) return

        const name = /** @type {GroupName | null} */ (
          currentProperty.type === 'Property' &&
            utils.getStaticPropertyName(currentProperty)
        )
        if (!name) continue

        const propertyOption = parseOption(nextOption, name)
        if (!propertyOption) continue

        const nestedProperties =
          currentProperty.type === 'Property' &&
          currentProperty.value.type === 'ObjectExpression' &&
          currentProperty.value.properties
        if (!nestedProperties) continue

        verify(
          nestedProperties,
          parseOption(propertyOption, OptionKeys.BetweenItems),
          parseOption(propertyOption, OptionKeys.WithinEach)
        )
      }
    }

    return utils.compositingVisitors(
      utils.defineVueVisitor(context, {
        onVueObjectEnter(node) {
          verify(
            node.properties,
            parseOption(options, OptionKeys.BetweenOptions),
            parseOption(options, OptionKeys.WithinOption)
          )
        }
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(_, props) {
          const propNodes = props
            .filter(isValidProperties)
            .map((prop) => prop.node)

          const withinOption = parseOption(options, OptionKeys.WithinOption)
          const propsOption = withinOption && parseOption(withinOption, 'props')
          if (!propsOption) return

          verify(
            propNodes,
            parseOption(propsOption, OptionKeys.BetweenItems),
            parseOption(propsOption, OptionKeys.WithinEach)
          )
        },
        onDefineEmitsEnter(_, emits) {
          const emitNodes = emits
            .filter(isValidProperties)
            .map((emit) => emit.node)

          const withinOption = parseOption(options, OptionKeys.WithinOption)
          const emitsOption = withinOption && parseOption(withinOption, 'emits')
          if (!emitsOption) return

          verify(
            emitNodes,
            parseOption(emitsOption, OptionKeys.BetweenItems),
            parseOption(emitsOption, OptionKeys.WithinEach)
          )
        },
        onDefineOptionsEnter(node) {
          if (node.arguments.length === 0) return
          const define = node.arguments[0]
          if (define.type !== 'ObjectExpression') return
          verify(
            define.properties,
            parseOption(options, OptionKeys.BetweenOptions),
            parseOption(options, OptionKeys.WithinOption)
          )
        }
      })
    )
  }
}
