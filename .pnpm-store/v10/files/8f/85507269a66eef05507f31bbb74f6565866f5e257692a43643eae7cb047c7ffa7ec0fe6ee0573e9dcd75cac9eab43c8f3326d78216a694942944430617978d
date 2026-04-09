import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import { flagEnabled } from '../featureFlags'

let getNode = {
  id(node) {
    return selectorParser.attribute({
      attribute: 'id',
      operator: '=',
      value: node.value,
      quoteMark: '"',
    })
  },
}

function minimumImpactSelector(nodes) {
  let rest = nodes
    .filter((node) => {
      // Keep non-pseudo nodes
      if (node.type !== 'pseudo') return true

      // Keep pseudo nodes that have subnodes
      // E.g.: `:not()` contains subnodes inside the parentheses
      if (node.nodes.length > 0) return true

      // Keep pseudo `elements`
      // This implicitly means that we ignore pseudo `classes`
      return (
        node.value.startsWith('::') ||
        [':before', ':after', ':first-line', ':first-letter'].includes(node.value)
      )
    })
    .reverse()

  let searchFor = new Set(['tag', 'class', 'id', 'attribute'])

  let splitPointIdx = rest.findIndex((n) => searchFor.has(n.type))
  if (splitPointIdx === -1) return rest.reverse().join('').trim()

  let node = rest[splitPointIdx]
  let bestNode = getNode[node.type] ? getNode[node.type](node) : node

  rest = rest.slice(0, splitPointIdx)

  let combinatorIdx = rest.findIndex((n) => n.type === 'combinator' && n.value === '>')
  if (combinatorIdx !== -1) {
    rest.splice(0, combinatorIdx)
    rest.unshift(selectorParser.universal())
  }

  return [bestNode, ...rest.reverse()].join('').trim()
}

export let elementSelectorParser = selectorParser((selectors) => {
  return selectors.map((s) => {
    let nodes = s.split((n) => n.type === 'combinator' && n.value === ' ').pop()
    return minimumImpactSelector(nodes)
  })
})

let cache = new Map()

function extractElementSelector(selector) {
  if (!cache.has(selector)) {
    cache.set(selector, elementSelectorParser.transformSync(selector))
  }

  return cache.get(selector)
}

export default function resolveDefaultsAtRules({ tailwindConfig }) {
  return (root) => {
    let variableNodeMap = new Map()

    /** @type {Set<import('postcss').AtRule>} */
    let universals = new Set()

    root.walkAtRules('defaults', (rule) => {
      if (rule.nodes && rule.nodes.length > 0) {
        universals.add(rule)
        return
      }

      let variable = rule.params
      if (!variableNodeMap.has(variable)) {
        variableNodeMap.set(variable, new Set())
      }

      variableNodeMap.get(variable).add(rule.parent)

      rule.remove()
    })

    if (flagEnabled(tailwindConfig, 'optimizeUniversalDefaults')) {
      for (let universal of universals) {
        /** @type {Map<string, Set<string>>} */
        let selectorGroups = new Map()

        let rules = variableNodeMap.get(universal.params) ?? []

        for (let rule of rules) {
          for (let selector of extractElementSelector(rule.selector)) {
            // If selector contains a vendor prefix after a pseudo element or class,
            // we consider them separately because merging the declarations into
            // a single rule will cause browsers that do not understand the
            // vendor prefix to throw out the whole rule
            // Additionally if a selector contains `:has` we also consider
            // it separately because FF only recently gained support for it
            let selectorGroupName =
              selector.includes(':-') || selector.includes('::-') || selector.includes(':has')
                ? selector
                : '__DEFAULT__'

            let selectors = selectorGroups.get(selectorGroupName) ?? new Set()
            selectorGroups.set(selectorGroupName, selectors)

            selectors.add(selector)
          }
        }

        if (selectorGroups.size === 0) {
          universal.remove()
          continue
        }

        for (let [, selectors] of selectorGroups) {
          let universalRule = postcss.rule({
            source: universal.source,
          })

          universalRule.selectors = [...selectors]

          universalRule.append(universal.nodes.map((node) => node.clone()))
          universal.before(universalRule)
        }

        universal.remove()
      }
    } else if (universals.size) {
      let universalRule = postcss.rule({
        selectors: ['*', '::before', '::after'],
      })

      for (let universal of universals) {
        universalRule.append(universal.nodes)

        if (!universalRule.parent) {
          universal.before(universalRule)
        }

        if (!universalRule.source) {
          universalRule.source = universal.source
        }

        universal.remove()
      }

      let backdropRule = universalRule.clone({
        selectors: ['::backdrop'],
      })

      universalRule.after(backdropRule)
    }
  }
}
