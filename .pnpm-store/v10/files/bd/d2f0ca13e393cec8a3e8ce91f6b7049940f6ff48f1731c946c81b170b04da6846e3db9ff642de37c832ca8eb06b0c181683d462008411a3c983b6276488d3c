import postcss from 'postcss'
import isPlainObject from './isPlainObject'

export default function transformThemeValue(themeSection) {
  if (['fontSize', 'outline'].includes(themeSection)) {
    return (value) => {
      if (typeof value === 'function') value = value({})
      if (Array.isArray(value)) value = value[0]

      return value
    }
  }

  if (themeSection === 'fontFamily') {
    return (value) => {
      if (typeof value === 'function') value = value({})
      let families = Array.isArray(value) && isPlainObject(value[1]) ? value[0] : value
      return Array.isArray(families) ? families.join(', ') : families
    }
  }

  if (
    [
      'boxShadow',
      'transitionProperty',
      'transitionDuration',
      'transitionDelay',
      'transitionTimingFunction',
      'backgroundImage',
      'backgroundSize',
      'backgroundColor',
      'cursor',
      'animation',
    ].includes(themeSection)
  ) {
    return (value) => {
      if (typeof value === 'function') value = value({})
      if (Array.isArray(value)) value = value.join(', ')

      return value
    }
  }

  // For backwards compatibility reasons, before we switched to underscores
  // instead of commas for arbitrary values.
  if (['gridTemplateColumns', 'gridTemplateRows', 'objectPosition'].includes(themeSection)) {
    return (value) => {
      if (typeof value === 'function') value = value({})
      if (typeof value === 'string') value = postcss.list.comma(value).join(' ')

      return value
    }
  }

  return (value, opts = {}) => {
    if (typeof value === 'function') {
      value = value(opts)
    }

    return value
  }
}
