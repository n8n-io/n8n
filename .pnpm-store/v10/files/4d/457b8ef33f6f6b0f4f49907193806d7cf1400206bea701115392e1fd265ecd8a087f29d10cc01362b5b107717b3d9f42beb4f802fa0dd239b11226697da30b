const decryptKeyValue = require('./decryptKeyValue')
const evalKeyValue = require('./evalKeyValue')
const resolveEscapeSequences = require('./resolveEscapeSequences')

class Parse {
  static LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg

  constructor (src, privateKey = null, processEnv = process.env, overload = false, privateKeyName = null) {
    this.src = src
    this.privateKey = privateKey
    this.privateKeyName = privateKeyName
    this.processEnv = processEnv
    this.overload = overload

    this.parsed = {}
    this.preExisted = {}
    this.injected = {}
    this.errors = []

    // for use with progressive expansion
    this.runningParsed = {}
    // for use with stopping expansion for literals
    this.literals = {}
  }

  run () {
    const lines = this.getLines()

    let match
    while ((match = Parse.LINE.exec(lines)) !== null) {
      const key = match[1]
      const value = match[2]
      const quote = this.quote(value) // must be raw match
      this.parsed[key] = this.clean(value, quote) // file value

      if (!this.overload && this.inProcessEnv(key)) {
        this.parsed[key] = this.processEnv[key] // use process.env pre-existing value
      }

      // decrypt
      try {
        this.parsed[key] = this.decrypt(key, this.parsed[key])
      } catch (e) {
        this.errors.push(e)
      }

      // eval empty, double, or backticks
      let evaled = false
      if (quote !== "'" && (!this.inProcessEnv(key) || this.processEnv[key] === this.parsed[key])) {
        const priorEvaled = this.parsed[key]
        // eval
        try {
          this.parsed[key] = this.eval(key, priorEvaled)
        } catch (e) {
          this.errors.push(e)
        }
        if (priorEvaled !== this.parsed[key]) {
          evaled = true
        }
      }

      // expand empty, double, or backticks
      if (!evaled && quote !== "'" && (!this.processEnv[key] || this.overload)) {
        this.parsed[key] = resolveEscapeSequences(this.expand(this.parsed[key]))
      }

      if (quote === "'") {
        this.literals[key] = this.parsed[key]
      }

      // for use with progressive expansion
      this.runningParsed[key] = this.parsed[key]

      if (Object.prototype.hasOwnProperty.call(this.processEnv, key) && !this.overload) {
        this.preExisted[key] = this.processEnv[key] // track preExisted
      } else {
        this.injected[key] = this.parsed[key] // track injected
      }
    }

    return {
      parsed: this.parsed,
      processEnv: this.processEnv,
      injected: this.injected,
      preExisted: this.preExisted,
      errors: this.errors
    }
  }

  trimmer (value) {
    // Default undefined or null to empty string
    return (value || '').trim()
  }

  quote (value) {
    const v = this.trimmer(value)
    const maybeQuote = v[0]
    let q = ''
    switch (maybeQuote) {
      // single
      case "'":
        q = "'"
        break
      // double
      case '"':
        q = '"'
        break
      // backtick
      case '`':
        q = '`'
        break
      // empty
      default:
        q = ''
    }

    return q
  }

  clean (value, _quote) {
    let v = this.trimmer(value)

    // Remove surrounding quotes
    v = v.replace(/^(['"`])([\s\S]*)\1$/mg, '$2')

    // Expand newlines if double quoted
    if (_quote === '"') {
      v = v.replace(/\\n/g, '\n') // newline
      v = v.replace(/\\r/g, '\r') // carriage return
      v = v.replace(/\\t/g, '\t') // tabs
    }

    return v
  }

  decrypt (key, value) {
    return decryptKeyValue(key, value, this.privateKeyName, this.privateKey)
  }

  eval (key, value) {
    return evalKeyValue(key, value, this.processEnv, this.runningParsed)
  }

  expand (value) {
    let env = { ...this.runningParsed, ...this.processEnv } // typically process.env wins
    if (this.overload) {
      env = { ...this.processEnv, ...this.runningParsed } // parsed wins
    }

    const regex = /(?<!\\)\${([^{}]+)}|(?<!\\)\$([A-Za-z_][A-Za-z0-9_]*)/g

    let result = value
    let match

    while ((match = regex.exec(result)) !== null) {
      const [template, bracedExpression, unbracedExpression] = match
      const expression = bracedExpression || unbracedExpression

      // match the operators `:+`, `+`, `:-`, and `-`
      const opRegex = /(:\+|\+|:-|-)/
      // find first match
      const opMatch = expression.match(opRegex)
      const splitter = opMatch ? opMatch[0] : null

      const r = expression.split(splitter)

      let defaultValue
      let value
      const key = r.shift()

      if ([':+', '+'].includes(splitter)) {
        defaultValue = env[key] ? r.join(splitter) : ''
        value = null
      } else {
        defaultValue = r.join(splitter)
        value = env[key]
      }

      if (value) {
        result = result.replace(template, value)
      } else {
        result = result.replace(template, defaultValue)
      }

      // if the result equaled what was in env then stop expanding - handle self-referential check as well
      if (result === env[key]) {
        break
      }

      // if the result came from what was a literal value then stop expanding
      // BUT only if the literal value contains expansion patterns (${...} or $VAR)
      if (this.literals[key] && /\$\{[^}]+\}|\$[A-Za-z_][A-Za-z0-9_]*/.test(this.literals[key])) {
        break
      }

      regex.lastIndex = 0 // reset regex search position to re-evaluate after each replacement
    }

    return result
  }

  inProcessEnv (key) {
    return Object.prototype.hasOwnProperty.call(this.processEnv, key)
  }

  getLines () {
    return (this.src || '').toString().replace(/\r\n?/mg, '\n') // Convert buffer to string and Convert line breaks to same format
  }
}

module.exports = Parse
