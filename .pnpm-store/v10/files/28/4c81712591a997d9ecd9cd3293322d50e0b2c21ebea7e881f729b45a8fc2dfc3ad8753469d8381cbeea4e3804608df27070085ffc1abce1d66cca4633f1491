// @flow
import curry from '../internalHelpers/_curry'
import guard from '../internalHelpers/_guard'
import parseToHsl from './parseToHsl'
import toColorString from './toColorString'

/**
 * Returns a string value for the lightened color.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: lighten(0.2, '#CCCD64'),
 *   background: lighten('0.2', 'rgba(204,205,100,0.7)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${lighten(0.2, '#FFCD64')};
 *   background: ${lighten('0.2', 'rgba(204,205,100,0.7)')};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "#e5e6b1";
 *   background: "rgba(229,230,177,0.7)";
 * }
 */
function lighten(amount: number | string, color: string): string {
  if (color === 'transparent') return color
  const hslColor = parseToHsl(color)
  return toColorString({
    ...hslColor,
    lightness: guard(0, 1, hslColor.lightness + parseFloat(amount)),
  })
}

// prettier-ignore
const curriedLighten = curry/* ::<number | string, string, string> */(lighten)
export default curriedLighten
