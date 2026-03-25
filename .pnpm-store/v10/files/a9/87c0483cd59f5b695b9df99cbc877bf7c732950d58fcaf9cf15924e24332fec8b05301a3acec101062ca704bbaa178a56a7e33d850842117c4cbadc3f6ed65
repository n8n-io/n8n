// @flow
import hslToRgb from './_hslToRgb'
import reduceHexValue from './_reduceHexValue'
import toHex from './_numberToHex'

function colorToHex(color: number): string {
  return toHex(Math.round(color * 255))
}

function convertToHex(red: number, green: number, blue: number): string {
  return reduceHexValue(`#${colorToHex(red)}${colorToHex(green)}${colorToHex(blue)}`)
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  return hslToRgb(hue, saturation, lightness, convertToHex)
}

export default hslToHex
