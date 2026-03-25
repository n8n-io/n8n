/**
 * @param {import('postcss').Container[]} nodes
 * @param {any} source
 * @param {any} raws
 * @returns {import('postcss').Container[]}
 */
export default function cloneNodes(nodes, source = undefined, raws = undefined) {
  return nodes.map((node) => {
    let cloned = node.clone()

    if (raws !== undefined) {
      cloned.raws.tailwind = {
        ...cloned.raws.tailwind,
        ...raws,
      }
    }

    if (source !== undefined) {
      traverse(cloned, (node) => {
        // Do not traverse nodes that have opted
        // to preserve their original source
        let shouldPreserveSource = node.raws.tailwind?.preserveSource === true && node.source
        if (shouldPreserveSource) {
          return false
        }

        // Otherwise we can safely replace the source
        // And continue traversing
        node.source = source
      })
    }

    return cloned
  })
}

/**
 * Traverse a tree of nodes and don't traverse children if the callback
 * returns false. Ideally we'd use Container#walk instead of this
 * function but it stops traversing siblings too.
 *
 * @param {import('postcss').Container} node
 * @param {(node: import('postcss').Container) => boolean} onNode
 */
function traverse(node, onNode) {
  if (onNode(node) !== false) {
    node.each?.((child) => traverse(child, onNode))
  }
}
