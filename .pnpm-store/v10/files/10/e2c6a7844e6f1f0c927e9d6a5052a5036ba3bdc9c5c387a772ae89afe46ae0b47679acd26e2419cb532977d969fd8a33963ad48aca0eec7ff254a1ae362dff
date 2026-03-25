'use strict'

const path = require('path')
const { test } = require('tap')
const gyp = require('../lib/node-gyp')
const createConfigGypi = require('../lib/create-config-gypi')
const { parseConfigGypi, getCurrentConfigGypi } = createConfigGypi.test

test('config.gypi with no options', async function (t) {
  t.plan(2)

  const prog = gyp()
  prog.parseArgv([])

  const config = await getCurrentConfigGypi({ gyp: prog, vsInfo: {} })
  t.equal(config.target_defaults.default_configuration, 'Release')
  t.equal(config.variables.target_arch, process.arch)
})

test('config.gypi with --debug', async function (t) {
  t.plan(1)

  const prog = gyp()
  prog.parseArgv(['_', '_', '--debug'])

  const config = await getCurrentConfigGypi({ gyp: prog, vsInfo: {} })
  t.equal(config.target_defaults.default_configuration, 'Debug')
})

test('config.gypi with custom options', async function (t) {
  t.plan(1)

  const prog = gyp()
  prog.parseArgv(['_', '_', '--shared-libxml2'])

  const config = await getCurrentConfigGypi({ gyp: prog, vsInfo: {} })
  t.equal(config.variables.shared_libxml2, true)
})

test('config.gypi with nodedir', async function (t) {
  t.plan(1)

  const nodeDir = path.join(__dirname, 'fixtures', 'nodedir')

  const prog = gyp()
  prog.parseArgv(['_', '_', `--nodedir=${nodeDir}`])

  const config = await getCurrentConfigGypi({ gyp: prog, nodeDir, vsInfo: {} })
  t.equal(config.variables.build_with_electron, true)
})

test('config.gypi with --force-process-config', async function (t) {
  t.plan(1)

  const nodeDir = path.join(__dirname, 'fixtures', 'nodedir')

  const prog = gyp()
  prog.parseArgv(['_', '_', '--force-process-config', `--nodedir=${nodeDir}`])

  const config = await getCurrentConfigGypi({ gyp: prog, nodeDir, vsInfo: {} })
  t.equal(config.variables.build_with_electron, undefined)
})

test('config.gypi parsing', function (t) {
  t.plan(1)

  const str = "# Some comments\n{'variables': {'multiline': 'A'\n'B'}}"
  const config = parseConfigGypi(str)
  t.deepEqual(config, { variables: { multiline: 'AB' } })
})
