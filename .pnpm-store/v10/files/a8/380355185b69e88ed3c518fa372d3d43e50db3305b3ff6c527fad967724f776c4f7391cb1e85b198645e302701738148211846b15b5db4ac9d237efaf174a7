// @flow
import hslToHex from '../internalHelpers/_hslToHex'
import hslToRgb from '../internalHelpers/_hslToRgb'
import PolishedError from '../internalHelpers/_errors'

import type { HslaColor } from '../types/color'

/**
 * Returns a string value for the color. The returned result is the smallest possible rgba or hex notation.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: hsla(359, 0.75, 0.4, 0.7),
 *   background: hsla({ hue: 360, saturation: 0.75, lightness: 0.4, alpha: 0,7 }),
 *   background: hsla(359, 0.75, 0.4, 1),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${hsla(359, 0.75, 0.4, 0.7)};
 *   background: ${hsla({ hue: 360, saturation: 0.75, lightness: 0.4, alpha: 0,7 })};
 *   background: ${hsla(359, 0.75, 0.4, 1)};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "rgba(179,25,28,0.7)";
 *   background: "rgba(179,25,28,0.7)";
 *   background: "#b3191c";
 * }
 */
export default function hsla(
  value: HslaColor | number,
  saturation?: number,
  lightness?: number,
  alpha?: number,
): string {
  if (
    typeof value === 'number'
    && typeof saturation === 'number'
    && typeof lightness === 'number'
    && typeof alpha === 'number'
  ) {
    return alpha >= 1
      ? hslToHex(value, saturation, lightness)
      : `rgba(${hslToRgb(value, saturation, lightness)},${alpha})`
  } else if (
    typeof value === 'object'
    && saturation === undefined
    && lightness === undefined
    && alpha === undefined
  ) {
    return value.alpha >= 1
      ? hslToHex(value.hue, value.saturation, value.lightness)
      : `rgba(${hslToRgb(value.hue, value.saturation, value.lightness)},${value.alpha})`
  }

  throw new PolishedError(2)
}
