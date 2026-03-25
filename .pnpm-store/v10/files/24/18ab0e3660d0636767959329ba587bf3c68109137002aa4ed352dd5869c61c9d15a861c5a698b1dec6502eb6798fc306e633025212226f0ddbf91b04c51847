// @flow
import parseToRGB from './parseToRgb'
import rgb from './rgb'
import PolishedError from '../internalHelpers/_errors'

import type { RgbaColor } from '../types/color'

/**
 * Returns a string value for the color. The returned result is the smallest possible rgba or hex notation.
 *
 * Can also be used to fade a color by passing a hex value or named CSS color along with an alpha value.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: rgba(255, 205, 100, 0.7),
 *   background: rgba({ red: 255, green: 205, blue: 100, alpha: 0.7 }),
 *   background: rgba(255, 205, 100, 1),
 *   background: rgba('#ffffff', 0.4),
 *   background: rgba('black', 0.7),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${rgba(255, 205, 100, 0.7)};
 *   background: ${rgba({ red: 255, green: 205, blue: 100, alpha: 0.7 })};
 *   background: ${rgba(255, 205, 100, 1)};
 *   background: ${rgba('#ffffff', 0.4)};
 *   background: ${rgba('black', 0.7)};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "rgba(255,205,100,0.7)";
 *   background: "rgba(255,205,100,0.7)";
 *   background: "#ffcd64";
 *   background: "rgba(255,255,255,0.4)";
 *   background: "rgba(0,0,0,0.7)";
 * }
 */
export default function rgba(
  firstValue: RgbaColor | number | string,
  secondValue?: number,
  thirdValue?: number,
  fourthValue?: number,
): string {
  if (typeof firstValue === 'string' && typeof secondValue === 'number') {
    const rgbValue = parseToRGB(firstValue)
    return `rgba(${rgbValue.red},${rgbValue.green},${rgbValue.blue},${secondValue})`
  } else if (
    typeof firstValue === 'number'
    && typeof secondValue === 'number'
    && typeof thirdValue === 'number'
    && typeof fourthValue === 'number'
  ) {
    return fourthValue >= 1
      ? rgb(firstValue, secondValue, thirdValue)
      : `rgba(${firstValue},${secondValue},${thirdValue},${fourthValue})`
  } else if (
    typeof firstValue === 'object'
    && secondValue === undefined
    && thirdValue === undefined
    && fourthValue === undefined
  ) {
    return firstValue.alpha >= 1
      ? rgb(firstValue.red, firstValue.green, firstValue.blue)
      : `rgba(${firstValue.red},${firstValue.green},${firstValue.blue},${firstValue.alpha})`
  }

  throw new PolishedError(7)
}
