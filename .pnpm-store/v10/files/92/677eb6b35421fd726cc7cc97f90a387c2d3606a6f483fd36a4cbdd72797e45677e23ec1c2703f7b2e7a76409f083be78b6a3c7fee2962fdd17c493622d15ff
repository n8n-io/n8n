// @ts-check

import fs from 'fs'
import path from 'path'
import { resolveDefaultConfigPath } from '../../util/resolveConfigPath.js'
import { createProcessor } from './plugin.js'

export async function build(args) {
  let input = args['--input']
  let shouldWatch = args['--watch']

  // TODO: Deprecate this in future versions
  if (!input && args['_'][1]) {
    console.error('[deprecation] Running tailwindcss without -i, please provide an input file.')
    input = args['--input'] = args['_'][1]
  }

  if (input && input !== '-' && !fs.existsSync((input = path.resolve(input)))) {
    console.error(`Specified input file ${args['--input']} does not exist.`)
    process.exit(9)
  }

  if (args['--config'] && !fs.existsSync((args['--config'] = path.resolve(args['--config'])))) {
    console.error(`Specified config file ${args['--config']} does not exist.`)
    process.exit(9)
  }

  // TODO: Reference the @config path here if exists
  let configPath = args['--config'] ? args['--config'] : resolveDefaultConfigPath()

  let processor = await createProcessor(args, configPath)

  if (shouldWatch) {
    // Abort the watcher if stdin is closed to avoid zombie processes
    // You can disable this behavior with --watch=always
    if (args['--watch'] !== 'always') {
      process.stdin.on('end', () => process.exit(0))
    }

    process.stdin.resume()

    await processor.watch()
  } else {
    await processor.build().catch((e) => {
      console.error(e)
      process.exit(1)
    })
  }
}
