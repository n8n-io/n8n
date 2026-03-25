// @flow
import PolishedError from '../internalHelpers/_errors'

import type { Styles } from '../types/style'

/**
 * Shorthand for easily setting the animation property. Allows either multiple arrays with animations
 * or a single animation spread over the arguments.
 * @example
 * // Styles as object usage
 * const styles = {
 *   ...animation(['rotate', '1s', 'ease-in-out'], ['colorchange', '2s'])
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${animation(['rotate', '1s', 'ease-in-out'], ['colorchange', '2s'])}
 * `
 *
 * // CSS as JS Output
 *
 * div {
 *   'animation': 'rotate 1s ease-in-out, colorchange 2s'
 * }
 * @example
 * // Styles as object usage
 * const styles = {
 *   ...animation('rotate', '1s', 'ease-in-out')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${animation('rotate', '1s', 'ease-in-out')}
 * `
 *
 * // CSS as JS Output
 *
 * div {
 *   'animation': 'rotate 1s ease-in-out'
 * }
 */
export default function animation(
  ...args: Array<Array<string | number> | string | number>
): Styles {
  // Allow single or multiple animations passed
  const multiMode = Array.isArray(args[0])
  if (!multiMode && args.length > 8) {
    throw new PolishedError(64)
  }
  const code = args
    .map(arg => {
      if ((multiMode && !Array.isArray(arg)) || (!multiMode && Array.isArray(arg))) {
        throw new PolishedError(65)
      }
      if (Array.isArray(arg) && arg.length > 8) {
        throw new PolishedError(66)
      }

      return Array.isArray(arg) ? arg.join(' ') : arg
    })
    .join(', ')

  return {
    animation: code,
  }
}
