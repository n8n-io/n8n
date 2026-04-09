import type { PanelConstraints, PanelData } from '../SplitterPanel.vue'

export type SizeUnit = '%' | 'px'

type ConvertConstraintsToPercentOptions = {
  panelDataArray: PanelData[]
  groupSizeInPixels: number | null
}

type ConvertValueOptions = {
  sizeUnit: SizeUnit
  groupSizeInPixels: number | null
  value: number | undefined
}

function convertValueToPercent({ sizeUnit, groupSizeInPixels, value }: ConvertValueOptions): number | undefined {
  if (value == null)
    return value

  if (sizeUnit === '%')
    return value

  if (groupSizeInPixels == null || groupSizeInPixels === 0)
    return undefined

  return (value / groupSizeInPixels) * 100
}

export function convertPanelConstraintsToPercent({
  panelDataArray,
  groupSizeInPixels,
}: ConvertConstraintsToPercentOptions): PanelConstraints[] | null {
  const requiresMeasurement = panelDataArray.some(
    panelData => (panelData.constraints.sizeUnit ?? '%') === 'px',
  )

  if (requiresMeasurement && (!groupSizeInPixels || Number.isNaN(groupSizeInPixels)))
    return null

  return panelDataArray.map((panelData) => {
    const constraints = panelData.constraints
    const sizeUnit = constraints.sizeUnit ?? '%'

    const collapsedSize = convertValueToPercent({
      groupSizeInPixels,
      sizeUnit,
      value: constraints.collapsedSize,
    })

    const defaultSize = convertValueToPercent({
      groupSizeInPixels,
      sizeUnit,
      value: constraints.defaultSize,
    })

    const maxSize = convertValueToPercent({
      groupSizeInPixels,
      sizeUnit,
      value: constraints.maxSize,
    })

    const minSize = convertValueToPercent({
      groupSizeInPixels,
      sizeUnit,
      value: constraints.minSize,
    })

    return {
      ...constraints,
      collapsedSize: collapsedSize ?? constraints.collapsedSize ?? 0,
      defaultSize,
      maxSize: maxSize ?? 100,
      minSize: minSize ?? 0,
      sizeUnit: '%',
    }
  })
}

type RecalculateLayoutOptions = {
  layout: number[]
  panelDataArray: PanelData[]
  prevGroupSize: number | null
  nextGroupSize: number | null
}

export function hasPixelSizedPanel(panelDataArray: PanelData[]): boolean {
  return panelDataArray.some(panelData => (panelData.constraints.sizeUnit ?? '%') === 'px')
}

export function recalculateLayoutForPixelPanels({
  layout,
  panelDataArray,
  prevGroupSize,
  nextGroupSize,
}: RecalculateLayoutOptions): number[] | null {
  if (!hasPixelSizedPanel(panelDataArray)) {
    return null
  }

  if (
    prevGroupSize == null
    || nextGroupSize == null
    || prevGroupSize === 0
    || nextGroupSize === 0
    || Number.isNaN(prevGroupSize)
    || Number.isNaN(nextGroupSize)
  ) {
    return null
  }

  const pixelPanelIndices = panelDataArray.reduce<number[]>((indices, panelData, index) => {
    if ((panelData.constraints.sizeUnit ?? '%') === 'px')
      indices.push(index)

    return indices
  }, [])

  if (pixelPanelIndices.length === 0) {
    return null
  }

  const pixelIndexSet = new Set(pixelPanelIndices)

  const nextLayout = layout.map(size => size ?? 0)

  const prevPercentForPixelPanels = pixelPanelIndices.reduce((sum, index) => sum + (layout[index] ?? 0), 0)

  const nextPixelPercents = pixelPanelIndices.map((index) => {
    const prevPercent = layout[index] ?? 0
    const prevPixelSize = (prevPercent / 100) * prevGroupSize
    return (prevPixelSize / nextGroupSize) * 100
  })

  const totalNextPixelPercent = nextPixelPercents.reduce((sum, value) => sum + value, 0)

  const prevPercentForPercentPanels = layout.reduce((sum, size, index) => {
    if (pixelIndexSet.has(index))
      return sum

    return sum + (size ?? 0)
  }, 0)

  const availableNextPercent = Math.max(0, 100 - totalNextPixelPercent)
  const scaleFactor = prevPercentForPercentPanels > 0
    ? availableNextPercent / prevPercentForPercentPanels
    : 0

  pixelPanelIndices.forEach((panelIndex, arrayIndex) => {
    nextLayout[panelIndex] = nextPixelPercents[arrayIndex]
  })

  for (let index = 0; index < nextLayout.length; index++) {
    if (pixelIndexSet.has(index))
      continue

    const prevSize = layout[index] ?? 0
    nextLayout[index] = prevSize * scaleFactor
  }

  // Normalize to ensure percentages always sum to exactly 100.
  // Floating-point arithmetic in the px→% conversions above can cause drift
  // (e.g. 99.89% instead of 100%) that gets persisted to localStorage and
  // triggers validation warnings on every subsequent page load.
  const total = nextLayout.reduce((sum, size) => sum + size, 0)
  if (total > 0 && Math.abs(total - 100) > 1e-9) {
    const factor = 100 / total
    for (let index = 0; index < nextLayout.length; index++) {
      nextLayout[index] = (nextLayout[index] ?? 0) * factor
    }
  }

  return nextLayout
}
