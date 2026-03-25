/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 */
/* eslint-disable eslint-plugin/report-message-format */

'use strict'

const utils = require('../utils')

/**
 * @typedef {object} RuleAndLocation
 * @property {string} RuleAndLocation.ruleId
 * @property {number} RuleAndLocation.index
 * @property {string} [RuleAndLocation.key]
 */

const COMMENT_DIRECTIVE_B = /^\s*(eslint-(?:en|dis)able)(?:\s+|$)/
const COMMENT_DIRECTIVE_L = /^\s*(eslint-disable(?:-next)?-line)(?:\s+|$)/

/**
 * Remove the ignored part from a given directive comment and trim it.
 * @param {string} value The comment text to strip.
 * @returns {string} The stripped text.
 */
function stripDirectiveComment(value) {
  return value.split(/\s-{2,}\s/u)[0]
}

/**
 * Parse a given comment.
 * @param {RegExp} pattern The RegExp pattern to parse.
 * @param {string} comment The comment value to parse.
 * @returns {({type:string,rules:RuleAndLocation[]})|null} The parsing result.
 */
function parse(pattern, comment) {
  const text = stripDirectiveComment(comment)
  const match = pattern.exec(text)
  if (match == null) {
    return null
  }

  const type = match[1]

  /** @type {RuleAndLocation[]} */
  const rules = []

  const rulesRe = /([^\s,]+)[\s,]*/g
  let startIndex = match[0].length
  rulesRe.lastIndex = startIndex

  let res
  while ((res = rulesRe.exec(text))) {
    const ruleId = res[1].trim()
    rules.push({
      ruleId,
      index: startIndex
    })
    startIndex = rulesRe.lastIndex
  }

  return { type, rules }
}

/**
 * Enable rules.
 * @param {RuleContext} context The rule context.
 * @param {{line:number,column:number}} loc The location information to enable.
 * @param { 'block' | 'line' } group The group to enable.
 * @param {string | null} rule The rule ID to enable.
 * @returns {void}
 */
function enable(context, loc, group, rule) {
  if (rule) {
    context.report({
      loc,
      messageId: group === 'block' ? 'enableBlockRule' : 'enableLineRule',
      data: { rule }
    })
  } else {
    context.report({
      loc,
      messageId: group === 'block' ? 'enableBlock' : 'enableLine'
    })
  }
}

/**
 * Disable rules.
 * @param {RuleContext} context The rule context.
 * @param {{line:number,column:number}} loc The location information to disable.
 * @param { 'block' | 'line' } group The group to disable.
 * @param {string | null} rule The rule ID to disable.
 * @param {string} key The disable directive key.
 * @returns {void}
 */
function disable(context, loc, group, rule, key) {
  if (rule) {
    context.report({
      loc,
      messageId: group === 'block' ? 'disableBlockRule' : 'disableLineRule',
      data: { rule, key }
    })
  } else {
    context.report({
      loc,
      messageId: group === 'block' ? 'disableBlock' : 'disableLine',
      data: { key }
    })
  }
}

/**
 * Process a given comment token.
 * If the comment is `eslint-disable` or `eslint-enable` then it reports the comment.
 * @param {RuleContext} context The rule context.
 * @param {Token} comment The comment token to process.
 * @param {boolean} reportUnusedDisableDirectives To report unused eslint-disable comments.
 * @returns {void}
 */
function processBlock(context, comment, reportUnusedDisableDirectives) {
  const parsed = parse(COMMENT_DIRECTIVE_B, comment.value)
  if (parsed === null) return

  if (parsed.type === 'eslint-disable') {
    if (parsed.rules.length > 0) {
      const rules = reportUnusedDisableDirectives
        ? reportUnusedRules(context, comment, parsed.type, parsed.rules)
        : parsed.rules
      for (const rule of rules) {
        disable(
          context,
          comment.loc.start,
          'block',
          rule.ruleId,
          rule.key || '*'
        )
      }
    } else {
      const key = reportUnusedDisableDirectives
        ? reportUnused(context, comment, parsed.type)
        : ''
      disable(context, comment.loc.start, 'block', null, key)
    }
  } else {
    if (parsed.rules.length > 0) {
      for (const rule of parsed.rules) {
        enable(context, comment.loc.start, 'block', rule.ruleId)
      }
    } else {
      enable(context, comment.loc.start, 'block', null)
    }
  }
}

/**
 * Process a given comment token.
 * If the comment is `eslint-disable-line` or `eslint-disable-next-line` then it reports the comment.
 * @param {RuleContext} context The rule context.
 * @param {Token} comment The comment token to process.
 * @param {boolean} reportUnusedDisableDirectives To report unused eslint-disable comments.
 * @returns {void}
 */
function processLine(context, comment, reportUnusedDisableDirectives) {
  const parsed = parse(COMMENT_DIRECTIVE_L, comment.value)
  if (parsed != null && comment.loc.start.line === comment.loc.end.line) {
    const line =
      comment.loc.start.line + (parsed.type === 'eslint-disable-line' ? 0 : 1)
    const column = -1
    if (parsed.rules.length > 0) {
      const rules = reportUnusedDisableDirectives
        ? reportUnusedRules(context, comment, parsed.type, parsed.rules)
        : parsed.rules
      for (const rule of rules) {
        disable(context, { line, column }, 'line', rule.ruleId, rule.key || '')
        enable(context, { line: line + 1, column }, 'line', rule.ruleId)
      }
    } else {
      const key = reportUnusedDisableDirectives
        ? reportUnused(context, comment, parsed.type)
        : ''
      disable(context, { line, column }, 'line', null, key)
      enable(context, { line: line + 1, column }, 'line', null)
    }
  }
}

/**
 * Reports unused disable directive.
 * Do not check the use of directives here. Filter the directives used with postprocess.
 * @param {RuleContext} context The rule context.
 * @param {Token} comment The comment token to report.
 * @param {string} kind The comment directive kind.
 * @returns {string} The report key
 */
function reportUnused(context, comment, kind) {
  const loc = comment.loc

  context.report({
    loc,
    messageId: 'unused',
    data: { kind }
  })

  return locToKey(loc.start)
}

/**
 * Reports unused disable directive rules.
 * Do not check the use of directives here. Filter the directives used with postprocess.
 * @param {RuleContext} context The rule context.
 * @param {Token} comment The comment token to report.
 * @param {string} kind The comment directive kind.
 * @param {RuleAndLocation[]} rules To report rule.
 * @returns { { ruleId: string, key: string }[] }
 */
function reportUnusedRules(context, comment, kind, rules) {
  const sourceCode = context.getSourceCode()
  const commentStart = comment.range[0] + 4 /* <!-- */

  return rules.map((rule) => {
    const start = sourceCode.getLocFromIndex(commentStart + rule.index)
    const end = sourceCode.getLocFromIndex(
      commentStart + rule.index + rule.ruleId.length
    )

    context.report({
      loc: { start, end },
      messageId: 'unusedRule',
      data: { rule: rule.ruleId, kind }
    })

    return {
      ruleId: rule.ruleId,
      key: locToKey(start)
    }
  })
}

/**
 * Gets the key of location
 * @param {Position} location The location
 * @returns {string} The key
 */
function locToKey(location) {
  return `line:${location.line},column${location.column}`
}

/**
 * Extracts the top-level elements in document fragment.
 * @param {VDocumentFragment} documentFragment The document fragment.
 * @returns {VElement[]} The top-level elements
 */
function extractTopLevelHTMLElements(documentFragment) {
  return documentFragment.children.filter(utils.isVElement)
}
/**
 * Extracts the top-level comments in document fragment.
 * @param {VDocumentFragment} documentFragment The document fragment.
 * @returns {Token[]} The top-level comments
 */
function extractTopLevelDocumentFragmentComments(documentFragment) {
  const elements = extractTopLevelHTMLElements(documentFragment)

  return documentFragment.comments.filter((comment) =>
    elements.every(
      (element) =>
        comment.range[1] <= element.range[0] ||
        element.range[1] <= comment.range[0]
    )
  )
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'support comment-directives in `<template>`', // eslint-disable-line eslint-plugin/require-meta-docs-description
      categories: ['base'],
      url: 'https://eslint.vuejs.org/rules/comment-directive.html'
    },
    schema: [
      {
        type: 'object',
        properties: {
          reportUnusedDisableDirectives: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      disableBlock: '--block {{key}}',
      enableBlock: '++block',
      disableLine: '--line {{key}}',
      enableLine: '++line',
      disableBlockRule: '-block {{rule}} {{key}}',
      enableBlockRule: '+block {{rule}}',
      disableLineRule: '-line {{rule}} {{key}}',
      enableLineRule: '+line {{rule}}',
      clear: 'clear',

      unused: 'Unused {{kind}} directive (no problems were reported).',
      unusedRule:
        "Unused {{kind}} directive (no problems were reported from '{{rule}}')."
    }
  },
  /**
   * @param {RuleContext} context - The rule context.
   * @returns {RuleListener} AST event handlers.
   */
  create(context) {
    const options = context.options[0] || {}
    /** @type {boolean} */
    const reportUnusedDisableDirectives = options.reportUnusedDisableDirectives
    const sourceCode = context.getSourceCode()
    const documentFragment =
      sourceCode.parserServices.getDocumentFragment &&
      sourceCode.parserServices.getDocumentFragment()

    return {
      Program(node) {
        if (node.templateBody) {
          // Send directives to the post-process.
          for (const comment of node.templateBody.comments) {
            processBlock(context, comment, reportUnusedDisableDirectives)
            processLine(context, comment, reportUnusedDisableDirectives)
          }

          // Send a clear mark to the post-process.
          context.report({
            loc: node.templateBody.loc.end,
            messageId: 'clear'
          })
        }
        if (documentFragment) {
          // Send directives to the post-process.
          for (const comment of extractTopLevelDocumentFragmentComments(
            documentFragment
          )) {
            processBlock(context, comment, reportUnusedDisableDirectives)
            processLine(context, comment, reportUnusedDisableDirectives)
          }

          // Send a clear mark to the post-process.
          for (const element of extractTopLevelHTMLElements(documentFragment)) {
            context.report({
              loc: element.loc.end,
              messageId: 'clear'
            })
          }
        }
      }
    }
  }
}
