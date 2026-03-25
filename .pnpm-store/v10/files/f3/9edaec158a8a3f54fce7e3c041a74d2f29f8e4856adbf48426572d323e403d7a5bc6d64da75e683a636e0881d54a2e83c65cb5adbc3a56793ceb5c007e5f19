// @flow
import defaultSymbolMap from './presets/defaultSymbols'
import PolishedError from '../internalHelpers/_errors'

const unitRegExp = /((?!\w)a|na|hc|mc|dg|me[r]?|xe|ni(?![a-zA-Z])|mm|cp|tp|xp|q(?!s)|hv|xamv|nimv|wv|sm|s(?!\D|$)|ged|darg?|nrut)/g

// Merges additional math functionality into the defaults.
function mergeSymbolMaps(additionalSymbols?: Object): Object {
  const symbolMap = {}
  symbolMap.symbols = additionalSymbols
    ? { ...defaultSymbolMap.symbols, ...additionalSymbols.symbols }
    : { ...defaultSymbolMap.symbols }

  return symbolMap
}

function exec(operators: Array<any>, values: Array<number>): Array<number | string> {
  const op = operators.pop()
  values.push(op.f(...[].concat(...values.splice(-op.argCount))))
  return op.precedence
}

function calculate(expression: string, additionalSymbols?: Object): number {
  const symbolMap = mergeSymbolMaps(additionalSymbols)

  let match
  const operators = [symbolMap.symbols['('].prefix]
  const values = []

  const pattern = new RegExp( // Pattern for numbers
    `\\d+(?:\\.\\d+)?|${
      // ...and patterns for individual operators/function names
      Object.keys(symbolMap.symbols)
        .map(key => symbolMap.symbols[key])
        // longer symbols should be listed first
        // $FlowFixMe
        .sort((a, b) => b.symbol.length - a.symbol.length)
        // $FlowFixMe
        .map(val => val.regSymbol)
        .join('|')
    }|(\\S)`,
    'g',
  )
  pattern.lastIndex = 0 // Reset regular expression object

  let afterValue = false

  do {
    match = pattern.exec(expression)

    const [token, bad] = match || [')', undefined]
    const notNumber = symbolMap.symbols[token]
    const notNewValue = notNumber && !notNumber.prefix && !notNumber.func
    const notAfterValue = !notNumber || (!notNumber.postfix && !notNumber.infix)

    // Check for syntax errors:
    if (bad || (afterValue ? notAfterValue : notNewValue)) {
      throw new PolishedError(37, match ? match.index : expression.length, expression)
    }

    if (afterValue) {
      // We either have an infix or postfix operator (they should be mutually exclusive)
      const curr = notNumber.postfix || notNumber.infix
      do {
        const prev = operators[operators.length - 1]
        if ((curr.precedence - prev.precedence || prev.rightToLeft) > 0) break
        // Apply previous operator, since it has precedence over current one
      } while (exec(operators, values)) // Exit loop after executing an opening parenthesis or function
      afterValue = curr.notation === 'postfix'
      if (curr.symbol !== ')') {
        operators.push(curr)
        // Postfix always has precedence over any operator that follows after it
        if (afterValue) exec(operators, values)
      }
    } else if (notNumber) {
      // prefix operator or function
      operators.push(notNumber.prefix || notNumber.func)
      if (notNumber.func) {
        // Require an opening parenthesis
        match = pattern.exec(expression)
        if (!match || match[0] !== '(') {
          throw new PolishedError(38, match ? match.index : expression.length, expression)
        }
      }
    } else {
      // number
      values.push(+token)
      afterValue = true
    }
  } while (match && operators.length)

  if (operators.length) {
    throw new PolishedError(39, match ? match.index : expression.length, expression)
  } else if (match) {
    throw new PolishedError(40, match ? match.index : expression.length, expression)
  } else {
    return values.pop()
  }
}

function reverseString(str: string): string {
  return str.split('').reverse().join('')
}

/**
 * Helper for doing math with CSS Units. Accepts a formula as a string. All values in the formula must have the same unit (or be unitless). Supports complex formulas utliziing addition, subtraction, multiplication, division, square root, powers, factorial, min, max, as well as parentheses for order of operation.
 *
 *In cases where you need to do calculations with mixed units where one unit is a [relative length unit](https://developer.mozilla.org/en-US/docs/Web/CSS/length#Relative_length_units), you will want to use [CSS Calc](https://developer.mozilla.org/en-US/docs/Web/CSS/calc).
 *
 * *warning* While we've done everything possible to ensure math safely evalutes formulas expressed as strings, you should always use extreme caution when passing `math` user provided values.
 * @example
 * // Styles as object usage
 * const styles = {
 *   fontSize: math('12rem + 8rem'),
 *   fontSize: math('(12px + 2px) * 3'),
 *   fontSize: math('3px^2 + sqrt(4)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   fontSize: ${math('12rem + 8rem')};
 *   fontSize: ${math('(12px + 2px) * 3')};
 *   fontSize: ${math('3px^2 + sqrt(4)')};
 * `
 *
 * // CSS as JS Output
 *
 * div: {
 *   fontSize: '20rem',
 *   fontSize: '42px',
 *   fontSize: '11px',
 * }
 */
export default function math(formula: string, additionalSymbols?: Object): string {
  const reversedFormula = reverseString(formula)
  const formulaMatch = reversedFormula.match(unitRegExp)

  // Check that all units are the same
  if (formulaMatch && !formulaMatch.every(unit => unit === formulaMatch[0])) {
    throw new PolishedError(41)
  }

  const cleanFormula = reverseString(reversedFormula.replace(unitRegExp, ''))
  return `${calculate(cleanFormula, additionalSymbols)}${
    formulaMatch ? reverseString(formulaMatch[0]) : ''
  }`
}
