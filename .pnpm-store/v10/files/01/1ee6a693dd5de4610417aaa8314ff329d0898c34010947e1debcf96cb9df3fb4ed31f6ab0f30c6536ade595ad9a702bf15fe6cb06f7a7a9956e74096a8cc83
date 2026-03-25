// @flow
import PolishedError from '../internalHelpers/_errors'

const cssVariableRegex = /--[\S]*/g

/**
 * Fetches the value of a passed CSS Variable in the :root scope, or otherwise returns a defaultValue if provided.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   'background': cssVar('--background-color'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${cssVar('--background-color')};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   'background': 'red'
 * }
 */
export default function cssVar(
  cssVariable: string,
  defaultValue?: string | number,
): string | number {
  if (!cssVariable || !cssVariable.match(cssVariableRegex)) {
    throw new PolishedError(73)
  }

  let variableValue

  /* eslint-disable */
  /* istanbul ignore next */
  if (typeof document !== 'undefined' && document.documentElement !== null) {
    variableValue = getComputedStyle(document.documentElement).getPropertyValue(cssVariable)
  }
  /* eslint-enable */

  if (variableValue) {
    return variableValue.trim()
  } else if (defaultValue) {
    return defaultValue
  }

  throw new PolishedError(74)
}
