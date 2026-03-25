// @flow

import type {
  HslColor, HslaColor, RgbColor, RgbaColor,
} from '../types/color'

function rgbToHsl(color: RgbColor | RgbaColor): HslColor | HslaColor {
  // make sure rgb are contained in a set of [0, 255]
  const red = color.red / 255
  const green = color.green / 255
  const blue = color.blue / 255

  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2

  if (max === min) {
    // achromatic
    if (color.alpha !== undefined) {
      return {
        hue: 0,
        saturation: 0,
        lightness,
        alpha: color.alpha,
      }
    } else {
      return { hue: 0, saturation: 0, lightness }
    }
  }

  let hue
  const delta = max - min
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0)
      break
    case green:
      hue = (blue - red) / delta + 2
      break
    default:
      // blue case
      hue = (red - green) / delta + 4
      break
  }

  hue *= 60
  if (color.alpha !== undefined) {
    return {
      hue,
      saturation,
      lightness,
      alpha: color.alpha,
    }
  }
  return { hue, saturation, lightness }
}

export default rgbToHsl
