'use strict'

const test = require('tap').test
const path = require('path')
const fs = require('graceful-fs')
const childProcess = require('child_process')
const os = require('os')
const addonPath = path.resolve(__dirname, 'node_modules', 'hello_world')
const nodeGyp = path.resolve(__dirname, '..', 'bin', 'node-gyp.js')
const execFileSync = childProcess.execFileSync || require('./process-exec-sync')
const execFile = childProcess.execFile

function runHello (hostProcess) {
  if (!hostProcess) {
    hostProcess = process.execPath
  }
  var testCode = "console.log(require('hello_world').hello())"
  return execFileSync(hostProcess, ['-e', testCode], { cwd: __dirname }).toString()
}

function getEncoding () {
  var code = 'import locale;print(locale.getdefaultlocale()[1])'
  return execFileSync('python', ['-c', code]).toString().trim()
}

function checkCharmapValid () {
  var data
  try {
    data = execFileSync('python', ['fixtures/test-charmap.py'],
      { cwd: __dirname })
  } catch (err) {
    return false
  }
  var lines = data.toString().trim().split('\n')
  return lines.pop() === 'True'
}

test('build simple addon', function (t) {
  t.plan(3)

  // Set the loglevel otherwise the output disappears when run via 'npm test'
  var cmd = [nodeGyp, 'rebuild', '-C', addonPath, '--loglevel=verbose']
  var proc = execFile(process.execPath, cmd, function (err, stdout, stderr) {
    var logLines = stderr.toString().trim().split(/\r?\n/)
    var lastLine = logLines[logLines.length - 1]
    t.strictEqual(err, null)
    t.strictEqual(lastLine, 'gyp info ok', 'should end in ok')
    t.strictEqual(runHello().trim(), 'world')
  })
  proc.stdout.setEncoding('utf-8')
  proc.stderr.setEncoding('utf-8')
})

test('build simple addon in path with non-ascii characters', function (t) {
  t.plan(1)

  if (!checkCharmapValid()) {
    return t.skip('python console app can\'t encode non-ascii character.')
  }

  var testDirNames = {
    cp936: '文件夹',
    cp1252: 'Latīna',
    cp932: 'フォルダ'
  }
  // Select non-ascii characters by current encoding
  var testDirName = testDirNames[getEncoding()]
  // If encoding is UTF-8 or other then no need to test
  if (!testDirName) {
    return t.skip('no need to test')
  }

  t.plan(3)

  var data
  var configPath = path.join(addonPath, 'build', 'config.gypi')
  try {
    data = fs.readFileSync(configPath, 'utf8')
  } catch (err) {
    t.error(err)
    return
  }
  var config = JSON.parse(data.replace(/#.+\n/, ''))
  var nodeDir = config.variables.nodedir
  var testNodeDir = path.join(addonPath, testDirName)
  // Create symbol link to path with non-ascii characters
  try {
    fs.symlinkSync(nodeDir, testNodeDir, 'dir')
  } catch (err) {
    switch (err.code) {
      case 'EEXIST': break
      case 'EPERM':
        t.error(err, 'Please try to running console as an administrator')
        return
      default:
        t.error(err)
        return
    }
  }

  var cmd = [
    nodeGyp,
    'rebuild',
    '-C',
    addonPath,
    '--loglevel=verbose',
    '-nodedir=' + testNodeDir
  ]
  var proc = execFile(process.execPath, cmd, function (err, stdout, stderr) {
    try {
      fs.unlink(testNodeDir)
    } catch (err) {
      t.error(err)
    }

    var logLines = stderr.toString().trim().split(/\r?\n/)
    var lastLine = logLines[logLines.length - 1]
    t.strictEqual(err, null)
    t.strictEqual(lastLine, 'gyp info ok', 'should end in ok')
    t.strictEqual(runHello().trim(), 'world')
  })
  proc.stdout.setEncoding('utf-8')
  proc.stderr.setEncoding('utf-8')
})

test('addon works with renamed host executable', function (t) {
  // No `fs.copyFileSync` before node8.
  if (process.version.substr(1).split('.')[0] < 8) {
    t.skip('skipping test for old node version')
    t.end()
    return
  }

  t.plan(3)

  var notNodePath = path.join(os.tmpdir(), 'notnode' + path.extname(process.execPath))
  fs.copyFileSync(process.execPath, notNodePath)

  var cmd = [nodeGyp, 'rebuild', '-C', addonPath, '--loglevel=verbose']
  var proc = execFile(process.execPath, cmd, function (err, stdout, stderr) {
    var logLines = stderr.toString().trim().split(/\r?\n/)
    var lastLine = logLines[logLines.length - 1]
    t.strictEqual(err, null)
    t.strictEqual(lastLine, 'gyp info ok', 'should end in ok')
    t.strictEqual(runHello(notNodePath).trim(), 'world')
    fs.unlinkSync(notNodePath)
  })
  proc.stdout.setEncoding('utf-8')
  proc.stderr.setEncoding('utf-8')
})
