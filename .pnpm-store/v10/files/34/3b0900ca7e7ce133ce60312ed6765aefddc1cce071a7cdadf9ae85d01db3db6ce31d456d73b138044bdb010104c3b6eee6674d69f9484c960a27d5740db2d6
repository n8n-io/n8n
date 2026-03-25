// @flow
import hslToHex from '../internalHelpers/_hslToHex'
import PolishedError from '../internalHelpers/_errors'

import type { HslColor } from '../types/color'

/**
 * Returns a string value for the color. The returned result is the smallest possible hex notation.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: hsl(359, 0.75, 0.4),
 *   background: hsl({ hue: 360, saturation: 0.75, lightness: 0.4 }),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${hsl(359, 0.75, 0.4)};
 *   background: ${hsl({ hue: 360, saturation: 0.75, lightness: 0.4 })};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "#b3191c";
 *   background: "#b3191c";
 * }
 */
export default function hsl(
  value: HslColor | number,
  saturation?: number,
  lightness?: number,
): string {
  if (
    typeof value === 'number'
    && typeof saturation === 'number'
    && typeof lightness === 'number'
  ) {
    return hslToHex(value, saturation, lightness)
  } else if (typeof value === 'object' && saturation === undefined && lightness === undefined) {
    return hslToHex(value.hue, value.saturation, value.lightness)
  }

  throw new PolishedError(1)
}
