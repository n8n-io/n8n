import postcss from 'postcss'
import cloneNodes from './cloneNodes'

export default function responsive(rules) {
  return postcss
    .atRule({
      name: 'responsive',
    })
    .append(cloneNodes(Array.isArray(rules) ? rules : [rules]))
}
