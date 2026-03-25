// @flow
import curry from '../internalHelpers/_curry'
import mix from './mix'

/**
 * Tints a color by mixing it with white. `tint` can produce
 * hue shifts, where as `lighten` manipulates the luminance channel and therefore
 * doesn't produce hue shifts.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: tint(0.25, '#00f')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${tint(0.25, '#00f')};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "#bfbfff";
 * }
 */

function tint(percentage: number | string, color: string): string {
  if (color === 'transparent') return color
  return mix(parseFloat(percentage), 'rgb(255, 255, 255)', color)
}

// prettier-ignore
const curriedTint = curry/* ::<number | string, string, string> */(tint)
export default curriedTint
