// @flow

type ConversionFunction = (red: number, green: number, blue: number) => string

function colorToInt(color: number): number {
  return Math.round(color * 255)
}

function convertToInt(red: number, green: number, blue: number): string {
  return `${colorToInt(red)},${colorToInt(green)},${colorToInt(blue)}`
}

function hslToRgb(
  hue: number,
  saturation: number,
  lightness: number,
  convert: ConversionFunction = convertToInt,
): string {
  if (saturation === 0) {
    // achromatic
    return convert(lightness, lightness, lightness)
  }

  // formulae from https://en.wikipedia.org/wiki/HSL_and_HSV
  const huePrime = (((hue % 360) + 360) % 360) / 60
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1))

  let red = 0
  let green = 0
  let blue = 0

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma
    green = secondComponent
  } else if (huePrime >= 1 && huePrime < 2) {
    red = secondComponent
    green = chroma
  } else if (huePrime >= 2 && huePrime < 3) {
    green = chroma
    blue = secondComponent
  } else if (huePrime >= 3 && huePrime < 4) {
    green = secondComponent
    blue = chroma
  } else if (huePrime >= 4 && huePrime < 5) {
    red = secondComponent
    blue = chroma
  } else if (huePrime >= 5 && huePrime < 6) {
    red = chroma
    blue = secondComponent
  }

  const lightnessModification = lightness - chroma / 2
  const finalRed = red + lightnessModification
  const finalGreen = green + lightnessModification
  const finalBlue = blue + lightnessModification
  return convert(finalRed, finalGreen, finalBlue)
}

export default hslToRgb
