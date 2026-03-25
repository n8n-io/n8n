import namedColors from './colorNames'

let HEX = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i
let SHORT_HEX = /^#([a-f\d])([a-f\d])([a-f\d])([a-f\d])?$/i
let VALUE = /(?:\d+|\d*\.\d+)%?/
let SEP = /(?:\s*,\s*|\s+)/
let ALPHA_SEP = /\s*[,/]\s*/
let CUSTOM_PROPERTY = /var\(--(?:[^ )]*?)(?:,(?:[^ )]*?|var\(--[^ )]*?\)))?\)/

let RGB = new RegExp(
  `^(rgba?)\\(\\s*(${VALUE.source}|${CUSTOM_PROPERTY.source})(?:${SEP.source}(${VALUE.source}|${CUSTOM_PROPERTY.source}))?(?:${SEP.source}(${VALUE.source}|${CUSTOM_PROPERTY.source}))?(?:${ALPHA_SEP.source}(${VALUE.source}|${CUSTOM_PROPERTY.source}))?\\s*\\)$`
)
let HSL = new RegExp(
  `^(hsla?)\\(\\s*((?:${VALUE.source})(?:deg|rad|grad|turn)?|${CUSTOM_PROPERTY.source})(?:${SEP.source}(${VALUE.source}|${CUSTOM_PROPERTY.source}))?(?:${SEP.source}(${VALUE.source}|${CUSTOM_PROPERTY.source}))?(?:${ALPHA_SEP.source}(${VALUE.source}|${CUSTOM_PROPERTY.source}))?\\s*\\)$`
)

// In "loose" mode the color may contain fewer than 3 parts, as long as at least
// one of the parts is variable.
export function parseColor(value, { loose = false } = {}) {
  if (typeof value !== 'string') {
    return null
  }

  value = value.trim()
  if (value === 'transparent') {
    return { mode: 'rgb', color: ['0', '0', '0'], alpha: '0' }
  }

  if (value in namedColors) {
    return { mode: 'rgb', color: namedColors[value].map((v) => v.toString()) }
  }

  let hex = value
    .replace(SHORT_HEX, (_, r, g, b, a) => ['#', r, r, g, g, b, b, a ? a + a : ''].join(''))
    .match(HEX)

  if (hex !== null) {
    return {
      mode: 'rgb',
      color: [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)].map((v) =>
        v.toString()
      ),
      alpha: hex[4] ? (parseInt(hex[4], 16) / 255).toString() : undefined,
    }
  }

  let match = value.match(RGB) ?? value.match(HSL)

  if (match === null) {
    return null
  }

  let color = [match[2], match[3], match[4]].filter(Boolean).map((v) => v.toString())

  // rgba(var(--my-color), 0.1)
  // hsla(var(--my-color), 0.1)
  if (color.length === 2 && color[0].startsWith('var(')) {
    return {
      mode: match[1],
      color: [color[0]],
      alpha: color[1],
    }
  }

  if (!loose && color.length !== 3) {
    return null
  }

  if (color.length < 3 && !color.some((part) => /^var\(.*?\)$/.test(part))) {
    return null
  }

  return {
    mode: match[1],
    color,
    alpha: match[5]?.toString?.(),
  }
}

export function formatColor({ mode, color, alpha }) {
  let hasAlpha = alpha !== undefined

  if (mode === 'rgba' || mode === 'hsla') {
    return `${mode}(${color.join(', ')}${hasAlpha ? `, ${alpha}` : ''})`
  }

  return `${mode}(${color.join(' ')}${hasAlpha ? ` / ${alpha}` : ''})`
}
