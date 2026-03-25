// @flow
import between from './between'
import PolishedError from '../internalHelpers/_errors'

import type { FluidRangeConfiguration } from '../types/fluidRangeConfiguration'
import type { Styles } from '../types/style'

/**
 * Returns a set of media queries that resizes a property (or set of properties) between a provided fromSize and toSize. Accepts optional minScreen (defaults to '320px') and maxScreen (defaults to '1200px') to constrain the interpolation.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   ...fluidRange(
 *    {
 *        prop: 'padding',
 *        fromSize: '20px',
 *        toSize: '100px',
 *      },
 *      '400px',
 *      '1000px',
 *    )
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${fluidRange(
 *      {
 *        prop: 'padding',
 *        fromSize: '20px',
 *        toSize: '100px',
 *      },
 *      '400px',
 *      '1000px',
 *    )}
 * `
 *
 * // CSS as JS Output
 *
 * div: {
 *   "@media (min-width: 1000px)": Object {
 *     "padding": "100px",
 *   },
 *   "@media (min-width: 400px)": Object {
 *     "padding": "calc(-33.33333333333334px + 13.333333333333334vw)",
 *   },
 *   "padding": "20px",
 * }
 */
export default function fluidRange(
  cssProp: Array<FluidRangeConfiguration> | FluidRangeConfiguration,
  minScreen?: string = '320px',
  maxScreen?: string = '1200px',
): Styles {
  if ((!Array.isArray(cssProp) && typeof cssProp !== 'object') || cssProp === null) {
    throw new PolishedError(49)
  }

  if (Array.isArray(cssProp)) {
    const mediaQueries = {}
    const fallbacks = {}
    for (const obj of cssProp) {
      if (!obj.prop || !obj.fromSize || !obj.toSize) {
        throw new PolishedError(50)
      }

      fallbacks[obj.prop] = obj.fromSize
      mediaQueries[`@media (min-width: ${minScreen})`] = {
        ...mediaQueries[`@media (min-width: ${minScreen})`],
        [obj.prop]: between(obj.fromSize, obj.toSize, minScreen, maxScreen),
      }
      mediaQueries[`@media (min-width: ${maxScreen})`] = {
        ...mediaQueries[`@media (min-width: ${maxScreen})`],
        [obj.prop]: obj.toSize,
      }
    }

    return {
      ...fallbacks,
      ...mediaQueries,
    }
  } else {
    if (!cssProp.prop || !cssProp.fromSize || !cssProp.toSize) {
      throw new PolishedError(51)
    }

    return {
      [cssProp.prop]: cssProp.fromSize,
      [`@media (min-width: ${minScreen})`]: {
        [cssProp.prop]: between(cssProp.fromSize, cssProp.toSize, minScreen, maxScreen),
      },
      [`@media (min-width: ${maxScreen})`]: {
        [cssProp.prop]: cssProp.toSize,
      },
    }
  }
}
