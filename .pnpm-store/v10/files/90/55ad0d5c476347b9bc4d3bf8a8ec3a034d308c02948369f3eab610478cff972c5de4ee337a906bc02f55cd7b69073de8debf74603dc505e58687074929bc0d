const fs = require('fs')
const tty = require('tty')

const { diff } = require('./index')
const { colorize } = require('./colorize')

module.exports = function (argv) {
  const options = require('dreamopt')(
    [
      'Usage: json-diff [-vCjfoxnskKp] first.json second.json',
      '  <first.json>              Old file #var(file1) #required',
      '  <second.json>             New file #var(file2) #required',
      'General options:',
      '  -v, --verbose           Output progress info',
      '  -C, --[no-]color        Colored output',
      '  -j, --raw-json          Display raw JSON encoding of the diff #var(raw)',
      '  -f, --full              Include the equal sections of the document, not just the deltas #var(full)',
      '  --max-elisions COUNT    Max number of ...\'s to show in a row in "deltas" mode (before collapsing them) #var(maxElisions)',
      '  -o, --output-keys KEYS  Always print this comma separated keys, with their value, if they are part of an object with any diff #var(outputKeys)',
      '  -x, --exclude-keys KEYS  Exclude these comma separated keys from comparison on both files #var(excludeKeys)',
      '  -n, --output-new-only   Output only the updated and new key/value pairs (without marking them as such). If you need only the diffs from the old file, just exchange the first and second json. #var(outputNewOnly)',
      '  -s, --sort              Sort primitive values in arrays before comparing #var(sort)',
      '  -k, --keys-only         Compare only the keys, ignore the differences in values #var(keysOnly)',
      '  -K, --keep-unchanged-values  Instead of omitting values that are equal, output them as they are #var(keepUnchangedValues)',
      '  -p, --precision DECIMALS  Round all floating point numbers to this number of decimal places prior to comparison'
    ],
    argv
  )

  options.outputKeys = options.outputKeys ? options.outputKeys.split(',') : []
  options.excludeKeys = options.excludeKeys ? options.excludeKeys.split(',') : []

  if (options.verbose) {
    process.stderr.write(`${JSON.stringify(options, null, 2)}\n`)
  }

  if (options.verbose) {
    process.stderr.write('Loading files...\n')
  }
  const data1 = fs.readFileSync(options.file1, 'utf8')
  const data2 = fs.readFileSync(options.file2, 'utf8')

  if (options.verbose) {
    process.stderr.write('Parsing old file...\n')
  }
  const json1 = JSON.parse(data1)

  if (options.verbose) {
    process.stderr.write('Parsing new file...\n')
  }
  const json2 = JSON.parse(data2)

  if (options.verbose) {
    process.stderr.write('Running diff...\n')
  }

  const result = diff(json1, json2, options)

  if (options.color == null) {
    options.color = tty.isatty(process.stdout.fd)
  }

  if (result) {
    if (options.raw) {
      if (options.verbose) {
        process.stderr.write('Serializing JSON output...\n')
      }
      process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    } else {
      if (options.verbose) {
        process.stderr.write('Producing colored output...\n')
      }
      const colorizeOptions = {
        color: options.color,
        maxElisions: options.maxElisions
      }
      process.stdout.write(colorize(result, colorizeOptions))
    }
    process.exit(1)
  } else {
    if (options.verbose) {
      process.stderr.write('No diff')
    }
    process.exit(0)
  }
}
