import selectorParser from 'postcss-selector-parser'
import unescape from 'postcss-selector-parser/dist/util/unesc'
import escapeClassName from '../util/escapeClassName'
import prefixSelector from '../util/prefixSelector'
import { movePseudos } from './pseudoElements'
import { splitAtTopLevelOnly } from './splitAtTopLevelOnly'

/** @typedef {import('postcss-selector-parser').Root} Root */
/** @typedef {import('postcss-selector-parser').Selector} Selector */
/** @typedef {import('postcss-selector-parser').Pseudo} Pseudo */
/** @typedef {import('postcss-selector-parser').Node} Node */

/** @typedef {{format: string, respectPrefix: boolean}[]} RawFormats */
/** @typedef {import('postcss-selector-parser').Root} ParsedFormats */
/** @typedef {RawFormats | ParsedFormats} AcceptedFormats */

let MERGE = ':merge'

/**
 * @param {RawFormats} formats
 * @param {{context: any, candidate: string, base: string | null}} options
 * @returns {ParsedFormats | null}
 */
export function formatVariantSelector(formats, { context, candidate }) {
  let prefix = context?.tailwindConfig.prefix ?? ''

  // Parse the format selector into an AST
  let parsedFormats = formats.map((format) => {
    let ast = selectorParser().astSync(format.format)

    return {
      ...format,
      ast: format.respectPrefix ? prefixSelector(prefix, ast) : ast,
    }
  })

  // We start with the candidate selector
  let formatAst = selectorParser.root({
    nodes: [
      selectorParser.selector({
        nodes: [selectorParser.className({ value: escapeClassName(candidate) })],
      }),
    ],
  })

  // And iteratively merge each format selector into the candidate selector
  for (let { ast } of parsedFormats) {
    // 1. Handle :merge() special pseudo-class
    ;[formatAst, ast] = handleMergePseudo(formatAst, ast)

    // 2. Merge the format selector into the current selector AST
    ast.walkNesting((nesting) => nesting.replaceWith(...formatAst.nodes[0].nodes))

    // 3. Keep going!
    formatAst = ast
  }

  return formatAst
}

/**
 * Given any node in a selector this gets the "simple" selector it's a part of
 * A simple selector is just a list of nodes without any combinators
 * Technically :is(), :not(), :has(), etc… can have combinators but those are nested
 * inside the relevant node and won't be picked up so they're fine to ignore
 *
 * @param {Node} node
 * @returns {Node[]}
 **/
function simpleSelectorForNode(node) {
  /** @type {Node[]} */
  let nodes = []

  // Walk backwards until we hit a combinator node (or the start)
  while (node.prev() && node.prev().type !== 'combinator') {
    node = node.prev()
  }

  // Now record all non-combinator nodes until we hit one (or the end)
  while (node && node.type !== 'combinator') {
    nodes.push(node)
    node = node.next()
  }

  return nodes
}

/**
 * Resorts the nodes in a selector to ensure they're in the correct order
 * Tags go before classes, and pseudo classes go after classes
 *
 * @param {Selector} sel
 * @returns {Selector}
 **/
function resortSelector(sel) {
  sel.sort((a, b) => {
    if (a.type === 'tag' && b.type === 'class') {
      return -1
    } else if (a.type === 'class' && b.type === 'tag') {
      return 1
    } else if (a.type === 'class' && b.type === 'pseudo' && b.value.startsWith('::')) {
      return -1
    } else if (a.type === 'pseudo' && a.value.startsWith('::') && b.type === 'class') {
      return 1
    }

    return sel.index(a) - sel.index(b)
  })

  return sel
}

/**
 * Remove extraneous selectors that do not include the base class/candidate
 *
 * Example:
 * Given the utility `.a, .b { color: red}`
 * Given the candidate `sm:b`
 *
 * The final selector should be `.sm\:b` and not `.a, .sm\:b`
 *
 * @param {Selector} ast
 * @param {string} base
 */
export function eliminateIrrelevantSelectors(sel, base) {
  let hasClassesMatchingCandidate = false

  sel.walk((child) => {
    if (child.type === 'class' && child.value === base) {
      hasClassesMatchingCandidate = true
      return false // Stop walking
    }
  })

  if (!hasClassesMatchingCandidate) {
    sel.remove()
  }

  // We do NOT recursively eliminate sub selectors that don't have the base class
  // as this is NOT a safe operation. For example, if we have:
  // `.space-x-2 > :not([hidden]) ~ :not([hidden])`
  // We cannot remove the [hidden] from the :not() because it would change the
  // meaning of the selector.

  // TODO: Can we do this for :matches, :is, and :where?
}

/**
 * @param {string} current
 * @param {AcceptedFormats} formats
 * @param {{context: any, candidate: string, base: string | null}} options
 * @returns {string}
 */
export function finalizeSelector(current, formats, { context, candidate, base }) {
  let separator = context?.tailwindConfig?.separator ?? ':'

  // Split by the separator, but ignore the separator inside square brackets:
  //
  // E.g.: dark:lg:hover:[paint-order:markers]
  //           ┬  ┬     ┬            ┬
  //           │  │     │            ╰── We will not split here
  //           ╰──┴─────┴─────────────── We will split here
  //
  base = base ?? splitAtTopLevelOnly(candidate, separator).pop()

  // Parse the selector into an AST
  let selector = selectorParser().astSync(current)

  // Normalize escaped classes, e.g.:
  //
  // The idea would be to replace the escaped `base` in the selector with the
  // `format`. However, in css you can escape the same selector in a few
  // different ways. This would result in different strings and therefore we
  // can't replace it properly.
  //
  //               base: bg-[rgb(255,0,0)]
  //   base in selector: bg-\\[rgb\\(255\\,0\\,0\\)\\]
  //       escaped base: bg-\\[rgb\\(255\\2c 0\\2c 0\\)\\]
  //
  selector.walkClasses((node) => {
    if (node.raws && node.value.includes(base)) {
      node.raws.value = escapeClassName(unescape(node.raws.value))
    }
  })

  // Remove extraneous selectors that do not include the base candidate
  selector.each((sel) => eliminateIrrelevantSelectors(sel, base))

  // If ffter eliminating irrelevant selectors, we end up with nothing
  // Then the whole "rule" this is associated with does not need to exist
  // We use `null` as a marker value for that case
  if (selector.length === 0) {
    return null
  }

  // If there are no formats that means there were no variants added to the candidate
  // so we can just return the selector as-is
  let formatAst = Array.isArray(formats)
    ? formatVariantSelector(formats, { context, candidate })
    : formats

  if (formatAst === null) {
    return selector.toString()
  }

  let simpleStart = selectorParser.comment({ value: '/*__simple__*/' })
  let simpleEnd = selectorParser.comment({ value: '/*__simple__*/' })

  // We can safely replace the escaped base now, since the `base` section is
  // now in a normalized escaped value.
  selector.walkClasses((node) => {
    if (node.value !== base) {
      return
    }

    let parent = node.parent
    let formatNodes = formatAst.nodes[0].nodes

    // Perf optimization: if the parent is a single class we can just replace it and be done
    if (parent.nodes.length === 1) {
      node.replaceWith(...formatNodes)
      return
    }

    let simpleSelector = simpleSelectorForNode(node)
    parent.insertBefore(simpleSelector[0], simpleStart)
    parent.insertAfter(simpleSelector[simpleSelector.length - 1], simpleEnd)

    for (let child of formatNodes) {
      parent.insertBefore(simpleSelector[0], child.clone())
    }

    node.remove()

    // Re-sort the simple selector to ensure it's in the correct order
    simpleSelector = simpleSelectorForNode(simpleStart)
    let firstNode = parent.index(simpleStart)

    parent.nodes.splice(
      firstNode,
      simpleSelector.length,
      ...resortSelector(selectorParser.selector({ nodes: simpleSelector })).nodes
    )

    simpleStart.remove()
    simpleEnd.remove()
  })

  // Remove unnecessary pseudo selectors that we used as placeholders
  selector.walkPseudos((p) => {
    if (p.value === MERGE) {
      p.replaceWith(p.nodes)
    }
  })

  // Move pseudo elements to the end of the selector (if necessary)
  selector.each((sel) => movePseudos(sel))

  return selector.toString()
}

/**
 *
 * @param {Selector} selector
 * @param {Selector} format
 */
export function handleMergePseudo(selector, format) {
  /** @type {{pseudo: Pseudo, value: string}[]} */
  let merges = []

  // Find all :merge() pseudo-classes in `selector`
  selector.walkPseudos((pseudo) => {
    if (pseudo.value === MERGE) {
      merges.push({
        pseudo,
        value: pseudo.nodes[0].toString(),
      })
    }
  })

  // Find all :merge() "attachments" in `format` and attach them to the matching selector in `selector`
  format.walkPseudos((pseudo) => {
    if (pseudo.value !== MERGE) {
      return
    }

    let value = pseudo.nodes[0].toString()

    // Does `selector` contain a :merge() pseudo-class with the same value?
    let existing = merges.find((merge) => merge.value === value)

    // Nope so there's nothing to do
    if (!existing) {
      return
    }

    // Everything after `:merge()` up to the next combinator is what is attached to the merged selector
    let attachments = []
    let next = pseudo.next()
    while (next && next.type !== 'combinator') {
      attachments.push(next)
      next = next.next()
    }

    let combinator = next

    existing.pseudo.parent.insertAfter(
      existing.pseudo,
      selectorParser.selector({ nodes: attachments.map((node) => node.clone()) })
    )

    pseudo.remove()
    attachments.forEach((node) => node.remove())

    // What about this case:
    // :merge(.group):focus > &
    // :merge(.group):hover &
    if (combinator && combinator.type === 'combinator') {
      combinator.remove()
    }
  })

  return [selector, format]
}
