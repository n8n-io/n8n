#!/usr/bin/env node
import { createReadStream, createWriteStream, readFileSync, renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pipeline as pipelineCallback } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { jsonrepairTransform } from '../lib/esm/stream.js'

const pipeline = promisify(pipelineCallback)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function processArgs(args) {
  const options = {
    version: false,
    help: false,
    overwrite: false,
    bufferSize: undefined,
    inputFile: null,
    outputFile: null
  }

  // we skip the first two args, since they contain node and the script path
  let i = 2
  while (i < args.length) {
    const arg = args[i]

    switch (arg) {
      case '-v':
      case '--version':
        options.version = true
        break

      case '-h':
      case '--help':
        options.help = true
        break

      case '--overwrite':
        options.overwrite = true
        break

      case '--buffer':
        i++
        options.bufferSize = parseSize(args[i])
        break

      case '-o':
      case '--output':
        i++
        options.outputFile = args[i]
        break

      default:
        if (options.inputFile == null) {
          options.inputFile = arg
        } else {
          throw new Error(`Unexpected argument "${arg}"`)
        }
    }

    i++
  }

  return options
}

async function run(options) {
  if (options.version) {
    outputVersion()
    return
  }

  if (options.help) {
    outputHelp()
    return
  }

  if (options.overwrite) {
    if (!options.inputFile) {
      console.error('Error: cannot use --overwrite: no input file provided')
      process.exit(1)
    }
    if (options.outputFile) {
      console.error('Error: cannot use --overwrite: there is also an --output provided')
      process.exit(1)
    }

    const dateStr = new Date().toISOString().replace(/\W/g, '-')
    const tempFileSuffix = `.repair-${dateStr}.json`
    const tempFile = options.inputFile + tempFileSuffix

    try {
      const readStream = createReadStream(options.inputFile)
      const writeStream = createWriteStream(tempFile)
      await pipeline(
        readStream,
        jsonrepairTransform({ bufferSize: options.bufferSize }),
        writeStream
      )
      renameSync(tempFile, options.inputFile)
    } catch (err) {
      process.stderr.write(err.toString())
      process.exit(1)
    }

    return
  }

  try {
    const readStream = options.inputFile ? createReadStream(options.inputFile) : process.stdin
    const writeStream = options.outputFile ? createWriteStream(options.outputFile) : process.stdout
    await pipeline(readStream, jsonrepairTransform({ bufferSize: options.bufferSize }), writeStream)
  } catch (err) {
    process.stderr.write(err.toString())
    process.exit(1)
  }
}

function outputVersion() {
  const file = join(__dirname, '../package.json')
  const pkg = JSON.parse(String(readFileSync(file, 'utf-8')))

  console.log(pkg.version)
}

function parseSize(size) {
  // match
  const match = size.match(/^(\d+)([KMG]?)$/)
  if (!match) {
    throw new Error(`Buffer size "${size}" not recognized. Examples: 65536, 512K, 2M`)
  }

  const num = Number.parseInt(match[1], 10)
  const suffix = match[2] // K, M, or G

  switch (suffix) {
    case 'K':
      return num * 1024
    case 'M':
      return num * 1024 * 1024
    case 'G':
      return num * 1024 * 1024 * 1024
    default:
      return num
  }
}

const help = `
jsonrepair
https://github.com/josdejong/jsonrepair

Repair invalid JSON documents. When a document could not be repaired, the output will be left unchanged.

Usage:
    jsonrepair [filename] {OPTIONS}

Options:
    --version, -v       Show application version
    --help,    -h       Show this message
    --output,  -o       Output file
    --overwrite         Overwrite the input file
    --buffer            Buffer size in bytes, for example 64K (default) or 1M

Example usage:
    jsonrepair broken.json                        # Repair a file, output to console
    jsonrepair broken.json > repaired.json        # Repair a file, output to file
    jsonrepair broken.json --output repaired.json # Repair a file, output to file
    jsonrepair broken.json --overwrite            # Repair a file, replace the file itself
    cat broken.json | jsonrepair                  # Repair data from an input stream
    cat broken.json | jsonrepair > repaired.json  # Repair data from an input stream, output to file
`

function outputHelp() {
  console.log(help)
}

const options = processArgs(process.argv)
await run(options)
