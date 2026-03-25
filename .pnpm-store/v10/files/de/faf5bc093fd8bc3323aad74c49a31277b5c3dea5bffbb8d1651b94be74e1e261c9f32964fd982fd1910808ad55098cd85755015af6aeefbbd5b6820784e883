// @flow
import curry from '../internalHelpers/_curry'
import guard from '../internalHelpers/_guard'
import rgba from './rgba'
import parseToRgb from './parseToRgb'

/**
 * Decreases the opacity of a color. Its range for the amount is between 0 to 1.
 *
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: transparentize(0.1, '#fff'),
 *   background: transparentize(0.2, 'hsl(0, 0%, 100%)'),
 *   background: transparentize('0.5', 'rgba(255, 0, 0, 0.8)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${transparentize(0.1, '#fff')};
 *   background: ${transparentize(0.2, 'hsl(0, 0%, 100%)')};
 *   background: ${transparentize('0.5', 'rgba(255, 0, 0, 0.8)')};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "rgba(255,255,255,0.9)";
 *   background: "rgba(255,255,255,0.8)";
 *   background: "rgba(255,0,0,0.3)";
 * }
 */
function transparentize(amount: number | string, color: string): string {
  if (color === 'transparent') return color
  const parsedColor = parseToRgb(color)
  const alpha: number = typeof parsedColor.alpha === 'number' ? parsedColor.alpha : 1
  const colorWithAlpha = {
    ...parsedColor,
    alpha: guard(0, 1, +(alpha * 100 - parseFloat(amount) * 100).toFixed(2) / 100),
  }
  return rgba(colorWithAlpha)
}

// prettier-ignore
const curriedTransparentize = curry/* ::<number | string, string, string> */(
  transparentize,
)
export default curriedTransparentize
