// @flow
const cssRegex = /^([+-]?(?:\d+|\d*\.\d+))([a-z]*|%)$/

/**
 * Returns a given CSS value minus its unit of measure.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   '--dimension': stripUnit('100px')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   --dimension: ${stripUnit('100px')};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   '--dimension': 100
 * }
 */
export default function stripUnit(value: string | number): string | number {
  if (typeof value !== 'string') return value
  const matchedValue = value.match(cssRegex)
  return matchedValue ? parseFloat(value) : value
}
