/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 */
'use strict'

/**
 * @typedef {import('eslint').Linter.LintMessage} LintMessage
 */
/**
 * @typedef {object} GroupState
 * @property {Set<string>} GroupState.disableAllKeys
 * @property {Map<string, string[]>} GroupState.disableRuleKeys
 */

module.exports = {
  /** @param {string} code */
  preprocess(code) {
    return [code]
  },

  /**
   * @param {LintMessage[][]} messages
   * @returns {LintMessage[]}
   */
  postprocess(messages) {
    const state = {
      /** @type {GroupState} */
      block: {
        disableAllKeys: new Set(),
        disableRuleKeys: new Map()
      },
      /** @type {GroupState} */
      line: {
        disableAllKeys: new Set(),
        disableRuleKeys: new Map()
      }
    }
    /** @type {string[]} */
    const usedDisableDirectiveKeys = []
    /** @type {Map<string,LintMessage>} */
    const unusedDisableDirectiveReports = new Map()

    // Filter messages which are in disabled area.
    const filteredMessages = messages[0].filter((message) => {
      if (message.ruleId === 'vue/comment-directive') {
        const directiveType = message.messageId
        const data = message.message.split(' ')
        switch (directiveType) {
          case 'disableBlock': {
            state.block.disableAllKeys.add(data[1])
            break
          }
          case 'disableLine': {
            state.line.disableAllKeys.add(data[1])
            break
          }
          case 'enableBlock': {
            state.block.disableAllKeys.clear()
            break
          }
          case 'enableLine': {
            state.line.disableAllKeys.clear()
            break
          }
          case 'disableBlockRule': {
            addDisableRule(state.block.disableRuleKeys, data[1], data[2])
            break
          }
          case 'disableLineRule': {
            addDisableRule(state.line.disableRuleKeys, data[1], data[2])
            break
          }
          case 'enableBlockRule': {
            state.block.disableRuleKeys.delete(data[1])
            break
          }
          case 'enableLineRule': {
            state.line.disableRuleKeys.delete(data[1])
            break
          }
          case 'clear': {
            state.block.disableAllKeys.clear()
            state.block.disableRuleKeys.clear()
            state.line.disableAllKeys.clear()
            state.line.disableRuleKeys.clear()
            break
          }
          default: {
            // unused eslint-disable comments report
            unusedDisableDirectiveReports.set(messageToKey(message), message)
            break
          }
        }
        return false
      } else {
        const disableDirectiveKeys = []
        if (state.block.disableAllKeys.size > 0) {
          disableDirectiveKeys.push(...state.block.disableAllKeys)
        }
        if (state.line.disableAllKeys.size > 0) {
          disableDirectiveKeys.push(...state.line.disableAllKeys)
        }
        if (message.ruleId) {
          const block = state.block.disableRuleKeys.get(message.ruleId)
          if (block) {
            disableDirectiveKeys.push(...block)
          }
          const line = state.line.disableRuleKeys.get(message.ruleId)
          if (line) {
            disableDirectiveKeys.push(...line)
          }
        }

        if (disableDirectiveKeys.length > 0) {
          // Store used eslint-disable comment key
          usedDisableDirectiveKeys.push(...disableDirectiveKeys)
          return false
        } else {
          return true
        }
      }
    })

    if (unusedDisableDirectiveReports.size > 0) {
      for (const key of usedDisableDirectiveKeys) {
        // Remove used eslint-disable comments
        unusedDisableDirectiveReports.delete(key)
      }
      // Reports unused eslint-disable comments
      filteredMessages.push(...unusedDisableDirectiveReports.values())
      filteredMessages.sort(compareLocations)
    }

    return filteredMessages
  },

  supportsAutofix: true,

  meta: require('./meta')
}

/**
 * @param {Map<string, string[]>} disableRuleKeys
 * @param {string} rule
 * @param {string} key
 */
function addDisableRule(disableRuleKeys, rule, key) {
  let keys = disableRuleKeys.get(rule)
  if (keys) {
    keys.push(key)
  } else {
    keys = [key]
    disableRuleKeys.set(rule, keys)
  }
}

/**
 * @param {LintMessage} message
 * @returns {string} message key
 */
function messageToKey(message) {
  return `line:${message.line},column${
    // -1 because +1 by ESLint's `report-translator`.
    message.column - 1
  }`
}

/**
 * Compares the locations of two objects in a source file
 * @param {Position} itemA The first object
 * @param {Position} itemB The second object
 * @returns {number} A value less than 1 if itemA appears before itemB in the source file, greater than 1 if
 * itemA appears after itemB in the source file, or 0 if itemA and itemB have the same location.
 */
function compareLocations(itemA, itemB) {
  return itemA.line - itemB.line || itemA.column - itemB.column
}
