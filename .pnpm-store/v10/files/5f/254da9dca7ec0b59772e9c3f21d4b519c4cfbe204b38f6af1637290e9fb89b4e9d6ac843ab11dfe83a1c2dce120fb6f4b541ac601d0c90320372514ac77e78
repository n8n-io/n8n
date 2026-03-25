// historical dotenv.parse - https://github.com/motdotla/dotenv)
const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg

function dotenvParse (src, skipExpandForDoubleQuotes = false, skipConvertingWindowsNewlines = false, collectAllValues = false) {
  const obj = {}

  // Convert buffer to string
  let lines = src.toString()

  // Convert line breaks to same format
  if (!skipConvertingWindowsNewlines) {
    lines = lines.replace(/\r\n?/mg, '\n')
  }

  let match
  while ((match = LINE.exec(lines)) != null) {
    const key = match[1]

    // Default undefined or null to empty string
    let value = (match[2] || '')

    // Remove whitespace
    value = value.trim()

    // Check if double quoted
    const maybeQuote = value[0]

    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2')

    // Expand newlines if double quoted
    if (maybeQuote === '"' && !skipExpandForDoubleQuotes) {
      value = value.replace(/\\n/g, '\n') // newline
      value = value.replace(/\\r/g, '\r') // carriage return
      value = value.replace(/\\t/g, '\t') // tabs
    }

    if (collectAllValues) {
      // handle scenario where user mistakenly includes plaintext duplicate in .env:
      //
      // # .env
      // HELLO="World"
      // HELLO="encrypted:1234"
      obj[key] = obj[key] || []
      obj[key].push(value)
    } else {
      // Add to object
      obj[key] = value
    }
  }

  return obj
}

module.exports = dotenvParse
