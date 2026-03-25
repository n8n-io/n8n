options = require('../lib/dreamopt') [
  "  -f, --from DATE  Only process records from the given date #date"
], {
  date: (value, options, optionName) ->
    if isNaN(new Date(value))
      throw new Error("Invalid date for option #{optionName}")
    new Date(value)
}

console.log "Year: " + options.from?.getFullYear()
