import { parseColor, formatColor } from './color'

export function withAlphaValue(color, alphaValue, defaultValue) {
  if (typeof color === 'function') {
    return color({ opacityValue: alphaValue })
  }

  let parsed = parseColor(color, { loose: true })

  if (parsed === null) {
    return defaultValue
  }

  return formatColor({ ...parsed, alpha: alphaValue })
}

export default function withAlphaVariable({ color, property, variable }) {
  let properties = [].concat(property)
  if (typeof color === 'function') {
    return {
      [variable]: '1',
      ...Object.fromEntries(
        properties.map((p) => {
          return [p, color({ opacityVariable: variable, opacityValue: `var(${variable})` })]
        })
      ),
    }
  }

  const parsed = parseColor(color)

  if (parsed === null) {
    return Object.fromEntries(properties.map((p) => [p, color]))
  }

  if (parsed.alpha !== undefined) {
    // Has an alpha value, return color as-is
    return Object.fromEntries(properties.map((p) => [p, color]))
  }

  return {
    [variable]: '1',
    ...Object.fromEntries(
      properties.map((p) => {
        return [p, formatColor({ ...parsed, alpha: `var(${variable})` })]
      })
    ),
  }
}
