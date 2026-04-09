import fs from 'fs'
import * as path from 'path'
import postcss from 'postcss'
import createUtilityPlugin from './util/createUtilityPlugin'
import buildMediaQuery from './util/buildMediaQuery'
import escapeClassName from './util/escapeClassName'
import parseAnimationValue from './util/parseAnimationValue'
import flattenColorPalette from './util/flattenColorPalette'
import withAlphaVariable, { withAlphaValue } from './util/withAlphaVariable'
import toColorValue from './util/toColorValue'
import isPlainObject from './util/isPlainObject'
import transformThemeValue from './util/transformThemeValue'
import { version as tailwindVersion } from '../package.json'
import log from './util/log'
import {
  normalizeScreens,
  isScreenSortable,
  compareScreens,
  toScreen,
} from './util/normalizeScreens'
import { formatBoxShadowValue, parseBoxShadowValue } from './util/parseBoxShadowValue'
import { removeAlphaVariables } from './util/removeAlphaVariables'
import { flagEnabled } from './featureFlags'
import { normalize, normalizeAttributeSelectors } from './util/dataTypes'
import { INTERNAL_FEATURES } from './lib/setupContextUtils'

export let variantPlugins = {
  childVariant: ({ addVariant }) => {
    addVariant('*', '& > *')
  },
  pseudoElementVariants: ({ addVariant }) => {
    addVariant('first-letter', '&::first-letter')
    addVariant('first-line', '&::first-line')

    addVariant('marker', [
      ({ container }) => {
        removeAlphaVariables(container, ['--tw-text-opacity'])

        return '& *::marker'
      },
      ({ container }) => {
        removeAlphaVariables(container, ['--tw-text-opacity'])

        return '&::marker'
      },
    ])

    addVariant('selection', ['& *::selection', '&::selection'])

    addVariant('file', '&::file-selector-button')

    addVariant('placeholder', '&::placeholder')

    addVariant('backdrop', '&::backdrop')

    addVariant('before', ({ container }) => {
      container.walkRules((rule) => {
        let foundContent = false
        rule.walkDecls('content', () => {
          foundContent = true
        })

        if (!foundContent) {
          rule.prepend(postcss.decl({ prop: 'content', value: 'var(--tw-content)' }))
        }
      })

      return '&::before'
    })

    addVariant('after', ({ container }) => {
      container.walkRules((rule) => {
        let foundContent = false
        rule.walkDecls('content', () => {
          foundContent = true
        })

        if (!foundContent) {
          rule.prepend(postcss.decl({ prop: 'content', value: 'var(--tw-content)' }))
        }
      })

      return '&::after'
    })
  },

  pseudoClassVariants: ({ addVariant, matchVariant, config, prefix }) => {
    let pseudoVariants = [
      // Positional
      ['first', '&:first-child'],
      ['last', '&:last-child'],
      ['only', '&:only-child'],
      ['odd', '&:nth-child(odd)'],
      ['even', '&:nth-child(even)'],
      'first-of-type',
      'last-of-type',
      'only-of-type',

      // State
      [
        'visited',
        ({ container }) => {
          removeAlphaVariables(container, [
            '--tw-text-opacity',
            '--tw-border-opacity',
            '--tw-bg-opacity',
          ])

          return '&:visited'
        },
      ],
      'target',
      ['open', '&[open]'],

      // Forms
      'default',
      'checked',
      'indeterminate',
      'placeholder-shown',
      'autofill',
      'optional',
      'required',
      'valid',
      'invalid',
      'in-range',
      'out-of-range',
      'read-only',

      // Content
      'empty',

      // Interactive
      'focus-within',
      [
        'hover',
        !flagEnabled(config(), 'hoverOnlyWhenSupported')
          ? '&:hover'
          : '@media (hover: hover) and (pointer: fine) { &:hover }',
      ],
      'focus',
      'focus-visible',
      'active',
      'enabled',
      'disabled',
    ].map((variant) => (Array.isArray(variant) ? variant : [variant, `&:${variant}`]))

    for (let [variantName, state] of pseudoVariants) {
      addVariant(variantName, (ctx) => {
        let result = typeof state === 'function' ? state(ctx) : state

        return result
      })
    }

    let variants = {
      group: (_, { modifier }) =>
        modifier
          ? [`:merge(${prefix('.group')}\\/${escapeClassName(modifier)})`, ' &']
          : [`:merge(${prefix('.group')})`, ' &'],
      peer: (_, { modifier }) =>
        modifier
          ? [`:merge(${prefix('.peer')}\\/${escapeClassName(modifier)})`, ' ~ &']
          : [`:merge(${prefix('.peer')})`, ' ~ &'],
    }

    for (let [name, fn] of Object.entries(variants)) {
      matchVariant(
        name,
        (value = '', extra) => {
          let result = normalize(typeof value === 'function' ? value(extra) : value)
          if (!result.includes('&')) result = '&' + result

          let [a, b] = fn('', extra)

          let start = null
          let end = null
          let quotes = 0

          for (let i = 0; i < result.length; ++i) {
            let c = result[i]
            if (c === '&') {
              start = i
            } else if (c === "'" || c === '"') {
              quotes += 1
            } else if (start !== null && c === ' ' && !quotes) {
              end = i
            }
          }

          if (start !== null && end === null) {
            end = result.length
          }

          // Basically this but can handle quotes:
          // result.replace(/&(\S+)?/g, (_, pseudo = '') => a + pseudo + b)

          return result.slice(0, start) + a + result.slice(start + 1, end) + b + result.slice(end)
        },
        {
          values: Object.fromEntries(pseudoVariants),
          [INTERNAL_FEATURES]: {
            respectPrefix: false,
          },
        }
      )
    }
  },

  directionVariants: ({ addVariant }) => {
    addVariant('ltr', '&:where([dir="ltr"], [dir="ltr"] *)')
    addVariant('rtl', '&:where([dir="rtl"], [dir="rtl"] *)')
  },

  reducedMotionVariants: ({ addVariant }) => {
    addVariant('motion-safe', '@media (prefers-reduced-motion: no-preference)')
    addVariant('motion-reduce', '@media (prefers-reduced-motion: reduce)')
  },

  darkVariants: ({ config, addVariant }) => {
    let [mode, selector = '.dark'] = [].concat(config('darkMode', 'media'))

    if (mode === false) {
      mode = 'media'
      log.warn('darkmode-false', [
        'The `darkMode` option in your Tailwind CSS configuration is set to `false`, which now behaves the same as `media`.',
        'Change `darkMode` to `media` or remove it entirely.',
        'https://tailwindcss.com/docs/upgrade-guide#remove-dark-mode-configuration',
      ])
    }

    if (mode === 'variant') {
      let formats
      if (Array.isArray(selector)) {
        formats = selector
      } else if (typeof selector === 'function') {
        formats = selector
      } else if (typeof selector === 'string') {
        formats = [selector]
      }

      // TODO: We could also add these warnings if the user passes a function that returns string | string[]
      // But this is an advanced enough use case that it's probably not necessary
      if (Array.isArray(formats)) {
        for (let format of formats) {
          if (format === '.dark') {
            mode = false
            log.warn('darkmode-variant-without-selector', [
              'When using `variant` for `darkMode`, you must provide a selector.',
              'Example: `darkMode: ["variant", ".your-selector &"]`',
            ])
          } else if (!format.includes('&')) {
            mode = false
            log.warn('darkmode-variant-without-ampersand', [
              'When using `variant` for `darkMode`, your selector must contain `&`.',
              'Example `darkMode: ["variant", ".your-selector &"]`',
            ])
          }
        }
      }

      selector = formats
    }

    if (mode === 'selector') {
      // New preferred behavior
      addVariant('dark', `&:where(${selector}, ${selector} *)`)
    } else if (mode === 'media') {
      addVariant('dark', '@media (prefers-color-scheme: dark)')
    } else if (mode === 'variant') {
      addVariant('dark', selector)
    } else if (mode === 'class') {
      // Old behavior
      addVariant('dark', `&:is(${selector} *)`)
    }
  },

  printVariant: ({ addVariant }) => {
    addVariant('print', '@media print')
  },

  screenVariants: ({ theme, addVariant, matchVariant }) => {
    let rawScreens = theme('screens') ?? {}
    let areSimpleScreens = Object.values(rawScreens).every((v) => typeof v === 'string')
    let screens = normalizeScreens(theme('screens'))

    /** @type {Set<string>} */
    let unitCache = new Set([])

    /** @param {string} value */
    function units(value) {
      return value.match(/(\D+)$/)?.[1] ?? '(none)'
    }

    /** @param {string} value */
    function recordUnits(value) {
      if (value !== undefined) {
        unitCache.add(units(value))
      }
    }

    /** @param {string} value */
    function canUseUnits(value) {
      recordUnits(value)

      // If the cache was empty it'll become 1 because we've just added the current unit
      // If the cache was not empty and the units are the same the size doesn't change
      // Otherwise, if the units are different from what is already known the size will always be > 1
      return unitCache.size === 1
    }

    for (const screen of screens) {
      for (const value of screen.values) {
        recordUnits(value.min)
        recordUnits(value.max)
      }
    }

    let screensUseConsistentUnits = unitCache.size <= 1

    /**
     * @typedef {import('./util/normalizeScreens').Screen} Screen
     */

    /**
     * @param {'min' | 'max'} type
     * @returns {Record<string, Screen>}
     */
    function buildScreenValues(type) {
      return Object.fromEntries(
        screens
          .filter((screen) => isScreenSortable(screen).result)
          .map((screen) => {
            let { min, max } = screen.values[0]

            if (type === 'min' && min !== undefined) {
              return screen
            } else if (type === 'min' && max !== undefined) {
              return { ...screen, not: !screen.not }
            } else if (type === 'max' && max !== undefined) {
              return screen
            } else if (type === 'max' && min !== undefined) {
              return { ...screen, not: !screen.not }
            }
          })
          .map((screen) => [screen.name, screen])
      )
    }

    /**
     * @param {'min' | 'max'} type
     * @returns {(a: { value: string | Screen }, z: { value: string | Screen }) => number}
     */
    function buildSort(type) {
      return (a, z) => compareScreens(type, a.value, z.value)
    }

    let maxSort = buildSort('max')
    let minSort = buildSort('min')

    /** @param {'min'|'max'} type */
    function buildScreenVariant(type) {
      return (value) => {
        if (!areSimpleScreens) {
          log.warn('complex-screen-config', [
            'The `min-*` and `max-*` variants are not supported with a `screens` configuration containing objects.',
          ])

          return []
        } else if (!screensUseConsistentUnits) {
          log.warn('mixed-screen-units', [
            'The `min-*` and `max-*` variants are not supported with a `screens` configuration containing mixed units.',
          ])

          return []
        } else if (typeof value === 'string' && !canUseUnits(value)) {
          log.warn('minmax-have-mixed-units', [
            'The `min-*` and `max-*` variants are not supported with a `screens` configuration containing mixed units.',
          ])

          return []
        }

        return [`@media ${buildMediaQuery(toScreen(value, type))}`]
      }
    }

    matchVariant('max', buildScreenVariant('max'), {
      sort: maxSort,
      values: areSimpleScreens ? buildScreenValues('max') : {},
    })

    // screens and min-* are sorted together when they can be
    let id = 'min-screens'
    for (let screen of screens) {
      addVariant(screen.name, `@media ${buildMediaQuery(screen)}`, {
        id,
        sort: areSimpleScreens && screensUseConsistentUnits ? minSort : undefined,
        value: screen,
      })
    }

    matchVariant('min', buildScreenVariant('min'), {
      id,
      sort: minSort,
    })
  },

  supportsVariants: ({ matchVariant, theme }) => {
    matchVariant(
      'supports',
      (value = '') => {
        let check = value.startsWith('--') ? value : normalize(value)
        let isRaw = /^[\w-]*\s*\(/.test(check)

        // Chrome has a bug where `(condition1)or(condition2)` is not valid
        // But `(condition1) or (condition2)` is supported.
        check = isRaw ? check.replace(/\b(and|or|not)\b/g, ' $1 ') : check

        if (isRaw) {
          return `@supports ${check}`
        }

        if (!check.includes(':')) {
          check = `${check}: var(--tw)`
        }

        if (!(check.startsWith('(') && check.endsWith(')'))) {
          check = `(${check})`
        }

        return `@supports ${check}`
      },
      { values: theme('supports') ?? {} }
    )
  },

  hasVariants: ({ matchVariant, prefix }) => {
    matchVariant('has', (value) => `&:has(${normalize(value)})`, {
      values: {},
      [INTERNAL_FEATURES]: {
        respectPrefix: false,
      },
    })

    matchVariant(
      'group-has',
      (value, { modifier }) =>
        modifier
          ? `:merge(${prefix('.group')}\\/${modifier}):has(${normalize(value)}) &`
          : `:merge(${prefix('.group')}):has(${normalize(value)}) &`,
      {
        values: {},
        [INTERNAL_FEATURES]: {
          respectPrefix: false,
        },
      }
    )

    matchVariant(
      'peer-has',
      (value, { modifier }) =>
        modifier
          ? `:merge(${prefix('.peer')}\\/${modifier}):has(${normalize(value)}) ~ &`
          : `:merge(${prefix('.peer')}):has(${normalize(value)}) ~ &`,
      {
        values: {},
        [INTERNAL_FEATURES]: {
          respectPrefix: false,
        },
      }
    )
  },

  ariaVariants: ({ matchVariant, theme }) => {
    matchVariant('aria', (value) => `&[aria-${normalizeAttributeSelectors(normalize(value))}]`, {
      values: theme('aria') ?? {},
    })
    matchVariant(
      'group-aria',
      (value, { modifier }) =>
        modifier
          ? `:merge(.group\\/${modifier})[aria-${normalizeAttributeSelectors(normalize(value))}] &`
          : `:merge(.group)[aria-${normalizeAttributeSelectors(normalize(value))}] &`,
      { values: theme('aria') ?? {} }
    )
    matchVariant(
      'peer-aria',
      (value, { modifier }) =>
        modifier
          ? `:merge(.peer\\/${modifier})[aria-${normalizeAttributeSelectors(normalize(value))}] ~ &`
          : `:merge(.peer)[aria-${normalizeAttributeSelectors(normalize(value))}] ~ &`,
      { values: theme('aria') ?? {} }
    )
  },

  dataVariants: ({ matchVariant, theme }) => {
    matchVariant('data', (value) => `&[data-${normalizeAttributeSelectors(normalize(value))}]`, {
      values: theme('data') ?? {},
    })
    matchVariant(
      'group-data',
      (value, { modifier }) =>
        modifier
          ? `:merge(.group\\/${modifier})[data-${normalizeAttributeSelectors(normalize(value))}] &`
          : `:merge(.group)[data-${normalizeAttributeSelectors(normalize(value))}] &`,
      { values: theme('data') ?? {} }
    )
    matchVariant(
      'peer-data',
      (value, { modifier }) =>
        modifier
          ? `:merge(.peer\\/${modifier})[data-${normalizeAttributeSelectors(normalize(value))}] ~ &`
          : `:merge(.peer)[data-${normalizeAttributeSelectors(normalize(value))}] ~ &`,
      { values: theme('data') ?? {} }
    )
  },

  orientationVariants: ({ addVariant }) => {
    addVariant('portrait', '@media (orientation: portrait)')
    addVariant('landscape', '@media (orientation: landscape)')
  },

  prefersContrastVariants: ({ addVariant }) => {
    addVariant('contrast-more', '@media (prefers-contrast: more)')
    addVariant('contrast-less', '@media (prefers-contrast: less)')
  },

  forcedColorsVariants: ({ addVariant }) => {
    addVariant('forced-colors', '@media (forced-colors: active)')
  },
}

let cssTransformValue = [
  'translate(var(--tw-translate-x), var(--tw-translate-y))',
  'rotate(var(--tw-rotate))',
  'skewX(var(--tw-skew-x))',
  'skewY(var(--tw-skew-y))',
  'scaleX(var(--tw-scale-x))',
  'scaleY(var(--tw-scale-y))',
].join(' ')

let cssFilterValue = [
  'var(--tw-blur)',
  'var(--tw-brightness)',
  'var(--tw-contrast)',
  'var(--tw-grayscale)',
  'var(--tw-hue-rotate)',
  'var(--tw-invert)',
  'var(--tw-saturate)',
  'var(--tw-sepia)',
  'var(--tw-drop-shadow)',
].join(' ')

let cssBackdropFilterValue = [
  'var(--tw-backdrop-blur)',
  'var(--tw-backdrop-brightness)',
  'var(--tw-backdrop-contrast)',
  'var(--tw-backdrop-grayscale)',
  'var(--tw-backdrop-hue-rotate)',
  'var(--tw-backdrop-invert)',
  'var(--tw-backdrop-opacity)',
  'var(--tw-backdrop-saturate)',
  'var(--tw-backdrop-sepia)',
].join(' ')

export let corePlugins = {
  preflight: ({ addBase }) => {
    let preflightStyles = postcss.parse(
      fs.readFileSync(path.join(__dirname, './css/preflight.css'), 'utf8')
    )

    addBase([
      postcss.comment({
        text: `! tailwindcss v${tailwindVersion} | MIT License | https://tailwindcss.com`,
      }),
      ...preflightStyles.nodes,
    ])
  },

  container: (() => {
    function extractMinWidths(breakpoints = []) {
      return breakpoints
        .flatMap((breakpoint) => breakpoint.values.map((breakpoint) => breakpoint.min))
        .filter((v) => v !== undefined)
    }

    function mapMinWidthsToPadding(minWidths, screens, paddings) {
      if (typeof paddings === 'undefined') {
        return []
      }

      if (!(typeof paddings === 'object' && paddings !== null)) {
        return [
          {
            screen: 'DEFAULT',
            minWidth: 0,
            padding: paddings,
          },
        ]
      }

      let mapping = []

      if (paddings.DEFAULT) {
        mapping.push({
          screen: 'DEFAULT',
          minWidth: 0,
          padding: paddings.DEFAULT,
        })
      }

      for (let minWidth of minWidths) {
        for (let screen of screens) {
          for (let { min } of screen.values) {
            if (min === minWidth) {
              mapping.push({ minWidth, padding: paddings[screen.name] })
            }
          }
        }
      }

      return mapping
    }

    return function ({ addComponents, theme }) {
      let screens = normalizeScreens(theme('container.screens', theme('screens')))
      let minWidths = extractMinWidths(screens)
      let paddings = mapMinWidthsToPadding(minWidths, screens, theme('container.padding'))

      let generatePaddingFor = (minWidth) => {
        let paddingConfig = paddings.find((padding) => padding.minWidth === minWidth)

        if (!paddingConfig) {
          return {}
        }

        return {
          paddingRight: paddingConfig.padding,
          paddingLeft: paddingConfig.padding,
        }
      }

      let atRules = Array.from(
        new Set(minWidths.slice().sort((a, z) => parseInt(a) - parseInt(z)))
      ).map((minWidth) => ({
        [`@media (min-width: ${minWidth})`]: {
          '.container': {
            'max-width': minWidth,
            ...generatePaddingFor(minWidth),
          },
        },
      }))

      addComponents([
        {
          '.container': Object.assign(
            { width: '100%' },
            theme('container.center', false) ? { marginRight: 'auto', marginLeft: 'auto' } : {},
            generatePaddingFor(0)
          ),
        },
        ...atRules,
      ])
    }
  })(),

  accessibility: ({ addUtilities }) => {
    addUtilities({
      '.sr-only': {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: '0',
      },
      '.not-sr-only': {
        position: 'static',
        width: 'auto',
        height: 'auto',
        padding: '0',
        margin: '0',
        overflow: 'visible',
        clip: 'auto',
        whiteSpace: 'normal',
      },
    })
  },

  pointerEvents: ({ addUtilities }) => {
    addUtilities({
      '.pointer-events-none': { 'pointer-events': 'none' },
      '.pointer-events-auto': { 'pointer-events': 'auto' },
    })
  },

  visibility: ({ addUtilities }) => {
    addUtilities({
      '.visible': { visibility: 'visible' },
      '.invisible': { visibility: 'hidden' },
      '.collapse': { visibility: 'collapse' },
    })
  },

  position: ({ addUtilities }) => {
    addUtilities({
      '.static': { position: 'static' },
      '.fixed': { position: 'fixed' },
      '.absolute': { position: 'absolute' },
      '.relative': { position: 'relative' },
      '.sticky': { position: 'sticky' },
    })
  },

  inset: createUtilityPlugin(
    'inset',
    [
      ['inset', ['inset']],
      [
        ['inset-x', ['left', 'right']],
        ['inset-y', ['top', 'bottom']],
      ],
      [
        ['start', ['inset-inline-start']],
        ['end', ['inset-inline-end']],
        ['top', ['top']],
        ['right', ['right']],
        ['bottom', ['bottom']],
        ['left', ['left']],
      ],
    ],
    { supportsNegativeValues: true }
  ),

  isolation: ({ addUtilities }) => {
    addUtilities({
      '.isolate': { isolation: 'isolate' },
      '.isolation-auto': { isolation: 'auto' },
    })
  },

  zIndex: createUtilityPlugin('zIndex', [['z', ['zIndex']]], { supportsNegativeValues: true }),
  order: createUtilityPlugin('order', undefined, { supportsNegativeValues: true }),
  gridColumn: createUtilityPlugin('gridColumn', [['col', ['gridColumn']]]),
  gridColumnStart: createUtilityPlugin('gridColumnStart', [['col-start', ['gridColumnStart']]], {
    supportsNegativeValues: true,
  }),
  gridColumnEnd: createUtilityPlugin('gridColumnEnd', [['col-end', ['gridColumnEnd']]], {
    supportsNegativeValues: true,
  }),
  gridRow: createUtilityPlugin('gridRow', [['row', ['gridRow']]]),
  gridRowStart: createUtilityPlugin('gridRowStart', [['row-start', ['gridRowStart']]], {
    supportsNegativeValues: true,
  }),
  gridRowEnd: createUtilityPlugin('gridRowEnd', [['row-end', ['gridRowEnd']]], {
    supportsNegativeValues: true,
  }),

  float: ({ addUtilities }) => {
    addUtilities({
      '.float-start': { float: 'inline-start' },
      '.float-end': { float: 'inline-end' },
      '.float-right': { float: 'right' },
      '.float-left': { float: 'left' },
      '.float-none': { float: 'none' },
    })
  },

  clear: ({ addUtilities }) => {
    addUtilities({
      '.clear-start': { clear: 'inline-start' },
      '.clear-end': { clear: 'inline-end' },
      '.clear-left': { clear: 'left' },
      '.clear-right': { clear: 'right' },
      '.clear-both': { clear: 'both' },
      '.clear-none': { clear: 'none' },
    })
  },

  margin: createUtilityPlugin(
    'margin',
    [
      ['m', ['margin']],
      [
        ['mx', ['margin-left', 'margin-right']],
        ['my', ['margin-top', 'margin-bottom']],
      ],
      [
        ['ms', ['margin-inline-start']],
        ['me', ['margin-inline-end']],
        ['mt', ['margin-top']],
        ['mr', ['margin-right']],
        ['mb', ['margin-bottom']],
        ['ml', ['margin-left']],
      ],
    ],
    { supportsNegativeValues: true }
  ),

  boxSizing: ({ addUtilities }) => {
    addUtilities({
      '.box-border': { 'box-sizing': 'border-box' },
      '.box-content': { 'box-sizing': 'content-box' },
    })
  },

  lineClamp: ({ matchUtilities, addUtilities, theme }) => {
    matchUtilities(
      {
        'line-clamp': (value) => ({
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': `${value}`,
        }),
      },
      { values: theme('lineClamp') }
    )

    addUtilities({
      '.line-clamp-none': {
        overflow: 'visible',
        display: 'block',
        '-webkit-box-orient': 'horizontal',
        '-webkit-line-clamp': 'none',
      },
    })
  },

  display: ({ addUtilities }) => {
    addUtilities({
      '.block': { display: 'block' },
      '.inline-block': { display: 'inline-block' },
      '.inline': { display: 'inline' },
      '.flex': { display: 'flex' },
      '.inline-flex': { display: 'inline-flex' },
      '.table': { display: 'table' },
      '.inline-table': { display: 'inline-table' },
      '.table-caption': { display: 'table-caption' },
      '.table-cell': { display: 'table-cell' },
      '.table-column': { display: 'table-column' },
      '.table-column-group': { display: 'table-column-group' },
      '.table-footer-group': { display: 'table-footer-group' },
      '.table-header-group': { display: 'table-header-group' },
      '.table-row-group': { display: 'table-row-group' },
      '.table-row': { display: 'table-row' },
      '.flow-root': { display: 'flow-root' },
      '.grid': { display: 'grid' },
      '.inline-grid': { display: 'inline-grid' },
      '.contents': { display: 'contents' },
      '.list-item': { display: 'list-item' },
      '.hidden': { display: 'none' },
    })
  },

  aspectRatio: createUtilityPlugin('aspectRatio', [['aspect', ['aspect-ratio']]]),

  size: createUtilityPlugin('size', [['size', ['width', 'height']]]),

  height: createUtilityPlugin('height', [['h', ['height']]]),
  maxHeight: createUtilityPlugin('maxHeight', [['max-h', ['maxHeight']]]),
  minHeight: createUtilityPlugin('minHeight', [['min-h', ['minHeight']]]),

  width: createUtilityPlugin('width', [['w', ['width']]]),
  minWidth: createUtilityPlugin('minWidth', [['min-w', ['minWidth']]]),
  maxWidth: createUtilityPlugin('maxWidth', [['max-w', ['maxWidth']]]),

  flex: createUtilityPlugin('flex'),
  flexShrink: createUtilityPlugin('flexShrink', [
    ['flex-shrink', ['flex-shrink']], // Deprecated
    ['shrink', ['flex-shrink']],
  ]),
  flexGrow: createUtilityPlugin('flexGrow', [
    ['flex-grow', ['flex-grow']], // Deprecated
    ['grow', ['flex-grow']],
  ]),
  flexBasis: createUtilityPlugin('flexBasis', [['basis', ['flex-basis']]]),

  tableLayout: ({ addUtilities }) => {
    addUtilities({
      '.table-auto': { 'table-layout': 'auto' },
      '.table-fixed': { 'table-layout': 'fixed' },
    })
  },

  captionSide: ({ addUtilities }) => {
    addUtilities({
      '.caption-top': { 'caption-side': 'top' },
      '.caption-bottom': { 'caption-side': 'bottom' },
    })
  },

  borderCollapse: ({ addUtilities }) => {
    addUtilities({
      '.border-collapse': { 'border-collapse': 'collapse' },
      '.border-separate': { 'border-collapse': 'separate' },
    })
  },

  borderSpacing: ({ addDefaults, matchUtilities, theme }) => {
    addDefaults('border-spacing', {
      '--tw-border-spacing-x': 0,
      '--tw-border-spacing-y': 0,
    })

    matchUtilities(
      {
        'border-spacing': (value) => {
          return {
            '--tw-border-spacing-x': value,
            '--tw-border-spacing-y': value,
            '@defaults border-spacing': {},
            'border-spacing': 'var(--tw-border-spacing-x) var(--tw-border-spacing-y)',
          }
        },
        'border-spacing-x': (value) => {
          return {
            '--tw-border-spacing-x': value,
            '@defaults border-spacing': {},
            'border-spacing': 'var(--tw-border-spacing-x) var(--tw-border-spacing-y)',
          }
        },
        'border-spacing-y': (value) => {
          return {
            '--tw-border-spacing-y': value,
            '@defaults border-spacing': {},
            'border-spacing': 'var(--tw-border-spacing-x) var(--tw-border-spacing-y)',
          }
        },
      },
      { values: theme('borderSpacing') }
    )
  },

  transformOrigin: createUtilityPlugin('transformOrigin', [['origin', ['transformOrigin']]]),
  translate: createUtilityPlugin(
    'translate',
    [
      [
        [
          'translate-x',
          [['@defaults transform', {}], '--tw-translate-x', ['transform', cssTransformValue]],
        ],
        [
          'translate-y',
          [['@defaults transform', {}], '--tw-translate-y', ['transform', cssTransformValue]],
        ],
      ],
    ],
    { supportsNegativeValues: true }
  ),
  rotate: createUtilityPlugin(
    'rotate',
    [['rotate', [['@defaults transform', {}], '--tw-rotate', ['transform', cssTransformValue]]]],
    { supportsNegativeValues: true }
  ),
  skew: createUtilityPlugin(
    'skew',
    [
      [
        ['skew-x', [['@defaults transform', {}], '--tw-skew-x', ['transform', cssTransformValue]]],
        ['skew-y', [['@defaults transform', {}], '--tw-skew-y', ['transform', cssTransformValue]]],
      ],
    ],
    { supportsNegativeValues: true }
  ),
  scale: createUtilityPlugin(
    'scale',
    [
      [
        'scale',
        [
          ['@defaults transform', {}],
          '--tw-scale-x',
          '--tw-scale-y',
          ['transform', cssTransformValue],
        ],
      ],
      [
        [
          'scale-x',
          [['@defaults transform', {}], '--tw-scale-x', ['transform', cssTransformValue]],
        ],
        [
          'scale-y',
          [['@defaults transform', {}], '--tw-scale-y', ['transform', cssTransformValue]],
        ],
      ],
    ],
    { supportsNegativeValues: true }
  ),

  transform: ({ addDefaults, addUtilities }) => {
    addDefaults('transform', {
      '--tw-translate-x': '0',
      '--tw-translate-y': '0',
      '--tw-rotate': '0',
      '--tw-skew-x': '0',
      '--tw-skew-y': '0',
      '--tw-scale-x': '1',
      '--tw-scale-y': '1',
    })

    addUtilities({
      '.transform': { '@defaults transform': {}, transform: cssTransformValue },
      '.transform-cpu': {
        transform: cssTransformValue,
      },
      '.transform-gpu': {
        transform: cssTransformValue.replace(
          'translate(var(--tw-translate-x), var(--tw-translate-y))',
          'translate3d(var(--tw-translate-x), var(--tw-translate-y), 0)'
        ),
      },
      '.transform-none': { transform: 'none' },
    })
  },

  animation: ({ matchUtilities, theme, config }) => {
    let prefixName = (name) => escapeClassName(config('prefix') + name)
    let keyframes = Object.fromEntries(
      Object.entries(theme('keyframes') ?? {}).map(([key, value]) => {
        return [key, { [`@keyframes ${prefixName(key)}`]: value }]
      })
    )

    matchUtilities(
      {
        animate: (value) => {
          let animations = parseAnimationValue(value)

          return [
            ...animations.flatMap((animation) => keyframes[animation.name]),
            {
              animation: animations
                .map(({ name, value }) => {
                  if (name === undefined || keyframes[name] === undefined) {
                    return value
                  }
                  return value.replace(name, prefixName(name))
                })
                .join(', '),
            },
          ]
        },
      },
      { values: theme('animation') }
    )
  },

  cursor: createUtilityPlugin('cursor'),

  touchAction: ({ addDefaults, addUtilities }) => {
    addDefaults('touch-action', {
      '--tw-pan-x': ' ',
      '--tw-pan-y': ' ',
      '--tw-pinch-zoom': ' ',
    })

    let cssTouchActionValue = 'var(--tw-pan-x) var(--tw-pan-y) var(--tw-pinch-zoom)'

    addUtilities({
      '.touch-auto': { 'touch-action': 'auto' },
      '.touch-none': { 'touch-action': 'none' },
      '.touch-pan-x': {
        '@defaults touch-action': {},
        '--tw-pan-x': 'pan-x',
        'touch-action': cssTouchActionValue,
      },
      '.touch-pan-left': {
        '@defaults touch-action': {},
        '--tw-pan-x': 'pan-left',
        'touch-action': cssTouchActionValue,
      },
      '.touch-pan-right': {
        '@defaults touch-action': {},
        '--tw-pan-x': 'pan-right',
        'touch-action': cssTouchActionValue,
      },
      '.touch-pan-y': {
        '@defaults touch-action': {},
        '--tw-pan-y': 'pan-y',
        'touch-action': cssTouchActionValue,
      },
      '.touch-pan-up': {
        '@defaults touch-action': {},
        '--tw-pan-y': 'pan-up',
        'touch-action': cssTouchActionValue,
      },
      '.touch-pan-down': {
        '@defaults touch-action': {},
        '--tw-pan-y': 'pan-down',
        'touch-action': cssTouchActionValue,
      },
      '.touch-pinch-zoom': {
        '@defaults touch-action': {},
        '--tw-pinch-zoom': 'pinch-zoom',
        'touch-action': cssTouchActionValue,
      },
      '.touch-manipulation': { 'touch-action': 'manipulation' },
    })
  },

  userSelect: ({ addUtilities }) => {
    addUtilities({
      '.select-none': { 'user-select': 'none' },
      '.select-text': { 'user-select': 'text' },
      '.select-all': { 'user-select': 'all' },
      '.select-auto': { 'user-select': 'auto' },
    })
  },

  resize: ({ addUtilities }) => {
    addUtilities({
      '.resize-none': { resize: 'none' },
      '.resize-y': { resize: 'vertical' },
      '.resize-x': { resize: 'horizontal' },
      '.resize': { resize: 'both' },
    })
  },

  scrollSnapType: ({ addDefaults, addUtilities }) => {
    addDefaults('scroll-snap-type', {
      '--tw-scroll-snap-strictness': 'proximity',
    })

    addUtilities({
      '.snap-none': { 'scroll-snap-type': 'none' },
      '.snap-x': {
        '@defaults scroll-snap-type': {},
        'scroll-snap-type': 'x var(--tw-scroll-snap-strictness)',
      },
      '.snap-y': {
        '@defaults scroll-snap-type': {},
        'scroll-snap-type': 'y var(--tw-scroll-snap-strictness)',
      },
      '.snap-both': {
        '@defaults scroll-snap-type': {},
        'scroll-snap-type': 'both var(--tw-scroll-snap-strictness)',
      },
      '.snap-mandatory': { '--tw-scroll-snap-strictness': 'mandatory' },
      '.snap-proximity': { '--tw-scroll-snap-strictness': 'proximity' },
    })
  },

  scrollSnapAlign: ({ addUtilities }) => {
    addUtilities({
      '.snap-start': { 'scroll-snap-align': 'start' },
      '.snap-end': { 'scroll-snap-align': 'end' },
      '.snap-center': { 'scroll-snap-align': 'center' },
      '.snap-align-none': { 'scroll-snap-align': 'none' },
    })
  },

  scrollSnapStop: ({ addUtilities }) => {
    addUtilities({
      '.snap-normal': { 'scroll-snap-stop': 'normal' },
      '.snap-always': { 'scroll-snap-stop': 'always' },
    })
  },

  scrollMargin: createUtilityPlugin(
    'scrollMargin',
    [
      ['scroll-m', ['scroll-margin']],
      [
        ['scroll-mx', ['scroll-margin-left', 'scroll-margin-right']],
        ['scroll-my', ['scroll-margin-top', 'scroll-margin-bottom']],
      ],
      [
        ['scroll-ms', ['scroll-margin-inline-start']],
        ['scroll-me', ['scroll-margin-inline-end']],
        ['scroll-mt', ['scroll-margin-top']],
        ['scroll-mr', ['scroll-margin-right']],
        ['scroll-mb', ['scroll-margin-bottom']],
        ['scroll-ml', ['scroll-margin-left']],
      ],
    ],
    { supportsNegativeValues: true }
  ),

  scrollPadding: createUtilityPlugin('scrollPadding', [
    ['scroll-p', ['scroll-padding']],
    [
      ['scroll-px', ['scroll-padding-left', 'scroll-padding-right']],
      ['scroll-py', ['scroll-padding-top', 'scroll-padding-bottom']],
    ],
    [
      ['scroll-ps', ['scroll-padding-inline-start']],
      ['scroll-pe', ['scroll-padding-inline-end']],
      ['scroll-pt', ['scroll-padding-top']],
      ['scroll-pr', ['scroll-padding-right']],
      ['scroll-pb', ['scroll-padding-bottom']],
      ['scroll-pl', ['scroll-padding-left']],
    ],
  ]),

  listStylePosition: ({ addUtilities }) => {
    addUtilities({
      '.list-inside': { 'list-style-position': 'inside' },
      '.list-outside': { 'list-style-position': 'outside' },
    })
  },
  listStyleType: createUtilityPlugin('listStyleType', [['list', ['listStyleType']]]),
  listStyleImage: createUtilityPlugin('listStyleImage', [['list-image', ['listStyleImage']]]),

  appearance: ({ addUtilities }) => {
    addUtilities({
      '.appearance-none': { appearance: 'none' },
      '.appearance-auto': { appearance: 'auto' },
    })
  },

  columns: createUtilityPlugin('columns', [['columns', ['columns']]]),

  breakBefore: ({ addUtilities }) => {
    addUtilities({
      '.break-before-auto': { 'break-before': 'auto' },
      '.break-before-avoid': { 'break-before': 'avoid' },
      '.break-before-all': { 'break-before': 'all' },
      '.break-before-avoid-page': { 'break-before': 'avoid-page' },
      '.break-before-page': { 'break-before': 'page' },
      '.break-before-left': { 'break-before': 'left' },
      '.break-before-right': { 'break-before': 'right' },
      '.break-before-column': { 'break-before': 'column' },
    })
  },

  breakInside: ({ addUtilities }) => {
    addUtilities({
      '.break-inside-auto': { 'break-inside': 'auto' },
      '.break-inside-avoid': { 'break-inside': 'avoid' },
      '.break-inside-avoid-page': { 'break-inside': 'avoid-page' },
      '.break-inside-avoid-column': { 'break-inside': 'avoid-column' },
    })
  },

  breakAfter: ({ addUtilities }) => {
    addUtilities({
      '.break-after-auto': { 'break-after': 'auto' },
      '.break-after-avoid': { 'break-after': 'avoid' },
      '.break-after-all': { 'break-after': 'all' },
      '.break-after-avoid-page': { 'break-after': 'avoid-page' },
      '.break-after-page': { 'break-after': 'page' },
      '.break-after-left': { 'break-after': 'left' },
      '.break-after-right': { 'break-after': 'right' },
      '.break-after-column': { 'break-after': 'column' },
    })
  },

  gridAutoColumns: createUtilityPlugin('gridAutoColumns', [['auto-cols', ['gridAutoColumns']]]),

  gridAutoFlow: ({ addUtilities }) => {
    addUtilities({
      '.grid-flow-row': { gridAutoFlow: 'row' },
      '.grid-flow-col': { gridAutoFlow: 'column' },
      '.grid-flow-dense': { gridAutoFlow: 'dense' },
      '.grid-flow-row-dense': { gridAutoFlow: 'row dense' },
      '.grid-flow-col-dense': { gridAutoFlow: 'column dense' },
    })
  },

  gridAutoRows: createUtilityPlugin('gridAutoRows', [['auto-rows', ['gridAutoRows']]]),
  gridTemplateColumns: createUtilityPlugin('gridTemplateColumns', [
    ['grid-cols', ['gridTemplateColumns']],
  ]),
  gridTemplateRows: createUtilityPlugin('gridTemplateRows', [['grid-rows', ['gridTemplateRows']]]),

  flexDirection: ({ addUtilities }) => {
    addUtilities({
      '.flex-row': { 'flex-direction': 'row' },
      '.flex-row-reverse': { 'flex-direction': 'row-reverse' },
      '.flex-col': { 'flex-direction': 'column' },
      '.flex-col-reverse': { 'flex-direction': 'column-reverse' },
    })
  },

  flexWrap: ({ addUtilities }) => {
    addUtilities({
      '.flex-wrap': { 'flex-wrap': 'wrap' },
      '.flex-wrap-reverse': { 'flex-wrap': 'wrap-reverse' },
      '.flex-nowrap': { 'flex-wrap': 'nowrap' },
    })
  },

  placeContent: ({ addUtilities }) => {
    addUtilities({
      '.place-content-center': { 'place-content': 'center' },
      '.place-content-start': { 'place-content': 'start' },
      '.place-content-end': { 'place-content': 'end' },
      '.place-content-between': { 'place-content': 'space-between' },
      '.place-content-around': { 'place-content': 'space-around' },
      '.place-content-evenly': { 'place-content': 'space-evenly' },
      '.place-content-baseline': { 'place-content': 'baseline' },
      '.place-content-stretch': { 'place-content': 'stretch' },
    })
  },

  placeItems: ({ addUtilities }) => {
    addUtilities({
      '.place-items-start': { 'place-items': 'start' },
      '.place-items-end': { 'place-items': 'end' },
      '.place-items-center': { 'place-items': 'center' },
      '.place-items-baseline': { 'place-items': 'baseline' },
      '.place-items-stretch': { 'place-items': 'stretch' },
    })
  },

  alignContent: ({ addUtilities }) => {
    addUtilities({
      '.content-normal': { 'align-content': 'normal' },
      '.content-center': { 'align-content': 'center' },
      '.content-start': { 'align-content': 'flex-start' },
      '.content-end': { 'align-content': 'flex-end' },
      '.content-between': { 'align-content': 'space-between' },
      '.content-around': { 'align-content': 'space-around' },
      '.content-evenly': { 'align-content': 'space-evenly' },
      '.content-baseline': { 'align-content': 'baseline' },
      '.content-stretch': { 'align-content': 'stretch' },
    })
  },

  alignItems: ({ addUtilities }) => {
    addUtilities({
      '.items-start': { 'align-items': 'flex-start' },
      '.items-end': { 'align-items': 'flex-end' },
      '.items-center': { 'align-items': 'center' },
      '.items-baseline': { 'align-items': 'baseline' },
      '.items-stretch': { 'align-items': 'stretch' },
    })
  },

  justifyContent: ({ addUtilities }) => {
    addUtilities({
      '.justify-normal': { 'justify-content': 'normal' },
      '.justify-start': { 'justify-content': 'flex-start' },
      '.justify-end': { 'justify-content': 'flex-end' },
      '.justify-center': { 'justify-content': 'center' },
      '.justify-between': { 'justify-content': 'space-between' },
      '.justify-around': { 'justify-content': 'space-around' },
      '.justify-evenly': { 'justify-content': 'space-evenly' },
      '.justify-stretch': { 'justify-content': 'stretch' },
    })
  },

  justifyItems: ({ addUtilities }) => {
    addUtilities({
      '.justify-items-start': { 'justify-items': 'start' },
      '.justify-items-end': { 'justify-items': 'end' },
      '.justify-items-center': { 'justify-items': 'center' },
      '.justify-items-stretch': { 'justify-items': 'stretch' },
    })
  },

  gap: createUtilityPlugin('gap', [
    ['gap', ['gap']],
    [
      ['gap-x', ['columnGap']],
      ['gap-y', ['rowGap']],
    ],
  ]),

  space: ({ matchUtilities, addUtilities, theme }) => {
    matchUtilities(
      {
        'space-x': (value) => {
          value = value === '0' ? '0px' : value

          return {
            '& > :not([hidden]) ~ :not([hidden])': {
              '--tw-space-x-reverse': '0',
              'margin-right': `calc(${value} * var(--tw-space-x-reverse))`,
              'margin-left': `calc(${value} * calc(1 - var(--tw-space-x-reverse)))`,
            },
          }
        },
        'space-y': (value) => {
          value = value === '0' ? '0px' : value

          return {
            '& > :not([hidden]) ~ :not([hidden])': {
              '--tw-space-y-reverse': '0',
              'margin-top': `calc(${value} * calc(1 - var(--tw-space-y-reverse)))`,
              'margin-bottom': `calc(${value} * var(--tw-space-y-reverse))`,
            },
          }
        },
      },
      { values: theme('space'), supportsNegativeValues: true }
    )

    addUtilities({
      '.space-y-reverse > :not([hidden]) ~ :not([hidden])': { '--tw-space-y-reverse': '1' },
      '.space-x-reverse > :not([hidden]) ~ :not([hidden])': { '--tw-space-x-reverse': '1' },
    })
  },

  divideWidth: ({ matchUtilities, addUtilities, theme }) => {
    matchUtilities(
      {
        'divide-x': (value) => {
          value = value === '0' ? '0px' : value

          return {
            '& > :not([hidden]) ~ :not([hidden])': {
              '@defaults border-width': {},
              '--tw-divide-x-reverse': '0',
              'border-right-width': `calc(${value} * var(--tw-divide-x-reverse))`,
              'border-left-width': `calc(${value} * calc(1 - var(--tw-divide-x-reverse)))`,
            },
          }
        },
        'divide-y': (value) => {
          value = value === '0' ? '0px' : value

          return {
            '& > :not([hidden]) ~ :not([hidden])': {
              '@defaults border-width': {},
              '--tw-divide-y-reverse': '0',
              'border-top-width': `calc(${value} * calc(1 - var(--tw-divide-y-reverse)))`,
              'border-bottom-width': `calc(${value} * var(--tw-divide-y-reverse))`,
            },
          }
        },
      },
      { values: theme('divideWidth'), type: ['line-width', 'length', 'any'] }
    )

    addUtilities({
      '.divide-y-reverse > :not([hidden]) ~ :not([hidden])': {
        '@defaults border-width': {},
        '--tw-divide-y-reverse': '1',
      },
      '.divide-x-reverse > :not([hidden]) ~ :not([hidden])': {
        '@defaults border-width': {},
        '--tw-divide-x-reverse': '1',
      },
    })
  },

  divideStyle: ({ addUtilities }) => {
    addUtilities({
      '.divide-solid > :not([hidden]) ~ :not([hidden])': { 'border-style': 'solid' },
      '.divide-dashed > :not([hidden]) ~ :not([hidden])': { 'border-style': 'dashed' },
      '.divide-dotted > :not([hidden]) ~ :not([hidden])': { 'border-style': 'dotted' },
      '.divide-double > :not([hidden]) ~ :not([hidden])': { 'border-style': 'double' },
      '.divide-none > :not([hidden]) ~ :not([hidden])': { 'border-style': 'none' },
    })
  },

  divideColor: ({ matchUtilities, theme, corePlugins }) => {
    matchUtilities(
      {
        divide: (value) => {
          if (!corePlugins('divideOpacity')) {
            return {
              ['& > :not([hidden]) ~ :not([hidden])']: {
                'border-color': toColorValue(value),
              },
            }
          }

          return {
            ['& > :not([hidden]) ~ :not([hidden])']: withAlphaVariable({
              color: value,
              property: 'border-color',
              variable: '--tw-divide-opacity',
            }),
          }
        },
      },
      {
        values: (({ DEFAULT: _, ...colors }) => colors)(flattenColorPalette(theme('divideColor'))),
        type: ['color', 'any'],
      }
    )
  },

  divideOpacity: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'divide-opacity': (value) => {
          return { [`& > :not([hidden]) ~ :not([hidden])`]: { '--tw-divide-opacity': value } }
        },
      },
      { values: theme('divideOpacity') }
    )
  },

  placeSelf: ({ addUtilities }) => {
    addUtilities({
      '.place-self-auto': { 'place-self': 'auto' },
      '.place-self-start': { 'place-self': 'start' },
      '.place-self-end': { 'place-self': 'end' },
      '.place-self-center': { 'place-self': 'center' },
      '.place-self-stretch': { 'place-self': 'stretch' },
    })
  },

  alignSelf: ({ addUtilities }) => {
    addUtilities({
      '.self-auto': { 'align-self': 'auto' },
      '.self-start': { 'align-self': 'flex-start' },
      '.self-end': { 'align-self': 'flex-end' },
      '.self-center': { 'align-self': 'center' },
      '.self-stretch': { 'align-self': 'stretch' },
      '.self-baseline': { 'align-self': 'baseline' },
    })
  },

  justifySelf: ({ addUtilities }) => {
    addUtilities({
      '.justify-self-auto': { 'justify-self': 'auto' },
      '.justify-self-start': { 'justify-self': 'start' },
      '.justify-self-end': { 'justify-self': 'end' },
      '.justify-self-center': { 'justify-self': 'center' },
      '.justify-self-stretch': { 'justify-self': 'stretch' },
    })
  },

  overflow: ({ addUtilities }) => {
    addUtilities({
      '.overflow-auto': { overflow: 'auto' },
      '.overflow-hidden': { overflow: 'hidden' },
      '.overflow-clip': { overflow: 'clip' },
      '.overflow-visible': { overflow: 'visible' },
      '.overflow-scroll': { overflow: 'scroll' },
      '.overflow-x-auto': { 'overflow-x': 'auto' },
      '.overflow-y-auto': { 'overflow-y': 'auto' },
      '.overflow-x-hidden': { 'overflow-x': 'hidden' },
      '.overflow-y-hidden': { 'overflow-y': 'hidden' },
      '.overflow-x-clip': { 'overflow-x': 'clip' },
      '.overflow-y-clip': { 'overflow-y': 'clip' },
      '.overflow-x-visible': { 'overflow-x': 'visible' },
      '.overflow-y-visible': { 'overflow-y': 'visible' },
      '.overflow-x-scroll': { 'overflow-x': 'scroll' },
      '.overflow-y-scroll': { 'overflow-y': 'scroll' },
    })
  },

  overscrollBehavior: ({ addUtilities }) => {
    addUtilities({
      '.overscroll-auto': { 'overscroll-behavior': 'auto' },
      '.overscroll-contain': { 'overscroll-behavior': 'contain' },
      '.overscroll-none': { 'overscroll-behavior': 'none' },
      '.overscroll-y-auto': { 'overscroll-behavior-y': 'auto' },
      '.overscroll-y-contain': { 'overscroll-behavior-y': 'contain' },
      '.overscroll-y-none': { 'overscroll-behavior-y': 'none' },
      '.overscroll-x-auto': { 'overscroll-behavior-x': 'auto' },
      '.overscroll-x-contain': { 'overscroll-behavior-x': 'contain' },
      '.overscroll-x-none': { 'overscroll-behavior-x': 'none' },
    })
  },

  scrollBehavior: ({ addUtilities }) => {
    addUtilities({
      '.scroll-auto': { 'scroll-behavior': 'auto' },
      '.scroll-smooth': { 'scroll-behavior': 'smooth' },
    })
  },

  textOverflow: ({ addUtilities }) => {
    addUtilities({
      '.truncate': { overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
      '.overflow-ellipsis': { 'text-overflow': 'ellipsis' }, // Deprecated
      '.text-ellipsis': { 'text-overflow': 'ellipsis' },
      '.text-clip': { 'text-overflow': 'clip' },
    })
  },

  hyphens: ({ addUtilities }) => {
    addUtilities({
      '.hyphens-none': { hyphens: 'none' },
      '.hyphens-manual': { hyphens: 'manual' },
      '.hyphens-auto': { hyphens: 'auto' },
    })
  },

  whitespace: ({ addUtilities }) => {
    addUtilities({
      '.whitespace-normal': { 'white-space': 'normal' },
      '.whitespace-nowrap': { 'white-space': 'nowrap' },
      '.whitespace-pre': { 'white-space': 'pre' },
      '.whitespace-pre-line': { 'white-space': 'pre-line' },
      '.whitespace-pre-wrap': { 'white-space': 'pre-wrap' },
      '.whitespace-break-spaces': { 'white-space': 'break-spaces' },
    })
  },

  textWrap: ({ addUtilities }) => {
    addUtilities({
      '.text-wrap': { 'text-wrap': 'wrap' },
      '.text-nowrap': { 'text-wrap': 'nowrap' },
      '.text-balance': { 'text-wrap': 'balance' },
      '.text-pretty': { 'text-wrap': 'pretty' },
    })
  },

  wordBreak: ({ addUtilities }) => {
    addUtilities({
      '.break-normal': { 'overflow-wrap': 'normal', 'word-break': 'normal' },
      '.break-words': { 'overflow-wrap': 'break-word' },
      '.break-all': { 'word-break': 'break-all' },
      '.break-keep': { 'word-break': 'keep-all' },
    })
  },

  borderRadius: createUtilityPlugin('borderRadius', [
    ['rounded', ['border-radius']],
    [
      ['rounded-s', ['border-start-start-radius', 'border-end-start-radius']],
      ['rounded-e', ['border-start-end-radius', 'border-end-end-radius']],
      ['rounded-t', ['border-top-left-radius', 'border-top-right-radius']],
      ['rounded-r', ['border-top-right-radius', 'border-bottom-right-radius']],
      ['rounded-b', ['border-bottom-right-radius', 'border-bottom-left-radius']],
      ['rounded-l', ['border-top-left-radius', 'border-bottom-left-radius']],
    ],
    [
      ['rounded-ss', ['border-start-start-radius']],
      ['rounded-se', ['border-start-end-radius']],
      ['rounded-ee', ['border-end-end-radius']],
      ['rounded-es', ['border-end-start-radius']],
      ['rounded-tl', ['border-top-left-radius']],
      ['rounded-tr', ['border-top-right-radius']],
      ['rounded-br', ['border-bottom-right-radius']],
      ['rounded-bl', ['border-bottom-left-radius']],
    ],
  ]),

  borderWidth: createUtilityPlugin(
    'borderWidth',
    [
      ['border', [['@defaults border-width', {}], 'border-width']],
      [
        ['border-x', [['@defaults border-width', {}], 'border-left-width', 'border-right-width']],
        ['border-y', [['@defaults border-width', {}], 'border-top-width', 'border-bottom-width']],
      ],
      [
        ['border-s', [['@defaults border-width', {}], 'border-inline-start-width']],
        ['border-e', [['@defaults border-width', {}], 'border-inline-end-width']],
        ['border-t', [['@defaults border-width', {}], 'border-top-width']],
        ['border-r', [['@defaults border-width', {}], 'border-right-width']],
        ['border-b', [['@defaults border-width', {}], 'border-bottom-width']],
        ['border-l', [['@defaults border-width', {}], 'border-left-width']],
      ],
    ],
    { type: ['line-width', 'length'] }
  ),

  borderStyle: ({ addUtilities }) => {
    addUtilities({
      '.border-solid': { 'border-style': 'solid' },
      '.border-dashed': { 'border-style': 'dashed' },
      '.border-dotted': { 'border-style': 'dotted' },
      '.border-double': { 'border-style': 'double' },
      '.border-hidden': { 'border-style': 'hidden' },
      '.border-none': { 'border-style': 'none' },
    })
  },

  borderColor: ({ matchUtilities, theme, corePlugins }) => {
    matchUtilities(
      {
        border: (value) => {
          if (!corePlugins('borderOpacity')) {
            return {
              'border-color': toColorValue(value),
            }
          }

          return withAlphaVariable({
            color: value,
            property: 'border-color',
            variable: '--tw-border-opacity',
          })
        },
      },
      {
        values: (({ DEFAULT: _, ...colors }) => colors)(flattenColorPalette(theme('borderColor'))),
        type: ['color', 'any'],
      }
    )

    matchUtilities(
      {
        'border-x': (value) => {
          if (!corePlugins('borderOpacity')) {
            return {
              'border-left-color': toColorValue(value),
              'border-right-color': toColorValue(value),
            }
          }

          return withAlphaVariable({
            color: value,
            property: ['border-left-color', 'border-right-color'],
            variable: '--tw-border-opacity',
          })
        },
        'border-y': (value) => {
          if (!corePlugins('borderOpacity')) {
            return {
              'border-top-color': toColorValue(value),
              'border-bottom-color': toColorValue(value),
            }
          }

          return withAlphaVariable({
            color: value,
            property: ['border-top-color', 'border-bottom-color'],
            variable: '--tw-border-opacity',
          })
        },
      },
      {
        values: (({ DEFAULT: _, ...colors }) => colors)(flattenColorPalette(theme('borderColor'))),
        type: ['color', 'any'],
      }
    )

    matchUtilities(
      {
        'border-s': (value) => {
          if (!corePlugins('borderOpacity')) {
            return {
              'border-inline-start-color': toColorValue(value),
            }
          }

          return withAlphaVariable({
            color: value,
            property: 'border-inline-start-color',
            variable: '--tw-border-opacity',
          })
        },
        'border-e': (value) => {
          if (!corePlugins('borderOpacity')) {
            return {
              'border-inline-end-color': toColorValue(value),
            }
          }

          return withAlphaVariable({
            color: value,
            property: 'border-inline-end-color',
            variable: '--tw-border-opacity',
          })
        },
        'border-t': (value) => {
          if (!corePlugins('borderOpacity')) {
            return {
              'border-top-color': toColorValue(value),
            }
          }

          return withAlphaVariable({
            color: value,
            property: 'border-top-color',
            variable: '--tw-border-opacity',
          })
        },
        'border-r': (value) => {
          if (!corePlugins('borderOpacity')) {
            return {
              'border-right-color': toColorValue(value),
            }
          }

          return withAlphaVariable({
            color: value,
            property: 'border-right-color',
            variable: '--tw-border-opacity',
          })
        },
        'border-b': (value) => {
          if (!corePlugins('borderOpacity')) {
            return {
              'border-bottom-color': toColorValue(value),
            }
          }

          return withAlphaVariable({
            color: value,
            property: 'border-bottom-color',
            variable: '--tw-border-opacity',
          })
        },
        'border-l': (value) => {
          if (!corePlugins('borderOpacity')) {
            return {
              'border-left-color': toColorValue(value),
            }
          }

          return withAlphaVariable({
            color: value,
            property: 'border-left-color',
            variable: '--tw-border-opacity',
          })
        },
      },
      {
        values: (({ DEFAULT: _, ...colors }) => colors)(flattenColorPalette(theme('borderColor'))),
        type: ['color', 'any'],
      }
    )
  },

  borderOpacity: createUtilityPlugin('borderOpacity', [
    ['border-opacity', ['--tw-border-opacity']],
  ]),

  backgroundColor: ({ matchUtilities, theme, corePlugins }) => {
    matchUtilities(
      {
        bg: (value) => {
          if (!corePlugins('backgroundOpacity')) {
            return {
              'background-color': toColorValue(value),
            }
          }

          return withAlphaVariable({
            color: value,
            property: 'background-color',
            variable: '--tw-bg-opacity',
          })
        },
      },
      { values: flattenColorPalette(theme('backgroundColor')), type: ['color', 'any'] }
    )
  },

  backgroundOpacity: createUtilityPlugin('backgroundOpacity', [
    ['bg-opacity', ['--tw-bg-opacity']],
  ]),
  backgroundImage: createUtilityPlugin('backgroundImage', [['bg', ['background-image']]], {
    type: ['lookup', 'image', 'url'],
  }),
  gradientColorStops: (() => {
    function transparentTo(value) {
      return withAlphaValue(value, 0, 'rgb(255 255 255 / 0)')
    }

    return function ({ matchUtilities, theme, addDefaults }) {
      addDefaults('gradient-color-stops', {
        '--tw-gradient-from-position': ' ',
        '--tw-gradient-via-position': ' ',
        '--tw-gradient-to-position': ' ',
      })

      let options = {
        values: flattenColorPalette(theme('gradientColorStops')),
        type: ['color', 'any'],
      }

      let positionOptions = {
        values: theme('gradientColorStopPositions'),
        type: ['length', 'percentage'],
      }

      matchUtilities(
        {
          from: (value) => {
            let transparentToValue = transparentTo(value)

            return {
              '@defaults gradient-color-stops': {},
              '--tw-gradient-from': `${toColorValue(value)} var(--tw-gradient-from-position)`,
              '--tw-gradient-to': `${transparentToValue} var(--tw-gradient-to-position)`,
              '--tw-gradient-stops': `var(--tw-gradient-from), var(--tw-gradient-to)`,
            }
          },
        },
        options
      )

      matchUtilities(
        {
          from: (value) => {
            return {
              '--tw-gradient-from-position': value,
            }
          },
        },
        positionOptions
      )

      matchUtilities(
        {
          via: (value) => {
            let transparentToValue = transparentTo(value)

            return {
              '@defaults gradient-color-stops': {},
              '--tw-gradient-to': `${transparentToValue}  var(--tw-gradient-to-position)`,
              '--tw-gradient-stops': `var(--tw-gradient-from), ${toColorValue(
                value
              )} var(--tw-gradient-via-position), var(--tw-gradient-to)`,
            }
          },
        },
        options
      )

      matchUtilities(
        {
          via: (value) => {
            return {
              '--tw-gradient-via-position': value,
            }
          },
        },
        positionOptions
      )

      matchUtilities(
        {
          to: (value) => ({
            '@defaults gradient-color-stops': {},
            '--tw-gradient-to': `${toColorValue(value)} var(--tw-gradient-to-position)`,
          }),
        },
        options
      )

      matchUtilities(
        {
          to: (value) => {
            return {
              '--tw-gradient-to-position': value,
            }
          },
        },
        positionOptions
      )
    }
  })(),

  boxDecorationBreak: ({ addUtilities }) => {
    addUtilities({
      '.decoration-slice': { 'box-decoration-break': 'slice' }, // Deprecated
      '.decoration-clone': { 'box-decoration-break': 'clone' }, // Deprecated
      '.box-decoration-slice': { 'box-decoration-break': 'slice' },
      '.box-decoration-clone': { 'box-decoration-break': 'clone' },
    })
  },

  backgroundSize: createUtilityPlugin('backgroundSize', [['bg', ['background-size']]], {
    type: ['lookup', 'length', 'percentage', 'size'],
  }),

  backgroundAttachment: ({ addUtilities }) => {
    addUtilities({
      '.bg-fixed': { 'background-attachment': 'fixed' },
      '.bg-local': { 'background-attachment': 'local' },
      '.bg-scroll': { 'background-attachment': 'scroll' },
    })
  },

  backgroundClip: ({ addUtilities }) => {
    addUtilities({
      '.bg-clip-border': { 'background-clip': 'border-box' },
      '.bg-clip-padding': { 'background-clip': 'padding-box' },
      '.bg-clip-content': { 'background-clip': 'content-box' },
      '.bg-clip-text': { 'background-clip': 'text' },
    })
  },

  backgroundPosition: createUtilityPlugin('backgroundPosition', [['bg', ['background-position']]], {
    type: ['lookup', ['position', { preferOnConflict: true }]],
  }),

  backgroundRepeat: ({ addUtilities }) => {
    addUtilities({
      '.bg-repeat': { 'background-repeat': 'repeat' },
      '.bg-no-repeat': { 'background-repeat': 'no-repeat' },
      '.bg-repeat-x': { 'background-repeat': 'repeat-x' },
      '.bg-repeat-y': { 'background-repeat': 'repeat-y' },
      '.bg-repeat-round': { 'background-repeat': 'round' },
      '.bg-repeat-space': { 'background-repeat': 'space' },
    })
  },

  backgroundOrigin: ({ addUtilities }) => {
    addUtilities({
      '.bg-origin-border': { 'background-origin': 'border-box' },
      '.bg-origin-padding': { 'background-origin': 'padding-box' },
      '.bg-origin-content': { 'background-origin': 'content-box' },
    })
  },

  fill: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        fill: (value) => {
          return { fill: toColorValue(value) }
        },
      },
      { values: flattenColorPalette(theme('fill')), type: ['color', 'any'] }
    )
  },

  stroke: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        stroke: (value) => {
          return { stroke: toColorValue(value) }
        },
      },
      { values: flattenColorPalette(theme('stroke')), type: ['color', 'url', 'any'] }
    )
  },

  strokeWidth: createUtilityPlugin('strokeWidth', [['stroke', ['stroke-width']]], {
    type: ['length', 'number', 'percentage'],
  }),

  objectFit: ({ addUtilities }) => {
    addUtilities({
      '.object-contain': { 'object-fit': 'contain' },
      '.object-cover': { 'object-fit': 'cover' },
      '.object-fill': { 'object-fit': 'fill' },
      '.object-none': { 'object-fit': 'none' },
      '.object-scale-down': { 'object-fit': 'scale-down' },
    })
  },
  objectPosition: createUtilityPlugin('objectPosition', [['object', ['object-position']]]),

  padding: createUtilityPlugin('padding', [
    ['p', ['padding']],
    [
      ['px', ['padding-left', 'padding-right']],
      ['py', ['padding-top', 'padding-bottom']],
    ],
    [
      ['ps', ['padding-inline-start']],
      ['pe', ['padding-inline-end']],
      ['pt', ['padding-top']],
      ['pr', ['padding-right']],
      ['pb', ['padding-bottom']],
      ['pl', ['padding-left']],
    ],
  ]),

  textAlign: ({ addUtilities }) => {
    addUtilities({
      '.text-left': { 'text-align': 'left' },
      '.text-center': { 'text-align': 'center' },
      '.text-right': { 'text-align': 'right' },
      '.text-justify': { 'text-align': 'justify' },
      '.text-start': { 'text-align': 'start' },
      '.text-end': { 'text-align': 'end' },
    })
  },

  textIndent: createUtilityPlugin('textIndent', [['indent', ['text-indent']]], {
    supportsNegativeValues: true,
  }),

  verticalAlign: ({ addUtilities, matchUtilities }) => {
    addUtilities({
      '.align-baseline': { 'vertical-align': 'baseline' },
      '.align-top': { 'vertical-align': 'top' },
      '.align-middle': { 'vertical-align': 'middle' },
      '.align-bottom': { 'vertical-align': 'bottom' },
      '.align-text-top': { 'vertical-align': 'text-top' },
      '.align-text-bottom': { 'vertical-align': 'text-bottom' },
      '.align-sub': { 'vertical-align': 'sub' },
      '.align-super': { 'vertical-align': 'super' },
    })

    matchUtilities({ align: (value) => ({ 'vertical-align': value }) })
  },

  fontFamily: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        font: (value) => {
          let [families, options = {}] =
            Array.isArray(value) && isPlainObject(value[1]) ? value : [value]
          let { fontFeatureSettings, fontVariationSettings } = options

          return {
            'font-family': Array.isArray(families) ? families.join(', ') : families,
            ...(fontFeatureSettings === undefined
              ? {}
              : { 'font-feature-settings': fontFeatureSettings }),
            ...(fontVariationSettings === undefined
              ? {}
              : { 'font-variation-settings': fontVariationSettings }),
          }
        },
      },
      {
        values: theme('fontFamily'),
        type: ['lookup', 'generic-name', 'family-name'],
      }
    )
  },

  fontSize: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        text: (value, { modifier }) => {
          let [fontSize, options] = Array.isArray(value) ? value : [value]

          if (modifier) {
            return {
              'font-size': fontSize,
              'line-height': modifier,
            }
          }

          let { lineHeight, letterSpacing, fontWeight } = isPlainObject(options)
            ? options
            : { lineHeight: options }

          return {
            'font-size': fontSize,
            ...(lineHeight === undefined ? {} : { 'line-height': lineHeight }),
            ...(letterSpacing === undefined ? {} : { 'letter-spacing': letterSpacing }),
            ...(fontWeight === undefined ? {} : { 'font-weight': fontWeight }),
          }
        },
      },
      {
        values: theme('fontSize'),
        modifiers: theme('lineHeight'),
        type: ['absolute-size', 'relative-size', 'length', 'percentage'],
      }
    )
  },

  fontWeight: createUtilityPlugin('fontWeight', [['font', ['fontWeight']]], {
    type: ['lookup', 'number', 'any'],
  }),

  textTransform: ({ addUtilities }) => {
    addUtilities({
      '.uppercase': { 'text-transform': 'uppercase' },
      '.lowercase': { 'text-transform': 'lowercase' },
      '.capitalize': { 'text-transform': 'capitalize' },
      '.normal-case': { 'text-transform': 'none' },
    })
  },

  fontStyle: ({ addUtilities }) => {
    addUtilities({
      '.italic': { 'font-style': 'italic' },
      '.not-italic': { 'font-style': 'normal' },
    })
  },

  fontVariantNumeric: ({ addDefaults, addUtilities }) => {
    let cssFontVariantNumericValue =
      'var(--tw-ordinal) var(--tw-slashed-zero) var(--tw-numeric-figure) var(--tw-numeric-spacing) var(--tw-numeric-fraction)'

    addDefaults('font-variant-numeric', {
      '--tw-ordinal': ' ',
      '--tw-slashed-zero': ' ',
      '--tw-numeric-figure': ' ',
      '--tw-numeric-spacing': ' ',
      '--tw-numeric-fraction': ' ',
    })

    addUtilities({
      '.normal-nums': { 'font-variant-numeric': 'normal' },
      '.ordinal': {
        '@defaults font-variant-numeric': {},
        '--tw-ordinal': 'ordinal',
        'font-variant-numeric': cssFontVariantNumericValue,
      },
      '.slashed-zero': {
        '@defaults font-variant-numeric': {},
        '--tw-slashed-zero': 'slashed-zero',
        'font-variant-numeric': cssFontVariantNumericValue,
      },
      '.lining-nums': {
        '@defaults font-variant-numeric': {},
        '--tw-numeric-figure': 'lining-nums',
        'font-variant-numeric': cssFontVariantNumericValue,
      },
      '.oldstyle-nums': {
        '@defaults font-variant-numeric': {},
        '--tw-numeric-figure': 'oldstyle-nums',
        'font-variant-numeric': cssFontVariantNumericValue,
      },
      '.proportional-nums': {
        '@defaults font-variant-numeric': {},
        '--tw-numeric-spacing': 'proportional-nums',
        'font-variant-numeric': cssFontVariantNumericValue,
      },
      '.tabular-nums': {
        '@defaults font-variant-numeric': {},
        '--tw-numeric-spacing': 'tabular-nums',
        'font-variant-numeric': cssFontVariantNumericValue,
      },
      '.diagonal-fractions': {
        '@defaults font-variant-numeric': {},
        '--tw-numeric-fraction': 'diagonal-fractions',
        'font-variant-numeric': cssFontVariantNumericValue,
      },
      '.stacked-fractions': {
        '@defaults font-variant-numeric': {},
        '--tw-numeric-fraction': 'stacked-fractions',
        'font-variant-numeric': cssFontVariantNumericValue,
      },
    })
  },

  lineHeight: createUtilityPlugin('lineHeight', [['leading', ['lineHeight']]]),
  letterSpacing: createUtilityPlugin('letterSpacing', [['tracking', ['letterSpacing']]], {
    supportsNegativeValues: true,
  }),

  textColor: ({ matchUtilities, theme, corePlugins }) => {
    matchUtilities(
      {
        text: (value) => {
          if (!corePlugins('textOpacity')) {
            return { color: toColorValue(value) }
          }

          return withAlphaVariable({
            color: value,
            property: 'color',
            variable: '--tw-text-opacity',
          })
        },
      },
      { values: flattenColorPalette(theme('textColor')), type: ['color', 'any'] }
    )
  },

  textOpacity: createUtilityPlugin('textOpacity', [['text-opacity', ['--tw-text-opacity']]]),

  textDecoration: ({ addUtilities }) => {
    addUtilities({
      '.underline': { 'text-decoration-line': 'underline' },
      '.overline': { 'text-decoration-line': 'overline' },
      '.line-through': { 'text-decoration-line': 'line-through' },
      '.no-underline': { 'text-decoration-line': 'none' },
    })
  },

  textDecorationColor: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        decoration: (value) => {
          return { 'text-decoration-color': toColorValue(value) }
        },
      },
      { values: flattenColorPalette(theme('textDecorationColor')), type: ['color', 'any'] }
    )
  },

  textDecorationStyle: ({ addUtilities }) => {
    addUtilities({
      '.decoration-solid': { 'text-decoration-style': 'solid' },
      '.decoration-double': { 'text-decoration-style': 'double' },
      '.decoration-dotted': { 'text-decoration-style': 'dotted' },
      '.decoration-dashed': { 'text-decoration-style': 'dashed' },
      '.decoration-wavy': { 'text-decoration-style': 'wavy' },
    })
  },

  textDecorationThickness: createUtilityPlugin(
    'textDecorationThickness',
    [['decoration', ['text-decoration-thickness']]],
    { type: ['length', 'percentage'] }
  ),

  textUnderlineOffset: createUtilityPlugin(
    'textUnderlineOffset',
    [['underline-offset', ['text-underline-offset']]],
    { type: ['length', 'percentage', 'any'] }
  ),

  fontSmoothing: ({ addUtilities }) => {
    addUtilities({
      '.antialiased': {
        '-webkit-font-smoothing': 'antialiased',
        '-moz-osx-font-smoothing': 'grayscale',
      },
      '.subpixel-antialiased': {
        '-webkit-font-smoothing': 'auto',
        '-moz-osx-font-smoothing': 'auto',
      },
    })
  },

  placeholderColor: ({ matchUtilities, theme, corePlugins }) => {
    matchUtilities(
      {
        placeholder: (value) => {
          if (!corePlugins('placeholderOpacity')) {
            return {
              '&::placeholder': {
                color: toColorValue(value),
              },
            }
          }

          return {
            '&::placeholder': withAlphaVariable({
              color: value,
              property: 'color',
              variable: '--tw-placeholder-opacity',
            }),
          }
        },
      },
      { values: flattenColorPalette(theme('placeholderColor')), type: ['color', 'any'] }
    )
  },

  placeholderOpacity: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'placeholder-opacity': (value) => {
          return { ['&::placeholder']: { '--tw-placeholder-opacity': value } }
        },
      },
      { values: theme('placeholderOpacity') }
    )
  },

  caretColor: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        caret: (value) => {
          return { 'caret-color': toColorValue(value) }
        },
      },
      { values: flattenColorPalette(theme('caretColor')), type: ['color', 'any'] }
    )
  },

  accentColor: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        accent: (value) => {
          return { 'accent-color': toColorValue(value) }
        },
      },
      { values: flattenColorPalette(theme('accentColor')), type: ['color', 'any'] }
    )
  },

  opacity: createUtilityPlugin('opacity', [['opacity', ['opacity']]]),

  backgroundBlendMode: ({ addUtilities }) => {
    addUtilities({
      '.bg-blend-normal': { 'background-blend-mode': 'normal' },
      '.bg-blend-multiply': { 'background-blend-mode': 'multiply' },
      '.bg-blend-screen': { 'background-blend-mode': 'screen' },
      '.bg-blend-overlay': { 'background-blend-mode': 'overlay' },
      '.bg-blend-darken': { 'background-blend-mode': 'darken' },
      '.bg-blend-lighten': { 'background-blend-mode': 'lighten' },
      '.bg-blend-color-dodge': { 'background-blend-mode': 'color-dodge' },
      '.bg-blend-color-burn': { 'background-blend-mode': 'color-burn' },
      '.bg-blend-hard-light': { 'background-blend-mode': 'hard-light' },
      '.bg-blend-soft-light': { 'background-blend-mode': 'soft-light' },
      '.bg-blend-difference': { 'background-blend-mode': 'difference' },
      '.bg-blend-exclusion': { 'background-blend-mode': 'exclusion' },
      '.bg-blend-hue': { 'background-blend-mode': 'hue' },
      '.bg-blend-saturation': { 'background-blend-mode': 'saturation' },
      '.bg-blend-color': { 'background-blend-mode': 'color' },
      '.bg-blend-luminosity': { 'background-blend-mode': 'luminosity' },
    })
  },

  mixBlendMode: ({ addUtilities }) => {
    addUtilities({
      '.mix-blend-normal': { 'mix-blend-mode': 'normal' },
      '.mix-blend-multiply': { 'mix-blend-mode': 'multiply' },
      '.mix-blend-screen': { 'mix-blend-mode': 'screen' },
      '.mix-blend-overlay': { 'mix-blend-mode': 'overlay' },
      '.mix-blend-darken': { 'mix-blend-mode': 'darken' },
      '.mix-blend-lighten': { 'mix-blend-mode': 'lighten' },
      '.mix-blend-color-dodge': { 'mix-blend-mode': 'color-dodge' },
      '.mix-blend-color-burn': { 'mix-blend-mode': 'color-burn' },
      '.mix-blend-hard-light': { 'mix-blend-mode': 'hard-light' },
      '.mix-blend-soft-light': { 'mix-blend-mode': 'soft-light' },
      '.mix-blend-difference': { 'mix-blend-mode': 'difference' },
      '.mix-blend-exclusion': { 'mix-blend-mode': 'exclusion' },
      '.mix-blend-hue': { 'mix-blend-mode': 'hue' },
      '.mix-blend-saturation': { 'mix-blend-mode': 'saturation' },
      '.mix-blend-color': { 'mix-blend-mode': 'color' },
      '.mix-blend-luminosity': { 'mix-blend-mode': 'luminosity' },
      '.mix-blend-plus-darker': { 'mix-blend-mode': 'plus-darker' },
      '.mix-blend-plus-lighter': { 'mix-blend-mode': 'plus-lighter' },
    })
  },

  boxShadow: (() => {
    let transformValue = transformThemeValue('boxShadow')
    let defaultBoxShadow = [
      `var(--tw-ring-offset-shadow, 0 0 #0000)`,
      `var(--tw-ring-shadow, 0 0 #0000)`,
      `var(--tw-shadow)`,
    ].join(', ')

    return function ({ matchUtilities, addDefaults, theme }) {
      addDefaults('box-shadow', {
        '--tw-ring-offset-shadow': '0 0 #0000',
        '--tw-ring-shadow': '0 0 #0000',
        '--tw-shadow': '0 0 #0000',
        '--tw-shadow-colored': '0 0 #0000',
      })

      matchUtilities(
        {
          shadow: (value) => {
            value = transformValue(value)

            let ast = parseBoxShadowValue(value)
            for (let shadow of ast) {
              // Don't override color if the whole shadow is a variable
              if (!shadow.valid) {
                continue
              }

              shadow.color = 'var(--tw-shadow-color)'
            }

            return {
              '@defaults box-shadow': {},
              '--tw-shadow': value === 'none' ? '0 0 #0000' : value,
              '--tw-shadow-colored': value === 'none' ? '0 0 #0000' : formatBoxShadowValue(ast),
              'box-shadow': defaultBoxShadow,
            }
          },
        },
        { values: theme('boxShadow'), type: ['shadow'] }
      )
    }
  })(),

  boxShadowColor: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        shadow: (value) => {
          return {
            '--tw-shadow-color': toColorValue(value),
            '--tw-shadow': 'var(--tw-shadow-colored)',
          }
        },
      },
      { values: flattenColorPalette(theme('boxShadowColor')), type: ['color', 'any'] }
    )
  },

  outlineStyle: ({ addUtilities }) => {
    addUtilities({
      '.outline-none': {
        outline: '2px solid transparent',
        'outline-offset': '2px',
      },
      '.outline': { 'outline-style': 'solid' },
      '.outline-dashed': { 'outline-style': 'dashed' },
      '.outline-dotted': { 'outline-style': 'dotted' },
      '.outline-double': { 'outline-style': 'double' },
    })
  },

  outlineWidth: createUtilityPlugin('outlineWidth', [['outline', ['outline-width']]], {
    type: ['length', 'number', 'percentage'],
  }),

  outlineOffset: createUtilityPlugin('outlineOffset', [['outline-offset', ['outline-offset']]], {
    type: ['length', 'number', 'percentage', 'any'],
    supportsNegativeValues: true,
  }),

  outlineColor: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        outline: (value) => {
          return { 'outline-color': toColorValue(value) }
        },
      },
      { values: flattenColorPalette(theme('outlineColor')), type: ['color', 'any'] }
    )
  },

  ringWidth: ({ matchUtilities, addDefaults, addUtilities, theme, config }) => {
    let ringColorDefault = (() => {
      if (flagEnabled(config(), 'respectDefaultRingColorOpacity')) {
        return theme('ringColor.DEFAULT')
      }

      let ringOpacityDefault = theme('ringOpacity.DEFAULT', '0.5')

      if (!theme('ringColor')?.DEFAULT) {
        return `rgb(147 197 253 / ${ringOpacityDefault})`
      }

      return withAlphaValue(
        theme('ringColor')?.DEFAULT,
        ringOpacityDefault,
        `rgb(147 197 253 / ${ringOpacityDefault})`
      )
    })()

    addDefaults('ring-width', {
      '--tw-ring-inset': ' ',
      '--tw-ring-offset-width': theme('ringOffsetWidth.DEFAULT', '0px'),
      '--tw-ring-offset-color': theme('ringOffsetColor.DEFAULT', '#fff'),
      '--tw-ring-color': ringColorDefault,
      '--tw-ring-offset-shadow': '0 0 #0000',
      '--tw-ring-shadow': '0 0 #0000',
      '--tw-shadow': '0 0 #0000',
      '--tw-shadow-colored': '0 0 #0000',
    })

    matchUtilities(
      {
        ring: (value) => {
          return {
            '@defaults ring-width': {},
            '--tw-ring-offset-shadow': `var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)`,
            '--tw-ring-shadow': `var(--tw-ring-inset) 0 0 0 calc(${value} + var(--tw-ring-offset-width)) var(--tw-ring-color)`,
            'box-shadow': [
              `var(--tw-ring-offset-shadow)`,
              `var(--tw-ring-shadow)`,
              `var(--tw-shadow, 0 0 #0000)`,
            ].join(', '),
          }
        },
      },
      { values: theme('ringWidth'), type: 'length' }
    )

    addUtilities({
      '.ring-inset': { '@defaults ring-width': {}, '--tw-ring-inset': 'inset' },
    })
  },

  ringColor: ({ matchUtilities, theme, corePlugins }) => {
    matchUtilities(
      {
        ring: (value) => {
          if (!corePlugins('ringOpacity')) {
            return {
              '--tw-ring-color': toColorValue(value),
            }
          }

          return withAlphaVariable({
            color: value,
            property: '--tw-ring-color',
            variable: '--tw-ring-opacity',
          })
        },
      },
      {
        values: Object.fromEntries(
          Object.entries(flattenColorPalette(theme('ringColor'))).filter(
            ([modifier]) => modifier !== 'DEFAULT'
          )
        ),
        type: ['color', 'any'],
      }
    )
  },

  ringOpacity: (helpers) => {
    let { config } = helpers

    return createUtilityPlugin('ringOpacity', [['ring-opacity', ['--tw-ring-opacity']]], {
      filterDefault: !flagEnabled(config(), 'respectDefaultRingColorOpacity'),
    })(helpers)
  },
  ringOffsetWidth: createUtilityPlugin(
    'ringOffsetWidth',
    [['ring-offset', ['--tw-ring-offset-width']]],
    { type: 'length' }
  ),

  ringOffsetColor: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'ring-offset': (value) => {
          return {
            '--tw-ring-offset-color': toColorValue(value),
          }
        },
      },
      { values: flattenColorPalette(theme('ringOffsetColor')), type: ['color', 'any'] }
    )
  },

  blur: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        blur: (value) => {
          return {
            '--tw-blur': value.trim() === '' ? ' ' : `blur(${value})`,
            '@defaults filter': {},
            filter: cssFilterValue,
          }
        },
      },
      { values: theme('blur') }
    )
  },

  brightness: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        brightness: (value) => {
          return {
            '--tw-brightness': `brightness(${value})`,
            '@defaults filter': {},
            filter: cssFilterValue,
          }
        },
      },
      { values: theme('brightness') }
    )
  },

  contrast: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        contrast: (value) => {
          return {
            '--tw-contrast': `contrast(${value})`,
            '@defaults filter': {},
            filter: cssFilterValue,
          }
        },
      },
      { values: theme('contrast') }
    )
  },

  dropShadow: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'drop-shadow': (value) => {
          return {
            '--tw-drop-shadow': Array.isArray(value)
              ? value.map((v) => `drop-shadow(${v})`).join(' ')
              : `drop-shadow(${value})`,
            '@defaults filter': {},
            filter: cssFilterValue,
          }
        },
      },
      { values: theme('dropShadow') }
    )
  },

  grayscale: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        grayscale: (value) => {
          return {
            '--tw-grayscale': `grayscale(${value})`,
            '@defaults filter': {},
            filter: cssFilterValue,
          }
        },
      },
      { values: theme('grayscale') }
    )
  },

  hueRotate: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'hue-rotate': (value) => {
          return {
            '--tw-hue-rotate': `hue-rotate(${value})`,
            '@defaults filter': {},
            filter: cssFilterValue,
          }
        },
      },
      { values: theme('hueRotate'), supportsNegativeValues: true }
    )
  },

  invert: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        invert: (value) => {
          return {
            '--tw-invert': `invert(${value})`,
            '@defaults filter': {},
            filter: cssFilterValue,
          }
        },
      },
      { values: theme('invert') }
    )
  },

  saturate: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        saturate: (value) => {
          return {
            '--tw-saturate': `saturate(${value})`,
            '@defaults filter': {},
            filter: cssFilterValue,
          }
        },
      },
      { values: theme('saturate') }
    )
  },

  sepia: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        sepia: (value) => {
          return {
            '--tw-sepia': `sepia(${value})`,
            '@defaults filter': {},
            filter: cssFilterValue,
          }
        },
      },
      { values: theme('sepia') }
    )
  },

  filter: ({ addDefaults, addUtilities }) => {
    addDefaults('filter', {
      '--tw-blur': ' ',
      '--tw-brightness': ' ',
      '--tw-contrast': ' ',
      '--tw-grayscale': ' ',
      '--tw-hue-rotate': ' ',
      '--tw-invert': ' ',
      '--tw-saturate': ' ',
      '--tw-sepia': ' ',
      '--tw-drop-shadow': ' ',
    })
    addUtilities({
      '.filter': { '@defaults filter': {}, filter: cssFilterValue },
      '.filter-none': { filter: 'none' },
    })
  },

  backdropBlur: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'backdrop-blur': (value) => {
          return {
            '--tw-backdrop-blur': value.trim() === '' ? ' ' : `blur(${value})`,
            '@defaults backdrop-filter': {},
            '-webkit-backdrop-filter': cssBackdropFilterValue,
            'backdrop-filter': cssBackdropFilterValue,
          }
        },
      },
      { values: theme('backdropBlur') }
    )
  },

  backdropBrightness: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'backdrop-brightness': (value) => {
          return {
            '--tw-backdrop-brightness': `brightness(${value})`,
            '@defaults backdrop-filter': {},
            '-webkit-backdrop-filter': cssBackdropFilterValue,
            'backdrop-filter': cssBackdropFilterValue,
          }
        },
      },
      { values: theme('backdropBrightness') }
    )
  },

  backdropContrast: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'backdrop-contrast': (value) => {
          return {
            '--tw-backdrop-contrast': `contrast(${value})`,
            '@defaults backdrop-filter': {},
            '-webkit-backdrop-filter': cssBackdropFilterValue,
            'backdrop-filter': cssBackdropFilterValue,
          }
        },
      },
      { values: theme('backdropContrast') }
    )
  },

  backdropGrayscale: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'backdrop-grayscale': (value) => {
          return {
            '--tw-backdrop-grayscale': `grayscale(${value})`,
            '@defaults backdrop-filter': {},
            '-webkit-backdrop-filter': cssBackdropFilterValue,
            'backdrop-filter': cssBackdropFilterValue,
          }
        },
      },
      { values: theme('backdropGrayscale') }
    )
  },

  backdropHueRotate: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'backdrop-hue-rotate': (value) => {
          return {
            '--tw-backdrop-hue-rotate': `hue-rotate(${value})`,
            '@defaults backdrop-filter': {},
            '-webkit-backdrop-filter': cssBackdropFilterValue,
            'backdrop-filter': cssBackdropFilterValue,
          }
        },
      },
      { values: theme('backdropHueRotate'), supportsNegativeValues: true }
    )
  },

  backdropInvert: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'backdrop-invert': (value) => {
          return {
            '--tw-backdrop-invert': `invert(${value})`,
            '@defaults backdrop-filter': {},
            '-webkit-backdrop-filter': cssBackdropFilterValue,
            'backdrop-filter': cssBackdropFilterValue,
          }
        },
      },
      { values: theme('backdropInvert') }
    )
  },

  backdropOpacity: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'backdrop-opacity': (value) => {
          return {
            '--tw-backdrop-opacity': `opacity(${value})`,
            '@defaults backdrop-filter': {},
            '-webkit-backdrop-filter': cssBackdropFilterValue,
            'backdrop-filter': cssBackdropFilterValue,
          }
        },
      },
      { values: theme('backdropOpacity') }
    )
  },

  backdropSaturate: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'backdrop-saturate': (value) => {
          return {
            '--tw-backdrop-saturate': `saturate(${value})`,
            '@defaults backdrop-filter': {},
            '-webkit-backdrop-filter': cssBackdropFilterValue,
            'backdrop-filter': cssBackdropFilterValue,
          }
        },
      },
      { values: theme('backdropSaturate') }
    )
  },

  backdropSepia: ({ matchUtilities, theme }) => {
    matchUtilities(
      {
        'backdrop-sepia': (value) => {
          return {
            '--tw-backdrop-sepia': `sepia(${value})`,
            '@defaults backdrop-filter': {},
            '-webkit-backdrop-filter': cssBackdropFilterValue,
            'backdrop-filter': cssBackdropFilterValue,
          }
        },
      },
      { values: theme('backdropSepia') }
    )
  },

  backdropFilter: ({ addDefaults, addUtilities }) => {
    addDefaults('backdrop-filter', {
      '--tw-backdrop-blur': ' ',
      '--tw-backdrop-brightness': ' ',
      '--tw-backdrop-contrast': ' ',
      '--tw-backdrop-grayscale': ' ',
      '--tw-backdrop-hue-rotate': ' ',
      '--tw-backdrop-invert': ' ',
      '--tw-backdrop-opacity': ' ',
      '--tw-backdrop-saturate': ' ',
      '--tw-backdrop-sepia': ' ',
    })
    addUtilities({
      '.backdrop-filter': {
        '@defaults backdrop-filter': {},
        '-webkit-backdrop-filter': cssBackdropFilterValue,
        'backdrop-filter': cssBackdropFilterValue,
      },
      '.backdrop-filter-none': {
        '-webkit-backdrop-filter': 'none',
        'backdrop-filter': 'none',
      },
    })
  },

  transitionProperty: ({ matchUtilities, theme }) => {
    let defaultTimingFunction = theme('transitionTimingFunction.DEFAULT')
    let defaultDuration = theme('transitionDuration.DEFAULT')

    matchUtilities(
      {
        transition: (value) => {
          return {
            'transition-property': value,
            ...(value === 'none'
              ? {}
              : {
                  'transition-timing-function': defaultTimingFunction,
                  'transition-duration': defaultDuration,
                }),
          }
        },
      },
      { values: theme('transitionProperty') }
    )
  },

  transitionDelay: createUtilityPlugin('transitionDelay', [['delay', ['transitionDelay']]]),
  transitionDuration: createUtilityPlugin(
    'transitionDuration',
    [['duration', ['transitionDuration']]],
    { filterDefault: true }
  ),
  transitionTimingFunction: createUtilityPlugin(
    'transitionTimingFunction',
    [['ease', ['transitionTimingFunction']]],
    { filterDefault: true }
  ),
  willChange: createUtilityPlugin('willChange', [['will-change', ['will-change']]]),
  contain: ({ addDefaults, addUtilities }) => {
    let cssContainValue =
      'var(--tw-contain-size) var(--tw-contain-layout) var(--tw-contain-paint) var(--tw-contain-style)'

    addDefaults('contain', {
      '--tw-contain-size': ' ',
      '--tw-contain-layout': ' ',
      '--tw-contain-paint': ' ',
      '--tw-contain-style': ' ',
    })

    addUtilities({
      '.contain-none': { contain: 'none' },
      '.contain-content': { contain: 'content' },
      '.contain-strict': { contain: 'strict' },
      '.contain-size': {
        '@defaults contain': {},
        '--tw-contain-size': 'size',
        contain: cssContainValue,
      },
      '.contain-inline-size': {
        '@defaults contain': {},
        '--tw-contain-size': 'inline-size',
        contain: cssContainValue,
      },
      '.contain-layout': {
        '@defaults contain': {},
        '--tw-contain-layout': 'layout',
        contain: cssContainValue,
      },
      '.contain-paint': {
        '@defaults contain': {},
        '--tw-contain-paint': 'paint',
        contain: cssContainValue,
      },
      '.contain-style': {
        '@defaults contain': {},
        '--tw-contain-style': 'style',
        contain: cssContainValue,
      },
    })
  },
  content: createUtilityPlugin('content', [
    ['content', ['--tw-content', ['content', 'var(--tw-content)']]],
  ]),
  forcedColorAdjust: ({ addUtilities }) => {
    addUtilities({
      '.forced-color-adjust-auto': { 'forced-color-adjust': 'auto' },
      '.forced-color-adjust-none': { 'forced-color-adjust': 'none' },
    })
  },
}
