import { approxEqual, debounce, memo, notUndefined } from './utils'

export * from './utils'

//

type ScrollDirection = 'forward' | 'backward'

type ScrollAlignment = 'start' | 'center' | 'end' | 'auto'

type ScrollBehavior = 'auto' | 'smooth'

export interface ScrollToOptions {
  align?: ScrollAlignment
  behavior?: ScrollBehavior
}

type ScrollToOffsetOptions = ScrollToOptions

type ScrollToIndexOptions = ScrollToOptions

export interface Range {
  startIndex: number
  endIndex: number
  overscan: number
  count: number
}

type Key = number | string | bigint

export interface VirtualItem {
  key: Key
  index: number
  start: number
  end: number
  size: number
  lane: number
}

export interface Rect {
  width: number
  height: number
}

//

const getRect = (element: HTMLElement): Rect => {
  const { offsetWidth, offsetHeight } = element
  return { width: offsetWidth, height: offsetHeight }
}

export const defaultKeyExtractor = (index: number) => index

export const defaultRangeExtractor = (range: Range) => {
  const start = Math.max(range.startIndex - range.overscan, 0)
  const end = Math.min(range.endIndex + range.overscan, range.count - 1)

  const arr = []

  for (let i = start; i <= end; i++) {
    arr.push(i)
  }

  return arr
}

export const observeElementRect = <T extends Element>(
  instance: Virtualizer<T, any>,
  cb: (rect: Rect) => void,
) => {
  const element = instance.scrollElement
  if (!element) {
    return
  }
  const targetWindow = instance.targetWindow
  if (!targetWindow) {
    return
  }

  const handler = (rect: Rect) => {
    const { width, height } = rect
    cb({ width: Math.round(width), height: Math.round(height) })
  }

  handler(getRect(element as unknown as HTMLElement))

  if (!targetWindow.ResizeObserver) {
    return () => {}
  }

  const observer = new targetWindow.ResizeObserver((entries) => {
    const run = () => {
      const entry = entries[0]
      if (entry?.borderBoxSize) {
        const box = entry.borderBoxSize[0]
        if (box) {
          handler({ width: box.inlineSize, height: box.blockSize })
          return
        }
      }
      handler(getRect(element as unknown as HTMLElement))
    }

    instance.options.useAnimationFrameWithResizeObserver
      ? requestAnimationFrame(run)
      : run()
  })

  observer.observe(element, { box: 'border-box' })

  return () => {
    observer.unobserve(element)
  }
}

const addEventListenerOptions = {
  passive: true,
}

export const observeWindowRect = (
  instance: Virtualizer<Window, any>,
  cb: (rect: Rect) => void,
) => {
  const element = instance.scrollElement
  if (!element) {
    return
  }

  const handler = () => {
    cb({ width: element.innerWidth, height: element.innerHeight })
  }
  handler()

  element.addEventListener('resize', handler, addEventListenerOptions)

  return () => {
    element.removeEventListener('resize', handler)
  }
}

const supportsScrollend =
  typeof window == 'undefined' ? true : 'onscrollend' in window

type ObserveOffsetCallBack = (offset: number, isScrolling: boolean) => void

export const observeElementOffset = <T extends Element>(
  instance: Virtualizer<T, any>,
  cb: ObserveOffsetCallBack,
) => {
  const element = instance.scrollElement
  if (!element) {
    return
  }
  const targetWindow = instance.targetWindow
  if (!targetWindow) {
    return
  }

  let offset = 0
  const fallback =
    instance.options.useScrollendEvent && supportsScrollend
      ? () => undefined
      : debounce(
          targetWindow,
          () => {
            cb(offset, false)
          },
          instance.options.isScrollingResetDelay,
        )

  const createHandler = (isScrolling: boolean) => () => {
    const { horizontal, isRtl } = instance.options
    offset = horizontal
      ? element['scrollLeft'] * ((isRtl && -1) || 1)
      : element['scrollTop']
    fallback()
    cb(offset, isScrolling)
  }
  const handler = createHandler(true)
  const endHandler = createHandler(false)
  endHandler()

  element.addEventListener('scroll', handler, addEventListenerOptions)
  const registerScrollendEvent =
    instance.options.useScrollendEvent && supportsScrollend
  if (registerScrollendEvent) {
    element.addEventListener('scrollend', endHandler, addEventListenerOptions)
  }
  return () => {
    element.removeEventListener('scroll', handler)
    if (registerScrollendEvent) {
      element.removeEventListener('scrollend', endHandler)
    }
  }
}

export const observeWindowOffset = (
  instance: Virtualizer<Window, any>,
  cb: ObserveOffsetCallBack,
) => {
  const element = instance.scrollElement
  if (!element) {
    return
  }
  const targetWindow = instance.targetWindow
  if (!targetWindow) {
    return
  }

  let offset = 0
  const fallback =
    instance.options.useScrollendEvent && supportsScrollend
      ? () => undefined
      : debounce(
          targetWindow,
          () => {
            cb(offset, false)
          },
          instance.options.isScrollingResetDelay,
        )

  const createHandler = (isScrolling: boolean) => () => {
    offset = element[instance.options.horizontal ? 'scrollX' : 'scrollY']
    fallback()
    cb(offset, isScrolling)
  }
  const handler = createHandler(true)
  const endHandler = createHandler(false)
  endHandler()

  element.addEventListener('scroll', handler, addEventListenerOptions)
  const registerScrollendEvent =
    instance.options.useScrollendEvent && supportsScrollend
  if (registerScrollendEvent) {
    element.addEventListener('scrollend', endHandler, addEventListenerOptions)
  }
  return () => {
    element.removeEventListener('scroll', handler)
    if (registerScrollendEvent) {
      element.removeEventListener('scrollend', endHandler)
    }
  }
}

export const measureElement = <TItemElement extends Element>(
  element: TItemElement,
  entry: ResizeObserverEntry | undefined,
  instance: Virtualizer<any, TItemElement>,
) => {
  if (entry?.borderBoxSize) {
    const box = entry.borderBoxSize[0]
    if (box) {
      const size = Math.round(
        box[instance.options.horizontal ? 'inlineSize' : 'blockSize'],
      )
      return size
    }
  }

  return (element as unknown as HTMLElement)[
    instance.options.horizontal ? 'offsetWidth' : 'offsetHeight'
  ]
}

export const windowScroll = <T extends Window>(
  offset: number,
  {
    adjustments = 0,
    behavior,
  }: { adjustments?: number; behavior?: ScrollBehavior },
  instance: Virtualizer<T, any>,
) => {
  const toOffset = offset + adjustments

  instance.scrollElement?.scrollTo?.({
    [instance.options.horizontal ? 'left' : 'top']: toOffset,
    behavior,
  })
}

export const elementScroll = <T extends Element>(
  offset: number,
  {
    adjustments = 0,
    behavior,
  }: { adjustments?: number; behavior?: ScrollBehavior },
  instance: Virtualizer<T, any>,
) => {
  const toOffset = offset + adjustments

  instance.scrollElement?.scrollTo?.({
    [instance.options.horizontal ? 'left' : 'top']: toOffset,
    behavior,
  })
}

export interface VirtualizerOptions<
  TScrollElement extends Element | Window,
  TItemElement extends Element,
> {
  // Required from the user
  count: number
  getScrollElement: () => TScrollElement | null
  estimateSize: (index: number) => number

  // Required from the framework adapter (but can be overridden)
  scrollToFn: (
    offset: number,
    options: { adjustments?: number; behavior?: ScrollBehavior },
    instance: Virtualizer<TScrollElement, TItemElement>,
  ) => void
  observeElementRect: (
    instance: Virtualizer<TScrollElement, TItemElement>,
    cb: (rect: Rect) => void,
  ) => void | (() => void)
  observeElementOffset: (
    instance: Virtualizer<TScrollElement, TItemElement>,
    cb: ObserveOffsetCallBack,
  ) => void | (() => void)
  // Optional
  debug?: boolean
  initialRect?: Rect
  onChange?: (
    instance: Virtualizer<TScrollElement, TItemElement>,
    sync: boolean,
  ) => void
  measureElement?: (
    element: TItemElement,
    entry: ResizeObserverEntry | undefined,
    instance: Virtualizer<TScrollElement, TItemElement>,
  ) => number
  overscan?: number
  horizontal?: boolean
  paddingStart?: number
  paddingEnd?: number
  scrollPaddingStart?: number
  scrollPaddingEnd?: number
  initialOffset?: number | (() => number)
  getItemKey?: (index: number) => Key
  rangeExtractor?: (range: Range) => Array<number>
  scrollMargin?: number
  gap?: number
  indexAttribute?: string
  initialMeasurementsCache?: Array<VirtualItem>
  lanes?: number
  isScrollingResetDelay?: number
  useScrollendEvent?: boolean
  enabled?: boolean
  isRtl?: boolean
  useAnimationFrameWithResizeObserver?: boolean
}

export class Virtualizer<
  TScrollElement extends Element | Window,
  TItemElement extends Element,
> {
  private unsubs: Array<void | (() => void)> = []
  options!: Required<VirtualizerOptions<TScrollElement, TItemElement>>
  scrollElement: TScrollElement | null = null
  targetWindow: (Window & typeof globalThis) | null = null
  isScrolling = false
  private scrollToIndexTimeoutId: number | null = null
  measurementsCache: Array<VirtualItem> = []
  private itemSizeCache = new Map<Key, number>()
  private pendingMeasuredCacheIndexes: Array<number> = []
  scrollRect: Rect | null = null
  scrollOffset: number | null = null
  scrollDirection: ScrollDirection | null = null
  private scrollAdjustments = 0
  shouldAdjustScrollPositionOnItemSizeChange:
    | undefined
    | ((
        item: VirtualItem,
        delta: number,
        instance: Virtualizer<TScrollElement, TItemElement>,
      ) => boolean)
  elementsCache = new Map<Key, TItemElement>()
  private observer = (() => {
    let _ro: ResizeObserver | null = null

    const get = () => {
      if (_ro) {
        return _ro
      }

      if (!this.targetWindow || !this.targetWindow.ResizeObserver) {
        return null
      }

      return (_ro = new this.targetWindow.ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const run = () => {
            this._measureElement(entry.target as TItemElement, entry)
          }
          this.options.useAnimationFrameWithResizeObserver
            ? requestAnimationFrame(run)
            : run()
        })
      }))
    }

    return {
      disconnect: () => {
        get()?.disconnect()
        _ro = null
      },
      observe: (target: Element) =>
        get()?.observe(target, { box: 'border-box' }),
      unobserve: (target: Element) => get()?.unobserve(target),
    }
  })()
  range: { startIndex: number; endIndex: number } | null = null

  constructor(opts: VirtualizerOptions<TScrollElement, TItemElement>) {
    this.setOptions(opts)
  }

  setOptions = (opts: VirtualizerOptions<TScrollElement, TItemElement>) => {
    Object.entries(opts).forEach(([key, value]) => {
      if (typeof value === 'undefined') delete (opts as any)[key]
    })

    this.options = {
      debug: false,
      initialOffset: 0,
      overscan: 1,
      paddingStart: 0,
      paddingEnd: 0,
      scrollPaddingStart: 0,
      scrollPaddingEnd: 0,
      horizontal: false,
      getItemKey: defaultKeyExtractor,
      rangeExtractor: defaultRangeExtractor,
      onChange: () => {},
      measureElement,
      initialRect: { width: 0, height: 0 },
      scrollMargin: 0,
      gap: 0,
      indexAttribute: 'data-index',
      initialMeasurementsCache: [],
      lanes: 1,
      isScrollingResetDelay: 150,
      enabled: true,
      isRtl: false,
      useScrollendEvent: false,
      useAnimationFrameWithResizeObserver: false,
      ...opts,
    }
  }

  private notify = (sync: boolean) => {
    this.options.onChange?.(this, sync)
  }

  private maybeNotify = memo(
    () => {
      this.calculateRange()

      return [
        this.isScrolling,
        this.range ? this.range.startIndex : null,
        this.range ? this.range.endIndex : null,
      ]
    },
    (isScrolling) => {
      this.notify(isScrolling)
    },
    {
      key: process.env.NODE_ENV !== 'production' && 'maybeNotify',
      debug: () => this.options.debug,
      initialDeps: [
        this.isScrolling,
        this.range ? this.range.startIndex : null,
        this.range ? this.range.endIndex : null,
      ] as [boolean, number | null, number | null],
    },
  )

  private cleanup = () => {
    this.unsubs.filter(Boolean).forEach((d) => d!())
    this.unsubs = []
    this.observer.disconnect()
    this.scrollElement = null
    this.targetWindow = null
  }

  _didMount = () => {
    return () => {
      this.cleanup()
    }
  }

  _willUpdate = () => {
    const scrollElement = this.options.enabled
      ? this.options.getScrollElement()
      : null

    if (this.scrollElement !== scrollElement) {
      this.cleanup()

      if (!scrollElement) {
        this.maybeNotify()
        return
      }

      this.scrollElement = scrollElement

      if (this.scrollElement && 'ownerDocument' in this.scrollElement) {
        this.targetWindow = this.scrollElement.ownerDocument.defaultView
      } else {
        this.targetWindow = this.scrollElement?.window ?? null
      }

      this.elementsCache.forEach((cached) => {
        this.observer.observe(cached)
      })

      this._scrollToOffset(this.getScrollOffset(), {
        adjustments: undefined,
        behavior: undefined,
      })

      this.unsubs.push(
        this.options.observeElementRect(this, (rect) => {
          this.scrollRect = rect
          this.maybeNotify()
        }),
      )

      this.unsubs.push(
        this.options.observeElementOffset(this, (offset, isScrolling) => {
          this.scrollAdjustments = 0
          this.scrollDirection = isScrolling
            ? this.getScrollOffset() < offset
              ? 'forward'
              : 'backward'
            : null
          this.scrollOffset = offset
          this.isScrolling = isScrolling

          this.maybeNotify()
        }),
      )
    }
  }

  private getSize = () => {
    if (!this.options.enabled) {
      this.scrollRect = null
      return 0
    }

    this.scrollRect = this.scrollRect ?? this.options.initialRect

    return this.scrollRect[this.options.horizontal ? 'width' : 'height']
  }

  private getScrollOffset = () => {
    if (!this.options.enabled) {
      this.scrollOffset = null
      return 0
    }

    this.scrollOffset =
      this.scrollOffset ??
      (typeof this.options.initialOffset === 'function'
        ? this.options.initialOffset()
        : this.options.initialOffset)

    return this.scrollOffset
  }

  private getFurthestMeasurement = (
    measurements: Array<VirtualItem>,
    index: number,
  ) => {
    const furthestMeasurementsFound = new Map<number, true>()
    const furthestMeasurements = new Map<number, VirtualItem>()
    for (let m = index - 1; m >= 0; m--) {
      const measurement = measurements[m]!

      if (furthestMeasurementsFound.has(measurement.lane)) {
        continue
      }

      const previousFurthestMeasurement = furthestMeasurements.get(
        measurement.lane,
      )
      if (
        previousFurthestMeasurement == null ||
        measurement.end > previousFurthestMeasurement.end
      ) {
        furthestMeasurements.set(measurement.lane, measurement)
      } else if (measurement.end < previousFurthestMeasurement.end) {
        furthestMeasurementsFound.set(measurement.lane, true)
      }

      if (furthestMeasurementsFound.size === this.options.lanes) {
        break
      }
    }

    return furthestMeasurements.size === this.options.lanes
      ? Array.from(furthestMeasurements.values()).sort((a, b) => {
          if (a.end === b.end) {
            return a.index - b.index
          }

          return a.end - b.end
        })[0]
      : undefined
  }

  private getMeasurementOptions = memo(
    () => [
      this.options.count,
      this.options.paddingStart,
      this.options.scrollMargin,
      this.options.getItemKey,
      this.options.enabled,
    ],
    (count, paddingStart, scrollMargin, getItemKey, enabled) => {
      this.pendingMeasuredCacheIndexes = []
      return {
        count,
        paddingStart,
        scrollMargin,
        getItemKey,
        enabled,
      }
    },
    {
      key: false,
    },
  )

  private getMeasurements = memo(
    () => [this.getMeasurementOptions(), this.itemSizeCache],
    (
      { count, paddingStart, scrollMargin, getItemKey, enabled },
      itemSizeCache,
    ) => {
      if (!enabled) {
        this.measurementsCache = []
        this.itemSizeCache.clear()
        return []
      }

      if (this.measurementsCache.length === 0) {
        this.measurementsCache = this.options.initialMeasurementsCache
        this.measurementsCache.forEach((item) => {
          this.itemSizeCache.set(item.key, item.size)
        })
      }

      const min =
        this.pendingMeasuredCacheIndexes.length > 0
          ? Math.min(...this.pendingMeasuredCacheIndexes)
          : 0
      this.pendingMeasuredCacheIndexes = []

      const measurements = this.measurementsCache.slice(0, min)

      for (let i = min; i < count; i++) {
        const key = getItemKey(i)

        const furthestMeasurement =
          this.options.lanes === 1
            ? measurements[i - 1]
            : this.getFurthestMeasurement(measurements, i)

        const start = furthestMeasurement
          ? furthestMeasurement.end + this.options.gap
          : paddingStart + scrollMargin

        const measuredSize = itemSizeCache.get(key)
        const size =
          typeof measuredSize === 'number'
            ? measuredSize
            : this.options.estimateSize(i)

        const end = start + size

        const lane = furthestMeasurement
          ? furthestMeasurement.lane
          : i % this.options.lanes

        measurements[i] = {
          index: i,
          start,
          size,
          end,
          key,
          lane,
        }
      }

      this.measurementsCache = measurements

      return measurements
    },
    {
      key: process.env.NODE_ENV !== 'production' && 'getMeasurements',
      debug: () => this.options.debug,
    },
  )

  calculateRange = memo(
    () => [
      this.getMeasurements(),
      this.getSize(),
      this.getScrollOffset(),
      this.options.lanes,
    ],
    (measurements, outerSize, scrollOffset, lanes) => {
      return (this.range =
        measurements.length > 0 && outerSize > 0
          ? calculateRange({
              measurements,
              outerSize,
              scrollOffset,
              lanes,
            })
          : null)
    },
    {
      key: process.env.NODE_ENV !== 'production' && 'calculateRange',
      debug: () => this.options.debug,
    },
  )

  getVirtualIndexes = memo(
    () => {
      let startIndex: number | null = null
      let endIndex: number | null = null
      const range = this.calculateRange()
      if (range) {
        startIndex = range.startIndex
        endIndex = range.endIndex
      }
      this.maybeNotify.updateDeps([this.isScrolling, startIndex, endIndex])
      return [
        this.options.rangeExtractor,
        this.options.overscan,
        this.options.count,
        startIndex,
        endIndex,
      ]
    },
    (rangeExtractor, overscan, count, startIndex, endIndex) => {
      return startIndex === null || endIndex === null
        ? []
        : rangeExtractor({
            startIndex,
            endIndex,
            overscan,
            count,
          })
    },
    {
      key: process.env.NODE_ENV !== 'production' && 'getVirtualIndexes',
      debug: () => this.options.debug,
    },
  )

  indexFromElement = (node: TItemElement) => {
    const attributeName = this.options.indexAttribute
    const indexStr = node.getAttribute(attributeName)

    if (!indexStr) {
      console.warn(
        `Missing attribute name '${attributeName}={index}' on measured element.`,
      )
      return -1
    }

    return parseInt(indexStr, 10)
  }

  private _measureElement = (
    node: TItemElement,
    entry: ResizeObserverEntry | undefined,
  ) => {
    const index = this.indexFromElement(node)
    const item = this.measurementsCache[index]
    if (!item) {
      return
    }
    const key = item.key
    const prevNode = this.elementsCache.get(key)

    if (prevNode !== node) {
      if (prevNode) {
        this.observer.unobserve(prevNode)
      }
      this.observer.observe(node)
      this.elementsCache.set(key, node)
    }

    if (node.isConnected) {
      this.resizeItem(index, this.options.measureElement(node, entry, this))
    }
  }

  resizeItem = (index: number, size: number) => {
    const item = this.measurementsCache[index]
    if (!item) {
      return
    }
    const itemSize = this.itemSizeCache.get(item.key) ?? item.size
    const delta = size - itemSize

    if (delta !== 0) {
      if (
        this.shouldAdjustScrollPositionOnItemSizeChange !== undefined
          ? this.shouldAdjustScrollPositionOnItemSizeChange(item, delta, this)
          : item.start < this.getScrollOffset() + this.scrollAdjustments
      ) {
        if (process.env.NODE_ENV !== 'production' && this.options.debug) {
          console.info('correction', delta)
        }

        this._scrollToOffset(this.getScrollOffset(), {
          adjustments: (this.scrollAdjustments += delta),
          behavior: undefined,
        })
      }

      this.pendingMeasuredCacheIndexes.push(item.index)
      this.itemSizeCache = new Map(this.itemSizeCache.set(item.key, size))

      this.notify(false)
    }
  }

  measureElement = (node: TItemElement | null | undefined) => {
    if (!node) {
      this.elementsCache.forEach((cached, key) => {
        if (!cached.isConnected) {
          this.observer.unobserve(cached)
          this.elementsCache.delete(key)
        }
      })
      return
    }

    this._measureElement(node, undefined)
  }

  getVirtualItems = memo(
    () => [this.getVirtualIndexes(), this.getMeasurements()],
    (indexes, measurements) => {
      const virtualItems: Array<VirtualItem> = []

      for (let k = 0, len = indexes.length; k < len; k++) {
        const i = indexes[k]!
        const measurement = measurements[i]!

        virtualItems.push(measurement)
      }

      return virtualItems
    },
    {
      key: process.env.NODE_ENV !== 'production' && 'getVirtualItems',
      debug: () => this.options.debug,
    },
  )

  getVirtualItemForOffset = (offset: number) => {
    const measurements = this.getMeasurements()
    if (measurements.length === 0) {
      return undefined
    }
    return notUndefined(
      measurements[
        findNearestBinarySearch(
          0,
          measurements.length - 1,
          (index: number) => notUndefined(measurements[index]).start,
          offset,
        )
      ],
    )
  }

  getOffsetForAlignment = (
    toOffset: number,
    align: ScrollAlignment,
    itemSize = 0,
  ) => {
    const size = this.getSize()
    const scrollOffset = this.getScrollOffset()

    if (align === 'auto') {
      align = toOffset >= scrollOffset + size ? 'end' : 'start'
    }

    if (align === 'center') {
      // When aligning to a particular item (e.g. with scrollToIndex),
      // adjust offset by the size of the item to center on the item
      toOffset += (itemSize - size) / 2
    } else if (align === 'end') {
      toOffset -= size
    }

    const maxOffset = this.getTotalSize() - size

    return Math.max(Math.min(maxOffset, toOffset), 0)
  }

  getOffsetForIndex = (index: number, align: ScrollAlignment = 'auto') => {
    index = Math.max(0, Math.min(index, this.options.count - 1))

    const item = this.measurementsCache[index]
    if (!item) {
      return undefined
    }

    const size = this.getSize()
    const scrollOffset = this.getScrollOffset()

    if (align === 'auto') {
      if (item.end >= scrollOffset + size - this.options.scrollPaddingEnd) {
        align = 'end'
      } else if (item.start <= scrollOffset + this.options.scrollPaddingStart) {
        align = 'start'
      } else {
        return [scrollOffset, align] as const
      }
    }

    const toOffset =
      align === 'end'
        ? item.end + this.options.scrollPaddingEnd
        : item.start - this.options.scrollPaddingStart

    return [
      this.getOffsetForAlignment(toOffset, align, item.size),
      align,
    ] as const
  }

  private isDynamicMode = () => this.elementsCache.size > 0

  private cancelScrollToIndex = () => {
    if (this.scrollToIndexTimeoutId !== null && this.targetWindow) {
      this.targetWindow.clearTimeout(this.scrollToIndexTimeoutId)
      this.scrollToIndexTimeoutId = null
    }
  }

  scrollToOffset = (
    toOffset: number,
    { align = 'start', behavior }: ScrollToOffsetOptions = {},
  ) => {
    this.cancelScrollToIndex()

    if (behavior === 'smooth' && this.isDynamicMode()) {
      console.warn(
        'The `smooth` scroll behavior is not fully supported with dynamic size.',
      )
    }

    this._scrollToOffset(this.getOffsetForAlignment(toOffset, align), {
      adjustments: undefined,
      behavior,
    })
  }

  scrollToIndex = (
    index: number,
    { align: initialAlign = 'auto', behavior }: ScrollToIndexOptions = {},
  ) => {
    index = Math.max(0, Math.min(index, this.options.count - 1))

    this.cancelScrollToIndex()

    if (behavior === 'smooth' && this.isDynamicMode()) {
      console.warn(
        'The `smooth` scroll behavior is not fully supported with dynamic size.',
      )
    }

    const offsetAndAlign = this.getOffsetForIndex(index, initialAlign)
    if (!offsetAndAlign) return

    const [offset, align] = offsetAndAlign

    this._scrollToOffset(offset, { adjustments: undefined, behavior })

    if (behavior !== 'smooth' && this.isDynamicMode() && this.targetWindow) {
      this.scrollToIndexTimeoutId = this.targetWindow.setTimeout(() => {
        this.scrollToIndexTimeoutId = null

        const elementInDOM = this.elementsCache.has(
          this.options.getItemKey(index),
        )

        if (elementInDOM) {
          const result = this.getOffsetForIndex(index, align)
          if (!result) return
          const [latestOffset] = result

          const currentScrollOffset = this.getScrollOffset()
          if (!approxEqual(latestOffset, currentScrollOffset)) {
            this.scrollToIndex(index, { align, behavior })
          }
        } else {
          this.scrollToIndex(index, { align, behavior })
        }
      })
    }
  }

  scrollBy = (delta: number, { behavior }: ScrollToOffsetOptions = {}) => {
    this.cancelScrollToIndex()

    if (behavior === 'smooth' && this.isDynamicMode()) {
      console.warn(
        'The `smooth` scroll behavior is not fully supported with dynamic size.',
      )
    }

    this._scrollToOffset(this.getScrollOffset() + delta, {
      adjustments: undefined,
      behavior,
    })
  }

  getTotalSize = () => {
    const measurements = this.getMeasurements()

    let end: number
    // If there are no measurements, set the end to paddingStart
    // If there is only one lane, use the last measurement's end
    // Otherwise find the maximum end value among all measurements
    if (measurements.length === 0) {
      end = this.options.paddingStart
    } else if (this.options.lanes === 1) {
      end = measurements[measurements.length - 1]?.end ?? 0
    } else {
      const endByLane = Array<number | null>(this.options.lanes).fill(null)
      let endIndex = measurements.length - 1
      while (endIndex >= 0 && endByLane.some((val) => val === null)) {
        const item = measurements[endIndex]!
        if (endByLane[item.lane] === null) {
          endByLane[item.lane] = item.end
        }

        endIndex--
      }

      end = Math.max(...endByLane.filter((val): val is number => val !== null))
    }

    return Math.max(
      end - this.options.scrollMargin + this.options.paddingEnd,
      0,
    )
  }

  private _scrollToOffset = (
    offset: number,
    {
      adjustments,
      behavior,
    }: {
      adjustments: number | undefined
      behavior: ScrollBehavior | undefined
    },
  ) => {
    this.options.scrollToFn(offset, { behavior, adjustments }, this)
  }

  measure = () => {
    this.itemSizeCache = new Map()
    this.notify(false)
  }
}

const findNearestBinarySearch = (
  low: number,
  high: number,
  getCurrentValue: (i: number) => number,
  value: number,
) => {
  while (low <= high) {
    const middle = ((low + high) / 2) | 0
    const currentValue = getCurrentValue(middle)

    if (currentValue < value) {
      low = middle + 1
    } else if (currentValue > value) {
      high = middle - 1
    } else {
      return middle
    }
  }

  if (low > 0) {
    return low - 1
  } else {
    return 0
  }
}

function calculateRange({
  measurements,
  outerSize,
  scrollOffset,
  lanes,
}: {
  measurements: Array<VirtualItem>
  outerSize: number
  scrollOffset: number
  lanes: number
}) {
  const lastIndex = measurements.length - 1
  const getOffset = (index: number) => measurements[index]!.start

  // handle case when item count is less than or equal to lanes
  if (measurements.length <= lanes) {
    return {
      startIndex: 0,
      endIndex: lastIndex,
    }
  }

  let startIndex = findNearestBinarySearch(
    0,
    lastIndex,
    getOffset,
    scrollOffset,
  )
  let endIndex = startIndex

  if (lanes === 1) {
    while (
      endIndex < lastIndex &&
      measurements[endIndex]!.end < scrollOffset + outerSize
    ) {
      endIndex++
    }
  } else if (lanes > 1) {
    // Expand forward until we include the visible items from all lanes
    // which are closer to the end of the virtualizer window
    const endPerLane = Array(lanes).fill(0)
    while (
      endIndex < lastIndex &&
      endPerLane.some((pos) => pos < scrollOffset + outerSize)
    ) {
      const item = measurements[endIndex]!
      endPerLane[item.lane] = item.end
      endIndex++
    }

    // Expand backward until we include all lanes' visible items
    // closer to the top
    const startPerLane = Array(lanes).fill(scrollOffset + outerSize)
    while (startIndex >= 0 && startPerLane.some((pos) => pos >= scrollOffset)) {
      const item = measurements[startIndex]!
      startPerLane[item.lane] = item.start
      startIndex--
    }

    // Align startIndex to the beginning of its lane
    startIndex = Math.max(0, startIndex - (startIndex % lanes))
    // Align endIndex to the end of its lane
    endIndex = Math.min(lastIndex, endIndex + (lanes - 1 - (endIndex % lanes)))
  }

  return { startIndex, endIndex }
}
