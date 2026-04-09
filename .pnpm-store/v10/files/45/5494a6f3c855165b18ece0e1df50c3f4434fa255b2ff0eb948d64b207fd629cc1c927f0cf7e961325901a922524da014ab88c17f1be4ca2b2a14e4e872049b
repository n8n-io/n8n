import type { Color, ColorFormat, HSBColor, HSLColor, RGBColor } from './types'

/**
 * Converts a Color object to a string representation.
 */
export function colorToString(color: Color, format: ColorFormat = 'hex'): string {
  switch (format) {
    case 'hex':
      return colorToHex(color)
    case 'rgb':
      return colorToRgb(color)
    case 'hsl':
      return colorToHsl(color)
    case 'hsb':
      return colorToHsb(color)
    default:
      throw new Error(`Unknown format: ${format}`)
  }
}

/**
 * Converts any color to hex string.
 */
export function colorToHex(color: Color): string {
  const rgb = color.space === 'rgb' ? color : convertToRgb(color)
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')

  if (rgb.alpha < 1) {
    const alpha = Math.round(rgb.alpha * 255).toString(16).padStart(2, '0')
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}${alpha}`
  }

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

/**
 * Converts any color to rgb() string.
 */
export function colorToRgb(color: Color): string {
  const rgb = color.space === 'rgb' ? color : convertToRgb(color)
  const { r, g, b, alpha } = rgb

  if (alpha < 1) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

/**
 * Converts any color to hsl() string.
 */
export function colorToHsl(color: Color): string {
  const hsl = color.space === 'hsl' ? color : convertToHsl(color)
  const { h, s, l, alpha } = hsl

  if (alpha < 1) {
    return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${alpha})`
  }
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`
}

/**
 * Converts any color to hsb() string.
 */
export function colorToHsb(color: Color): string {
  const hsb = color.space === 'hsb' ? color : convertToHsb(color)
  const { h, s, b, alpha } = hsb

  if (alpha < 1) {
    return `hsba(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(b)}%, ${alpha})`
  }
  return `hsb(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(b)}%)`
}

/**
 * Converts any color to RGB color space.
 */
export function convertToRgb(color: Color): RGBColor {
  if (color.space === 'rgb') {
    return color
  }
  if (color.space === 'hsl') {
    return hslToRgb(color)
  }
  if (color.space === 'hsb') {
    return hsbToRgb(color)
  }
  throw new Error(`Unknown color space: ${(color as Color).space}`)
}

/**
 * Converts any color to HSL color space.
 */
export function convertToHsl(color: Color): HSLColor {
  if (color.space === 'hsl') {
    return color
  }
  return rgbToHsl(convertToRgb(color))
}

/**
 * Converts any color to HSB color space.
 */
export function convertToHsb(color: Color): HSBColor {
  if (color.space === 'hsb') {
    return color
  }
  return rgbToHsb(convertToRgb(color))
}

/**
 * Converts RGB to HSL.
 */
function rgbToHsl(rgb: RGBColor): HSLColor {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    space: 'hsl',
    h: h * 360,
    s: s * 100,
    l: l * 100,
    alpha: rgb.alpha,
  }
}

/**
 * Converts HSL to RGB.
 */
function hslToRgb(hsl: HSLColor): RGBColor {
  const h = hsl.h / 360
  const s = hsl.s / 100
  const l = hsl.l / 100

  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  }
  else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0)
        t += 1
      if (t > 1)
        t -= 1
      if (t < 1 / 6)
        return p + (q - p) * 6 * t
      if (t < 1 / 2)
        return q
      if (t < 2 / 3)
        return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    space: 'rgb',
    r: r * 255,
    g: g * 255,
    b: b * 255,
    alpha: hsl.alpha,
  }
}

/**
 * Converts RGB to HSB.
 */
function rgbToHsb(rgb: RGBColor): HSBColor {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    space: 'hsb',
    h: h * 360,
    s: s * 100,
    b: v * 100,
    alpha: rgb.alpha,
  }
}

/**
 * Converts HSB to RGB.
 */
function hsbToRgb(hsb: HSBColor): RGBColor {
  const h = hsb.h / 360
  const s = hsb.s / 100
  const v = hsb.b / 100

  let r = 0
  let g = 0
  let b = 0

  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0:
      r = v
      g = t
      b = p
      break
    case 1:
      r = q
      g = v
      b = p
      break
    case 2:
      r = p
      g = v
      b = t
      break
    case 3:
      r = p
      g = q
      b = v
      break
    case 4:
      r = t
      g = p
      b = v
      break
    case 5:
      r = v
      g = p
      b = q
      break
  }

  return {
    space: 'rgb',
    r: r * 255,
    g: g * 255,
    b: b * 255,
    alpha: hsb.alpha,
  }
}
