/**
 * @typedef {object} ScreenValue
 * @property {number|undefined} min
 * @property {number|undefined} max
 * @property {string|undefined} raw
 */

/**
 * @typedef {object} Screen
 * @property {string} name
 * @property {boolean} not
 * @property {ScreenValue[]} values
 */

/**
 * A function that normalizes the various forms that the screens object can be
 * provided in.
 *
 * Input(s):
 *   - ['100px', '200px'] // Raw strings
 *   - { sm: '100px', md: '200px' } // Object with string values
 *   - { sm: { min: '100px' }, md: { max: '100px' } } // Object with object values
 *   - { sm: [{ min: '100px' }, { max: '200px' }] } // Object with object array (multiple values)
 *
 * Output(s):
 *   - [{ name: 'sm', values: [{ min: '100px', max: '200px' }] }] // List of objects, that contains multiple values
 *
 * @returns {Screen[]}
 */
export function normalizeScreens(screens, root = true) {
  if (Array.isArray(screens)) {
    return screens.map((screen) => {
      if (root && Array.isArray(screen)) {
        throw new Error('The tuple syntax is not supported for `screens`.')
      }

      if (typeof screen === 'string') {
        return { name: screen.toString(), not: false, values: [{ min: screen, max: undefined }] }
      }

      let [name, options] = screen
      name = name.toString()

      if (typeof options === 'string') {
        return { name, not: false, values: [{ min: options, max: undefined }] }
      }

      if (Array.isArray(options)) {
        return { name, not: false, values: options.map((option) => resolveValue(option)) }
      }

      return { name, not: false, values: [resolveValue(options)] }
    })
  }

  return normalizeScreens(Object.entries(screens ?? {}), false)
}

/**
 * @param {Screen} screen
 * @returns {{result: false, reason: string} | {result: true, reason: null}}
 */
export function isScreenSortable(screen) {
  if (screen.values.length !== 1) {
    return { result: false, reason: 'multiple-values' }
  } else if (screen.values[0].raw !== undefined) {
    return { result: false, reason: 'raw-values' }
  } else if (screen.values[0].min !== undefined && screen.values[0].max !== undefined) {
    return { result: false, reason: 'min-and-max' }
  }

  return { result: true, reason: null }
}

/**
 * @param {'min' | 'max'} type
 * @param {Screen | 'string'} a
 * @param {Screen | 'string'} z
 * @returns {number}
 */
export function compareScreens(type, a, z) {
  let aScreen = toScreen(a, type)
  let zScreen = toScreen(z, type)

  let aSorting = isScreenSortable(aScreen)
  let bSorting = isScreenSortable(zScreen)

  // These cases should never happen and indicate a bug in Tailwind CSS itself
  if (aSorting.reason === 'multiple-values' || bSorting.reason === 'multiple-values') {
    throw new Error(
      'Attempted to sort a screen with multiple values. This should never happen. Please open a bug report.'
    )
  } else if (aSorting.reason === 'raw-values' || bSorting.reason === 'raw-values') {
    throw new Error(
      'Attempted to sort a screen with raw values. This should never happen. Please open a bug report.'
    )
  } else if (aSorting.reason === 'min-and-max' || bSorting.reason === 'min-and-max') {
    throw new Error(
      'Attempted to sort a screen with both min and max values. This should never happen. Please open a bug report.'
    )
  }

  // Let the sorting begin
  let { min: aMin, max: aMax } = aScreen.values[0]
  let { min: zMin, max: zMax } = zScreen.values[0]

  // Negating screens flip their behavior. Basically `not min-width` is `max-width`
  if (a.not) [aMin, aMax] = [aMax, aMin]
  if (z.not) [zMin, zMax] = [zMax, zMin]

  aMin = aMin === undefined ? aMin : parseFloat(aMin)
  aMax = aMax === undefined ? aMax : parseFloat(aMax)
  zMin = zMin === undefined ? zMin : parseFloat(zMin)
  zMax = zMax === undefined ? zMax : parseFloat(zMax)

  let [aValue, zValue] = type === 'min' ? [aMin, zMin] : [zMax, aMax]

  return aValue - zValue
}

/**
 *
 * @param {PartialScreen> | string} value
 * @param {'min' | 'max'} type
 * @returns {Screen}
 */
export function toScreen(value, type) {
  if (typeof value === 'object') {
    return value
  }

  return {
    name: 'arbitrary-screen',
    values: [{ [type]: value }],
  }
}

function resolveValue({ 'min-width': _minWidth, min = _minWidth, max, raw } = {}) {
  return { min, max, raw }
}
