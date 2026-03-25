// @flow
import hsl from './hsl'
import hsla from './hsla'
import rgb from './rgb'
import rgba from './rgba'
import PolishedError from '../internalHelpers/_errors'

const isRgb = (color: Object): boolean => typeof color.red === 'number'
  && typeof color.green === 'number'
  && typeof color.blue === 'number'
  && (typeof color.alpha !== 'number' || typeof color.alpha === 'undefined')

const isRgba = (color: Object): boolean => typeof color.red === 'number'
  && typeof color.green === 'number'
  && typeof color.blue === 'number'
  && typeof color.alpha === 'number'

const isHsl = (color: Object): boolean => typeof color.hue === 'number'
  && typeof color.saturation === 'number'
  && typeof color.lightness === 'number'
  && (typeof color.alpha !== 'number' || typeof color.alpha === 'undefined')

const isHsla = (color: Object): boolean => typeof color.hue === 'number'
  && typeof color.saturation === 'number'
  && typeof color.lightness === 'number'
  && typeof color.alpha === 'number'

/**
 * Converts a RgbColor, RgbaColor, HslColor or HslaColor object to a color string.
 * This util is useful in case you only know on runtime which color object is
 * used. Otherwise we recommend to rely on `rgb`, `rgba`, `hsl` or `hsla`.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: toColorString({ red: 255, green: 205, blue: 100 }),
 *   background: toColorString({ red: 255, green: 205, blue: 100, alpha: 0.72 }),
 *   background: toColorString({ hue: 240, saturation: 1, lightness: 0.5 }),
 *   background: toColorString({ hue: 360, saturation: 0.75, lightness: 0.4, alpha: 0.72 }),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${toColorString({ red: 255, green: 205, blue: 100 })};
 *   background: ${toColorString({ red: 255, green: 205, blue: 100, alpha: 0.72 })};
 *   background: ${toColorString({ hue: 240, saturation: 1, lightness: 0.5 })};
 *   background: ${toColorString({ hue: 360, saturation: 0.75, lightness: 0.4, alpha: 0.72 })};
 * `
 *
 * // CSS in JS Output
 * element {
 *   background: "#ffcd64";
 *   background: "rgba(255,205,100,0.72)";
 *   background: "#00f";
 *   background: "rgba(179,25,25,0.72)";
 * }
 */

export default function toColorString(color: Object): string {
  if (typeof color !== 'object') throw new PolishedError(8)
  if (isRgba(color)) return rgba(color)
  if (isRgb(color)) return rgb(color)
  if (isHsla(color)) return hsla(color)
  if (isHsl(color)) return hsl(color)

  throw new PolishedError(8)
}
