// @flow
import hslToRgb from '../internalHelpers/_hslToRgb'
import nameToHex from '../internalHelpers/_nameToHex'
import PolishedError from '../internalHelpers/_errors'

import type { RgbColor, RgbaColor } from '../types/color'

const hexRegex = /^#[a-fA-F0-9]{6}$/
const hexRgbaRegex = /^#[a-fA-F0-9]{8}$/
const reducedHexRegex = /^#[a-fA-F0-9]{3}$/
const reducedRgbaHexRegex = /^#[a-fA-F0-9]{4}$/
const rgbRegex = /^rgb\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*\)$/i
const rgbaRegex = /^rgb(?:a)?\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i
const hslRegex = /^hsl\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*\)$/i
const hslaRegex = /^hsl(?:a)?\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i

/**
 * Returns an RgbColor or RgbaColor object. This utility function is only useful
 * if want to extract a color component. With the color util `toColorString` you
 * can convert a RgbColor or RgbaColor object back to a string.
 *
 * @example
 * // Assigns `{ red: 255, green: 0, blue: 0 }` to color1
 * const color1 = parseToRgb('rgb(255, 0, 0)');
 * // Assigns `{ red: 92, green: 102, blue: 112, alpha: 0.75 }` to color2
 * const color2 = parseToRgb('hsla(210, 10%, 40%, 0.75)');
 */
export default function parseToRgb(color: string): RgbColor | RgbaColor {
  if (typeof color !== 'string') {
    throw new PolishedError(3)
  }
  const normalizedColor = nameToHex(color)
  if (normalizedColor.match(hexRegex)) {
    return {
      red: parseInt(`${normalizedColor[1]}${normalizedColor[2]}`, 16),
      green: parseInt(`${normalizedColor[3]}${normalizedColor[4]}`, 16),
      blue: parseInt(`${normalizedColor[5]}${normalizedColor[6]}`, 16),
    }
  }
  if (normalizedColor.match(hexRgbaRegex)) {
    const alpha = parseFloat(
      (parseInt(`${normalizedColor[7]}${normalizedColor[8]}`, 16) / 255).toFixed(2),
    )
    return {
      red: parseInt(`${normalizedColor[1]}${normalizedColor[2]}`, 16),
      green: parseInt(`${normalizedColor[3]}${normalizedColor[4]}`, 16),
      blue: parseInt(`${normalizedColor[5]}${normalizedColor[6]}`, 16),
      alpha,
    }
  }
  if (normalizedColor.match(reducedHexRegex)) {
    return {
      red: parseInt(`${normalizedColor[1]}${normalizedColor[1]}`, 16),
      green: parseInt(`${normalizedColor[2]}${normalizedColor[2]}`, 16),
      blue: parseInt(`${normalizedColor[3]}${normalizedColor[3]}`, 16),
    }
  }
  if (normalizedColor.match(reducedRgbaHexRegex)) {
    const alpha = parseFloat(
      (parseInt(`${normalizedColor[4]}${normalizedColor[4]}`, 16) / 255).toFixed(2),
    )
    return {
      red: parseInt(`${normalizedColor[1]}${normalizedColor[1]}`, 16),
      green: parseInt(`${normalizedColor[2]}${normalizedColor[2]}`, 16),
      blue: parseInt(`${normalizedColor[3]}${normalizedColor[3]}`, 16),
      alpha,
    }
  }
  const rgbMatched = rgbRegex.exec(normalizedColor)
  if (rgbMatched) {
    return {
      red: parseInt(`${rgbMatched[1]}`, 10),
      green: parseInt(`${rgbMatched[2]}`, 10),
      blue: parseInt(`${rgbMatched[3]}`, 10),
    }
  }
  const rgbaMatched = rgbaRegex.exec(normalizedColor.substring(0, 50))
  if (rgbaMatched) {
    return {
      red: parseInt(`${rgbaMatched[1]}`, 10),
      green: parseInt(`${rgbaMatched[2]}`, 10),
      blue: parseInt(`${rgbaMatched[3]}`, 10),
      alpha:
        parseFloat(`${rgbaMatched[4]}`) > 1
          ? parseFloat(`${rgbaMatched[4]}`) / 100
          : parseFloat(`${rgbaMatched[4]}`),
    }
  }
  const hslMatched = hslRegex.exec(normalizedColor)
  if (hslMatched) {
    const hue = parseInt(`${hslMatched[1]}`, 10)
    const saturation = parseInt(`${hslMatched[2]}`, 10) / 100
    const lightness = parseInt(`${hslMatched[3]}`, 10) / 100
    const rgbColorString = `rgb(${hslToRgb(hue, saturation, lightness)})`
    const hslRgbMatched = rgbRegex.exec(rgbColorString)
    if (!hslRgbMatched) {
      throw new PolishedError(4, normalizedColor, rgbColorString)
    }
    return {
      red: parseInt(`${hslRgbMatched[1]}`, 10),
      green: parseInt(`${hslRgbMatched[2]}`, 10),
      blue: parseInt(`${hslRgbMatched[3]}`, 10),
    }
  }
  const hslaMatched = hslaRegex.exec(normalizedColor.substring(0, 50))
  if (hslaMatched) {
    const hue = parseInt(`${hslaMatched[1]}`, 10)
    const saturation = parseInt(`${hslaMatched[2]}`, 10) / 100
    const lightness = parseInt(`${hslaMatched[3]}`, 10) / 100
    const rgbColorString = `rgb(${hslToRgb(hue, saturation, lightness)})`
    const hslRgbMatched = rgbRegex.exec(rgbColorString)
    if (!hslRgbMatched) {
      throw new PolishedError(4, normalizedColor, rgbColorString)
    }
    return {
      red: parseInt(`${hslRgbMatched[1]}`, 10),
      green: parseInt(`${hslRgbMatched[2]}`, 10),
      blue: parseInt(`${hslRgbMatched[3]}`, 10),
      alpha:
        parseFloat(`${hslaMatched[4]}`) > 1
          ? parseFloat(`${hslaMatched[4]}`) / 100
          : parseFloat(`${hslaMatched[4]}`),
    }
  }
  throw new PolishedError(5)
}
