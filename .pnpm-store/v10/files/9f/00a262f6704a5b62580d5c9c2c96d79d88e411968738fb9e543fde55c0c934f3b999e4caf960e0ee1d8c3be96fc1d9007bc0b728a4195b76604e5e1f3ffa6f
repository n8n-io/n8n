// @flow
import type { Styles } from '../types/style'

/**
 * CSS to contain a float (credit to CSSMojo).
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *    ...clearFix(),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${clearFix()}
 * `
 *
 * // CSS as JS Output
 *
 * '&::after': {
 *   'clear': 'both',
 *   'content': '""',
 *   'display': 'table'
 * }
 */
export default function clearFix(parent?: string = '&'): Styles {
  const pseudoSelector = `${parent}::after`
  return {
    [pseudoSelector]: {
      clear: 'both',
      content: '""',
      display: 'table',
    },
  }
}
