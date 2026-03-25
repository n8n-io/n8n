// @flow
import type { Styles } from '../types/style'

/**
 * CSS to fully cover an area. Can optionally be passed an offset to act as a "padding".
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   ...cover()
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${cover()}
 * `
 *
 * // CSS as JS Output
 *
 * div: {
 *   'position': 'absolute',
 *   'top': '0',
 *   'right: '0',
 *   'bottom': '0',
 *   'left: '0'
 * }
 */
export default function cover(offset?: number | string = 0): Styles {
  return {
    position: 'absolute',
    top: offset,
    right: offset,
    bottom: offset,
    left: offset,
  }
}
