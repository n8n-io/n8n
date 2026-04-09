export type ColorSpace = 'rgb' | 'hsl' | 'hsb'

export interface RGBColor {
  space: 'rgb'
  r: number
  g: number
  b: number
  alpha: number
}

export interface HSLColor {
  space: 'hsl'
  h: number
  s: number
  l: number
  alpha: number
}

export interface HSBColor {
  space: 'hsb'
  h: number
  s: number
  b: number
  alpha: number
}

export type Color = RGBColor | HSLColor | HSBColor

export type RGBChannel = 'red' | 'green' | 'blue' | 'alpha'
export type HSLChannel = 'hue' | 'saturation' | 'lightness' | 'alpha'
export type HSBChannel = 'hue' | 'saturation' | 'brightness' | 'alpha'
export type ColorChannel = RGBChannel | HSLChannel | HSBChannel

export interface ChannelRange {
  min: number
  max: number
  step: number
}

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsb'
