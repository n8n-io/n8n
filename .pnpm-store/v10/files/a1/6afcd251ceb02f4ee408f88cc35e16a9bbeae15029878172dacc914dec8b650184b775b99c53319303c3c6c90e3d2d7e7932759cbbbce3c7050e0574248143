let matchingBrackets = new Map([
  ['{', '}'],
  ['[', ']'],
  ['(', ')'],
])
let inverseMatchingBrackets = new Map(
  Array.from(matchingBrackets.entries()).map(([k, v]) => [v, k])
)

let quotes = new Set(['"', "'", '`'])

// Arbitrary values must contain balanced brackets (), [] and {}. Escaped
// values don't count, and brackets inside quotes also don't count.
//
// E.g.: w-[this-is]w-[weird-and-invalid]
// E.g.: w-[this-is\\]w-\\[weird-but-valid]
// E.g.: content-['this-is-also-valid]-weirdly-enough']
export default function isSyntacticallyValidPropertyValue(value) {
  let stack = []
  let inQuotes = false

  for (let i = 0; i < value.length; i++) {
    let char = value[i]

    if (char === ':' && !inQuotes && stack.length === 0) {
      return false
    }

    // Non-escaped quotes allow us to "allow" anything in between
    if (quotes.has(char) && value[i - 1] !== '\\') {
      inQuotes = !inQuotes
    }

    if (inQuotes) continue
    if (value[i - 1] === '\\') continue // Escaped

    if (matchingBrackets.has(char)) {
      stack.push(char)
    } else if (inverseMatchingBrackets.has(char)) {
      let inverse = inverseMatchingBrackets.get(char)

      // Nothing to pop from, therefore it is unbalanced
      if (stack.length <= 0) {
        return false
      }

      // Popped value must match the inverse value, otherwise it is unbalanced
      if (stack.pop() !== inverse) {
        return false
      }
    }
  }

  // If there is still something on the stack, it is also unbalanced
  if (stack.length > 0) {
    return false
  }

  // All good, totally balanced!
  return true
}
