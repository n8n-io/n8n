// @flow
import PolishedError from '../internalHelpers/_errors'

import type { FontFaceConfiguration } from '../types/fontFaceConfiguration'
import type { Styles } from '../types/style'

const dataURIRegex = /^\s*data:([a-z]+\/[a-z-]+(;[a-z-]+=[a-z-]+)?)?(;charset=[a-z0-9-]+)?(;base64)?,[a-z0-9!$&',()*+,;=\-._~:@/?%\s]*\s*$/i

const formatHintMap = {
  woff: 'woff',
  woff2: 'woff2',
  ttf: 'truetype',
  otf: 'opentype',
  eot: 'embedded-opentype',
  svg: 'svg',
  svgz: 'svg',
}

function generateFormatHint(format: string, formatHint: boolean): string {
  if (!formatHint) return ''
  return ` format("${formatHintMap[format]}")`
}

function isDataURI(fontFilePath: string): boolean {
  return !!fontFilePath.replace(/\s+/g, ' ').match(dataURIRegex)
}

function generateFileReferences(
  fontFilePath: string,
  fileFormats: Array<string>,
  formatHint: boolean,
): string {
  if (isDataURI(fontFilePath)) {
    return `url("${fontFilePath}")${generateFormatHint(fileFormats[0], formatHint)}`
  }

  const fileFontReferences = fileFormats.map(
    format => `url("${fontFilePath}.${format}")${generateFormatHint(format, formatHint)}`,
  )
  return fileFontReferences.join(', ')
}

function generateLocalReferences(localFonts: Array<string>): string {
  const localFontReferences = localFonts.map(font => `local("${font}")`)
  return localFontReferences.join(', ')
}

function generateSources(
  fontFilePath?: string,
  localFonts: Array<string> | null,
  fileFormats: Array<string>,
  formatHint: boolean,
): string {
  const fontReferences = []
  if (localFonts) fontReferences.push(generateLocalReferences(localFonts))
  if (fontFilePath) {
    fontReferences.push(generateFileReferences(fontFilePath, fileFormats, formatHint))
  }
  return fontReferences.join(', ')
}

/**
 * CSS for a @font-face declaration. Defaults to check for local copies of the font on the user's machine. You can disable this by passing `null` to localFonts.
 *
 * @example
 * // Styles as object basic usage
 * const styles = {
 *    ...fontFace({
 *      'fontFamily': 'Sans-Pro',
 *      'fontFilePath': 'path/to/file'
 *    })
 * }
 *
 * // styled-components basic usage
 * const GlobalStyle = createGlobalStyle`${
 *   fontFace({
 *     'fontFamily': 'Sans-Pro',
 *     'fontFilePath': 'path/to/file'
 *   }
 * )}`
 *
 * // CSS as JS Output
 *
 * '@font-face': {
 *   'fontFamily': 'Sans-Pro',
 *   'src': 'url("path/to/file.eot"), url("path/to/file.woff2"), url("path/to/file.woff"), url("path/to/file.ttf"), url("path/to/file.svg")',
 * }
 */

export default function fontFace({
  fontFamily,
  fontFilePath,
  fontStretch,
  fontStyle,
  fontVariant,
  fontWeight,
  fileFormats = ['eot', 'woff2', 'woff', 'ttf', 'svg'],
  formatHint = false,
  localFonts = [fontFamily],
  unicodeRange,
  fontDisplay,
  fontVariationSettings,
  fontFeatureSettings,
}: FontFaceConfiguration): Styles {
  // Error Handling
  if (!fontFamily) throw new PolishedError(55)
  if (!fontFilePath && !localFonts) {
    throw new PolishedError(52)
  }
  if (localFonts && !Array.isArray(localFonts)) {
    throw new PolishedError(53)
  }
  if (!Array.isArray(fileFormats)) {
    throw new PolishedError(54)
  }

  const fontFaceDeclaration = {
    '@font-face': {
      fontFamily,
      src: generateSources(fontFilePath, localFonts, fileFormats, formatHint),
      unicodeRange,
      fontStretch,
      fontStyle,
      fontVariant,
      fontWeight,
      fontDisplay,
      fontVariationSettings,
      fontFeatureSettings,
    },
  }

  // Removes undefined fields for cleaner css object.
  return JSON.parse(JSON.stringify(fontFaceDeclaration))
}
