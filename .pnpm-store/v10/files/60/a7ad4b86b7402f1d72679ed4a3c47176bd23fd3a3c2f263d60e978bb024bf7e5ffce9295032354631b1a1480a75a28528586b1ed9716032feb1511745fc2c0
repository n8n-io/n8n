// @flow
import type { Styles } from '../types/style'
import PolishedError from '../internalHelpers/_errors'

/**
 * Accepts any number of transition values as parameters for creating a single transition statement. You may also pass an array of properties as the first parameter that you would like to apply the same transition values to (second parameter).
 * @example
 * // Styles as object usage
 * const styles = {
 *   ...transitions('opacity 1.0s ease-in 0s', 'width 2.0s ease-in 2s'),
 *   ...transitions(['color', 'background-color'], '2.0s ease-in 2s')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${transitions('opacity 1.0s ease-in 0s', 'width 2.0s ease-in 2s')};
 *   ${transitions(['color', 'background-color'], '2.0s ease-in 2s'),};
 * `
 *
 * // CSS as JS Output
 *
 * div {
 *   'transition': 'opacity 1.0s ease-in 0s, width 2.0s ease-in 2s'
 *   'transition': 'color 2.0s ease-in 2s, background-color 2.0s ease-in 2s',
 * }
 */
export default function transitions(...properties: Array<string | Array<string>>): Styles {
  if (Array.isArray(properties[0]) && properties.length === 2) {
    const value = properties[1]
    if (typeof value !== 'string') {
      throw new PolishedError(61)
    }
    const transitionsString = properties[0]
      .map((property: string): string => `${property} ${value}`)
      .join(', ')
    return {
      transition: transitionsString,
    }
  } else {
    return {
      transition: properties.join(', '),
    }
  }
}
