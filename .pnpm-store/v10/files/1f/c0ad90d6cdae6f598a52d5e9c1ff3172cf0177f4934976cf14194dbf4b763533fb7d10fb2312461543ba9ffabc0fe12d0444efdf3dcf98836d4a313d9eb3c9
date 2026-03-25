// @flow
import getContrast from './getContrast'

import type { ContrastScores } from '../types/color'

/**
 * Determines which contrast guidelines have been met for two colors.
 * Based on the [contrast calculations recommended by W3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced.html).
 *
 * @example
 * const scores = meetsContrastGuidelines('#444', '#fff');
 */
export default function meetsContrastGuidelines(color1: string, color2: string): ContrastScores {
  const contrastRatio = getContrast(color1, color2)
  return {
    AA: contrastRatio >= 4.5,
    AALarge: contrastRatio >= 3,
    AAA: contrastRatio >= 7,
    AAALarge: contrastRatio >= 4.5,
  }
}
