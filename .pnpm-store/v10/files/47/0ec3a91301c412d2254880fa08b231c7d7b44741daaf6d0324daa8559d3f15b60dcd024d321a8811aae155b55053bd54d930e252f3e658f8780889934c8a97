import parser from 'postcss-selector-parser'
import escapeCommas from './escapeCommas'

export default function escapeClassName(className) {
  let node = parser.className()
  node.value = className
  return escapeCommas(node?.raws?.value ?? node.value)
}
