'use strict'

const test = require('tap').test
const fs = require('fs')
const path = require('path')
const findVisualStudio = require('../lib/find-visualstudio')
const VisualStudioFinder = findVisualStudio.test.VisualStudioFinder

const semverV1 = { major: 1, minor: 0, patch: 0 }

delete process.env.VCINSTALLDIR

function poison (object, property) {
  function fail () {
    console.error(Error(`Property ${property} should not have been accessed.`))
    process.abort()
  }
  var descriptor = {
    configurable: false,
    enumerable: false,
    get: fail,
    set: fail
  }
  Object.defineProperty(object, property, descriptor)
}

function TestVisualStudioFinder () { VisualStudioFinder.apply(this, arguments) }
TestVisualStudioFinder.prototype = Object.create(VisualStudioFinder.prototype)
// Silence npmlog - remove for debugging
TestVisualStudioFinder.prototype.log = {
  silly: () => {},
  verbose: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
}

test('VS2013', function (t) {
  t.plan(4)

  const finder = new TestVisualStudioFinder(semverV1, null, (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info, {
      msBuild: 'C:\\MSBuild12\\MSBuild.exe',
      path: 'C:\\VS2013',
      sdk: null,
      toolset: 'v120',
      version: '12.0',
      versionMajor: 12,
      versionMinor: 0,
      versionYear: 2013
    })
  })

  finder.findVisualStudio2017OrNewer = (cb) => {
    finder.parseData(new Error(), '', '', cb)
  }
  finder.regSearchKeys = (keys, value, addOpts, cb) => {
    for (var i = 0; i < keys.length; ++i) {
      const fullName = `${keys[i]}\\${value}`
      switch (fullName) {
        case 'HKLM\\Software\\Microsoft\\VisualStudio\\SxS\\VC7\\14.0':
        case 'HKLM\\Software\\Wow6432Node\\Microsoft\\VisualStudio\\SxS\\VC7\\14.0':
          continue
        case 'HKLM\\Software\\Microsoft\\VisualStudio\\SxS\\VC7\\12.0':
          t.pass(`expected search for registry value ${fullName}`)
          return cb(null, 'C:\\VS2013\\VC\\')
        case 'HKLM\\Software\\Microsoft\\MSBuild\\ToolsVersions\\12.0\\MSBuildToolsPath':
          t.pass(`expected search for registry value ${fullName}`)
          return cb(null, 'C:\\MSBuild12\\')
        default:
          t.fail(`unexpected search for registry value ${fullName}`)
      }
    }
    return cb(new Error())
  }
  finder.findVisualStudio()
})

test('VS2013 should not be found on new node versions', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder({
    major: 10,
    minor: 0,
    patch: 0
  }, null, (err, info) => {
    t.ok(/find .* Visual Studio/i.test(err), 'expect error')
    t.false(info, 'no data')
  })

  finder.findVisualStudio2017OrNewer = (cb) => {
    const file = path.join(__dirname, 'fixtures', 'VS_2017_Unusable.txt')
    const data = fs.readFileSync(file)
    finder.parseData(null, data, '', cb)
  }
  finder.regSearchKeys = (keys, value, addOpts, cb) => {
    for (var i = 0; i < keys.length; ++i) {
      const fullName = `${keys[i]}\\${value}`
      switch (fullName) {
        case 'HKLM\\Software\\Microsoft\\VisualStudio\\SxS\\VC7\\14.0':
        case 'HKLM\\Software\\Wow6432Node\\Microsoft\\VisualStudio\\SxS\\VC7\\14.0':
          continue
        default:
          t.fail(`unexpected search for registry value ${fullName}`)
      }
    }
    return cb(new Error())
  }
  finder.findVisualStudio()
})

test('VS2015', function (t) {
  t.plan(4)

  const finder = new TestVisualStudioFinder(semverV1, null, (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info, {
      msBuild: 'C:\\MSBuild14\\MSBuild.exe',
      path: 'C:\\VS2015',
      sdk: null,
      toolset: 'v140',
      version: '14.0',
      versionMajor: 14,
      versionMinor: 0,
      versionYear: 2015
    })
  })

  finder.findVisualStudio2017OrNewer = (cb) => {
    finder.parseData(new Error(), '', '', cb)
  }
  finder.regSearchKeys = (keys, value, addOpts, cb) => {
    for (var i = 0; i < keys.length; ++i) {
      const fullName = `${keys[i]}\\${value}`
      switch (fullName) {
        case 'HKLM\\Software\\Microsoft\\VisualStudio\\SxS\\VC7\\14.0':
          t.pass(`expected search for registry value ${fullName}`)
          return cb(null, 'C:\\VS2015\\VC\\')
        case 'HKLM\\Software\\Microsoft\\MSBuild\\ToolsVersions\\14.0\\MSBuildToolsPath':
          t.pass(`expected search for registry value ${fullName}`)
          return cb(null, 'C:\\MSBuild14\\')
        default:
          t.fail(`unexpected search for registry value ${fullName}`)
      }
    }
    return cb(new Error())
  }
  finder.findVisualStudio()
})

test('error from PowerShell', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, null, null)

  finder.parseData(new Error(), '', '', (info) => {
    t.ok(/use PowerShell/i.test(finder.errorLog[0]), 'expect error')
    t.false(info, 'no data')
  })
})

test('empty output from PowerShell', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, null, null)

  finder.parseData(null, '', '', (info) => {
    t.ok(/use PowerShell/i.test(finder.errorLog[0]), 'expect error')
    t.false(info, 'no data')
  })
})

test('output from PowerShell not JSON', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, null, null)

  finder.parseData(null, 'AAAABBBB', '', (info) => {
    t.ok(/use PowerShell/i.test(finder.errorLog[0]), 'expect error')
    t.false(info, 'no data')
  })
})

test('wrong JSON from PowerShell', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, null, null)

  finder.parseData(null, '{}', '', (info) => {
    t.ok(/use PowerShell/i.test(finder.errorLog[0]), 'expect error')
    t.false(info, 'no data')
  })
})

test('empty JSON from PowerShell', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, null, null)

  finder.parseData(null, '[]', '', (info) => {
    t.ok(/find .* Visual Studio/i.test(finder.errorLog[0]), 'expect error')
    t.false(info, 'no data')
  })
})

test('future version', function (t) {
  t.plan(3)

  const finder = new TestVisualStudioFinder(semverV1, null, null)

  finder.parseData(null, JSON.stringify([{
    packages: [
      'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
      'Microsoft.VisualStudio.Component.Windows10SDK.17763',
      'Microsoft.VisualStudio.VC.MSBuild.Base'
    ],
    path: 'C:\\VS',
    version: '9999.9999.9999.9999'
  }]), '', (info) => {
    t.ok(/unknown version/i.test(finder.errorLog[0]), 'expect error')
    t.ok(/find .* Visual Studio/i.test(finder.errorLog[1]), 'expect error')
    t.false(info, 'no data')
  })
})

test('single unusable VS2017', function (t) {
  t.plan(3)

  const finder = new TestVisualStudioFinder(semverV1, null, null)

  const file = path.join(__dirname, 'fixtures', 'VS_2017_Unusable.txt')
  const data = fs.readFileSync(file)
  finder.parseData(null, data, '', (info) => {
    t.ok(/checking/i.test(finder.errorLog[0]), 'expect error')
    t.ok(/find .* Visual Studio/i.test(finder.errorLog[2]), 'expect error')
    t.false(info, 'no data')
  })
})

test('minimal VS2017 Build Tools', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, null, (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info, {
      msBuild: 'C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\' +
        'BuildTools\\MSBuild\\15.0\\Bin\\MSBuild.exe',
      path:
        'C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\BuildTools',
      sdk: '10.0.17134.0',
      toolset: 'v141',
      version: '15.9.28307.665',
      versionMajor: 15,
      versionMinor: 9,
      versionYear: 2017
    })
  })

  poison(finder, 'regSearchKeys')
  finder.findVisualStudio2017OrNewer = (cb) => {
    const file = path.join(__dirname, 'fixtures',
      'VS_2017_BuildTools_minimal.txt')
    const data = fs.readFileSync(file)
    finder.parseData(null, data, '', cb)
  }
  finder.findVisualStudio()
})

test('VS2017 Community with C++ workload', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, null, (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info, {
      msBuild: 'C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\' +
        'Community\\MSBuild\\15.0\\Bin\\MSBuild.exe',
      path:
        'C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Community',
      sdk: '10.0.17763.0',
      toolset: 'v141',
      version: '15.9.28307.665',
      versionMajor: 15,
      versionMinor: 9,
      versionYear: 2017
    })
  })

  poison(finder, 'regSearchKeys')
  finder.findVisualStudio2017OrNewer = (cb) => {
    const file = path.join(__dirname, 'fixtures',
      'VS_2017_Community_workload.txt')
    const data = fs.readFileSync(file)
    finder.parseData(null, data, '', cb)
  }
  finder.findVisualStudio()
})

test('VS2017 Express', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, null, (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info, {
      msBuild: 'C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\' +
        'WDExpress\\MSBuild\\15.0\\Bin\\MSBuild.exe',
      path:
        'C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\WDExpress',
      sdk: '10.0.17763.0',
      toolset: 'v141',
      version: '15.9.28307.858',
      versionMajor: 15,
      versionMinor: 9,
      versionYear: 2017
    })
  })

  poison(finder, 'regSearchKeys')
  finder.findVisualStudio2017OrNewer = (cb) => {
    const file = path.join(__dirname, 'fixtures', 'VS_2017_Express.txt')
    const data = fs.readFileSync(file)
    finder.parseData(null, data, '', cb)
  }
  finder.findVisualStudio()
})

test('VS2019 Preview with C++ workload', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, null, (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info, {
      msBuild: 'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\' +
        'Preview\\MSBuild\\Current\\Bin\\MSBuild.exe',
      path:
        'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Preview',
      sdk: '10.0.17763.0',
      toolset: 'v142',
      version: '16.0.28608.199',
      versionMajor: 16,
      versionMinor: 0,
      versionYear: 2019
    })
  })

  poison(finder, 'regSearchKeys')
  finder.findVisualStudio2017OrNewer = (cb) => {
    const file = path.join(__dirname, 'fixtures',
      'VS_2019_Preview.txt')
    const data = fs.readFileSync(file)
    finder.parseData(null, data, '', cb)
  }
  finder.findVisualStudio()
})

test('minimal VS2019 Build Tools', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, null, (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info, {
      msBuild: 'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\' +
        'BuildTools\\MSBuild\\Current\\Bin\\MSBuild.exe',
      path:
        'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools',
      sdk: '10.0.17134.0',
      toolset: 'v142',
      version: '16.1.28922.388',
      versionMajor: 16,
      versionMinor: 1,
      versionYear: 2019
    })
  })

  poison(finder, 'regSearchKeys')
  finder.findVisualStudio2017OrNewer = (cb) => {
    const file = path.join(__dirname, 'fixtures',
      'VS_2019_BuildTools_minimal.txt')
    const data = fs.readFileSync(file)
    finder.parseData(null, data, '', cb)
  }
  finder.findVisualStudio()
})

test('VS2019 Community with C++ workload', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, null, (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info, {
      msBuild: 'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\' +
        'Community\\MSBuild\\Current\\Bin\\MSBuild.exe',
      path:
        'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community',
      sdk: '10.0.17763.0',
      toolset: 'v142',
      version: '16.1.28922.388',
      versionMajor: 16,
      versionMinor: 1,
      versionYear: 2019
    })
  })

  poison(finder, 'regSearchKeys')
  finder.findVisualStudio2017OrNewer = (cb) => {
    const file = path.join(__dirname, 'fixtures',
      'VS_2019_Community_workload.txt')
    const data = fs.readFileSync(file)
    finder.parseData(null, data, '', cb)
  }
  finder.findVisualStudio()
})

function allVsVersions (t, finder) {
  finder.findVisualStudio2017OrNewer = (cb) => {
    const data0 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures',
      'VS_2017_Unusable.txt')))
    const data1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures',
      'VS_2017_BuildTools_minimal.txt')))
    const data2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures',
      'VS_2017_Community_workload.txt')))
    const data3 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures',
      'VS_2017_Express.txt')))
    const data4 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures',
      'VS_2019_Preview.txt')))
    const data5 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures',
      'VS_2019_BuildTools_minimal.txt')))
    const data6 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures',
      'VS_2019_Community_workload.txt')))
    const data = JSON.stringify(data0.concat(data1, data2, data3, data4,
      data5, data6))
    finder.parseData(null, data, '', cb)
  }
  finder.regSearchKeys = (keys, value, addOpts, cb) => {
    for (var i = 0; i < keys.length; ++i) {
      const fullName = `${keys[i]}\\${value}`
      switch (fullName) {
        case 'HKLM\\Software\\Microsoft\\VisualStudio\\SxS\\VC7\\14.0':
        case 'HKLM\\Software\\Microsoft\\VisualStudio\\SxS\\VC7\\12.0':
          continue
        case 'HKLM\\Software\\Wow6432Node\\Microsoft\\VisualStudio\\SxS\\VC7\\12.0':
          return cb(null, 'C:\\VS2013\\VC\\')
        case 'HKLM\\Software\\Microsoft\\MSBuild\\ToolsVersions\\12.0\\MSBuildToolsPath':
          return cb(null, 'C:\\MSBuild12\\')
        case 'HKLM\\Software\\Wow6432Node\\Microsoft\\VisualStudio\\SxS\\VC7\\14.0':
          return cb(null, 'C:\\VS2015\\VC\\')
        case 'HKLM\\Software\\Microsoft\\MSBuild\\ToolsVersions\\14.0\\MSBuildToolsPath':
          return cb(null, 'C:\\MSBuild14\\')
        default:
          t.fail(`unexpected search for registry value ${fullName}`)
      }
    }
    return cb(new Error())
  }
}

test('fail when looking for invalid path', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, 'AABB', (err, info) => {
    t.ok(/find .* Visual Studio/i.test(err), 'expect error')
    t.false(info, 'no data')
  })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('look for VS2013 by version number', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, '2013', (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info.versionYear, 2013)
  })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('look for VS2013 by installation path', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, 'C:\\VS2013',
    (err, info) => {
      t.strictEqual(err, null)
      t.deepEqual(info.path, 'C:\\VS2013')
    })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('look for VS2015 by version number', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, '2015', (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info.versionYear, 2015)
  })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('look for VS2015 by installation path', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, 'C:\\VS2015',
    (err, info) => {
      t.strictEqual(err, null)
      t.deepEqual(info.path, 'C:\\VS2015')
    })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('look for VS2017 by version number', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, '2017', (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info.versionYear, 2017)
  })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('look for VS2017 by installation path', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1,
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Community',
    (err, info) => {
      t.strictEqual(err, null)
      t.deepEqual(info.path,
        'C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Community')
    })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('look for VS2019 by version number', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, '2019', (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info.versionYear, 2019)
  })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('look for VS2019 by installation path', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1,
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools',
    (err, info) => {
      t.strictEqual(err, null)
      t.deepEqual(info.path,
        'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools')
    })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('msvs_version match should be case insensitive', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1,
    'c:\\program files (x86)\\microsoft visual studio\\2019\\BUILDTOOLS',
    (err, info) => {
      t.strictEqual(err, null)
      t.deepEqual(info.path,
        'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools')
    })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('latest version should be found by default', function (t) {
  t.plan(2)

  const finder = new TestVisualStudioFinder(semverV1, null, (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info.versionYear, 2019)
  })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('run on a usable VS Command Prompt', function (t) {
  t.plan(2)

  process.env.VCINSTALLDIR = 'C:\\VS2015\\VC'
  // VSINSTALLDIR is not defined on Visual C++ Build Tools 2015
  delete process.env.VSINSTALLDIR

  const finder = new TestVisualStudioFinder(semverV1, null, (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info.path, 'C:\\VS2015')
  })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('VCINSTALLDIR match should be case insensitive', function (t) {
  t.plan(2)

  process.env.VCINSTALLDIR =
    'c:\\program files (x86)\\microsoft visual studio\\2019\\BUILDTOOLS\\VC'

  const finder = new TestVisualStudioFinder(semverV1, null, (err, info) => {
    t.strictEqual(err, null)
    t.deepEqual(info.path,
      'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools')
  })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('run on a unusable VS Command Prompt', function (t) {
  t.plan(2)

  process.env.VCINSTALLDIR =
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildToolsUnusable\\VC'

  const finder = new TestVisualStudioFinder(semverV1, null, (err, info) => {
    t.ok(/find .* Visual Studio/i.test(err), 'expect error')
    t.false(info, 'no data')
  })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('run on a VS Command Prompt with matching msvs_version', function (t) {
  t.plan(2)

  process.env.VCINSTALLDIR = 'C:\\VS2015\\VC'

  const finder = new TestVisualStudioFinder(semverV1, 'C:\\VS2015',
    (err, info) => {
      t.strictEqual(err, null)
      t.deepEqual(info.path, 'C:\\VS2015')
    })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})

test('run on a VS Command Prompt with mismatched msvs_version', function (t) {
  t.plan(2)

  process.env.VCINSTALLDIR =
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools\\VC'

  const finder = new TestVisualStudioFinder(semverV1, 'C:\\VS2015',
    (err, info) => {
      t.ok(/find .* Visual Studio/i.test(err), 'expect error')
      t.false(info, 'no data')
    })

  allVsVersions(t, finder)
  finder.findVisualStudio()
})
