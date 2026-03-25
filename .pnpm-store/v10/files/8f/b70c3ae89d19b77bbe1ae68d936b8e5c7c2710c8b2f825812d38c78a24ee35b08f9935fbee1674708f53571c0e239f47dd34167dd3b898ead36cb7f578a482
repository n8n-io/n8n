import type { PanelConstraints } from '../SplitterPanel.vue'
import { assert } from './assert'
import { fuzzyNumbersEqual } from './compare'
import { resizePanel } from './resizePanel'

// All units must be in percentages; pixel values should be pre-converted
export function validatePanelGroupLayout({
  layout: prevLayout,
  panelConstraints,
}: {
  layout: number[]
  panelConstraints: PanelConstraints[]
}): number[] {
  const nextLayout = [...prevLayout]
  const nextLayoutTotalSize = nextLayout.reduce(
    (accumulated, current) => accumulated + current,
    0,
  )

  // Validate layout expectations
  if (nextLayout.length !== panelConstraints.length) {
    throw new Error(
      `Invalid ${panelConstraints.length} panel layout: ${nextLayout
        .map(size => `${size}%`)
        .join(', ')}`,
    )
  }
  else if (!fuzzyNumbersEqual(nextLayoutTotalSize, 100)) {
    // This is not ideal so we should warn about it, but it may be recoverable in some cases
    // (especially if the amount is small)

    if (true) {
      console.warn(
        `WARNING: Invalid layout total size: ${nextLayout
          .map(size => `${size}%`)
          .join(', ')}. Layout normalization will be applied.`,
      )
    }
    for (let index = 0; index < panelConstraints.length; index++) {
      const unsafeSize = nextLayout[index]
      assert(unsafeSize != null)
      const safeSize = (100 / nextLayoutTotalSize) * unsafeSize
      nextLayout[index] = safeSize
    }
  }

  let remainingSize = 0

  // First pass: Validate the proposed layout given each panel's constraints
  for (let index = 0; index < panelConstraints.length; index++) {
    const unsafeSize = nextLayout[index]
    assert(unsafeSize != null)

    const safeSize = resizePanel({
      panelConstraints,
      panelIndex: index,
      size: unsafeSize,
    })

    if (unsafeSize !== safeSize) {
      remainingSize += unsafeSize - safeSize

      nextLayout[index] = safeSize
    }
  }

  // If there is additional, left over space, assign it to any panel(s) that permits it
  // (It's not worth taking multiple additional passes to evenly distribute)
  if (!fuzzyNumbersEqual(remainingSize, 0)) {
    for (let index = 0; index < panelConstraints.length; index++) {
      const prevSize = nextLayout[index]
      assert(prevSize != null)
      const unsafeSize = prevSize + remainingSize
      const safeSize = resizePanel({
        panelConstraints,
        panelIndex: index,
        size: unsafeSize,
      })

      if (prevSize !== safeSize) {
        remainingSize -= safeSize - prevSize
        nextLayout[index] = safeSize

        // Once we've used up the remainder, bail
        if (fuzzyNumbersEqual(remainingSize, 0))
          break
      }
    }
  }

  return nextLayout
}

export function validatePanelConstraints({
  panelConstraints: panelConstraintsArray,
  panelId,
  panelIndex,
}: {
  panelConstraints: PanelConstraints[]
  panelId: string | undefined
  panelIndex: number
}): boolean {
  if (import.meta.env.DEV) {
    const warnings = []

    const panelConstraints = panelConstraintsArray[panelIndex]
    assert(panelConstraints)

    const {
      collapsedSize = 0,
      collapsible = false,
      defaultSize,
      maxSize = 100,
      minSize = 0,
    } = panelConstraints

    if (minSize > maxSize) {
      warnings.push(
        `min size (${minSize}%) should not be greater than max size (${maxSize}%)`,
      )
    }

    if (defaultSize != null) {
      if (defaultSize < 0) {
        warnings.push('default size should not be less than 0')
      }
      else if (
        defaultSize < minSize
        && (!collapsible || defaultSize !== collapsedSize)
      ) {
        warnings.push('default size should not be less than min size')
      }

      if (defaultSize > 100)
        warnings.push('default size should not be greater than 100')
      else if (defaultSize > maxSize)
        warnings.push('default size should not be greater than max size')
    }

    if (collapsedSize > minSize)
      warnings.push('collapsed size should not be greater than min size')

    if (warnings.length > 0) {
      const name = panelId != null ? `Panel "${panelId}"` : 'Panel'
      console.warn(
        `${name} has an invalid configuration:\n\n${warnings.join('\n')}`,
      )

      return false
    }
  }

  return true
}
