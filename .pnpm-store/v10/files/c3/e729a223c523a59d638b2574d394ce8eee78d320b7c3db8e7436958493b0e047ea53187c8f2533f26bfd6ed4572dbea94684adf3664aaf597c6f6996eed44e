// @flow
import getValueAndUnit from './getValueAndUnit'
import PolishedError from '../internalHelpers/_errors'

import type { ModularScaleRatio } from '../types/modularScaleRatio'

export const ratioNames = {
  minorSecond: 1.067,
  majorSecond: 1.125,
  minorThird: 1.2,
  majorThird: 1.25,
  perfectFourth: 1.333,
  augFourth: 1.414,
  perfectFifth: 1.5,
  minorSixth: 1.6,
  goldenSection: 1.618,
  majorSixth: 1.667,
  minorSeventh: 1.778,
  majorSeventh: 1.875,
  octave: 2,
  majorTenth: 2.5,
  majorEleventh: 2.667,
  majorTwelfth: 3,
  doubleOctave: 4,
}

function getRatio(ratioName: string): number {
  return ratioNames[ratioName]
}

/**
 * Establish consistent measurements and spacial relationships throughout your projects by incrementing an em or rem value up or down a defined scale. We provide a list of commonly used scales as pre-defined variables.
 * @example
 * // Styles as object usage
 * const styles = {
 *    // Increment two steps up the default scale
 *   'fontSize': modularScale(2)
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *    // Increment two steps up the default scale
 *   fontSize: ${modularScale(2)}
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   'fontSize': '1.77689em'
 * }
 */
export default function modularScale(
  steps: number,
  base?: number | string = '1em',
  ratio?: ModularScaleRatio = 1.333,
): string {
  if (typeof steps !== 'number') {
    throw new PolishedError(42)
  }
  if (typeof ratio === 'string' && !ratioNames[ratio]) {
    throw new PolishedError(43)
  }

  const [realBase, unit] = typeof base === 'string' ? getValueAndUnit(base) : [base, '']
  const realRatio = typeof ratio === 'string' ? getRatio(ratio) : ratio

  if (typeof realBase === 'string') {
    throw new PolishedError(44, base)
  }

  return `${realBase * realRatio ** steps}${unit || ''}`
}
