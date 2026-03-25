// @flow
import capitalizeString from '../internalHelpers/_capitalizeString'

import type { SideKeyword } from '../types/sideKeyword'
import type { Styles } from '../types/style'

const sideMap = ['top', 'right', 'bottom', 'left']

/**
 * Shorthand for the border property that splits out individual properties for use with tools like Fela and Styletron. A side keyword can optionally be passed to target only one side's border properties.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   ...border('1px', 'solid', 'red')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${border('1px', 'solid', 'red')}
 * `
 *
 * // CSS as JS Output
 *
 * div {
 *   'borderColor': 'red',
 *   'borderStyle': 'solid',
 *   'borderWidth': `1px`,
 * }
 *
 * // Styles as object usage
 * const styles = {
 *   ...border('top', '1px', 'solid', 'red')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${border('top', '1px', 'solid', 'red')}
 * `
 *
 * // CSS as JS Output
 *
 * div {
 *   'borderTopColor': 'red',
 *   'borderTopStyle': 'solid',
 *   'borderTopWidth': `1px`,
 * }
 */

export default function border(
  sideKeyword: SideKeyword | string | number,
  ...values: Array<string | number>
): Styles {
  if (typeof sideKeyword === 'string' && sideMap.indexOf(sideKeyword) >= 0) {
    return {
      [`border${capitalizeString(sideKeyword)}Width`]: values[0],
      [`border${capitalizeString(sideKeyword)}Style`]: values[1],
      [`border${capitalizeString(sideKeyword)}Color`]: values[2],
    }
  } else {
    values.unshift(sideKeyword)
    return {
      borderWidth: values[0],
      borderStyle: values[1],
      borderColor: values[2],
    }
  }
}
