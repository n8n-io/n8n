// @flow
import curry from '../internalHelpers/_curry'
import parseToHsl from './parseToHsl'
import toColorString from './toColorString'

/**
 * Sets the saturation of a color to the provided value. The saturation range can be
 * from 0 and 1.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: setSaturation(0.2, '#CCCD64'),
 *   background: setSaturation('0.75', 'rgba(204,205,100,0.7)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${setSaturation(0.2, '#CCCD64')};
 *   background: ${setSaturation('0.75', 'rgba(204,205,100,0.7)')};
 * `
 *
 * // CSS in JS Output
 * element {
 *   background: "#adad84";
 *   background: "rgba(228,229,76,0.7)";
 * }
 */
function setSaturation(saturation: number | string, color: string): string {
  if (color === 'transparent') return color
  return toColorString({
    ...parseToHsl(color),
    saturation: parseFloat(saturation),
  })
}

// prettier-ignore
const curriedSetSaturation = curry/* ::<number | string, string, string> */(setSaturation)
export default curriedSetSaturation
