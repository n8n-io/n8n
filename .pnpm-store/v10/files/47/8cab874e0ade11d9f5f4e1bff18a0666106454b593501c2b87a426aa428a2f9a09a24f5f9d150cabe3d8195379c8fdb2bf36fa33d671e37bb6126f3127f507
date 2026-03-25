// @flow
import parseToRgb from './parseToRgb'
import toColorString from './toColorString'

/**
 * Inverts the red, green and blue values of a color.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: invert('#CCCD64'),
 *   background: invert('rgba(101,100,205,0.7)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${invert('#CCCD64')};
 *   background: ${invert('rgba(101,100,205,0.7)')};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "#33329b";
 *   background: "rgba(154,155,50,0.7)";
 * }
 */
export default function invert(color: string): string {
  if (color === 'transparent') return color
  // parse color string to rgb
  const value = parseToRgb(color)
  return toColorString({
    ...value,
    red: 255 - value.red,
    green: 255 - value.green,
    blue: 255 - value.blue,
  })
}
