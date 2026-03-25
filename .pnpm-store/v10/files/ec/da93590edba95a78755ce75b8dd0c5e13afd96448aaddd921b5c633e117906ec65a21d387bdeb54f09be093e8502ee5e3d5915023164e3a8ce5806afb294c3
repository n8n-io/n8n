import { length, percentage } from './dataTypes'
import { splitAtTopLevelOnly } from './splitAtTopLevelOnly'

/**
 *
 * https://developer.mozilla.org/en-US/docs/Web/CSS/background-size#formal_syntax
 *
 * background-size =
 *  <bg-size>#
 *
 * <bg-size> =
 *   [ <length-percentage [0,∞]> | auto ]{1,2}  |
 *   cover                                      |
 *   contain
 *
 * <length-percentage> =
 *   <length>      |
 *   <percentage>
 *
 * @param {string} value
 */
export function backgroundSize(value) {
  let keywordValues = ['cover', 'contain']
  // the <length-percentage> type will probably be a css function
  // so we have to use `splitAtTopLevelOnly`
  return splitAtTopLevelOnly(value, ',').every((part) => {
    let sizes = splitAtTopLevelOnly(part, '_').filter(Boolean)
    if (sizes.length === 1 && keywordValues.includes(sizes[0])) return true

    if (sizes.length !== 1 && sizes.length !== 2) return false

    return sizes.every((size) => length(size) || percentage(size) || size === 'auto')
  })
}
