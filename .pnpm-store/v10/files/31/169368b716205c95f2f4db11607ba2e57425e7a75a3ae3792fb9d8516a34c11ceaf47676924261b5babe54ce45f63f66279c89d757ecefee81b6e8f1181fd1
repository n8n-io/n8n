// @flow
import getValueAndUnit from '../helpers/getValueAndUnit'
import PolishedError from '../internalHelpers/_errors'

/**
 * Returns a CSS calc formula for linear interpolation of a property between two values. Accepts optional minScreen (defaults to '320px') and maxScreen (defaults to '1200px').
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   fontSize: between('20px', '100px', '400px', '1000px'),
 *   fontSize: between('20px', '100px')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   fontSize: ${between('20px', '100px', '400px', '1000px')};
 *   fontSize: ${between('20px', '100px')}
 * `
 *
 * // CSS as JS Output
 *
 * h1: {
 *   'fontSize': 'calc(-33.33333333333334px + 13.333333333333334vw)',
 *   'fontSize': 'calc(-9.090909090909093px + 9.090909090909092vw)'
 * }
 */
export default function between(
  fromSize: string | number,
  toSize: string | number,
  minScreen?: string = '320px',
  maxScreen?: string = '1200px',
): string {
  const [unitlessFromSize, fromSizeUnit] = getValueAndUnit(fromSize)
  const [unitlessToSize, toSizeUnit] = getValueAndUnit(toSize)
  const [unitlessMinScreen, minScreenUnit] = getValueAndUnit(minScreen)
  const [unitlessMaxScreen, maxScreenUnit] = getValueAndUnit(maxScreen)

  if (
    typeof unitlessMinScreen !== 'number'
    || typeof unitlessMaxScreen !== 'number'
    || !minScreenUnit
    || !maxScreenUnit
    || minScreenUnit !== maxScreenUnit
  ) {
    throw new PolishedError(47)
  }

  if (
    typeof unitlessFromSize !== 'number'
    || typeof unitlessToSize !== 'number'
    || fromSizeUnit !== toSizeUnit
  ) {
    throw new PolishedError(48)
  }

  if (fromSizeUnit !== minScreenUnit || toSizeUnit !== maxScreenUnit) {
    throw new PolishedError(76)
  }

  const slope = (unitlessFromSize - unitlessToSize) / (unitlessMinScreen - unitlessMaxScreen)
  const base = unitlessToSize - slope * unitlessMaxScreen
  return `calc(${base.toFixed(2)}${fromSizeUnit || ''} + ${(100 * slope).toFixed(2)}vw)`
}
