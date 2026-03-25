var test = require('tap').test
var path = require('path')
var fs = require('fs')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var readInstalled = require('../')

var root = path.resolve(__dirname, 'root')
var pkg = path.resolve(root, 'pkg')
var pkgnm = path.resolve(pkg, 'node_modules')
var linkdepSrc = path.resolve(root, 'linkdep')
var linkdepLink = path.resolve(pkgnm, 'linkdep')
var devdep = path.resolve(linkdepSrc, 'node_modules', 'devdep')

function pjson (dir, data) {
  mkdirp.sync(dir)
  var d = path.resolve(dir, 'package.json')
  fs.writeFileSync(d, JSON.stringify(data))
}

test('setup', function (t) {
  rimraf.sync(root)
  pjson(pkg, {
    name: 'root',
    version: '1.2.3',
    dependencies: {
      linkdep: ''
    }
  })
  pjson(linkdepSrc, {
    name: 'linkdep',
    version: '1.2.3',
    devDependencies: {
      devdep: ''
    }
  })
  pjson(devdep, {
    name: 'devdep',
    version: '1.2.3'
  })

  mkdirp.sync(pkgnm)
  fs.symlinkSync(linkdepSrc, linkdepLink, 'dir')

  t.end()
})

test('basic', function (t) {
  readInstalled(pkg, { dev: true }, function (er, data) {
    var dd = data.dependencies.linkdep.dependencies.devdep
    t.notOk(dd.extraneous, 'linked dev dep should not be extraneous')
    t.end()
  })
})

test('cleanup', function (t) {
  rimraf.sync(root)
  t.end()
})
