// @flow
import getContrast from './getContrast'
import getLuminance from './getLuminance'

const defaultReturnIfLightColor = '#000'
const defaultReturnIfDarkColor = '#fff'

/**
 * Returns black or white (or optional passed colors) for best
 * contrast depending on the luminosity of the given color.
 * When passing custom return colors, strict mode ensures that the
 * return color always meets or exceeds WCAG level AA or greater. If this test
 * fails, the default return color (black or white) is returned in place of the
 * custom return color. You can optionally turn off strict mode.
 *
 * Follows [W3C specs for readability](https://www.w3.org/TR/WCAG20-TECHS/G18.html).
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   color: readableColor('#000'),
 *   color: readableColor('black', '#001', '#ff8'),
 *   color: readableColor('white', '#001', '#ff8'),
 *   color: readableColor('red', '#333', '#ddd', true)
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   color: ${readableColor('#000')};
 *   color: ${readableColor('black', '#001', '#ff8')};
 *   color: ${readableColor('white', '#001', '#ff8')};
 *   color: ${readableColor('red', '#333', '#ddd', true)};
 * `
 *
 * // CSS in JS Output
 * element {
 *   color: "#fff";
 *   color: "#ff8";
 *   color: "#001";
 *   color: "#000";
 * }
 */
export default function readableColor(
  color: string,
  returnIfLightColor?: string = defaultReturnIfLightColor,
  returnIfDarkColor?: string = defaultReturnIfDarkColor,
  strict?: boolean = true,
): string {
  const isColorLight = getLuminance(color) > 0.179
  const preferredReturnColor = isColorLight ? returnIfLightColor : returnIfDarkColor

  if (!strict || getContrast(color, preferredReturnColor) >= 4.5) {
    return preferredReturnColor
  }
  return isColorLight ? defaultReturnIfLightColor : defaultReturnIfDarkColor
}
