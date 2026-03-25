// @flow
import constructGradientValue from '../internalHelpers/_constructGradientValue'
import PolishedError from '../internalHelpers/_errors'

import type { LinearGradientConfiguration } from '../types/linearGradientConfiguration'
import type { Styles } from '../types/style'

/**
 * CSS for declaring a linear gradient, including a fallback background-color. The fallback is either the first color-stop or an explicitly passed fallback color.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   ...linearGradient({
        colorStops: ['#00FFFF 0%', 'rgba(0, 0, 255, 0) 50%', '#0000FF 95%'],
        toDirection: 'to top right',
        fallback: '#FFF',
      })
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${linearGradient({
        colorStops: ['#00FFFF 0%', 'rgba(0, 0, 255, 0) 50%', '#0000FF 95%'],
        toDirection: 'to top right',
        fallback: '#FFF',
      })}
 *`
 *
 * // CSS as JS Output
 *
 * div: {
 *   'backgroundColor': '#FFF',
 *   'backgroundImage': 'linear-gradient(to top right, #00FFFF 0%, rgba(0, 0, 255, 0) 50%, #0000FF 95%)',
 * }
 */
export default function linearGradient({
  colorStops,
  fallback,
  toDirection = '',
}: LinearGradientConfiguration): Styles {
  if (!colorStops || colorStops.length < 2) {
    throw new PolishedError(56)
  }
  return {
    backgroundColor:
      fallback
      || colorStops[0]
        .replace(/,\s+/g, ',')
        .split(' ')[0]
        .replace(/,(?=\S)/g, ', '),
    backgroundImage: constructGradientValue`linear-gradient(${toDirection}${colorStops
      .join(', ')
      .replace(/,(?=\S)/g, ', ')})`,
  }
}
