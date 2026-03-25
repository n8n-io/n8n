const { Rule, AtRule } = require('postcss')
let parser = require('postcss-selector-parser')

/**
 * Run a selector string through postcss-selector-parser
 */
function parse(rawSelector, rule) {
  let nodes
  try {
    parser(parsed => {
      nodes = parsed
    }).processSync(rawSelector)
  } catch (e) {
    if (rawSelector.includes(':')) {
      throw rule ? rule.error('Missed semicolon') : e
    } else {
      throw rule ? rule.error(e.message) : e
    }
  }
  return nodes.at(0)
}

/**
 * Replaces the "&" token in a node's selector with the parent selector
 * similar to what SCSS does.
 *
 * Mutates the nodes list
 */
function interpolateAmpInSelector(nodes, parent) {
  let replaced = false
  nodes.each(node => {
    if (node.type === 'nesting') {
      let clonedParent = parent.clone({})
      if (node.value !== '&') {
        node.replaceWith(
          parse(node.value.replace('&', clonedParent.toString()))
        )
      } else {
        node.replaceWith(clonedParent)
      }
      replaced = true
    } else if ('nodes' in node && node.nodes) {
      if (interpolateAmpInSelector(node, parent)) {
        replaced = true
      }
    }
  })
  return replaced
}

/**
 * Combines parent and child selectors, in a SCSS-like way
 */
function mergeSelectors(parent, child) {
  let merged = []
  parent.selectors.forEach(sel => {
    let parentNode = parse(sel, parent)

    child.selectors.forEach(selector => {
      if (!selector) {
        return
      }
      let node = parse(selector, child)
      let replaced = interpolateAmpInSelector(node, parentNode)
      if (!replaced) {
        node.prepend(parser.combinator({ value: ' ' }))
        node.prepend(parentNode.clone({}))
      }
      merged.push(node.toString())
    })
  })
  return merged
}

/**
 * Move a child and its preceeding comment(s) to after "after"
 */
function breakOut(child, after) {
  let prev = child.prev()
  after.after(child)
  while (prev && prev.type === 'comment') {
    let nextPrev = prev.prev()
    after.after(prev)
    prev = nextPrev
  }
  return child
}

function createFnAtruleChilds(bubble) {
  return function atruleChilds(rule, atrule, bubbling, mergeSels = bubbling) {
    let children = []
    atrule.each(child => {
      if (child.type === 'rule' && bubbling) {
        if (mergeSels) {
          child.selectors = mergeSelectors(rule, child)
        }
      } else if (child.type === 'atrule' && child.nodes) {
        if (bubble[child.name]) {
          atruleChilds(rule, child, mergeSels)
        } else if (atrule[rootRuleMergeSel] !== false) {
          children.push(child)
        }
      } else {
        children.push(child)
      }
    })
    if (bubbling) {
      if (children.length) {
        let clone = rule.clone({ nodes: [] })
        for (let child of children) {
          clone.append(child)
        }
        atrule.prepend(clone)
      }
    }
  }
}

function pickDeclarations(selector, declarations, after) {
  let parent = new Rule({
    selector,
    nodes: []
  })
  parent.append(declarations)
  after.after(parent)
  return parent
}

function atruleNames(defaults, custom) {
  let list = {}
  for (let name of defaults) {
    list[name] = true
  }
  if (custom) {
    for (let name of custom) {
      list[name.replace(/^@/, '')] = true
    }
  }
  return list
}

function parseRootRuleParams(params) {
  params = params.trim()
  let braceBlock = params.match(/^\((.*)\)$/)
  if (!braceBlock) {
    return { type: 'basic', selector: params }
  }
  let bits = braceBlock[1].match(/^(with(?:out)?):(.+)$/)
  if (bits) {
    let allowlist = bits[1] === 'with'
    let rules = Object.fromEntries(
      bits[2]
        .trim()
        .split(/\s+/)
        .map(name => [name, true])
    )
    if (allowlist && rules.all) {
      return { type: 'noop' }
    }
    let escapes = rule => !!rules[rule]
    if (rules.all) {
      escapes = () => true
    } else if (allowlist) {
      escapes = rule => (rule === 'all' ? false : !rules[rule])
    }

    return {
      type: 'withrules',
      escapes
    }
  }
  // Unrecognized brace block
  return { type: 'unknown' }
}

function getAncestorRules(leaf) {
  let lineage = []
  let parent = leaf.parent

  while (parent && parent instanceof AtRule) {
    lineage.push(parent)
    parent = parent.parent
  }
  return lineage
}

function unwrapRootRule(rule) {
  let escapes = rule[rootRuleEscapes]

  if (!escapes) {
    rule.after(rule.nodes)
  } else {
    let nodes = rule.nodes

    let topEscaped
    let topEscapedIdx = -1
    let breakoutLeaf
    let breakoutRoot
    let clone

    let lineage = getAncestorRules(rule)
    lineage.forEach((parent, i) => {
      if (escapes(parent.name)) {
        topEscaped = parent
        topEscapedIdx = i
        breakoutRoot = clone
      } else {
        let oldClone = clone
        clone = parent.clone({ nodes: [] })
        oldClone && clone.append(oldClone)
        breakoutLeaf = breakoutLeaf || clone
      }
    })

    if (!topEscaped) {
      rule.after(nodes)
    } else if (!breakoutRoot) {
      topEscaped.after(nodes)
    } else {
      let leaf = breakoutLeaf
      leaf.append(nodes)
      topEscaped.after(breakoutRoot)
    }

    if (rule.next() && topEscaped) {
      let restRoot
      lineage.slice(0, topEscapedIdx + 1).forEach((parent, i, arr) => {
        let oldRoot = restRoot
        restRoot = parent.clone({ nodes: [] })
        oldRoot && restRoot.append(oldRoot)

        let nextSibs = []
        let _child = arr[i - 1] || rule
        let next = _child.next()
        while (next) {
          nextSibs.push(next)
          next = next.next()
        }
        restRoot.append(nextSibs)
      })
      restRoot && (breakoutRoot || nodes[nodes.length - 1]).after(restRoot)
    }
  }

  rule.remove()
}

const rootRuleMergeSel = Symbol('rootRuleMergeSel')
const rootRuleEscapes = Symbol('rootRuleEscapes')

function normalizeRootRule(rule) {
  let { params } = rule
  let { type, selector, escapes } = parseRootRuleParams(params)
  if (type === 'unknown') {
    throw rule.error(
      `Unknown @${rule.name} parameter ${JSON.stringify(params)}`
    )
  }
  if (type === 'basic' && selector) {
    let selectorBlock = new Rule({ selector, nodes: rule.nodes })
    rule.removeAll()
    rule.append(selectorBlock)
  }
  rule[rootRuleEscapes] = escapes
  rule[rootRuleMergeSel] = escapes ? !escapes('all') : type === 'noop'
}

const hasRootRule = Symbol('hasRootRule')

module.exports = (opts = {}) => {
  let bubble = atruleNames(
    ['media', 'supports', 'layer', 'container'],
    opts.bubble
  )
  let atruleChilds = createFnAtruleChilds(bubble)
  let unwrap = atruleNames(
    [
      'document',
      'font-face',
      'keyframes',
      '-webkit-keyframes',
      '-moz-keyframes'
    ],
    opts.unwrap
  )
  let rootRuleName = (opts.rootRuleName || 'at-root').replace(/^@/, '')
  let preserveEmpty = opts.preserveEmpty

  return {
    postcssPlugin: 'postcss-nested',

    Once(root) {
      root.walkAtRules(rootRuleName, node => {
        normalizeRootRule(node)
        root[hasRootRule] = true
      })
    },

    Rule(rule) {
      let unwrapped = false
      let after = rule
      let copyDeclarations = false
      let declarations = []

      rule.each(child => {
        if (child.type === 'rule') {
          if (declarations.length) {
            after = pickDeclarations(rule.selector, declarations, after)
            declarations = []
          }

          copyDeclarations = true
          unwrapped = true
          child.selectors = mergeSelectors(rule, child)
          after = breakOut(child, after)
        } else if (child.type === 'atrule') {
          if (declarations.length) {
            after = pickDeclarations(rule.selector, declarations, after)
            declarations = []
          }
          if (child.name === rootRuleName) {
            unwrapped = true
            atruleChilds(rule, child, true, child[rootRuleMergeSel])
            after = breakOut(child, after)
          } else if (bubble[child.name]) {
            copyDeclarations = true
            unwrapped = true
            atruleChilds(rule, child, true)
            after = breakOut(child, after)
          } else if (unwrap[child.name]) {
            copyDeclarations = true
            unwrapped = true
            atruleChilds(rule, child, false)
            after = breakOut(child, after)
          } else if (copyDeclarations) {
            declarations.push(child)
          }
        } else if (child.type === 'decl' && copyDeclarations) {
          declarations.push(child)
        }
      })

      if (declarations.length) {
        after = pickDeclarations(rule.selector, declarations, after)
      }

      if (unwrapped && preserveEmpty !== true) {
        rule.raws.semicolon = true
        if (rule.nodes.length === 0) rule.remove()
      }
    },

    RootExit(root) {
      if (root[hasRootRule]) {
        root.walkAtRules(rootRuleName, unwrapRootRule)
        root[hasRootRule] = false
      }
    }
  }
}
module.exports.postcss = true
