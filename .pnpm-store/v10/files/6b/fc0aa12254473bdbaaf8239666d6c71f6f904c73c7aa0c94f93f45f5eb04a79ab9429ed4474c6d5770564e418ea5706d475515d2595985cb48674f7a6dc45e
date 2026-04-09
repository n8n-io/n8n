import parser from 'postcss-selector-parser'
import { movePseudos } from './pseudoElements'

export function applyImportantSelector(selector, important) {
  let sel = parser().astSync(selector)

  sel.each((sel) => {
    // For nesting, we only need to wrap a selector with :is() if it has a top-level combinator,
    // e.g. `.dark .text-white`, to be independent of DOM order. Any other selector, including
    // combinators inside of pseudos like `:where()`, are ok to nest.
    let shouldWrap = sel.nodes.some((node) => node.type === 'combinator')

    if (shouldWrap) {
      sel.nodes = [
        parser.pseudo({
          value: ':is',
          nodes: [sel.clone()],
        }),
      ]
    }

    movePseudos(sel)
  })

  return `${important} ${sel.toString()}`
}
