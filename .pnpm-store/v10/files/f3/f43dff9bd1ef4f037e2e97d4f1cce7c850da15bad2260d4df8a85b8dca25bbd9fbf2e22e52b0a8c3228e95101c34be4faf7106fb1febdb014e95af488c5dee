/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const { getScope } = require('./scope')

/**
 * @typedef {import('eslint').Rule.RuleModule} RuleModule
 * @typedef {import('estree').Position} Position
 * @typedef {import('eslint').Rule.CodePath} CodePath
 * @typedef {import('eslint').Rule.CodePathSegment} CodePathSegment
 */
/**
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentArrayProp} ComponentArrayProp
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentObjectProp} ComponentObjectProp
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentTypeProp} ComponentTypeProp
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentInferTypeProp} ComponentInferTypeProp
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentUnknownProp} ComponentUnknownProp
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentProp} ComponentProp
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentArrayEmit} ComponentArrayEmit
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentObjectEmit} ComponentObjectEmit
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentTypeEmit} ComponentTypeEmit
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentInferTypeEmit} ComponentInferTypeEmit
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentUnknownEmit} ComponentUnknownEmit
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentEmit} ComponentEmit
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentTypeSlot} ComponentTypeSlot
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentInferTypeSlot} ComponentInferTypeSlot
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentUnknownSlot} ComponentUnknownSlot
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentSlot} ComponentSlot
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentModelName} ComponentModelName
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentModel} ComponentModel
 */
/**
 * @typedef { {key: string | null, value: BlockStatement | null} } ComponentComputedProperty
 */
/**
 * @typedef { 'props' | 'asyncData' | 'data' | 'computed' | 'setup' | 'watch' | 'methods' | 'provide' | 'inject' | 'expose' } GroupName
 * @typedef { { type: 'array',  name: string, groupName: GroupName, node: Literal | TemplateLiteral } } ComponentArrayPropertyData
 * @typedef { { type: 'object', name: string, groupName: GroupName, node: Identifier | Literal | TemplateLiteral, property: Property } } ComponentObjectPropertyData
 * @typedef { ComponentArrayPropertyData | ComponentObjectPropertyData } ComponentPropertyData
 */
/**
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').VueObjectType} VueObjectType
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').VueObjectData} VueObjectData
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').VueVisitor} VueVisitor
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ScriptSetupVisitor} ScriptSetupVisitor
 */

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

const HTML_ELEMENT_NAMES = new Set(require('./html-elements.json'))
const SVG_ELEMENT_NAMES = new Set(require('./svg-elements.json'))
const MATH_ELEMENT_NAMES = new Set(require('./math-elements.json'))
const VOID_ELEMENT_NAMES = new Set(require('./void-elements.json'))
const VUE2_BUILTIN_COMPONENT_NAMES = new Set(
  require('./vue2-builtin-components')
)
const VUE3_BUILTIN_COMPONENT_NAMES = new Set(
  require('./vue3-builtin-components')
)
const VUE_BUILTIN_ELEMENT_NAMES = new Set(require('./vue-builtin-elements'))
const path = require('path')
const vueEslintParser = require('vue-eslint-parser')
const { traverseNodes, getFallbackKeys, NS } = vueEslintParser.AST
const {
  findVariable,
  ReferenceTracker
} = require('@eslint-community/eslint-utils')
const {
  getComponentPropsFromTypeDefine,
  getComponentEmitsFromTypeDefine,
  getComponentSlotsFromTypeDefine,
  isTypeNode
} = require('./ts-utils')

/**
 * @type { WeakMap<RuleContext, Token[]> }
 */
const componentComments = new WeakMap()

/** @type { Map<string, RuleModule> | null } */
let coreRuleMap = null
/** @type { Map<string, RuleModule> } */
const stylisticRuleMap = new Map()
/**
 * Get the core rule implementation from the rule name
 * @param {string} name
 * @returns {RuleModule | null}
 */
function getCoreRule(name) {
  const eslint = require('eslint')
  try {
    const map = coreRuleMap || (coreRuleMap = new eslint.Linter().getRules())
    return map.get(name) || null
  } catch {
    // getRules() is no longer available in flat config.
  }

  const { builtinRules } = require('eslint/use-at-your-own-risk')
  return /** @type {any} */ (builtinRules.get(name) || null)
}
/**
 * Get ESLint Stylistic rule implementation from the rule name
 * @param {string} name
 * @param {'@stylistic/eslint-plugin' | '@stylistic/eslint-plugin-ts' | '@stylistic/eslint-plugin-js'} [preferModule]
 * @returns {RuleModule | null}
 */
function getStylisticRule(name, preferModule) {
  if (!preferModule) {
    const cached = stylisticRuleMap.get(name)
    if (cached) {
      return cached
    }
  }
  const stylisticPluginNames = [
    '@stylistic/eslint-plugin',
    '@stylistic/eslint-plugin-ts',
    '@stylistic/eslint-plugin-js'
  ]
  if (preferModule) {
    stylisticPluginNames.unshift(preferModule)
  }
  for (const stylisticPluginName of stylisticPluginNames) {
    try {
      const plugin = createRequire(`${process.cwd()}/__placeholder__.js`)(
        stylisticPluginName
      )
      const rule = plugin?.rules?.[name]
      if (!preferModule) stylisticRuleMap.set(name, rule)
      return rule
    } catch {
      // ignore
    }
  }
  return null
}

/**
 * @template {object} T
 * @param {T} target
 * @param {Partial<T>[]} propsArray
 * @returns {T}
 */
function newProxy(target, ...propsArray) {
  const result = new Proxy(
    {},
    {
      get(_object, key) {
        for (const props of propsArray) {
          if (key in props) {
            // @ts-expect-error
            return props[key]
          }
        }
        // @ts-expect-error
        return target[key]
      },

      has(_object, key) {
        return key in target
      },
      ownKeys(_object) {
        return Reflect.ownKeys(target)
      },
      getPrototypeOf(_object) {
        return Reflect.getPrototypeOf(target)
      }
    }
  )
  return /** @type {T} */ (result)
}

/**
 * Wrap the rule context object to override methods which access to tokens (such as getTokenAfter).
 * @param {RuleContext} context The rule context object.
 * @param {ParserServices.TokenStore} tokenStore The token store object for template.
 * @param {Object} options The option of this rule.
 * @param {boolean} [options.applyDocument] If `true`, apply check to document fragment.
 * @returns {RuleContext}
 */
function wrapContextToOverrideTokenMethods(context, tokenStore, options) {
  const eslintSourceCode = context.getSourceCode()
  const rootNode = options.applyDocument
    ? eslintSourceCode.parserServices.getDocumentFragment &&
      eslintSourceCode.parserServices.getDocumentFragment()
    : eslintSourceCode.ast.templateBody
  /** @type {Token[] | null} */
  let tokensAndComments = null
  function getTokensAndComments() {
    if (tokensAndComments) {
      return tokensAndComments
    }
    tokensAndComments = rootNode
      ? tokenStore.getTokens(rootNode, {
          includeComments: true
        })
      : []
    return tokensAndComments
  }

  /** @param {number} index */
  function getNodeByRangeIndex(index) {
    if (!rootNode) {
      return eslintSourceCode.ast
    }

    /** @type {ASTNode} */
    let result = eslintSourceCode.ast
    /** @type {ASTNode[]} */
    const skipNodes = []
    let breakFlag = false

    traverseNodes(rootNode, {
      enterNode(node, parent) {
        if (breakFlag) {
          return
        }
        if (skipNodes[0] === parent) {
          skipNodes.unshift(node)
          return
        }
        if (node.range[0] <= index && index < node.range[1]) {
          result = node
        } else {
          skipNodes.unshift(node)
        }
      },
      leaveNode(node) {
        if (breakFlag) {
          return
        }
        if (result === node) {
          breakFlag = true
        } else if (skipNodes[0] === node) {
          skipNodes.shift()
        }
      }
    })
    return result
  }
  const sourceCode = newProxy(
    eslintSourceCode,
    {
      get tokensAndComments() {
        return getTokensAndComments()
      },
      getNodeByRangeIndex,
      // @ts-expect-error -- Added in ESLint v8.38.0
      getDeclaredVariables
    },
    tokenStore
  )

  /** @type {WeakMap<ASTNode, import('eslint').Scope.ScopeManager>} */
  const containerScopes = new WeakMap()

  /**
   * @param {ASTNode} node
   * @returns {import('eslint').Scope.ScopeManager|null}
   */
  function getContainerScope(node) {
    const exprContainer = getVExpressionContainer(node)
    if (!exprContainer) {
      return null
    }
    const cache = containerScopes.get(exprContainer)
    if (cache) {
      return cache
    }
    const programNode = eslintSourceCode.ast
    const parserOptions =
      context.languageOptions?.parserOptions ?? context.parserOptions ?? {}
    const ecmaFeatures = parserOptions.ecmaFeatures || {}
    const ecmaVersion =
      context.languageOptions?.ecmaVersion ?? parserOptions.ecmaVersion ?? 2020
    const sourceType = programNode.sourceType
    try {
      const eslintScope = createRequire(require.resolve('eslint'))(
        'eslint-scope'
      )
      const expStmt = newProxy(exprContainer, {
        // @ts-expect-error
        type: 'ExpressionStatement'
      })
      const scopeProgram = newProxy(programNode, {
        // @ts-expect-error
        body: [expStmt]
      })
      const scope = eslintScope.analyze(scopeProgram, {
        ignoreEval: true,
        nodejsScope: false,
        impliedStrict: ecmaFeatures.impliedStrict,
        ecmaVersion,
        sourceType,
        fallback: getFallbackKeys
      })
      containerScopes.set(exprContainer, scope)
      return scope
    } catch (error) {
      // ignore
      // console.log(error)
    }

    return null
  }
  return newProxy(context, {
    getSourceCode() {
      return sourceCode
    },
    get sourceCode() {
      return sourceCode
    },
    getDeclaredVariables
  })

  /**
   * @param {ESNode} node
   * @returns {Variable[]}
   */
  function getDeclaredVariables(node) {
    const scope = getContainerScope(node)
    return (
      scope?.getDeclaredVariables?.(node) ??
      context.getDeclaredVariables?.(node) ??
      []
    )
  }
}

/**
 * Wrap the rule context object to override report method to skip the dynamic argument.
 * @param {RuleContext} context The rule context object.
 * @returns {RuleContext}
 */
function wrapContextToOverrideReportMethodToSkipDynamicArgument(context) {
  const sourceCode = context.getSourceCode()
  const templateBody = sourceCode.ast.templateBody
  if (!templateBody) {
    return context
  }
  /** @type {Range[]} */
  const directiveKeyRanges = []
  traverseNodes(templateBody, {
    enterNode(node, parent) {
      if (
        parent &&
        parent.type === 'VDirectiveKey' &&
        node.type === 'VExpressionContainer'
      ) {
        directiveKeyRanges.push(node.range)
      }
    },
    leaveNode() {}
  })

  return newProxy(context, {
    report(descriptor, ...args) {
      let range = null
      if (descriptor.loc) {
        const startLoc = descriptor.loc.start || descriptor.loc
        const endLoc = descriptor.loc.end || startLoc
        range = [
          sourceCode.getIndexFromLoc(startLoc),
          sourceCode.getIndexFromLoc(endLoc)
        ]
      } else if (descriptor.node) {
        range = descriptor.node.range
      }
      if (range) {
        for (const directiveKeyRange of directiveKeyRanges) {
          if (
            range[0] < directiveKeyRange[1] &&
            directiveKeyRange[0] < range[1]
          ) {
            return
          }
        }
      }
      context.report(descriptor, ...args)
    }
  })
}

/**
 * @callback WrapRuleCreate
 * @param {RuleContext} ruleContext
 * @param {WrapRuleCreateContext} wrapContext
 * @returns {TemplateListener}
 *
 * @typedef {object} WrapRuleCreateContext
 * @property {RuleListener} baseHandlers
 */
/**
 * @callback WrapRulePreprocess
 * @param {RuleContext} ruleContext
 * @param {WrapRulePreprocessContext} wrapContext
 * @returns {void}
 *
 * @typedef {object} WrapRulePreprocessContext
 * @property { (override: Partial<RuleContext>) => RuleContext } wrapContextToOverrideProperties Wrap the rule context object to override
 * @property { (visitor: TemplateListener) => void } defineVisitor Define template body visitor
 */
/**
 * @typedef {object} WrapRuleOptions
 * @property {string[]} [categories] The categories of this rule.
 * @property {boolean} [skipDynamicArguments] If `true`, skip validation within dynamic arguments.
 * @property {boolean} [skipDynamicArgumentsReport] If `true`, skip report within dynamic arguments.
 * @property {boolean} [applyDocument] If `true`, apply check to document fragment.
 * @property {boolean} [skipBaseHandlers] If `true`, skip base rule handlers.
 * @property {WrapRulePreprocess} [preprocess] Preprocess to calling create of base rule.
 * @property {WrapRuleCreate} [create] If define, extend base rule.
 */
/**
 * Wrap a given core rule to apply it to Vue.js template.
 * @param {string} coreRuleName The name of the core rule implementation to wrap.
 * @param {WrapRuleOptions} [options] The option of this rule.
 * @returns {RuleModule} The wrapped rule implementation.
 */
function wrapCoreRule(coreRuleName, options) {
  const coreRule = getCoreRule(coreRuleName)
  if (!coreRule) {
    return {
      meta: {
        type: 'problem',
        docs: {
          url: `https://eslint.vuejs.org/rules/${coreRuleName}.html`
        }
      },
      create(context) {
        return defineTemplateBodyVisitor(context, {
          "VElement[name='template'][parent.type='VDocumentFragment']"(node) {
            context.report({
              node,
              message: `Failed to extend ESLint core rule "${coreRuleName}". You may be able to use this rule by upgrading the version of ESLint. If you cannot upgrade it, turn off this rule.`
            })
          }
        })
      }
    }
  }
  const rule = wrapRuleModule(coreRule, coreRuleName, options)
  const meta = {
    ...rule.meta,
    docs: {
      ...rule.meta.docs,
      extensionSource: {
        url: coreRule.meta.docs.url,
        name: 'ESLint core'
      }
    }
  }
  return {
    ...rule,
    meta
  }
}
/**
 * @typedef {object} RuleNames
 * @property {string} core The name of the core rule implementation to wrap.
 * @property {string} stylistic The name of ESLint Stylistic rule implementation to wrap.
 * @property {string} vue The name of the wrapped rule
 */
/**
 * Wrap a core rule or ESLint Stylistic rule to apply it to Vue.js template.
 * @param {RuleNames|string} ruleNames The names of the rule implementation to wrap.
 * @param {WrapRuleOptions} [options] The option of this rule.
 * @returns {RuleModule} The wrapped rule implementation.
 */
function wrapStylisticOrCoreRule(ruleNames, options) {
  const stylisticRuleName =
    typeof ruleNames === 'string' ? ruleNames : ruleNames.stylistic
  const coreRuleName =
    typeof ruleNames === 'string' ? ruleNames : ruleNames.core
  const vueRuleName = typeof ruleNames === 'string' ? ruleNames : ruleNames.vue
  const stylisticRule = getStylisticRule(stylisticRuleName)
  const baseRule = stylisticRule || getCoreRule(coreRuleName)
  if (!baseRule) {
    return {
      meta: {
        type: 'problem',
        docs: {
          url: `https://eslint.vuejs.org/rules/${vueRuleName}.html`
        }
      },
      create(context) {
        return defineTemplateBodyVisitor(context, {
          "VElement[name='template'][parent.type='VDocumentFragment']"(node) {
            context.report({
              node,
              message: `Failed to extend ESLint Stylistic rule "${stylisticRule}". You may be able to use this rule by installing ESLint Stylistic plugin (https://eslint.style/). If you cannot install it, turn off this rule.`
            })
          }
        })
      }
    }
  }
  const rule = wrapRuleModule(baseRule, vueRuleName, options)
  const jsRule = getStylisticRule(
    stylisticRuleName,
    '@stylistic/eslint-plugin-js'
  )
  const description = stylisticRule
    ? `${jsRule?.meta.docs.description} in \`<template>\``
    : rule.meta.docs.description
  const meta = {
    ...rule.meta,
    docs: {
      ...rule.meta.docs,
      description,
      extensionSource: {
        url: baseRule.meta.docs.url,
        name: stylisticRule ? 'ESLint Stylistic' : 'ESLint core'
      }
    },
    deprecated: undefined,
    replacedBy: undefined
  }
  return {
    ...rule,
    meta
  }
}
/**
 * Wrap a given rule to apply it to Vue.js template.
 * @param {RuleModule} baseRule The rule implementation to wrap.
 * @param {string} ruleName The name of the wrapped rule.
 * @param {WrapRuleOptions} [options] The option of this rule.
 * @returns {RuleModule} The wrapped rule implementation.
 */
function wrapRuleModule(baseRule, ruleName, options) {
  let description = baseRule.meta.docs.description
  if (description) {
    description += ' in `<template>`'
  }

  const {
    categories,
    skipDynamicArguments,
    skipDynamicArgumentsReport,
    skipBaseHandlers,
    applyDocument,
    preprocess,
    create
  } = options || {}
  return {
    create(context) {
      const sourceCode = context.getSourceCode()
      const tokenStore =
        sourceCode.parserServices.getTemplateBodyTokenStore &&
        sourceCode.parserServices.getTemplateBodyTokenStore()

      // The `context.getSourceCode()` cannot access the tokens of templates.
      // So override the methods which access to tokens by the `tokenStore`.
      if (tokenStore) {
        context = wrapContextToOverrideTokenMethods(context, tokenStore, {
          applyDocument
        })
      }

      if (skipDynamicArgumentsReport) {
        context =
          wrapContextToOverrideReportMethodToSkipDynamicArgument(context)
      }

      /** @type {TemplateListener} */
      const handlers = {}

      if (preprocess) {
        preprocess(context, {
          wrapContextToOverrideProperties(override) {
            context = newProxy(context, override)
            return context
          },
          defineVisitor(visitor) {
            compositingVisitors(handlers, visitor)
          }
        })
      }

      const baseHandlers = baseRule.create(context)
      if (!skipBaseHandlers) {
        compositingVisitors(handlers, baseHandlers)
      }

      // Move `Program` handlers to `VElement[parent.type!='VElement']`
      if (handlers.Program) {
        handlers[
          applyDocument
            ? 'VDocumentFragment'
            : "VElement[parent.type!='VElement']"
        ] = /** @type {any} */ (handlers.Program)
        delete handlers.Program
      }
      if (handlers['Program:exit']) {
        handlers[
          applyDocument
            ? 'VDocumentFragment:exit'
            : "VElement[parent.type!='VElement']:exit"
        ] = /** @type {any} */ (handlers['Program:exit'])
        delete handlers['Program:exit']
      }

      if (skipDynamicArguments) {
        let withinDynamicArguments = false
        for (const name of Object.keys(handlers)) {
          const original = handlers[name]
          /** @param {any[]} args */
          handlers[name] = (...args) => {
            if (withinDynamicArguments) return
            // @ts-expect-error
            original(...args)
          }
        }
        handlers['VDirectiveKey > VExpressionContainer'] = () => {
          withinDynamicArguments = true
        }
        handlers['VDirectiveKey > VExpressionContainer:exit'] = () => {
          withinDynamicArguments = false
        }
      }

      if (create) {
        compositingVisitors(handlers, create(context, { baseHandlers }))
      }

      if (applyDocument) {
        // Apply the handlers to document.
        return defineDocumentVisitor(context, handlers)
      }
      // Apply the handlers to templates.
      return defineTemplateBodyVisitor(context, handlers)
    },

    meta: Object.assign({}, baseRule.meta, {
      docs: Object.assign({}, baseRule.meta.docs, {
        description,
        category: null,
        categories,
        url: `https://eslint.vuejs.org/rules/${ruleName}.html`
      })
    })
  }
}

// ------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------

module.exports = {
  /**
   * Register the given visitor to parser services.
   * If the parser service of `vue-eslint-parser` was not found,
   * this generates a warning.
   *
   * @param {RuleContext} context The rule context to use parser services.
   * @param {TemplateListener} templateBodyVisitor The visitor to traverse the template body.
   * @param {RuleListener} [scriptVisitor] The visitor to traverse the script.
   * @param { { templateBodyTriggerSelector: "Program" | "Program:exit" } } [options] The options.
   * @returns {RuleListener} The merged visitor.
   */
  defineTemplateBodyVisitor,

  /**
   * Register the given visitor to parser services.
   * If the parser service of `vue-eslint-parser` was not found,
   * this generates a warning.
   *
   * @param {RuleContext} context The rule context to use parser services.
   * @param {TemplateListener} documentVisitor The visitor to traverse the document.
   * @param { { triggerSelector: "Program" | "Program:exit" } } [options] The options.
   * @returns {RuleListener} The merged visitor.
   */
  defineDocumentVisitor,
  /**
   * Wrap a given core rule to apply it to Vue.js template.
   * @type {typeof wrapCoreRule}
   */
  wrapCoreRule,
  wrapStylisticOrCoreRule,
  getCoreRule,
  /**
   * Checks whether the given value is defined.
   * @template T
   * @param {T | null | undefined} v
   * @returns {v is T}
   */
  isDef,
  /**
   * Flattens arrays, objects and iterable objects.
   * @template T
   * @param {T | Iterable<T> | null | undefined} v
   * @returns {T[]}
   */
  flatten,
  /**
   * Get the previous sibling element of the given element.
   * @param {VElement} node The element node to get the previous sibling element.
   * @returns {VElement|null} The previous sibling element.
   */
  prevSibling(node) {
    let prevElement = null

    for (const siblingNode of (node.parent && node.parent.children) || []) {
      if (siblingNode === node) {
        return prevElement
      }
      if (siblingNode.type === 'VElement') {
        prevElement = siblingNode
      }
    }

    return null
  },

  /**
   * Check whether the given directive attribute has their empty value (`=""`).
   * @param {VDirective} node The directive attribute node to check.
   * @param {RuleContext} context The rule context to use parser services.
   * @returns {boolean} `true` if the directive attribute has their empty value (`=""`).
   */
  isEmptyValueDirective(node, context) {
    if (node.value == null) {
      return false
    }
    if (node.value.expression != null) {
      return false
    }

    let valueText = context.getSourceCode().getText(node.value)
    if (
      (valueText[0] === '"' || valueText[0] === "'") &&
      valueText[0] === valueText[valueText.length - 1]
    ) {
      // quoted
      valueText = valueText.slice(1, -1)
    }
    if (!valueText) {
      // empty
      return true
    }
    return false
  },

  /**
   * Check whether the given directive attribute has their empty expression value (e.g. `=" "`, `="/* &ast;/"`).
   * @param {VDirective} node The directive attribute node to check.
   * @param {RuleContext} context The rule context to use parser services.
   * @returns {boolean} `true` if the directive attribute has their empty expression value.
   */
  isEmptyExpressionValueDirective(node, context) {
    if (node.value == null) {
      return false
    }
    if (node.value.expression != null) {
      return false
    }
    const sourceCode = context.getSourceCode()
    const valueNode = node.value
    const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore()
    let quote1 = null
    let quote2 = null
    // `node.value` may be only comments, so cannot get the correct tokens with `tokenStore.getTokens(node.value)`.
    for (const token of tokenStore.getTokens(node)) {
      if (token.range[1] <= valueNode.range[0]) {
        continue
      }
      if (valueNode.range[1] <= token.range[0]) {
        // empty
        return true
      }
      if (
        !quote1 &&
        token.type === 'Punctuator' &&
        (token.value === '"' || token.value === "'")
      ) {
        quote1 = token
        continue
      }
      if (
        !quote2 &&
        quote1 &&
        token.type === 'Punctuator' &&
        token.value === quote1.value
      ) {
        quote2 = token
        continue
      }
      // not empty
      return false
    }
    // empty
    return true
  },

  /**
   * Get the attribute which has the given name.
   * @param {VElement} node The start tag node to check.
   * @param {string} name The attribute name to check.
   * @param {string} [value] The attribute value to check.
   * @returns {VAttribute | null} The found attribute.
   */
  getAttribute,

  /**
   * Check whether the given start tag has specific directive.
   * @param {VElement} node The start tag node to check.
   * @param {string} name The attribute name to check.
   * @param {string} [value] The attribute value to check.
   * @returns {boolean} `true` if the start tag has the attribute.
   */
  hasAttribute,

  /**
   * Get the directive list which has the given name.
   * @param {VElement | VStartTag} node The start tag node to check.
   * @param {string} name The directive name to check.
   * @returns {VDirective[]} The array of `v-slot` directives.
   */
  getDirectives,
  /**
   * Get the directive which has the given name.
   * @param {VElement} node The start tag node to check.
   * @param {string} name The directive name to check.
   * @param {string} [argument] The directive argument to check.
   * @returns {VDirective | null} The found directive.
   */
  getDirective,

  /**
   * Check whether the given start tag has specific directive.
   * @param {VElement} node The start tag node to check.
   * @param {string} name The directive name to check.
   * @param {string} [argument] The directive argument to check.
   * @returns {boolean} `true` if the start tag has the directive.
   */
  hasDirective,

  isVBindSameNameShorthand,

  /**
   * Returns the list of all registered components
   * @param {ObjectExpression} componentObject
   * @returns { { node: Property, name: string }[] } Array of ASTNodes
   */
  getRegisteredComponents(componentObject) {
    const componentsNode = componentObject.properties.find(
      /**
       * @param {ESNode} p
       * @returns {p is (Property & { key: Identifier & {name: 'components'}, value: ObjectExpression })}
       */
      (p) =>
        p.type === 'Property' &&
        getStaticPropertyName(p) === 'components' &&
        p.value.type === 'ObjectExpression'
    )

    if (!componentsNode) {
      return []
    }

    return componentsNode.value.properties
      .filter(isProperty)
      .map((node) => {
        const name = getStaticPropertyName(node)
        return name ? { node, name } : null
      })
      .filter(isDef)
  },

  /**
   * Check whether the previous sibling element has `if` or `else-if` directive.
   * @param {VElement} node The element node to check.
   * @returns {boolean} `true` if the previous sibling element has `if` or `else-if` directive.
   */
  prevElementHasIf(node) {
    const prev = this.prevSibling(node)
    return (
      prev != null &&
      prev.startTag.attributes.some(
        (a) =>
          a.directive &&
          (a.key.name.name === 'if' || a.key.name.name === 'else-if')
      )
    )
  },

  /**
   * Returns a generator with all child element v-if chains of the given element.
   * @param {VElement} node The element node to check.
   * @returns {IterableIterator<VElement[]>}
   */
  *iterateChildElementsChains(node) {
    let vIf = false
    /** @type {VElement[]} */
    let elementChain = []
    for (const childNode of node.children) {
      if (childNode.type === 'VElement') {
        let connected
        if (hasDirective(childNode, 'if')) {
          connected = false
          vIf = true
        } else if (hasDirective(childNode, 'else-if')) {
          connected = vIf
          vIf = true
        } else if (hasDirective(childNode, 'else')) {
          connected = vIf
          vIf = false
        } else {
          connected = false
          vIf = false
        }

        if (connected) {
          elementChain.push(childNode)
        } else {
          if (elementChain.length > 0) {
            yield elementChain
          }
          elementChain = [childNode]
        }
      } else if (childNode.type !== 'VText' || childNode.value.trim() !== '') {
        vIf = false
      }
    }
    if (elementChain.length > 0) {
      yield elementChain
    }
  },

  /**
   * @param {ASTNode} node
   * @returns {node is Literal | TemplateLiteral}
   */
  isStringLiteral(node) {
    return (
      (node.type === 'Literal' && typeof node.value === 'string') ||
      (node.type === 'TemplateLiteral' && node.expressions.length === 0)
    )
  },

  /**
   * Check whether the given node is a custom component or not.
   * @param {VElement} node The start tag node to check.
   * @param {boolean} [ignoreElementNamespaces=false] If `true`, ignore element namespaces.
   * @returns {boolean} `true` if the node is a custom component.
   */
  isCustomComponent(node, ignoreElementNamespaces = false) {
    if (
      hasAttribute(node, 'is') ||
      hasDirective(node, 'bind', 'is') ||
      hasDirective(node, 'is')
    ) {
      return true
    }

    const isHtmlName = this.isHtmlWellKnownElementName(node.rawName)
    const isSvgName = this.isSvgWellKnownElementName(node.rawName)
    const isMathName = this.isMathWellKnownElementName(node.rawName)

    if (ignoreElementNamespaces) {
      return !isHtmlName && !isSvgName && !isMathName
    }

    return (
      (this.isHtmlElementNode(node) && !isHtmlName) ||
      (this.isSvgElementNode(node) && !isSvgName) ||
      (this.isMathElementNode(node) && !isMathName)
    )
  },

  /**
   * Check whether the given node is a HTML element or not.
   * @param {VElement} node The node to check.
   * @returns {boolean} `true` if the node is a HTML element.
   */
  isHtmlElementNode(node) {
    return node.namespace === NS.HTML
  },

  /**
   * Check whether the given node is a SVG element or not.
   * @param {VElement} node The node to check.
   * @returns {boolean} `true` if the name is a SVG element.
   */
  isSvgElementNode(node) {
    return node.namespace === NS.SVG
  },

  /**
   * Check whether the given name is a MathML element or not.
   * @param {VElement} node The node to check.
   * @returns {boolean} `true` if the node is a MathML element.
   */
  isMathElementNode(node) {
    return node.namespace === NS.MathML
  },

  /**
   * Check whether the given name is an well-known element or not.
   * @param {string} name The name to check.
   * @returns {boolean} `true` if the name is an well-known element name.
   */
  isHtmlWellKnownElementName(name) {
    return HTML_ELEMENT_NAMES.has(name)
  },

  /**
   * Check whether the given name is an well-known SVG element or not.
   * @param {string} name The name to check.
   * @returns {boolean} `true` if the name is an well-known SVG element name.
   */
  isSvgWellKnownElementName(name) {
    return SVG_ELEMENT_NAMES.has(name)
  },

  /**
   * Check whether the given name is a well-known MathML element or not.
   * @param {string} name The name to check.
   * @returns {boolean} `true` if the name is a well-known MathML element name.
   */
  isMathWellKnownElementName(name) {
    return MATH_ELEMENT_NAMES.has(name)
  },

  /**
   * Check whether the given name is a void element name or not.
   * @param {string} name The name to check.
   * @returns {boolean} `true` if the name is a void element name.
   */
  isHtmlVoidElementName(name) {
    return VOID_ELEMENT_NAMES.has(name)
  },

  /**
   * Check whether the given name is Vue builtin component name or not.
   * @param {string} name The name to check.
   * @returns {boolean} `true` if the name is a builtin component name
   */
  isBuiltInComponentName(name) {
    return (
      VUE3_BUILTIN_COMPONENT_NAMES.has(name) ||
      VUE2_BUILTIN_COMPONENT_NAMES.has(name)
    )
  },

  /**
   * Check whether the given name is Vue builtin element name or not.
   * @param {string} name The name to check.
   * @returns {boolean} `true` if the name is a builtin Vue element name
   */
  isVueBuiltInElementName(name) {
    return VUE_BUILTIN_ELEMENT_NAMES.has(name.toLowerCase())
  },

  /**
   * Check whether the given name is Vue builtin directive name or not.
   * @param {string} name The name to check.
   * @returns {boolean} `true` if the name is a builtin Directive name
   */
  isBuiltInDirectiveName(name) {
    return (
      name === 'bind' ||
      name === 'on' ||
      name === 'text' ||
      name === 'html' ||
      name === 'show' ||
      name === 'if' ||
      name === 'else' ||
      name === 'else-if' ||
      name === 'for' ||
      name === 'model' ||
      name === 'slot' ||
      name === 'pre' ||
      name === 'cloak' ||
      name === 'once' ||
      name === 'memo' ||
      name === 'is'
    )
  },

  /**
   * Gets the property name of a given node.
   * @param {Property|AssignmentProperty|MethodDefinition|MemberExpression} node - The node to get.
   * @return {string|null} The property name if static. Otherwise, null.
   */
  getStaticPropertyName,
  /**
   * Gets the string of a given node.
   * @param {Literal|TemplateLiteral} node - The node to get.
   * @return {string|null} The string if static. Otherwise, null.
   */
  getStringLiteralValue,
  /**
   * Get all props by looking at all component's properties
   * @param {ObjectExpression} componentObject Object with component definition
   * @return {(ComponentArrayProp | ComponentObjectProp | ComponentUnknownProp)[]} Array of component props
   */
  getComponentPropsFromOptions,
  /**
   * Get all emits by looking at all component's properties
   * @param {ObjectExpression} componentObject Object with component definition
   * @return {(ComponentArrayEmit | ComponentObjectEmit | ComponentUnknownEmit)[]} Array of component emits
   */
  getComponentEmitsFromOptions,

  /**
   * Get all computed properties by looking at all component's properties
   * @param {ObjectExpression} componentObject Object with component definition
   * @return {ComponentComputedProperty[]} Array of computed properties in format: [{key: String, value: ASTNode}]
   */
  getComputedProperties(componentObject) {
    const computedPropertiesNode = componentObject.properties.find(
      /**
       * @param {ESNode} p
       * @returns {p is (Property & { key: Identifier & {name: 'computed'}, value: ObjectExpression })}
       */
      (p) =>
        p.type === 'Property' &&
        getStaticPropertyName(p) === 'computed' &&
        p.value.type === 'ObjectExpression'
    )

    if (!computedPropertiesNode) {
      return []
    }

    return computedPropertiesNode.value.properties
      .filter(isProperty)
      .map((cp) => {
        const key = getStaticPropertyName(cp)
        /** @type {Expression} */
        const propValue = skipTSAsExpression(cp.value)
        /** @type {BlockStatement | null} */
        let value = null

        if (propValue.type === 'FunctionExpression') {
          value = propValue.body
        } else if (propValue.type === 'ObjectExpression') {
          const get =
            /** @type {(Property & { value: FunctionExpression }) | null} */ (
              findProperty(
                propValue,
                'get',
                (p) => p.value.type === 'FunctionExpression'
              )
            )
          value = get ? get.value.body : null
        }

        return { key, value }
      })
  },

  /**
   * Get getter body from computed function
   * @param {CallExpression} callExpression call of computed function
   * @return {FunctionExpression | ArrowFunctionExpression | null} getter function
   */
  getGetterBodyFromComputedFunction(callExpression) {
    if (callExpression.arguments.length <= 0) {
      return null
    }

    const arg = callExpression.arguments[0]

    if (
      arg.type === 'FunctionExpression' ||
      arg.type === 'ArrowFunctionExpression'
    ) {
      return arg
    }

    if (arg.type === 'ObjectExpression') {
      const getProperty =
        /** @type {(Property & { value: FunctionExpression | ArrowFunctionExpression }) | null} */ (
          findProperty(
            arg,
            'get',
            (p) =>
              p.value.type === 'FunctionExpression' ||
              p.value.type === 'ArrowFunctionExpression'
          )
        )
      return getProperty ? getProperty.value : null
    }

    return null
  },

  isTypeScriptFile,

  isVueFile,

  /**
   * Checks whether the current file is uses `<script setup>`
   * @param {RuleContext} context The ESLint rule context object.
   */
  isScriptSetup,
  /**
   * Gets the element of `<script setup>`
   * @param {RuleContext} context The ESLint rule context object.
   * @returns {VElement | null} the element of `<script setup>`
   */
  getScriptSetupElement,

  /**
   * Check if current file is a Vue instance or component and call callback
   * @param {RuleContext} context The ESLint rule context object.
   * @param { (node: ObjectExpression, type: VueObjectType) => void } cb Callback function
   */
  executeOnVue(context, cb) {
    return compositingVisitors(
      this.executeOnVueComponent(context, cb),
      this.executeOnVueInstance(context, cb)
    )
  },

  /**
   * Define handlers to traverse the Vue Objects.
   * Some special events are available to visitor.
   *
   * - `onVueObjectEnter` ... Event when Vue Object is found.
   * - `onVueObjectExit` ... Event when Vue Object visit ends.
   * - `onSetupFunctionEnter` ... Event when setup function found.
   * - `onRenderFunctionEnter` ... Event when render function found.
   *
   * @param {RuleContext} context The ESLint rule context object.
   * @param {VueVisitor} visitor The visitor to traverse the Vue Objects.
   */
  defineVueVisitor(context, visitor) {
    /** @type {VueObjectData | null} */
    let vueStack = null

    /**
     * @param {string} key
     * @param {ESNode} node
     */
    function callVisitor(key, node) {
      if (visitor[key] && vueStack) {
        // @ts-expect-error
        visitor[key](node, vueStack)
      }
    }

    /** @type {NodeListener} */
    const vueVisitor = {}
    for (const key in visitor) {
      vueVisitor[key] = (node) => callVisitor(key, node)
    }

    /**
     * @param {ObjectExpression} node
     */
    vueVisitor.ObjectExpression = (node) => {
      const type = getVueObjectType(context, node)
      if (type) {
        vueStack = {
          node,
          type,
          parent: vueStack,
          get functional() {
            const functional = node.properties.find(
              /**
               * @param {Property | SpreadElement} p
               * @returns {p is Property}
               */
              (p) =>
                p.type === 'Property' &&
                getStaticPropertyName(p) === 'functional'
            )
            if (!functional) {
              return false
            }
            if (
              functional.value.type === 'Literal' &&
              functional.value.value === false
            ) {
              return false
            }
            return true
          }
        }
        callVisitor('onVueObjectEnter', node)
      }
      callVisitor('ObjectExpression', node)
    }
    vueVisitor['ObjectExpression:exit'] = (node) => {
      callVisitor('ObjectExpression:exit', node)
      if (vueStack && vueStack.node === node) {
        callVisitor('onVueObjectExit', node)
        vueStack = vueStack.parent
      }
    }
    if (
      visitor.onSetupFunctionEnter ||
      visitor.onSetupFunctionExit ||
      visitor.onRenderFunctionEnter
    ) {
      const setups = new Set()
      /** @param { (FunctionExpression | ArrowFunctionExpression) & { parent: Property } } node */
      vueVisitor[
        'Property[value.type=/^(Arrow)?FunctionExpression$/] > :function'
      ] = (node) => {
        /** @type {Property} */
        const prop = node.parent
        if (vueStack && prop.parent === vueStack.node && prop.value === node) {
          const name = getStaticPropertyName(prop)
          if (name === 'setup') {
            callVisitor('onSetupFunctionEnter', node)
            setups.add(node)
          } else if (name === 'render') {
            callVisitor('onRenderFunctionEnter', node)
          }
        }
        callVisitor(
          'Property[value.type=/^(Arrow)?FunctionExpression$/] > :function',
          node
        )
      }
      if (visitor.onSetupFunctionExit) {
        /** @param { (FunctionExpression | ArrowFunctionExpression) & { parent: Property } } node */
        vueVisitor[
          'Property[value.type=/^(Arrow)?FunctionExpression$/] > :function:exit'
        ] = (node) => {
          if (setups.has(node)) {
            callVisitor('onSetupFunctionExit', node)
            setups.delete(node)
          }
        }
      }
    }

    return vueVisitor
  },

  /**
   * Define handlers to traverse the AST nodes in `<script setup>`.
   * Some special events are available to visitor.
   *
   * - `onDefinePropsEnter` ... Event when defineProps is found.
   * - `onDefinePropsExit` ... Event when defineProps visit ends.
   * - `onDefineEmitsEnter` ... Event when defineEmits is found.
   * - `onDefineEmitsExit` ... Event when defineEmits visit ends.
   * - `onDefineOptionsEnter` ... Event when defineOptions is found.
   * - `onDefineOptionsExit` ... Event when defineOptions visit ends.
   * - `onDefineSlotsEnter` ... Event when defineSlots is found.
   * - `onDefineSlotsExit` ... Event when defineSlots visit ends.
   * - `onDefineExposeEnter` ... Event when defineExpose is found.
   * - `onDefineExposeExit` ... Event when defineExpose visit ends.
   * - `onDefineModelEnter` ... Event when defineModel is found.
   * - `onDefineModelExit` ... Event when defineModel visit ends.
   *
   * @param {RuleContext} context The ESLint rule context object.
   * @param {ScriptSetupVisitor} visitor The visitor to traverse the AST nodes.
   */
  defineScriptSetupVisitor(context, visitor) {
    const scriptSetup = getScriptSetupElement(context)
    if (scriptSetup == null) {
      return {}
    }
    const scriptSetupRange = scriptSetup.range

    /**
     * @param {ESNode} node
     */
    function inScriptSetup(node) {
      return (
        scriptSetupRange[0] <= node.range[0] &&
        node.range[1] <= scriptSetupRange[1]
      )
    }
    /**
     * @param {string} key
     * @param {ESNode} node
     * @param {any[]} args
     */
    function callVisitor(key, node, ...args) {
      if (visitor[key] && (node.type === 'Program' || inScriptSetup(node))) {
        // @ts-expect-error
        visitor[key](node, ...args)
      }
    }

    /** @type {NodeListener} */
    const scriptSetupVisitor = {}
    for (const key in visitor) {
      scriptSetupVisitor[key] = (node) => callVisitor(key, node)
    }

    class MacroListener {
      /**
       * @param {string} name
       * @param {string} enterName
       * @param {string} exitName
       * @param {(candidateMacro: Expression | null, node: CallExpression) => boolean} isMacroNode
       * @param {(context: RuleContext, node: CallExpression) => unknown} buildParam
       */
      constructor(name, enterName, exitName, isMacroNode, buildParam) {
        this.name = name
        this.enterName = enterName
        this.exitName = exitName
        this.isMacroNode = isMacroNode
        this.buildParam = buildParam
        this.hasListener = Boolean(
          visitor[this.enterName] || visitor[this.exitName]
        )
        this.paramsMap = new Map()
      }
    }
    const macroListenerList = [
      new MacroListener(
        'defineProps',
        'onDefinePropsEnter',
        'onDefinePropsExit',
        (candidateMacro, node) =>
          candidateMacro === node || candidateMacro === getWithDefaults(node),
        getComponentPropsFromDefineProps
      ),
      new MacroListener(
        'defineEmits',
        'onDefineEmitsEnter',
        'onDefineEmitsExit',
        (candidateMacro, node) => candidateMacro === node,
        getComponentEmitsFromDefineEmits
      ),
      new MacroListener(
        'defineOptions',
        'onDefineOptionsEnter',
        'onDefineOptionsExit',
        (candidateMacro, node) => candidateMacro === node,
        () => undefined
      ),
      new MacroListener(
        'defineSlots',
        'onDefineSlotsEnter',
        'onDefineSlotsExit',
        (candidateMacro, node) => candidateMacro === node,
        getComponentSlotsFromDefineSlots
      ),
      new MacroListener(
        'defineExpose',
        'onDefineExposeEnter',
        'onDefineExposeExit',
        (candidateMacro, node) => candidateMacro === node,
        () => undefined
      ),
      new MacroListener(
        'defineModel',
        'onDefineModelEnter',
        'onDefineModelExit',
        (candidateMacro, node) => candidateMacro === node,
        getComponentModelFromDefineModel
      )
    ].filter((m) => m.hasListener)
    if (macroListenerList.length > 0) {
      /** @type {Expression | null} */
      let candidateMacro = null
      /** @param {VariableDeclarator|ExpressionStatement} node */
      scriptSetupVisitor[
        'Program > VariableDeclaration > VariableDeclarator, Program > ExpressionStatement'
      ] = (node) => {
        if (!candidateMacro) {
          candidateMacro =
            node.type === 'VariableDeclarator' ? node.init : node.expression
        }
      }
      /** @param {VariableDeclarator|ExpressionStatement} node */
      scriptSetupVisitor[
        'Program > VariableDeclaration > VariableDeclarator, Program > ExpressionStatement:exit'
      ] = (node) => {
        if (
          candidateMacro ===
          (node.type === 'VariableDeclarator' ? node.init : node.expression)
        ) {
          candidateMacro = null
        }
      }
      /**
       * @param {CallExpression} node
       */
      scriptSetupVisitor.CallExpression = (node) => {
        if (
          candidateMacro &&
          inScriptSetup(node) &&
          node.callee.type === 'Identifier'
        ) {
          for (const macroListener of macroListenerList) {
            if (
              node.callee.name !== macroListener.name ||
              !macroListener.isMacroNode(candidateMacro, node)
            ) {
              continue
            }
            const param = macroListener.buildParam(context, node)
            callVisitor(macroListener.enterName, node, param)
            macroListener.paramsMap.set(node, param)
            break
          }
        }
        callVisitor('CallExpression', node)
      }
      scriptSetupVisitor['CallExpression:exit'] = (node) => {
        callVisitor('CallExpression:exit', node)
        for (const macroListener of macroListenerList) {
          if (macroListener.paramsMap.has(node)) {
            callVisitor(
              macroListener.exitName,
              node,
              macroListener.paramsMap.get(node)
            )
            macroListener.paramsMap.delete(node)
          }
        }
      }
    }

    return scriptSetupVisitor
  },

  /**
   * Checks whether given defineProps call node has withDefaults.
   * @param {CallExpression} node The node of defineProps
   * @returns {node is CallExpression & { parent: CallExpression }}
   */
  hasWithDefaults,

  /**
   * Gets a map of the expressions defined in withDefaults.
   * @param {CallExpression} node The node of defineProps
   * @returns { { [key: string]: Expression | undefined } }
   */
  getWithDefaultsPropExpressions(node) {
    const map = getWithDefaultsProps(node)

    /** @type {Record<string, Expression | undefined>} */
    const result = {}

    for (const key of Object.keys(map)) {
      const prop = map[key]
      result[key] = prop && prop.value
    }

    return result
  },
  /**
   * Gets a map of the property nodes defined in withDefaults.
   * @param {CallExpression} node The node of defineProps
   * @returns { { [key: string]: Property | undefined } }
   */
  getWithDefaultsProps,
  /**
   * Gets the default definition nodes for defineProp
   * using the props destructure with assignment pattern.
   * @param {CallExpression} node The node of defineProps
   * @returns { Record<string, {prop: AssignmentProperty , expression: Expression} | undefined> }
   */
  getDefaultPropExpressionsForPropsDestructure,
  /**
   * Checks whether the given defineProps node is using Props Destructure.
   * @param {CallExpression} node The node of defineProps
   * @returns {boolean}
   */
  isUsingPropsDestructure(node) {
    const left = getLeftOfDefineProps(node)
    return left?.type === 'ObjectPattern'
  },
  /**
   * Gets the props destructure property nodes for defineProp.
   * @param {CallExpression} node The node of defineProps
   * @returns { Record<string, AssignmentProperty | undefined> }
   */
  getPropsDestructure,

  getVueObjectType,
  /**
   * Get the Vue component definition type from given node
   * Vue.component('xxx', {}) || component('xxx', {})
   * @param {ObjectExpression} node Node to check
   * @returns {'component' | 'mixin' | 'extend' | 'createApp' | 'defineComponent' | 'defineNuxtComponent' | null}
   */
  getVueComponentDefinitionType,
  /**
   * Checks whether the given object is an SFC definition.
   * @param {RuleContext} context The ESLint rule context object.
   * @param {ObjectExpression} node Node to check
   * @returns { boolean } `true`, the given object is an SFC definition.
   */
  isSFCObject,
  compositingVisitors,

  /**
   * Check if current file is a Vue instance (new Vue) and call callback
   * @param {RuleContext} context The ESLint rule context object.
   * @param { (node: ObjectExpression, type: VueObjectType) => void } cb Callback function
   */
  executeOnVueInstance(context, cb) {
    return {
      /** @param {ObjectExpression} node */
      'ObjectExpression:exit'(node) {
        const type = getVueObjectType(context, node)
        if (!type || type !== 'instance') return
        cb(node, type)
      }
    }
  },

  /**
   * Check if current file is a Vue component and call callback
   * @param {RuleContext} context The ESLint rule context object.
   * @param { (node: ObjectExpression, type: VueObjectType) => void } cb Callback function
   */
  executeOnVueComponent(context, cb) {
    return {
      /** @param {ObjectExpression} node */
      'ObjectExpression:exit'(node) {
        const type = getVueObjectType(context, node)
        if (
          !type ||
          (type !== 'mark' && type !== 'export' && type !== 'definition')
        )
          return
        cb(node, type)
      }
    }
  },

  /**
   * Check call `Vue.component` and call callback.
   * @param {RuleContext} _context The ESLint rule context object.
   * @param { (node: CallExpression) => void } cb Callback function
   */
  executeOnCallVueComponent(_context, cb) {
    return {
      /** @param {Identifier & { parent: MemberExpression & { parent: CallExpression } } } node */
      "CallExpression > MemberExpression > Identifier[name='component']": (
        node
      ) => {
        const callExpr = node.parent.parent
        const callee = callExpr.callee

        if (callee.type === 'MemberExpression') {
          const calleeObject = skipTSAsExpression(callee.object)

          if (
            calleeObject.type === 'Identifier' &&
            // calleeObject.name === 'Vue' && // Any names can be used in Vue.js 3.x. e.g. app.component()
            callee.property === node &&
            callExpr.arguments.length > 0
          ) {
            cb(callExpr)
          }
        }
      }
    }
  },
  /**
   * Return generator with all properties
   * @param {ObjectExpression} node Node to check
   * @param {Set<GroupName>} groups Name of parent group
   * @returns {IterableIterator<ComponentPropertyData>}
   */
  *iterateProperties(node, groups) {
    for (const item of node.properties) {
      if (item.type !== 'Property') {
        continue
      }

      const name = /** @type {GroupName | null} */ (getStaticPropertyName(item))
      if (!name || !groups.has(name)) continue

      switch (item.value.type) {
        case 'ArrayExpression': {
          yield* this.iterateArrayExpression(item.value, name)
          break
        }
        case 'ObjectExpression': {
          yield* this.iterateObjectExpression(item.value, name)
          break
        }
        case 'FunctionExpression': {
          yield* this.iterateFunctionExpression(item.value, name)
          break
        }
        case 'ArrowFunctionExpression': {
          yield* this.iterateArrowFunctionExpression(item.value, name)
          break
        }
      }
    }
  },

  /**
   * Return generator with all elements inside ArrayExpression
   * @param {ArrayExpression} node Node to check
   * @param {GroupName} groupName Name of parent group
   * @returns {IterableIterator<ComponentArrayPropertyData>}
   */
  *iterateArrayExpression(node, groupName) {
    for (const item of node.elements) {
      if (
        item &&
        (item.type === 'Literal' || item.type === 'TemplateLiteral')
      ) {
        const name = getStringLiteralValue(item)
        if (name) {
          yield { type: 'array', name, groupName, node: item }
        }
      }
    }
  },

  /**
   * Return generator with all elements inside ObjectExpression
   * @param {ObjectExpression} node Node to check
   * @param {GroupName} groupName Name of parent group
   * @returns {IterableIterator<ComponentObjectPropertyData>}
   */
  *iterateObjectExpression(node, groupName) {
    /** @type {Set<Property> | undefined} */
    let usedGetter
    for (const item of node.properties) {
      if (item.type === 'Property') {
        const key = item.key
        if (
          key.type === 'Identifier' ||
          key.type === 'Literal' ||
          key.type === 'TemplateLiteral'
        ) {
          const name = getStaticPropertyName(item)
          if (name) {
            // find getter pair
            if (
              item.kind === 'set' &&
              node.properties.some((item2) => {
                if (item2.type === 'Property' && item2.kind === 'get') {
                  if (!usedGetter) {
                    usedGetter = new Set()
                  }
                  if (usedGetter.has(item2)) {
                    return false
                  }
                  const getterName = getStaticPropertyName(item2)
                  if (getterName === name) {
                    usedGetter.add(item2)
                    return true
                  }
                }
                return false
              })
            ) {
              // has getter pair
              continue
            }
            yield {
              type: 'object',
              name,
              groupName,
              node: key,
              property: item
            }
          }
        }
      }
    }
  },

  /**
   * Return generator with all elements inside FunctionExpression
   * @param {FunctionExpression} node Node to check
   * @param {GroupName} groupName Name of parent group
   * @returns {IterableIterator<ComponentObjectPropertyData>}
   */
  *iterateFunctionExpression(node, groupName) {
    if (node.body.type === 'BlockStatement') {
      for (const item of node.body.body) {
        if (
          item.type === 'ReturnStatement' &&
          item.argument &&
          item.argument.type === 'ObjectExpression'
        ) {
          yield* this.iterateObjectExpression(item.argument, groupName)
        }
      }
    }
  },

  /**
   * Return generator with all elements inside ArrowFunctionExpression
   * @param {ArrowFunctionExpression} node Node to check
   * @param {GroupName} groupName Name of parent group
   * @returns {IterableIterator<ComponentObjectPropertyData>}
   */
  *iterateArrowFunctionExpression(node, groupName) {
    const body = node.body
    if (body.type === 'BlockStatement') {
      for (const item of body.body) {
        if (
          item.type === 'ReturnStatement' &&
          item.argument &&
          item.argument.type === 'ObjectExpression'
        ) {
          yield* this.iterateObjectExpression(item.argument, groupName)
        }
      }
    } else if (body.type === 'ObjectExpression') {
      yield* this.iterateObjectExpression(body, groupName)
    }
  },

  /**
   * Find all functions which do not always return values
   * @param {boolean} treatUndefinedAsUnspecified
   * @param { (node: ArrowFunctionExpression | FunctionExpression | FunctionDeclaration) => void } cb Callback function
   * @returns {RuleListener}
   */
  executeOnFunctionsWithoutReturn(treatUndefinedAsUnspecified, cb) {
    /**
     * @typedef {object} FuncInfo
     * @property {FuncInfo | null} funcInfo
     * @property {CodePath} codePath
     * @property {boolean} hasReturn
     * @property {boolean} hasReturnValue
     * @property {ArrowFunctionExpression | FunctionExpression | FunctionDeclaration} node
     * @property {CodePathSegment[]} currentSegments
     */

    /** @type {FuncInfo | null} */
    let funcInfo = null

    function isValidReturn() {
      if (!funcInfo) {
        return true
      }
      if (funcInfo.currentSegments.some((segment) => segment.reachable)) {
        return false
      }
      return !treatUndefinedAsUnspecified || funcInfo.hasReturnValue
    }

    return {
      /**
       * @param {CodePath} codePath
       * @param {ESNode} node
       */
      onCodePathStart(codePath, node) {
        if (
          node.type === 'ArrowFunctionExpression' ||
          node.type === 'FunctionExpression' ||
          node.type === 'FunctionDeclaration'
        ) {
          funcInfo = {
            codePath,
            currentSegments: [],
            funcInfo,
            hasReturn: false,
            hasReturnValue: false,
            node
          }
        }
      },
      onCodePathSegmentStart(segment) {
        funcInfo?.currentSegments.push(segment)
      },
      onCodePathSegmentEnd() {
        funcInfo?.currentSegments.pop()
      },
      onCodePathEnd() {
        funcInfo = funcInfo && funcInfo.funcInfo
      },
      /** @param {ReturnStatement} node */
      ReturnStatement(node) {
        if (funcInfo) {
          funcInfo.hasReturn = true
          funcInfo.hasReturnValue = Boolean(node.argument)
        }
      },
      /** @param {ArrowFunctionExpression} node */
      'ArrowFunctionExpression:exit'(node) {
        if (funcInfo && !isValidReturn() && !node.expression) {
          cb(funcInfo.node)
        }
      },
      'FunctionExpression:exit'() {
        if (funcInfo && !isValidReturn()) {
          cb(funcInfo.node)
        }
      }
    }
  },

  /**
   * Check whether the component is declared in a single line or not.
   * @param {ASTNode} node
   * @returns {boolean}
   */
  isSingleLine(node) {
    return node.loc.start.line === node.loc.end.line
  },

  /**
   * Check whether the templateBody of the program has invalid EOF or not.
   * @param {Program} node The program node to check.
   * @returns {boolean} `true` if it has invalid EOF.
   */
  hasInvalidEOF(node) {
    const body = node.templateBody
    if (body == null || body.errors == null) {
      return false
    }
    return body.errors.some(
      (error) => typeof error.code === 'string' && error.code.startsWith('eof-')
    )
  },

  /**
   * Get the chaining nodes of MemberExpression.
   *
   * @param  {ESNode} node The node to parse
   * @return {[ESNode, ...MemberExpression[]]} The chaining nodes
   */
  getMemberChaining(node) {
    /** @type {MemberExpression[]} */
    const nodes = []
    let n = skipChainExpression(node)

    while (n.type === 'MemberExpression') {
      nodes.push(n)
      n = skipChainExpression(n.object)
    }

    return [n, ...nodes.reverse()]
  },
  /**
   * return two string editdistance
   * @param {string} a string a to compare
   * @param {string} b string b to compare
   * @returns {number}
   */
  editDistance(a, b) {
    if (a === b) {
      return 0
    }
    const alen = a.length
    const blen = b.length
    const dp = Array.from({ length: alen + 1 }).map((_) =>
      Array.from({ length: blen + 1 }).fill(0)
    )
    for (let i = 0; i <= alen; i++) {
      dp[i][0] = i
    }
    for (let j = 0; j <= blen; j++) {
      dp[0][j] = j
    }
    for (let i = 1; i <= alen; i++) {
      for (let j = 1; j <= blen; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1
      }
    }
    return dp[alen][blen]
  },
  /**
   * Checks whether the target node is within the given range.
   * @param { [number, number] } range
   * @param {ASTNode | Token} target
   */
  inRange(range, target) {
    return range[0] <= target.range[0] && target.range[1] <= range[1]
  },
  /**
   * Checks whether the given node is Property.
   */
  isProperty,
  /**
   * Checks whether the given node is AssignmentProperty.
   */
  isAssignmentProperty,
  /**
   * Checks whether the given node is VElement.
   */
  isVElement,
  /**
   * Finds the property with the given name from the given ObjectExpression node.
   */
  findProperty,
  /**
   * Finds the assignment property with the given name from the given ObjectPattern node.
   */
  findAssignmentProperty,
  /**
   * Checks if the given node is a property value.
   * @param {Property} prop
   * @param {Expression} node
   */
  isPropertyChain,
  /**
   * Retrieve `TSAsExpression#expression` value if the given node a `TSAsExpression` node. Otherwise, pass through it.
   */
  skipTSAsExpression,
  /**
   * Retrieve `AssignmentPattern#left` value if the given node a `AssignmentPattern` node. Otherwise, pass through it.
   */
  skipDefaultParamValue,
  /**
   * Retrieve `ChainExpression#expression` value if the given node a `ChainExpression` node. Otherwise, pass through it.
   */
  skipChainExpression,
  /**
   * Checks whether the given node is in a type annotation.
   */
  withinTypeNode,
  findVariableByIdentifier,
  getScope,
  /**
   * Marks a variable with the given name in the current scope as used. This affects the no-unused-vars rule.
   */
  markVariableAsUsed,
  /**
   * Checks whether the given node is in export default.
   * @param {ASTNode} node
   * @returns {boolean}
   */
  isInExportDefault,

  /**
   * Check whether the given node is `this` or variable that stores `this`.
   * @param  {ESNode} node The node to check
   * @param {RuleContext} context The rule context to use parser services.
   * @returns {boolean} `true` if the given node is `this`.
   */
  isThis(node, context) {
    if (node.type === 'ThisExpression') {
      return true
    }
    if (node.type !== 'Identifier') {
      return false
    }
    const parent = node.parent
    if (
      (parent.type === 'MemberExpression' && parent.property === node) ||
      (parent.type === 'Property' && parent.key === node && !parent.computed)
    ) {
      return false
    }

    const variable = findVariable(getScope(context, node), node)

    if (variable != null && variable.defs.length === 1) {
      const def = variable.defs[0]
      if (
        def.type === 'Variable' &&
        def.parent.kind === 'const' &&
        def.node.id.type === 'Identifier'
      ) {
        return Boolean(
          def.node && def.node.init && def.node.init.type === 'ThisExpression'
        )
      }
    }
    return false
  },

  /**
   * @param {MemberExpression|Identifier} props
   * @returns { { kind: 'assignment' | 'update' | 'call' , node: ESNode, pathNodes: MemberExpression[] } | null }
   */
  findMutating(props) {
    /** @type {MemberExpression[]} */
    const pathNodes = []
    /** @type {MemberExpression | Identifier | ChainExpression} */
    let node = props
    let target = node.parent
    while (true) {
      switch (target.type) {
        case 'AssignmentExpression': {
          if (target.left === node) {
            // this.xxx <=|+=|-=>
            return {
              kind: 'assignment',
              node: target,
              pathNodes
            }
          }
          break
        }
        case 'UpdateExpression': {
          // this.xxx <++|-->
          return {
            kind: 'update',
            node: target,
            pathNodes
          }
        }
        case 'UnaryExpression': {
          if (target.operator === 'delete') {
            return {
              kind: 'update',
              node: target,
              pathNodes
            }
          }
          break
        }
        case 'CallExpression': {
          if (pathNodes.length > 0 && target.callee === node) {
            const mem = pathNodes[pathNodes.length - 1]
            const callName = getStaticPropertyName(mem)
            if (
              callName &&
              /^(?:push|pop|shift|unshift|reverse|splice|sort|copyWithin|fill)$/u.test(
                callName
              )
            ) {
              // this.xxx.push()
              pathNodes.pop()
              return {
                kind: 'call',
                node: target,
                pathNodes
              }
            }
          }
          break
        }
        case 'MemberExpression': {
          if (target.object === node) {
            pathNodes.push(target)
            node = target
            target = target.parent
            continue // loop
          }
          break
        }
        case 'ChainExpression': {
          node = target
          target = target.parent
          continue // loop
        }
      }

      return null
    }
  },

  /**
   * Return generator with the all handler nodes defined in the given watcher property.
   * @param {Property|Expression} property
   * @returns {IterableIterator<Expression>}
   */
  iterateWatchHandlerValues,

  /**
   * Wraps composition API trace map in both 'vue' and '@vue/composition-api' imports, or '#imports' from unimport
   * @param {import('@eslint-community/eslint-utils').TYPES.TraceMap} map
   */
  createCompositionApiTraceMap: (map) => ({
    vue: map,
    '@vue/composition-api': map,
    '#imports': map
  }),

  /**
   * Iterates all references in the given trace map.
   * Take the third argument option to detect auto-imported references.
   *
   * @param {import('@eslint-community/eslint-utils').ReferenceTracker} tracker
   * @param {import('@eslint-community/eslint-utils').TYPES.TraceMap} map
   * @returns {ReturnType<import('@eslint-community/eslint-utils').ReferenceTracker['iterateEsmReferences']>}
   */
  *iterateReferencesTraceMap(tracker, map) {
    const esmTraceMap = this.createCompositionApiTraceMap({
      ...map,
      [ReferenceTracker.ESM]: true
    })

    for (const ref of tracker.iterateEsmReferences(esmTraceMap)) {
      yield ref
    }

    for (const ref of tracker.iterateGlobalReferences(map)) {
      yield ref
    }
  },

  /**
   * Checks whether or not the tokens of two given nodes are same.
   * @param {ASTNode} left A node 1 to compare.
   * @param {ASTNode} right A node 2 to compare.
   * @param {ParserServices.TokenStore | SourceCode} sourceCode The ESLint source code object.
   * @returns {boolean} the source code for the given node.
   */
  equalTokens(left, right, sourceCode) {
    const tokensL = sourceCode.getTokens(left)
    const tokensR = sourceCode.getTokens(right)

    if (tokensL.length !== tokensR.length) {
      return false
    }

    return tokensL.every(
      (token, i) =>
        token.type === tokensR[i].type && token.value === tokensR[i].value
    )
  }
}

// ------------------------------------------------------------------------------
// Standard Helpers
// ------------------------------------------------------------------------------

/**
 * Checks whether the given value is defined.
 * @template T
 * @param {T | null | undefined} v
 * @returns {v is T}
 */
function isDef(v) {
  return v != null
}

/**
 * Flattens arrays, objects and iterable objects.
 * @template T
 * @param {T | Iterable<T> | null | undefined} v
 * @returns {T[]}
 */
function flatten(v) {
  /** @type {T[]} */
  const result = []
  if (v) {
    if (isIterable(v)) {
      result.push(...v)
    } else {
      result.push(v)
    }
  }
  return result
}

/**
 * @param {*} v
 * @returns {v is Iterable<any>}
 */
function isIterable(v) {
  return v && Symbol.iterator in v
}

// ------------------------------------------------------------------------------
// Nodejs Helpers
// ------------------------------------------------------------------------------
/**
 * @param {String} filename
 */
function createRequire(filename) {
  const Module = require('module')
  const moduleCreateRequire =
    // Added in v12.2.0
    Module.createRequire ||
    // Added in v10.12.0, but deprecated in v12.2.0.
    Module.createRequireFromPath ||
    // Polyfill - This is not executed on the tests on node@>=10.
    /**
     * @param {string} filename
     */
    function (filename) {
      const mod = new Module(filename)

      mod.filename = filename
      // @ts-ignore
      mod.paths = Module._nodeModulePaths(path.dirname(filename))
      // @ts-ignore
      mod._compile('module.exports = require;', filename)
      return mod.exports
    }
  return moduleCreateRequire(filename)
}

// ------------------------------------------------------------------------------
// Rule Helpers
// ------------------------------------------------------------------------------

/**
 * Register the given visitor to parser services.
 * If the parser service of `vue-eslint-parser` was not found,
 * this generates a warning.
 *
 * @param {RuleContext} context The rule context to use parser services.
 * @param {TemplateListener} templateBodyVisitor The visitor to traverse the template body.
 * @param {RuleListener} [scriptVisitor] The visitor to traverse the script.
 * @param { { templateBodyTriggerSelector: "Program" | "Program:exit" } } [options] The options.
 * @returns {RuleListener} The merged visitor.
 */
function defineTemplateBodyVisitor(
  context,
  templateBodyVisitor,
  scriptVisitor,
  options
) {
  const sourceCode = context.getSourceCode()
  if (sourceCode.parserServices.defineTemplateBodyVisitor == null) {
    const filename = context.getFilename()
    if (path.extname(filename) === '.vue') {
      context.report({
        loc: { line: 1, column: 0 },
        message:
          'Use the latest vue-eslint-parser. See also https://eslint.vuejs.org/user-guide/#what-is-the-use-the-latest-vue-eslint-parser-error.'
      })
    }
    return {}
  }
  return sourceCode.parserServices.defineTemplateBodyVisitor(
    templateBodyVisitor,
    scriptVisitor,
    options
  )
}
/**
 * Register the given visitor to parser services.
 * If the parser service of `vue-eslint-parser` was not found,
 * this generates a warning.
 *
 * @param {RuleContext} context The rule context to use parser services.
 * @param {TemplateListener} documentVisitor The visitor to traverse the document.
 * @param { { triggerSelector: "Program" | "Program:exit" } } [options] The options.
 * @returns {RuleListener} The merged visitor.
 */
function defineDocumentVisitor(context, documentVisitor, options) {
  const sourceCode = context.getSourceCode()
  if (sourceCode.parserServices.defineDocumentVisitor == null) {
    const filename = context.getFilename()
    if (path.extname(filename) === '.vue') {
      context.report({
        loc: { line: 1, column: 0 },
        message:
          'Use the latest vue-eslint-parser. See also https://eslint.vuejs.org/user-guide/#what-is-the-use-the-latest-vue-eslint-parser-error.'
      })
    }
    return {}
  }
  return sourceCode.parserServices.defineDocumentVisitor(
    documentVisitor,
    options
  )
}

/**
 * @template T
 * @param {T} visitor
 * @param {...(TemplateListener | RuleListener | NodeListener)} visitors
 * @returns {T}
 */
function compositingVisitors(visitor, ...visitors) {
  for (const v of visitors) {
    for (const key in v) {
      // @ts-expect-error
      if (visitor[key]) {
        // @ts-expect-error
        const o = visitor[key]
        // @ts-expect-error
        visitor[key] = (...args) => {
          o(...args)
          // @ts-expect-error
          v[key](...args)
        }
      } else {
        // @ts-expect-error
        visitor[key] = v[key]
      }
    }
  }
  return visitor
}

// ------------------------------------------------------------------------------
// AST Helpers
// ------------------------------------------------------------------------------

/**
 * Find the variable of a given identifier.
 * @param {RuleContext} context The rule context
 * @param {Identifier} node The variable name to find.
 * @returns {Variable|null} The found variable or null.
 */
function findVariableByIdentifier(context, node) {
  return findVariable(getScope(context, node), node)
}

/**
 * Finds the property with the given name from the given ObjectExpression node.
 * @param {ObjectExpression} node
 * @param {string} name
 * @param { (p: Property) => boolean } [filter]
 * @returns { (Property) | null}
 */
function findProperty(node, name, filter) {
  const predicate = filter
    ? /**
       * @param {Property | SpreadElement} prop
       * @returns {prop is Property}
       */
      (prop) =>
        isProperty(prop) && getStaticPropertyName(prop) === name && filter(prop)
    : /**
       * @param {Property | SpreadElement} prop
       * @returns {prop is Property}
       */
      (prop) => isProperty(prop) && getStaticPropertyName(prop) === name
  return node.properties.find(predicate) || null
}

/**
 * Finds the assignment property with the given name from the given ObjectPattern node.
 * @param {ObjectPattern} node
 * @param {string} name
 * @param { (p: AssignmentProperty) => boolean } [filter]
 * @returns { (AssignmentProperty) | null}
 */
function findAssignmentProperty(node, name, filter) {
  const predicate = filter
    ? /**
       * @param {AssignmentProperty | RestElement} prop
       * @returns {prop is AssignmentProperty}
       */
      (prop) =>
        isAssignmentProperty(prop) &&
        getStaticPropertyName(prop) === name &&
        filter(prop)
    : /**
       * @param {AssignmentProperty | RestElement} prop
       * @returns {prop is AssignmentProperty}
       */
      (prop) =>
        isAssignmentProperty(prop) && getStaticPropertyName(prop) === name
  return node.properties.find(predicate) || null
}

/**
 * Checks whether the given node is Property.
 * @param {Property | SpreadElement | AssignmentProperty} node
 * @returns {node is Property}
 */
function isProperty(node) {
  if (node.type !== 'Property') {
    return false
  }
  return !node.parent || node.parent.type === 'ObjectExpression'
}
/**
 * Checks whether the given node is AssignmentProperty.
 * @param {AssignmentProperty | RestElement} node
 * @returns {node is AssignmentProperty}
 */
function isAssignmentProperty(node) {
  return node.type === 'Property'
}
/**
 * Checks whether the given node is VElement.
 * @param {VElement | VExpressionContainer | VText} node
 * @returns {node is VElement}
 */
function isVElement(node) {
  return node.type === 'VElement'
}

/**
 * Checks whether the given node is in export default.
 * @param {ASTNode} node
 * @returns {boolean}
 */
function isInExportDefault(node) {
  /** @type {ASTNode | null} */
  let parent = node.parent
  while (parent) {
    if (parent.type === 'ExportDefaultDeclaration') {
      return true
    }
    parent = parent.parent
  }
  return false
}

/**
 * Retrieve `TSAsExpression#expression` value if the given node a `TSAsExpression` node. Otherwise, pass through it.
 * @template T Node type
 * @param {T | TSAsExpression} node The node to address.
 * @returns {T} The `TSAsExpression#expression` value if the node is a `TSAsExpression` node. Otherwise, the node.
 */
function skipTSAsExpression(node) {
  if (!node) {
    return node
  }
  // @ts-expect-error
  if (node.type === 'TSAsExpression') {
    // @ts-expect-error
    return skipTSAsExpression(node.expression)
  }
  // @ts-expect-error
  return node
}

/**
 * Gets the parent node of the given node. This method returns a value ignoring `X as F`.
 * @param {Expression} node
 * @returns {ASTNode}
 */
function getParent(node) {
  let parent = node.parent
  while (parent.type === 'TSAsExpression') {
    parent = parent.parent
  }
  return parent
}

/**
 * Checks if the given node is a property value.
 * @param {Property} prop
 * @param {Expression} node
 */
function isPropertyChain(prop, node) {
  let value = node
  while (value.parent.type === 'TSAsExpression') {
    value = value.parent
  }
  return prop === value.parent && prop.value === value
}

/**
 * Retrieve `AssignmentPattern#left` value if the given node a `AssignmentPattern` node. Otherwise, pass through it.
 * @template T Node type
 * @param {T | AssignmentPattern} node The node to address.
 * @return {T} The `AssignmentPattern#left` value if the node is a `AssignmentPattern` node. Otherwise, the node.
 */
function skipDefaultParamValue(node) {
  if (!node) {
    return node
  }
  // @ts-expect-error
  if (node.type === 'AssignmentPattern') {
    // @ts-expect-error
    return skipDefaultParamValue(node.left)
  }
  // @ts-expect-error
  return node
}

/**
 * Retrieve `ChainExpression#expression` value if the given node a `ChainExpression` node. Otherwise, pass through it.
 * @template T Node type
 * @param {T | ChainExpression} node The node to address.
 * @returns {T} The `ChainExpression#expression` value if the node is a `ChainExpression` node. Otherwise, the node.
 */
function skipChainExpression(node) {
  if (!node) {
    return node
  }
  // @ts-expect-error
  if (node.type === 'ChainExpression') {
    // @ts-expect-error
    return skipChainExpression(node.expression)
  }
  // @ts-expect-error
  return node
}

/**
 * Checks whether the given node is in a type annotation.
 * @param {ESNode} node
 * @returns {boolean}
 */
function withinTypeNode(node) {
  /** @type {ASTNode | null} */
  let target = node
  while (target) {
    if (isTypeNode(target)) {
      return true
    }
    target = target.parent
  }
  return false
}

/**
 * Gets the property name of a given node.
 * @param {Property|AssignmentProperty|MethodDefinition|MemberExpression} node - The node to get.
 * @return {string|null} The property name if static. Otherwise, null.
 */
function getStaticPropertyName(node) {
  if (node.type === 'Property' || node.type === 'MethodDefinition') {
    if (!node.computed) {
      const key = node.key
      if (key.type === 'Identifier') {
        return key.name
      }
    }
    const key = node.key
    // @ts-expect-error
    return getStringLiteralValue(key)
  } else if (node.type === 'MemberExpression') {
    if (!node.computed) {
      const property = node.property
      if (property.type === 'Identifier') {
        return property.name
      }
      return null
    }
    const property = node.property
    // @ts-expect-error
    return getStringLiteralValue(property)
  }
  return null
}

/**
 * Gets the string of a given node.
 * @param {Literal|TemplateLiteral} node - The node to get.
 * @param {boolean} [stringOnly]
 * @return {string|null} The string if static. Otherwise, null.
 */
function getStringLiteralValue(node, stringOnly) {
  if (node.type === 'Literal') {
    if (node.value == null) {
      if (!stringOnly && node.bigint != null) {
        return node.bigint
      }
      return null
    }
    if (typeof node.value === 'string') {
      return node.value
    }
    if (!stringOnly) {
      return String(node.value)
    }
    return null
  }
  if (
    node.type === 'TemplateLiteral' &&
    node.expressions.length === 0 &&
    node.quasis.length === 1
  ) {
    return node.quasis[0].value.cooked
  }
  return null
}
/**
 * Gets the VExpressionContainer of a given node.
 * @param {ASTNode} node - The node to get.
 * @return {VExpressionContainer|null}
 */
function getVExpressionContainer(node) {
  /** @type {ASTNode | null} */
  let n = node
  while (n && n.type !== 'VExpressionContainer') {
    n = n.parent
  }
  return n
}

/**
 * @param {string} path
 */
function isTypeScriptFile(path) {
  return path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.mts')
}

// ------------------------------------------------------------------------------
// ESLint Helpers
// ------------------------------------------------------------------------------
/**
 * Marks a variable with the given name in the current scope as used. This affects the no-unused-vars rule.
 * @param {RuleContext} context
 * @param {string} name
 * @param {ASTNode} node The node to get the current scope.
 */
function markVariableAsUsed(context, name, node) {
  const sourceCode = context.getSourceCode()
  if (sourceCode.markVariableAsUsed) {
    sourceCode.markVariableAsUsed(name, node)
  } else {
    // This function does not use the given node, but the currently visited node.
    // If we need to determine the scope of a given node, we need to implement it yourself.
    context.markVariableAsUsed?.(name)
  }
}

// ------------------------------------------------------------------------------
// Vue Helpers
// ------------------------------------------------------------------------------

/**
 * @param {string} path
 */
function isVueFile(path) {
  return path.endsWith('.vue') || path.endsWith('.jsx') || path.endsWith('.tsx')
}

/**
 * Checks whether the current file is uses `<script setup>`
 * @param {RuleContext} context The ESLint rule context object.
 */
function isScriptSetup(context) {
  return Boolean(getScriptSetupElement(context))
}
/**
 * Gets the element of `<script setup>`
 * @param {RuleContext} context The ESLint rule context object.
 * @returns {VElement | null} the element of `<script setup>`
 */
function getScriptSetupElement(context) {
  const sourceCode = context.getSourceCode()
  const df =
    sourceCode.parserServices.getDocumentFragment &&
    sourceCode.parserServices.getDocumentFragment()
  if (!df) {
    return null
  }
  const scripts = df.children.filter(
    /** @returns {e is VElement} */
    (e) => isVElement(e) && e.name === 'script'
  )
  if (scripts.length === 2) {
    return scripts.find((e) => hasAttribute(e, 'setup')) || null
  } else {
    const script = scripts[0]
    if (script && hasAttribute(script, 'setup')) {
      return script
    }
  }
  return null
}

/**
 * Check whether the given node is a Vue component based
 * on the filename and default export type
 * export default {} in .vue || .jsx
 * @param {ESNode} node Node to check
 * @param {string} path File name with extension
 * @returns {boolean}
 */
function isVueComponentFile(node, path) {
  return (
    isVueFile(path) &&
    node.type === 'ExportDefaultDeclaration' &&
    node.declaration.type === 'ObjectExpression'
  )
}

/**
 * Get the Vue component definition type from given node
 * Vue.component('xxx', {}) || component('xxx', {})
 * @param {ObjectExpression} node Node to check
 * @returns {'component' | 'mixin' | 'extend' | 'createApp' | 'defineComponent' | 'defineNuxtComponent' | null}
 */
function getVueComponentDefinitionType(node) {
  const parent = getParent(node)
  if (parent.type === 'CallExpression') {
    const callee = parent.callee

    if (callee.type === 'MemberExpression') {
      const calleeObject = skipTSAsExpression(callee.object)

      if (calleeObject.type === 'Identifier') {
        const propName = getStaticPropertyName(callee)
        if (calleeObject.name === 'Vue') {
          // for Vue.js 2.x
          // Vue.component('xxx', {}) || Vue.mixin({}) || Vue.extend('xxx', {})
          const maybeFullVueComponentForVue2 =
            propName && isObjectArgument(parent)

          return maybeFullVueComponentForVue2 &&
            (propName === 'component' ||
              propName === 'mixin' ||
              propName === 'extend')
            ? propName
            : null
        }

        // for Vue.js 3.x
        // app.component('xxx', {}) || app.mixin({})
        const maybeFullVueComponent = propName && isObjectArgument(parent)

        return maybeFullVueComponent &&
          (propName === 'component' || propName === 'mixin')
          ? propName
          : null
      }
    }

    if (callee.type === 'Identifier') {
      if (callee.name === 'component') {
        // for Vue.js 2.x
        // component('xxx', {})
        const isDestructedVueComponent = isObjectArgument(parent)
        return isDestructedVueComponent ? 'component' : null
      }
      if (callee.name === 'createApp') {
        // for Vue.js 3.x
        // createApp({})
        const isAppVueComponent = isObjectArgument(parent)
        return isAppVueComponent ? 'createApp' : null
      }
      if (callee.name === 'defineComponent') {
        // for Vue.js 3.x
        // defineComponent({})
        const isDestructedVueComponent = isObjectArgument(parent)
        return isDestructedVueComponent ? 'defineComponent' : null
      }
      if (callee.name === 'defineNuxtComponent') {
        // for Nuxt 3.x
        // defineNuxtComponent({})
        const isDestructedVueComponent = isObjectArgument(parent)
        return isDestructedVueComponent ? 'defineNuxtComponent' : null
      }
    }
  }

  return null
}

/** @param {CallExpression} node */
function isObjectArgument(node) {
  return (
    node.arguments.length > 0 &&
    skipTSAsExpression(node.arguments.slice(-1)[0]).type === 'ObjectExpression'
  )
}

/**
 * Check whether given node is new Vue instance
 * new Vue({})
 * @param {NewExpression} node Node to check
 * @returns {boolean}
 */
function isVueInstance(node) {
  const callee = node.callee
  return Boolean(
    node.type === 'NewExpression' &&
      callee.type === 'Identifier' &&
      callee.name === 'Vue' &&
      node.arguments.length > 0 &&
      skipTSAsExpression(node.arguments[0]).type === 'ObjectExpression'
  )
}

/**
 * If the given object is a Vue component or instance, returns the Vue definition type.
 * @param {RuleContext} context The ESLint rule context object.
 * @param {ObjectExpression} node Node to check
 * @returns { VueObjectType | null } The Vue definition type.
 */
function getVueObjectType(context, node) {
  if (node.type !== 'ObjectExpression') {
    return null
  }
  const parent = getParent(node)
  switch (parent.type) {
    case 'ExportDefaultDeclaration': {
      // export default {} in .vue || .jsx
      const filePath = context.getFilename()
      if (
        isVueComponentFile(parent, filePath) &&
        skipTSAsExpression(parent.declaration) === node
      ) {
        const scriptSetup = getScriptSetupElement(context)
        if (
          scriptSetup &&
          scriptSetup.range[0] <= parent.range[0] &&
          parent.range[1] <= scriptSetup.range[1]
        ) {
          // `export default` in `<script setup>`
          return null
        }
        return 'export'
      }

      break
    }
    case 'CallExpression': {
      // Vue.component('xxx', {}) || component('xxx', {})
      if (
        getVueComponentDefinitionType(node) != null &&
        skipTSAsExpression(parent.arguments.slice(-1)[0]) === node
      ) {
        return 'definition'
      }

      break
    }
    case 'NewExpression': {
      // new Vue({})
      if (
        isVueInstance(parent) &&
        skipTSAsExpression(parent.arguments[0]) === node
      ) {
        return 'instance'
      }

      break
    }
    // No default
  }
  if (
    getComponentComments(context).some(
      (el) => el.loc.end.line === node.loc.start.line - 1
    )
  ) {
    return 'mark'
  }
  return null
}

/**
 * Checks whether the given object is an SFC definition.
 * @param {RuleContext} context The ESLint rule context object.
 * @param {ObjectExpression} node Node to check
 * @returns { boolean } `true`, the given object is an SFC definition.
 */
function isSFCObject(context, node) {
  if (node.type !== 'ObjectExpression') {
    return false
  }
  const filePath = context.getFilename()
  const ext = path.extname(filePath)
  if (ext !== '.vue' && ext) {
    return false
  }
  return isSFC(node)

  /**
   * @param {Expression} node
   * @returns {boolean}
   */
  function isSFC(node) {
    const parent = getParent(node)
    switch (parent.type) {
      case 'ExportDefaultDeclaration': {
        // export default {}
        if (skipTSAsExpression(parent.declaration) !== node) {
          return false
        }
        const scriptSetup = getScriptSetupElement(context)
        if (
          scriptSetup &&
          scriptSetup.range[0] <= parent.range[0] &&
          parent.range[1] <= scriptSetup.range[1]
        ) {
          // `export default` in `<script setup>`
          return false
        }
        return true
      }
      case 'CallExpression': {
        if (parent.arguments.every((arg) => skipTSAsExpression(arg) !== node)) {
          return false
        }
        const { callee } = parent
        if (
          (callee.type === 'Identifier' &&
            (callee.name === 'defineComponent' ||
              callee.name === 'defineNuxtComponent')) ||
          (callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'Vue' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'extend')
        ) {
          return isSFC(parent)
        }
        return false
      }
      case 'VariableDeclarator': {
        if (
          skipTSAsExpression(parent.init) !== node ||
          parent.id.type !== 'Identifier'
        ) {
          return false
        }
        const variable = findVariable(getScope(context, node), parent.id)
        if (!variable) {
          return false
        }
        return variable.references.some((ref) => isSFC(ref.identifier))
      }
      // No default
    }
    return false
  }
}

/**
 * Gets the component comments of a given context.
 * @param {RuleContext} context The ESLint rule context object.
 * @return {Token[]} The the component comments.
 */
function getComponentComments(context) {
  let tokens = componentComments.get(context)
  if (tokens) {
    return tokens
  }
  const sourceCode = context.getSourceCode()
  tokens = sourceCode
    .getAllComments()
    .filter((comment) => /@vue\/component/g.test(comment.value))
  componentComments.set(context, tokens)
  return tokens
}

/**
 * Return generator with the all handler nodes defined in the given watcher property.
 * @param {Property|Expression} property
 * @returns {IterableIterator<Expression>}
 */
function* iterateWatchHandlerValues(property) {
  const value = property.type === 'Property' ? property.value : property
  if (value.type === 'ObjectExpression') {
    const handler = findProperty(value, 'handler')
    if (handler) {
      yield handler.value
    }
  } else if (value.type === 'ArrayExpression') {
    for (const element of value.elements.filter(isDef)) {
      if (element.type !== 'SpreadElement') {
        yield* iterateWatchHandlerValues(element)
      }
    }
  } else {
    yield value
  }
}

/**
 * Get the attribute which has the given name.
 * @param {VElement} node The start tag node to check.
 * @param {string} name The attribute name to check.
 * @param {string} [value] The attribute value to check.
 * @returns {VAttribute | null} The found attribute.
 */
function getAttribute(node, name, value) {
  return (
    node.startTag.attributes.find(
      /**
       * @param {VAttribute | VDirective} node
       * @returns {node is VAttribute}
       */
      (node) =>
        !node.directive &&
        node.key.name === name &&
        (value === undefined ||
          (node.value != null && node.value.value === value))
    ) || null
  )
}

/**
 * Get the directive list which has the given name.
 * @param {VElement | VStartTag} node The start tag node to check.
 * @param {string} name The directive name to check.
 * @returns {VDirective[]} The array of `v-slot` directives.
 */
function getDirectives(node, name) {
  const attributes =
    node.type === 'VElement' ? node.startTag.attributes : node.attributes
  return attributes.filter(
    /**
     * @param {VAttribute | VDirective} node
     * @returns {node is VDirective}
     */
    (node) => node.directive && node.key.name.name === name
  )
}
/**
 * Get the directive which has the given name.
 * @param {VElement} node The start tag node to check.
 * @param {string} name The directive name to check.
 * @param {string} [argument] The directive argument to check.
 * @returns {VDirective | null} The found directive.
 */
function getDirective(node, name, argument) {
  return (
    node.startTag.attributes.find(
      /**
       * @param {VAttribute | VDirective} node
       * @returns {node is VDirective}
       */
      (node) =>
        node.directive &&
        node.key.name.name === name &&
        (argument === undefined ||
          (node.key.argument &&
            node.key.argument.type === 'VIdentifier' &&
            node.key.argument.name) === argument)
    ) || null
  )
}

/**
 * Check whether the given start tag has specific directive.
 * @param {VElement} node The start tag node to check.
 * @param {string} name The attribute name to check.
 * @param {string} [value] The attribute value to check.
 * @returns {boolean} `true` if the start tag has the attribute.
 */
function hasAttribute(node, name, value) {
  return Boolean(getAttribute(node, name, value))
}

/**
 * Check whether the given start tag has specific directive.
 * @param {VElement} node The start tag node to check.
 * @param {string} name The directive name to check.
 * @param {string} [argument] The directive argument to check.
 * @returns {boolean} `true` if the start tag has the directive.
 */
function hasDirective(node, name, argument) {
  return Boolean(getDirective(node, name, argument))
}

/**
 * Check whether the given directive node is v-bind same-name shorthand.
 * @param {VAttribute | VDirective} node The directive node to check.
 * @returns {node is VDirective & { value: VExpressionContainer & { expression: Identifier } }} `true` if the directive node is v-bind same-name shorthand.
 */
function isVBindSameNameShorthand(node) {
  return (
    node.directive &&
    node.key.name.name === 'bind' &&
    node.value?.expression?.type === 'Identifier' &&
    node.key.range[0] <= node.value.range[0] &&
    node.value.range[1] <= node.key.range[1]
  )
}

/**
 * Checks whether given defineProps call node has withDefaults.
 * @param {CallExpression} node The node of defineProps
 * @returns {node is CallExpression & { parent: CallExpression }}
 */
function hasWithDefaults(node) {
  return (
    node.parent &&
    node.parent.type === 'CallExpression' &&
    node.parent.arguments[0] === node &&
    node.parent.callee.type === 'Identifier' &&
    node.parent.callee.name === 'withDefaults'
  )
}

/**
 * Get the withDefaults call node from given defineProps call node.
 * @param {CallExpression} node The node of defineProps
 * @returns {CallExpression | null}
 */
function getWithDefaults(node) {
  return hasWithDefaults(node) ? node.parent : null
}

/**
 * Gets a map of the property nodes defined in withDefaults.
 * @param {CallExpression} node The node of defineProps
 * @returns { { [key: string]: Property | undefined } }
 */
function getWithDefaultsProps(node) {
  if (!hasWithDefaults(node)) {
    return {}
  }
  const param = node.parent.arguments[1]
  if (!param || param.type !== 'ObjectExpression') {
    return {}
  }

  /** @type {Record<string, Property>} */
  const result = {}

  for (const prop of param.properties) {
    if (prop.type !== 'Property') {
      continue
    }
    const name = getStaticPropertyName(prop)
    if (name != null) {
      result[name] = prop
    }
  }

  return result
}

/**
 * Gets the props destructure property nodes for defineProp.
 * @param {CallExpression} node The node of defineProps
 * @returns { Record<string, AssignmentProperty | undefined> }
 */
function getPropsDestructure(node) {
  /** @type {ReturnType<typeof getPropsDestructure>} */
  const result = Object.create(null)
  const left = getLeftOfDefineProps(node)
  if (!left || left.type !== 'ObjectPattern') {
    return result
  }
  for (const prop of left.properties) {
    if (prop.type !== 'Property') continue
    const name = getStaticPropertyName(prop)
    if (name != null) {
      result[name] = prop
    }
  }
  return result
}

/**
 * Gets the default definition nodes for defineProp
 * using the props destructure with assignment pattern.
 * @param {CallExpression} node The node of defineProps
 * @returns { Record<string, {prop: AssignmentProperty , expression: Expression} | undefined> }
 */
function getDefaultPropExpressionsForPropsDestructure(node) {
  /** @type {ReturnType<typeof getDefaultPropExpressionsForPropsDestructure>} */
  const result = Object.create(null)
  for (const [name, prop] of Object.entries(getPropsDestructure(node))) {
    if (!prop) continue
    const value = prop.value
    if (value.type !== 'AssignmentPattern') continue
    result[name] = { prop, expression: value.right }
  }
  return result
}

/**
 * Gets the pattern of the left operand of defineProps.
 * @param {CallExpression} node The node of defineProps
 * @returns {Pattern | null} The pattern of the left operand of defineProps
 */
function getLeftOfDefineProps(node) {
  let target = node
  if (hasWithDefaults(target)) {
    target = target.parent
  }
  if (!target.parent) {
    return null
  }
  if (
    target.parent.type === 'VariableDeclarator' &&
    target.parent.init === target
  ) {
    return target.parent.id
  }
  return null
}

/**
 * Get all props from component options object.
 * @param {ObjectExpression} componentObject Object with component definition
 * @return {(ComponentArrayProp | ComponentObjectProp | ComponentUnknownProp)[]} Array of component props
 */
function getComponentPropsFromOptions(componentObject) {
  const propsNode = componentObject.properties.find(
    /**
     * @param {ESNode} p
     * @returns {p is (Property & { key: Identifier & {name: 'props'} })}
     */
    (p) => p.type === 'Property' && getStaticPropertyName(p) === 'props'
  )

  if (!propsNode) {
    return []
  }
  if (
    propsNode.value.type !== 'ObjectExpression' &&
    propsNode.value.type !== 'ArrayExpression'
  ) {
    return [
      {
        type: 'unknown',
        propName: null,
        node: propsNode.value
      }
    ]
  }

  return getComponentPropsFromDefine(propsNode.value)
}

/**
 * Get all emits from component options object.
 * @param {ObjectExpression} componentObject Object with component definition
 * @return {(ComponentArrayEmit | ComponentObjectEmit | ComponentUnknownEmit)[]} Array of component emits
 */
function getComponentEmitsFromOptions(componentObject) {
  const emitsNode = componentObject.properties.find(
    /**
     * @param {ESNode} p
     * @returns {p is (Property & { key: Identifier & {name: 'emits'} })}
     */
    (p) => p.type === 'Property' && getStaticPropertyName(p) === 'emits'
  )

  if (!emitsNode) {
    return []
  }
  if (
    emitsNode.value.type !== 'ObjectExpression' &&
    emitsNode.value.type !== 'ArrayExpression'
  ) {
    return [
      {
        type: 'unknown',
        emitName: null,
        node: emitsNode.value
      }
    ]
  }

  return getComponentEmitsFromDefine(emitsNode.value)
}

/**
 * Get all props from `defineProps` call expression.
 * @param {RuleContext} context The rule context object.
 * @param {CallExpression} node `defineProps` call expression
 * @return {ComponentProp[]} Array of component props
 */
function getComponentPropsFromDefineProps(context, node) {
  if (node.arguments.length > 0) {
    const defNode = getObjectOrArray(context, node.arguments[0])
    if (defNode) {
      return getComponentPropsFromDefine(defNode)
    }
    return [
      {
        type: 'unknown',
        propName: null,
        node: node.arguments[0]
      }
    ]
  }
  const typeArguments =
    'typeArguments' in node ? node.typeArguments : node.typeParameters
  if (typeArguments && typeArguments.params.length > 0) {
    return getComponentPropsFromTypeDefine(context, typeArguments.params[0])
  }
  return [
    {
      type: 'unknown',
      propName: null,
      node: null
    }
  ]
}

/**
 * Get all emits from `defineEmits` call expression.
 * @param {RuleContext} context The rule context object.
 * @param {CallExpression} node `defineEmits` call expression
 * @return {ComponentEmit[]} Array of component emits
 */
function getComponentEmitsFromDefineEmits(context, node) {
  if (node.arguments.length > 0) {
    const defNode = getObjectOrArray(context, node.arguments[0])
    if (defNode) {
      return getComponentEmitsFromDefine(defNode)
    }
    return [
      {
        type: 'unknown',
        emitName: null,
        node: node.arguments[0]
      }
    ]
  }
  const typeArguments =
    'typeArguments' in node ? node.typeArguments : node.typeParameters
  if (typeArguments && typeArguments.params.length > 0) {
    return getComponentEmitsFromTypeDefine(context, typeArguments.params[0])
  }
  return [
    {
      type: 'unknown',
      emitName: null,
      node: null
    }
  ]
}

/**
 * Get all slots from `defineSlots` call expression.
 * @param {RuleContext} context The rule context object.
 * @param {CallExpression} node `defineSlots` call expression
 * @return {ComponentSlot[]} Array of component slots
 */
function getComponentSlotsFromDefineSlots(context, node) {
  const typeArguments =
    'typeArguments' in node ? node.typeArguments : node.typeParameters
  if (typeArguments && typeArguments.params.length > 0) {
    return getComponentSlotsFromTypeDefine(context, typeArguments.params[0])
  }
  return [
    {
      type: 'unknown',
      slotName: null,
      node: null
    }
  ]
}

/**
 * Get model info from `defineModel` call expression.
 * @param {RuleContext} _context The rule context object.
 * @param {CallExpression} node `defineModel` call expression
 * @return {ComponentModel} Object of component model
 */
function getComponentModelFromDefineModel(_context, node) {
  /** @type {ComponentModelName} */
  let name = {
    modelName: 'modelValue',
    node: null
  }
  /** @type {Expression|null} */
  let options =
    node.arguments[0]?.type === 'SpreadElement' ? null : node.arguments[0]
  if (node.arguments.length > 0) {
    const nameNodeCandidate = skipTSAsExpression(node.arguments[0])
    if (nameNodeCandidate.type === 'Literal') {
      name = {
        modelName: String(nameNodeCandidate.value),
        node: nameNodeCandidate
      }
      options =
        node.arguments[1]?.type === 'SpreadElement' ? null : node.arguments[1]
    }
  }

  const typeArguments =
    'typeArguments' in node ? node.typeArguments : node.typeParameters
  if (typeArguments && typeArguments.params.length > 0) {
    return {
      name,
      options,
      typeNode: typeArguments.params[0]
    }
  }
  return {
    name,
    options,
    typeNode: null
  }
}

/**
 * Get all props by looking at all component's properties
 * @param {ObjectExpression|ArrayExpression} propsNode Object with props definition
 * @return {(ComponentArrayProp | ComponentObjectProp | ComponentUnknownProp)[]} Array of component props
 */
function getComponentPropsFromDefine(propsNode) {
  if (propsNode.type === 'ObjectExpression') {
    return propsNode.properties.map(
      /** @returns {ComponentArrayProp | ComponentObjectProp | ComponentUnknownProp} */
      (prop) => {
        if (!isProperty(prop)) {
          return {
            type: 'unknown',
            propName: null,
            node: prop
          }
        }
        const propName = getStaticPropertyName(prop)
        if (propName != null) {
          return {
            type: 'object',
            key: prop.key,
            propName,
            value: skipTSAsExpression(prop.value),
            node: prop
          }
        }
        return {
          type: 'object',
          key: null,
          propName: null,
          value: skipTSAsExpression(prop.value),
          node: prop
        }
      }
    )
  }

  return propsNode.elements.filter(isDef).map((prop) => {
    if (prop.type === 'Literal' || prop.type === 'TemplateLiteral') {
      const propName = getStringLiteralValue(prop)
      if (propName != null) {
        return {
          type: 'array',
          key: prop,
          propName,
          value: null,
          node: prop
        }
      }
    }
    return {
      type: 'array',
      key: null,
      propName: null,
      value: null,
      node: prop
    }
  })
}

/**
 * Get all emits by looking at all component's properties
 * @param {ObjectExpression|ArrayExpression} emitsNode Object with emits definition
 * @return {(ComponentArrayEmit | ComponentObjectEmit | ComponentUnknownEmit)[]} Array of component emits.
 */
function getComponentEmitsFromDefine(emitsNode) {
  if (emitsNode.type === 'ObjectExpression') {
    return emitsNode.properties.map((prop) => {
      if (!isProperty(prop)) {
        return {
          type: 'unknown',
          key: null,
          emitName: null,
          value: null,
          node: prop
        }
      }
      const emitName = getStaticPropertyName(prop)
      if (emitName != null) {
        return {
          type: 'object',
          key: prop.key,
          emitName,
          value: skipTSAsExpression(prop.value),
          node: prop
        }
      }
      return {
        type: 'object',
        key: null,
        emitName: null,
        value: skipTSAsExpression(prop.value),
        node: prop
      }
    })
  }

  return emitsNode.elements.filter(isDef).map((emit) => {
    if (emit.type === 'Literal' || emit.type === 'TemplateLiteral') {
      const emitName = getStringLiteralValue(emit)
      if (emitName != null) {
        return {
          type: 'array',
          key: emit,
          emitName,
          value: null,
          node: emit
        }
      }
    }
    return {
      type: 'array',
      key: null,
      emitName: null,
      value: null,
      node: emit
    }
  })
}

/**
 * @param {RuleContext} context The rule context object.
 * @param {ESNode} node
 * @returns {ObjectExpression | ArrayExpression | null}
 */
function getObjectOrArray(context, node) {
  if (node.type === 'ObjectExpression') {
    return node
  }
  if (node.type === 'ArrayExpression') {
    return node
  }
  if (node.type === 'Identifier') {
    const variable = findVariable(getScope(context, node), node)

    if (variable != null && variable.defs.length === 1) {
      const def = variable.defs[0]
      if (
        def.type === 'Variable' &&
        def.parent.kind === 'const' &&
        def.node.id.type === 'Identifier' &&
        def.node.init
      ) {
        return getObjectOrArray(context, def.node.init)
      }
    }
  }
  return null
}
