// @flow
import type { Styles } from '../types/style'

/**
 * Provides an easy way to change the `wordWrap` property.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   ...wordWrap('break-word')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${wordWrap('break-word')}
 * `
 *
 * // CSS as JS Output
 *
 * const styles = {
 *   overflowWrap: 'break-word',
 *   wordWrap: 'break-word',
 *   wordBreak: 'break-all',
 * }
 */
export default function wordWrap(wrap?: string = 'break-word'): Styles {
  const wordBreak = wrap === 'break-word' ? 'break-all' : wrap
  return {
    overflowWrap: wrap,
    wordWrap: wrap,
    wordBreak,
  }
}
