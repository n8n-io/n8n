// @flow
import capitalizeString from '../internalHelpers/_capitalizeString'

import type { Styles } from '../types/style'

const positionMap = ['Top', 'Right', 'Bottom', 'Left']

function generateProperty(property: string, position: string) {
  if (!property) return position.toLowerCase()
  const splitProperty = property.split('-')
  if (splitProperty.length > 1) {
    splitProperty.splice(1, 0, position)
    return splitProperty.reduce((acc, val) => `${acc}${capitalizeString(val)}`)
  }
  const joinedProperty = property.replace(/([a-z])([A-Z])/g, `$1${position}$2`)
  return property === joinedProperty ? `${property}${position}` : joinedProperty
}

function generateStyles(property: string, valuesWithDefaults: Array<?string | ?number>) {
  const styles = {}
  for (let i = 0; i < valuesWithDefaults.length; i += 1) {
    if (valuesWithDefaults[i] || valuesWithDefaults[i] === 0) {
      styles[generateProperty(property, positionMap[i])] = valuesWithDefaults[i]
    }
  }
  return styles
}

/**
 * Enables shorthand for direction-based properties. It accepts a property (hyphenated or camelCased) and up to four values that map to top, right, bottom, and left, respectively. You can optionally pass an empty string to get only the directional values as properties. You can also optionally pass a null argument for a directional value to ignore it.
 * @example
 * // Styles as object usage
 * const styles = {
 *   ...directionalProperty('padding', '12px', '24px', '36px', '48px')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${directionalProperty('padding', '12px', '24px', '36px', '48px')}
 * `
 *
 * // CSS as JS Output
 *
 * div {
 *   'paddingTop': '12px',
 *   'paddingRight': '24px',
 *   'paddingBottom': '36px',
 *   'paddingLeft': '48px'
 * }
 */
export default function directionalProperty(
  property: string,
  ...values: Array<?string | ?number>
): Styles {
  //  prettier-ignore
  const [firstValue, secondValue = firstValue, thirdValue = firstValue, fourthValue = secondValue] = values
  const valuesWithDefaults = [firstValue, secondValue, thirdValue, fourthValue]
  return generateStyles(property, valuesWithDefaults)
}
