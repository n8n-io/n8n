import type { Color, ColorChannel, ColorSpace, RGBColor } from './types'
import { colorToString, convertToHsb, convertToHsl, convertToRgb } from './convert'

/**
 * Generates a CSS gradient for a color slider track.
 */
export function getSliderGradient(
  color: Color,
  channel: ColorChannel,
  colorSpace: ColorSpace = color.space as ColorSpace,
): string {
  const hsl = convertToHsl(color)
  const hsb = convertToHsb(color)

  switch (channel) {
    case 'hue':
      return getHueGradient()
    case 'saturation':
      return getSaturationGradient(hsl, colorSpace)
    case 'lightness':
      return getLightnessGradient(hsl)
    case 'brightness':
      return getBrightnessGradient(hsb)
    case 'red':
      return getRedGradient(color)
    case 'green':
      return getGreenGradient(color)
    case 'blue':
      return getBlueGradient(color)
    case 'alpha':
      return getAlphaGradient(color)
    default:
      return ''
  }
}

/**
 * Generates a CSS gradient for a color area (2D picker).
 */
export function getAreaGradient(
  color: Color,
  xChannel: ColorChannel,
  yChannel: ColorChannel,
  colorSpace: ColorSpace = color.space as ColorSpace,
): { background: string, gradientX: string, gradientY: string } {
  const hsl = convertToHsl(color)
  const hsb = convertToHsb(color)

  // Determine which gradient layers to apply based on channels
  const gradientX = getChannelGradientForArea(color, xChannel, colorSpace, 'x')
  const gradientY = getChannelGradientForArea(color, yChannel, colorSpace, 'y')

  // Background is the color with both channels at max
  const bgColor = getAreaBackgroundColor(color, xChannel, yChannel, colorSpace)

  return {
    background: bgColor,
    gradientX,
    gradientY,
  }
}

function getHueGradient(): string {
  return 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
}

function getSaturationGradient(hsl: { h: number, s: number, l: number, alpha: number }, colorSpace: ColorSpace): string {
  const start = colorToString({ space: 'hsl', h: hsl.h, s: 0, l: colorSpace === 'hsl' ? hsl.l : 50, alpha: 1 }, 'hsl')
  const end = colorToString({ space: 'hsl', h: hsl.h, s: 100, l: colorSpace === 'hsl' ? hsl.l : 50, alpha: 1 }, 'hsl')
  return `linear-gradient(to right, ${start}, ${end})`
}

function getLightnessGradient(hsl: { h: number, s: number, l: number, alpha: number }): string {
  const start = colorToString({ space: 'hsl', h: hsl.h, s: hsl.s, l: 0, alpha: 1 }, 'hsl')
  const mid = colorToString({ space: 'hsl', h: hsl.h, s: hsl.s, l: 50, alpha: 1 }, 'hsl')
  const end = colorToString({ space: 'hsl', h: hsl.h, s: hsl.s, l: 100, alpha: 1 }, 'hsl')
  return `linear-gradient(to right, ${start}, ${mid}, ${end})`
}

function getBrightnessGradient(hsb: { h: number, s: number, b: number, alpha: number }): string {
  const start = colorToString({ space: 'hsb', h: hsb.h, s: hsb.s, b: 0, alpha: 1 }, 'rgb')
  const end = colorToString({ space: 'hsb', h: hsb.h, s: hsb.s, b: 100, alpha: 1 }, 'rgb')
  return `linear-gradient(to right, ${start}, ${end})`
}

function getRedGradient(color: Color): string {
  const { g, b, alpha } = color.space === 'rgb' ? color : { g: 128, b: 128, alpha: 1 }
  const start = colorToString({ space: 'rgb', r: 0, g, b, alpha: 1 }, 'rgb')
  const end = colorToString({ space: 'rgb', r: 255, g, b, alpha: 1 }, 'rgb')
  return `linear-gradient(to right, ${start}, ${end})`
}

function getGreenGradient(color: Color): string {
  const { r, b, alpha } = color.space === 'rgb' ? color : { r: 128, b: 128, alpha: 1 }
  const start = colorToString({ space: 'rgb', r, g: 0, b, alpha: 1 }, 'rgb')
  const end = colorToString({ space: 'rgb', r, g: 255, b, alpha: 1 }, 'rgb')
  return `linear-gradient(to right, ${start}, ${end})`
}

function getBlueGradient(color: Color): string {
  const { r, g, alpha } = color.space === 'rgb' ? color : { r: 128, g: 128, alpha: 1 }
  const start = colorToString({ space: 'rgb', r, g, b: 0, alpha: 1 }, 'rgb')
  const end = colorToString({ space: 'rgb', r, g, b: 255, alpha: 1 }, 'rgb')
  return `linear-gradient(to right, ${start}, ${end})`
}

// Checkerboard pattern used behind alpha gradients to visualize transparency
const CHECKERBOARD_LAYERS = [
  'linear-gradient(45deg, #ccc 25%, transparent 25%)',
  'linear-gradient(-45deg, #ccc 25%, transparent 25%)',
  'linear-gradient(45deg, transparent 75%, #ccc 75%)',
  'linear-gradient(-45deg, transparent 75%, #ccc 75%)',
].join(', ')

function getAlphaGradient(color: Color): string {
  const { r, g, b } = color.space === 'rgb' ? color : convertToRgb(color)
  const solidRgb = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  return `linear-gradient(to right, transparent, ${solidRgb}), ${CHECKERBOARD_LAYERS}`
}

function getChannelGradientForArea(
  color: Color,
  channel: ColorChannel,
  colorSpace: ColorSpace,
  axis: 'x' | 'y',
): string {
  const direction = axis === 'x' ? 'to right' : 'to top'
  const hsl = convertToHsl(color)
  const hsb = convertToHsb(color)

  switch (channel) {
    case 'saturation': {
      if (colorSpace === 'hsb') {
        // For HSB: White to transparent (overlay on pure hue)
        // Left side (0% sat) = white, Right side (100% sat) = transparent (shows pure hue)
        return `linear-gradient(${direction}, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0))`
      }
      // For HSL: White to full color
      const fullColor = colorToString({ space: 'hsl', h: hsl.h, s: 100, l: 50, alpha: 1 }, 'rgb')
      return `linear-gradient(${direction}, #ffffff, ${fullColor})`
    }
    case 'lightness': {
      // White -> color -> black
      const mid = colorToString({ space: 'hsl', h: hsl.h, s: hsl.s, l: 50, alpha: 1 }, 'rgb')
      return `linear-gradient(${direction}, #000000, ${mid}, #ffffff)`
    }
    case 'brightness': {
      // For HSB: Transparent to black (overlay on pure hue)
      // Top (100% brightness) = transparent (shows pure hue), Bottom (0% brightness) = black
      return `linear-gradient(${direction}, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1))`
    }
    default:
      return ''
  }
}

function getAreaBackgroundColor(
  color: Color,
  xChannel: ColorChannel,
  yChannel: ColorChannel,
  colorSpace: ColorSpace,
): string {
  const hsl = convertToHsl(color)
  const hsb = convertToHsb(color)

  // For HSL saturation/lightness area, show pure hue
  if (colorSpace === 'hsl' && xChannel === 'saturation' && yChannel === 'lightness') {
    return colorToString({ space: 'hsl', h: hsl.h, s: 100, l: 50, alpha: 1 }, 'rgb')
  }

  // For HSB saturation/brightness area, show pure hue
  if (colorSpace === 'hsb' && xChannel === 'saturation' && yChannel === 'brightness') {
    return colorToString({ space: 'hsb', h: hsb.h, s: 100, b: 100, alpha: 1 }, 'rgb')
  }

  // Default to white
  return '#ffffff'
}

/**
 * Gets the CSS background style for a color area.
 */
export function getAreaBackgroundStyle(
  color: Color,
  xChannel: ColorChannel,
  yChannel: ColorChannel,
  colorSpace: ColorSpace = color.space as ColorSpace,
): Record<string, string> {
  const hsl = convertToHsl(color)
  const hsb = convertToHsb(color)

  // Hue-based color picker (Hue/Saturation, Hue/Lightness, Hue/Brightness)
  // Shows full rainbow spectrum horizontally
  if (xChannel === 'hue') {
    // Full hue gradient as background (rainbow spectrum)
    const hueGradient = 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'

    if (yChannel === 'saturation') {
      // Vertical: gray at bottom (0% sat) fading to transparent at top (100% sat shows hue)
      // No blend mode needed — transparent stacking is correct
      const desatColor = colorToString({ space: 'hsl', h: hsl.h, s: 0, l: hsl.l, alpha: 1 }, 'rgb')
      return {
        backgroundImage: `linear-gradient(to bottom, transparent, ${desatColor}), ${hueGradient}`,
      }
    }

    if (yChannel === 'lightness') {
      // Vertical: black at bottom (L=0) → transparent at middle (L=50, shows hue) → white at top (L=100)
      return {
        backgroundImage: `linear-gradient(to top, #000000, transparent, #ffffff), ${hueGradient}`,
      }
    }

    if (yChannel === 'brightness') {
      // Vertical: black at bottom (B=0) → transparent at top (B=100, shows hue)
      return {
        backgroundImage: `linear-gradient(to top, #000000, transparent), ${hueGradient}`,
      }
    }
  }

  // Classic color picker gradients for saturation-based pickers
  if (xChannel === 'saturation' && (yChannel === 'lightness' || yChannel === 'brightness')) {
    if (colorSpace === 'hsl') {
      // HSL: Base is pure hue at 50% lightness
      // Saturation x-axis: gray (S=0) at left fading to transparent (shows pure hue at S=100)
      // Lightness y-axis: black at bottom (L=0), transparent at middle (L=50), white at top (L=100)
      const hueColor = colorToString({ space: 'hsl', h: hsl.h, s: 100, l: 50, alpha: 1 }, 'rgb')
      const grayColor = colorToString({ space: 'hsl', h: hsl.h, s: 0, l: 50, alpha: 1 }, 'rgb')
      const satGradient = `linear-gradient(to right, ${grayColor}, transparent)`
      const lightGradient = `linear-gradient(to top, #000000, transparent, #ffffff)`

      return {
        backgroundColor: hueColor,
        backgroundImage: `${lightGradient}, ${satGradient}`,
      }
    }

    if (colorSpace === 'hsb') {
      // HSB: Base is pure hue (full sat, full brightness)
      // Top edge: white (0% sat) → pure hue (100% sat)
      // Bottom edge: always black (0% brightness)
      const hueColor = colorToString({ space: 'hsb', h: hsb.h, s: 100, b: 100, alpha: 1 }, 'rgb')
      // White to transparent (left to right)
      const satGradient = `linear-gradient(to right, #ffffff, transparent)`
      // Black gradient from bottom up
      const brightGradient = `linear-gradient(to top, #000000, transparent)`

      return {
        backgroundColor: hueColor,
        backgroundImage: `${brightGradient}, ${satGradient}`,
      }
    }
  }

  // RGB color picker (Red/Green, Red/Blue, Green/Blue)
  // Uses screen blend mode to combine gradients additively (like React Spectrum)
  // Formula: 1 - (1 - a) * (1 - b), effectively adds RGB values
  if (colorSpace === 'rgb'
    && (xChannel === 'red' || xChannel === 'green' || xChannel === 'blue')
    && (yChannel === 'red' || yChannel === 'green' || yChannel === 'blue')) {
    const rgb = convertToRgb(color)

    // Get the constant channel (z-channel - the one NOT x or y)
    const allChannels = ['red', 'green', 'blue'] as const
    const varyingChannels = [xChannel, yChannel]
    const constantChannel = allChannels.find(c => !varyingChannels.includes(c))!
    const constantValue = rgb[constantChannel === 'red' ? 'r' : constantChannel === 'green' ? 'g' : 'b']

    // Create the three layers for screen blend mode:
    // 1. X gradient: black to full-X-color
    // 2. Y gradient: black to full-Y-color
    // 3. Background: black with Z channel set

    // X gradient: black (0,0,0) → full X (255,0,0) for red, etc.
    const xColorStart: RGBColor = { space: 'rgb', r: 0, g: 0, b: 0, alpha: 1 }
    const xColorEnd: RGBColor = {
      space: 'rgb',
      r: xChannel === 'red' ? 255 : 0,
      g: xChannel === 'green' ? 255 : 0,
      b: xChannel === 'blue' ? 255 : 0,
      alpha: 1,
    }
    const xGradient = `linear-gradient(to right, ${colorToString(xColorStart, 'rgb')}, ${colorToString(xColorEnd, 'rgb')})`

    // Y gradient: black (0,0,0) → full Y (0,255,0) for green, etc.
    const yColorEnd: RGBColor = {
      space: 'rgb',
      r: yChannel === 'red' ? 255 : 0,
      g: yChannel === 'green' ? 255 : 0,
      b: yChannel === 'blue' ? 255 : 0,
      alpha: 1,
    }
    const yGradient = `linear-gradient(to top, ${colorToString(xColorStart, 'rgb')}, ${colorToString(yColorEnd, 'rgb')})`

    // Background: black with constant Z channel value
    const bgColor: RGBColor = {
      space: 'rgb',
      r: constantChannel === 'red' ? constantValue : 0,
      g: constantChannel === 'green' ? constantValue : 0,
      b: constantChannel === 'blue' ? constantValue : 0,
      alpha: 1,
    }

    return {
      backgroundColor: colorToString(bgColor, 'rgb'),
      backgroundImage: `${yGradient}, ${xGradient}`,
      backgroundBlendMode: 'screen',
    }
  }

  // Fallback for other combinations
  const { background, gradientX, gradientY } = getAreaGradient(color, xChannel, yChannel, colorSpace)
  const gradients: string[] = []
  if (gradientY)
    gradients.push(gradientY)
  if (gradientX)
    gradients.push(gradientX)

  return {
    backgroundColor: background,
    backgroundImage: gradients.join(', '),
  }
}

/**
 * Gets the CSS background for a slider track.
 */
export function getSliderBackgroundStyle(
  color: Color,
  channel: ColorChannel,
  colorSpace: ColorSpace = color.space as ColorSpace,
): Record<string, string> {
  const gradient = getSliderGradient(color, channel, colorSpace)

  if (channel === 'alpha') {
    return {
      background: gradient,
      backgroundSize: '100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px',
      backgroundPosition: '0 0, 0 0, 0 4px, 4px -4px, -4px 0px',
    }
  }

  return {
    background: gradient,
  }
}
