// @flow
import constructGradientValue from '../internalHelpers/_constructGradientValue'
import PolishedError from '../internalHelpers/_errors'

import type { RadialGradientConfiguration } from '../types/radialGradientConfiguration'
import type { Styles } from '../types/style'

/**
 * CSS for declaring a radial gradient, including a fallback background-color. The fallback is either the first color-stop or an explicitly passed fallback color.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   ...radialGradient({
 *     colorStops: ['#00FFFF 0%', 'rgba(0, 0, 255, 0) 50%', '#0000FF 95%'],
 *     extent: 'farthest-corner at 45px 45px',
 *     position: 'center',
 *     shape: 'ellipse',
 *   })
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${radialGradient({
 *     colorStops: ['#00FFFF 0%', 'rgba(0, 0, 255, 0) 50%', '#0000FF 95%'],
 *     extent: 'farthest-corner at 45px 45px',
 *     position: 'center',
 *     shape: 'ellipse',
 *   })}
 *`
 *
 * // CSS as JS Output
 *
 * div: {
 *   'backgroundColor': '#00FFFF',
 *   'backgroundImage': 'radial-gradient(center ellipse farthest-corner at 45px 45px, #00FFFF 0%, rgba(0, 0, 255, 0) 50%, #0000FF 95%)',
 * }
 */
export default function radialGradient({
  colorStops,
  extent = '',
  fallback,
  position = '',
  shape = '',
}: RadialGradientConfiguration): Styles {
  if (!colorStops || colorStops.length < 2) {
    throw new PolishedError(57)
  }
  return {
    backgroundColor: fallback || colorStops[0].split(' ')[0],
    backgroundImage: constructGradientValue`radial-gradient(${position}${shape}${extent}${colorStops.join(
      ', ',
    )})`,
  }
}
