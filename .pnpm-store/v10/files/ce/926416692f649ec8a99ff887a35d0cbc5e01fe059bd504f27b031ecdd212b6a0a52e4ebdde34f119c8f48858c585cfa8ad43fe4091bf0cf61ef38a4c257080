// @flow
import curry from '../internalHelpers/_curry'
import guard from '../internalHelpers/_guard'
import parseToHsl from './parseToHsl'
import toColorString from './toColorString'

/**
 * Increases the intensity of a color. Its range is between 0 to 1. The first
 * argument of the saturate function is the amount by how much the color
 * intensity should be increased.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: saturate(0.2, '#CCCD64'),
 *   background: saturate('0.2', 'rgba(204,205,100,0.7)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${saturate(0.2, '#FFCD64')};
 *   background: ${saturate('0.2', 'rgba(204,205,100,0.7)')};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "#e0e250";
 *   background: "rgba(224,226,80,0.7)";
 * }
 */
function saturate(amount: number | string, color: string): string {
  if (color === 'transparent') return color
  const hslColor = parseToHsl(color)
  return toColorString({
    ...hslColor,
    saturation: guard(0, 1, hslColor.saturation + parseFloat(amount)),
  })
}

// prettier-ignore
const curriedSaturate = curry/* ::<number | string, string, string> */(saturate)
export default curriedSaturate
