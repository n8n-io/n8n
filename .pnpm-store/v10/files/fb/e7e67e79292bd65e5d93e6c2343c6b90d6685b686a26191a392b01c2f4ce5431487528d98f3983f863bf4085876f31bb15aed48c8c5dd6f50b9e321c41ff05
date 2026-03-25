import { parseColor } from './color'
import { parseBoxShadowValue } from './parseBoxShadowValue'
import { splitAtTopLevelOnly } from './splitAtTopLevelOnly'

let cssFunctions = ['min', 'max', 'clamp', 'calc']

// Ref: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Types

function isCSSFunction(value) {
  return cssFunctions.some((fn) => new RegExp(`^${fn}\\(.*\\)`).test(value))
}

// These properties accept a `<dashed-ident>` as one of the values. This means that you can use them
// as: `timeline-scope: --tl;`
//
// Without the `var(--tl)`, in these cases we don't want to normalize the value, and you should add
// the `var()` yourself.
//
// More info:
// - https://drafts.csswg.org/scroll-animations/#propdef-timeline-scope
// - https://developer.mozilla.org/en-US/docs/Web/CSS/timeline-scope#dashed-ident
//
const AUTO_VAR_INJECTION_EXCEPTIONS = new Set([
  // Concrete properties
  'scroll-timeline-name',
  'timeline-scope',
  'view-timeline-name',
  'font-palette',

  // Shorthand properties
  'scroll-timeline',
  'animation-timeline',
  'view-timeline',
])

// This is not a data type, but rather a function that can normalize the
// correct values.
export function normalize(value, context = null, isRoot = true) {
  let isVarException = context && AUTO_VAR_INJECTION_EXCEPTIONS.has(context.property)
  if (value.startsWith('--') && !isVarException) {
    return `var(${value})`
  }

  // Keep raw strings if it starts with `url(`
  if (value.includes('url(')) {
    return value
      .split(/(url\(.*?\))/g)
      .filter(Boolean)
      .map((part) => {
        if (/^url\(.*?\)$/.test(part)) {
          return part
        }

        return normalize(part, context, false)
      })
      .join('')
  }

  // Convert `_` to ` `, except for escaped underscores `\_`
  value = value
    .replace(
      /([^\\])_+/g,
      (fullMatch, characterBefore) => characterBefore + ' '.repeat(fullMatch.length - 1)
    )
    .replace(/^_/g, ' ')
    .replace(/\\_/g, '_')

  // Remove leftover whitespace
  if (isRoot) {
    value = value.trim()
  }

  value = normalizeMathOperatorSpacing(value)

  return value
}

/**
 * Add spaces around operators inside math functions
 * like calc() that do not follow an operator, '(', or `,`.
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeMathOperatorSpacing(value) {
  let preventFormattingInFunctions = ['theme']
  let preventFormattingKeywords = [
    'min-content',
    'max-content',
    'fit-content',

    // Env
    'safe-area-inset-top',
    'safe-area-inset-right',
    'safe-area-inset-bottom',
    'safe-area-inset-left',

    'titlebar-area-x',
    'titlebar-area-y',
    'titlebar-area-width',
    'titlebar-area-height',

    'keyboard-inset-top',
    'keyboard-inset-right',
    'keyboard-inset-bottom',
    'keyboard-inset-left',
    'keyboard-inset-width',
    'keyboard-inset-height',

    'radial-gradient',
    'linear-gradient',
    'conic-gradient',
    'repeating-radial-gradient',
    'repeating-linear-gradient',
    'repeating-conic-gradient',
  ]

  return value.replace(/(calc|min|max|clamp)\(.+\)/g, (match) => {
    let result = ''

    function lastChar() {
      let char = result.trimEnd()
      return char[char.length - 1]
    }

    for (let i = 0; i < match.length; i++) {
      function peek(word) {
        return word.split('').every((char, j) => match[i + j] === char)
      }

      function consumeUntil(chars) {
        let minIndex = Infinity
        for (let char of chars) {
          let index = match.indexOf(char, i)
          if (index !== -1 && index < minIndex) {
            minIndex = index
          }
        }

        let result = match.slice(i, minIndex)
        i += result.length - 1
        return result
      }

      let char = match[i]

      // Handle `var(--variable)`
      if (peek('var')) {
        // When we consume until `)`, then we are dealing with this scenario:
        //   `var(--example)`
        //
        // When we consume until `,`, then we are dealing with this scenario:
        //   `var(--example, 1rem)`
        //
        //   In this case we do want to "format", the default value as well
        result += consumeUntil([')', ','])
      }

      // Skip formatting of known keywords
      else if (preventFormattingKeywords.some((keyword) => peek(keyword))) {
        let keyword = preventFormattingKeywords.find((keyword) => peek(keyword))
        result += keyword
        i += keyword.length - 1
      }

      // Skip formatting inside known functions
      else if (preventFormattingInFunctions.some((fn) => peek(fn))) {
        result += consumeUntil([')'])
      }

      // Don't break CSS grid track names
      else if (peek('[')) {
        result += consumeUntil([']'])
      }

      // Handle operators
      else if (
        ['+', '-', '*', '/'].includes(char) &&
        !['(', '+', '-', '*', '/', ','].includes(lastChar())
      ) {
        result += ` ${char} `
      } else {
        result += char
      }
    }

    // Simplify multiple spaces
    return result.replace(/\s+/g, ' ')
  })
}

export function url(value) {
  return value.startsWith('url(')
}

export function number(value) {
  return !isNaN(Number(value)) || isCSSFunction(value)
}

export function percentage(value) {
  return (value.endsWith('%') && number(value.slice(0, -1))) || isCSSFunction(value)
}

// Please refer to MDN when updating this list:
// https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units
// https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries#container_query_length_units
let lengthUnits = [
  'cm',
  'mm',
  'Q',
  'in',
  'pc',
  'pt',
  'px',
  'em',
  'ex',
  'ch',
  'rem',
  'lh',
  'rlh',
  'vw',
  'vh',
  'vmin',
  'vmax',
  'vb',
  'vi',
  'svw',
  'svh',
  'lvw',
  'lvh',
  'dvw',
  'dvh',
  'cqw',
  'cqh',
  'cqi',
  'cqb',
  'cqmin',
  'cqmax',
]
let lengthUnitsPattern = `(?:${lengthUnits.join('|')})`
export function length(value) {
  return (
    value === '0' ||
    new RegExp(`^[+-]?[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?${lengthUnitsPattern}$`).test(value) ||
    isCSSFunction(value)
  )
}

let lineWidths = new Set(['thin', 'medium', 'thick'])
export function lineWidth(value) {
  return lineWidths.has(value)
}

export function shadow(value) {
  let parsedShadows = parseBoxShadowValue(normalize(value))

  for (let parsedShadow of parsedShadows) {
    if (!parsedShadow.valid) {
      return false
    }
  }

  return true
}

export function color(value) {
  let colors = 0

  let result = splitAtTopLevelOnly(value, '_').every((part) => {
    part = normalize(part)

    if (part.startsWith('var(')) return true
    if (parseColor(part, { loose: true }) !== null) return colors++, true

    return false
  })

  if (!result) return false
  return colors > 0
}

export function image(value) {
  let images = 0
  let result = splitAtTopLevelOnly(value, ',').every((part) => {
    part = normalize(part)

    if (part.startsWith('var(')) return true
    if (
      url(part) ||
      gradient(part) ||
      ['element(', 'image(', 'cross-fade(', 'image-set('].some((fn) => part.startsWith(fn))
    ) {
      images++
      return true
    }

    return false
  })

  if (!result) return false
  return images > 0
}

let gradientTypes = new Set([
  'conic-gradient',
  'linear-gradient',
  'radial-gradient',
  'repeating-conic-gradient',
  'repeating-linear-gradient',
  'repeating-radial-gradient',
])
export function gradient(value) {
  value = normalize(value)

  for (let type of gradientTypes) {
    if (value.startsWith(`${type}(`)) {
      return true
    }
  }
  return false
}

let validPositions = new Set(['center', 'top', 'right', 'bottom', 'left'])
export function position(value) {
  let positions = 0
  let result = splitAtTopLevelOnly(value, '_').every((part) => {
    part = normalize(part)

    if (part.startsWith('var(')) return true
    if (validPositions.has(part) || length(part) || percentage(part)) {
      positions++
      return true
    }

    return false
  })

  if (!result) return false
  return positions > 0
}

export function familyName(value) {
  let fonts = 0
  let result = splitAtTopLevelOnly(value, ',').every((part) => {
    part = normalize(part)

    if (part.startsWith('var(')) return true

    // If it contains spaces, then it should be quoted
    if (part.includes(' ')) {
      if (!/(['"])([^"']+)\1/g.test(part)) {
        return false
      }
    }

    // If it starts with a number, it's invalid
    if (/^\d/g.test(part)) {
      return false
    }

    fonts++

    return true
  })

  if (!result) return false
  return fonts > 0
}

let genericNames = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
])
export function genericName(value) {
  return genericNames.has(value)
}

let absoluteSizes = new Set([
  'xx-small',
  'x-small',
  'small',
  'medium',
  'large',
  'x-large',
  'xx-large',
  'xxx-large',
])
export function absoluteSize(value) {
  return absoluteSizes.has(value)
}

let relativeSizes = new Set(['larger', 'smaller'])
export function relativeSize(value) {
  return relativeSizes.has(value)
}
