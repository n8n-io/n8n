// @flow
import curry from '../internalHelpers/_curry'
import mix from './mix'

/**
 * Shades a color by mixing it with black. `shade` can produce
 * hue shifts, where as `darken` manipulates the luminance channel and therefore
 * doesn't produce hue shifts.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: shade(0.25, '#00f')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${shade(0.25, '#00f')};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "#00003f";
 * }
 */

function shade(percentage: number | string, color: string): string {
  if (color === 'transparent') return color
  return mix(parseFloat(percentage), 'rgb(0, 0, 0)', color)
}

// prettier-ignore
const curriedShade = curry/* ::<number | string, string, string> */(shade)
export default curriedShade
