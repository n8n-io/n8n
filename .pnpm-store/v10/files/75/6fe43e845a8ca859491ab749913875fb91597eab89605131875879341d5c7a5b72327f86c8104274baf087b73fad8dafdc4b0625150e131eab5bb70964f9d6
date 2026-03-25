import parser from 'postcss-selector-parser'
import { movePseudos } from './pseudoElements'

export function applyImportantSelector(selector, important) {
  let sel = parser().astSync(selector)

  sel.each((sel) => {
    // Wrap with :is if it's not already wrapped
    let isWrapped =
      sel.nodes[0].type === 'pseudo' &&
      sel.nodes[0].value === ':is' &&
      sel.nodes.every((node) => node.type !== 'combinator')

    if (!isWrapped) {
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
