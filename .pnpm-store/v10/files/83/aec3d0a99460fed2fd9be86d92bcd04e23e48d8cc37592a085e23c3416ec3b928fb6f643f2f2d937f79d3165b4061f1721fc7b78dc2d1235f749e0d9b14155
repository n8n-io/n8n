// @flow
import getValueAndUnit from './getValueAndUnit'
import PolishedError from '../internalHelpers/_errors'

const defaultFontSize = 16

function convertBase(base: string | number): number {
  const deconstructedValue = getValueAndUnit(base)
  if (deconstructedValue[1] === 'px') {
    return parseFloat(base)
  }

  if (deconstructedValue[1] === '%') {
    return (parseFloat(base) / 100) * defaultFontSize
  }

  throw new PolishedError(78, deconstructedValue[1])
}

function getBaseFromDoc(): number {
  /* eslint-disable */
  /* istanbul ignore next */
  if (typeof document !== 'undefined' && document.documentElement !== null) {
    const rootFontSize = getComputedStyle(document.documentElement).fontSize
    return rootFontSize ? convertBase(rootFontSize) : defaultFontSize
  }
  /* eslint-enable */
  /* istanbul ignore next */
  return defaultFontSize
}

/**
 * Convert rem values to px. By default, the base value is pulled from the font-size property on the root element (if it is set in % or px). It defaults to 16px if not found on the root. You can also override the base value by providing your own base in % or px.
 * @example
 * // Styles as object usage
 * const styles = {
 *   'height': remToPx('1.6rem')
 *   'height': remToPx('1.6rem', '10px')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   height: ${remToPx('1.6rem')}
 *   height: ${remToPx('1.6rem', '10px')}
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   'height': '25.6px',
 *   'height': '16px',
 * }
 */
export default function remToPx(value: string | number, base?: string | number): string {
  const deconstructedValue = getValueAndUnit(value)

  if (deconstructedValue[1] !== 'rem' && deconstructedValue[1] !== '') {
    throw new PolishedError(77, deconstructedValue[1])
  }

  const newBase = base ? convertBase(base) : getBaseFromDoc()
  return `${deconstructedValue[0] * newBase}px`
}
