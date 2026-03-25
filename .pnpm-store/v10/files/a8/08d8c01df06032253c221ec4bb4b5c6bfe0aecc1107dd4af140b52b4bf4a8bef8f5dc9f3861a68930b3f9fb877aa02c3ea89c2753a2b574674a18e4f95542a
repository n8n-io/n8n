'use strict'

const log = require('npmlog')
const execFile = require('child_process').execFile
const fs = require('fs')
const path = require('path').win32
const logWithPrefix = require('./util').logWithPrefix
const regSearchKeys = require('./util').regSearchKeys

function findVisualStudio (nodeSemver, configMsvsVersion, callback) {
  const finder = new VisualStudioFinder(nodeSemver, configMsvsVersion,
    callback)
  finder.findVisualStudio()
}

function VisualStudioFinder (nodeSemver, configMsvsVersion, callback) {
  this.nodeSemver = nodeSemver
  this.configMsvsVersion = configMsvsVersion
  this.callback = callback
  this.errorLog = []
  this.validVersions = []
}

VisualStudioFinder.prototype = {
  log: logWithPrefix(log, 'find VS'),

  regSearchKeys: regSearchKeys,

  // Logs a message at verbose level, but also saves it to be displayed later
  // at error level if an error occurs. This should help diagnose the problem.
  addLog: function addLog (message) {
    this.log.verbose(message)
    this.errorLog.push(message)
  },

  findVisualStudio: function findVisualStudio () {
    this.configVersionYear = null
    this.configPath = null
    if (this.configMsvsVersion) {
      this.addLog('msvs_version was set from command line or npm config')
      if (this.configMsvsVersion.match(/^\d{4}$/)) {
        this.configVersionYear = parseInt(this.configMsvsVersion, 10)
        this.addLog(
          `- looking for Visual Studio version ${this.configVersionYear}`)
      } else {
        this.configPath = path.resolve(this.configMsvsVersion)
        this.addLog(
          `- looking for Visual Studio installed in "${this.configPath}"`)
      }
    } else {
      this.addLog('msvs_version not set from command line or npm config')
    }

    if (process.env.VCINSTALLDIR) {
      this.envVcInstallDir =
        path.resolve(process.env.VCINSTALLDIR, '..')
      this.addLog('running in VS Command Prompt, installation path is:\n' +
        `"${this.envVcInstallDir}"\n- will only use this version`)
    } else {
      this.addLog('VCINSTALLDIR not set, not running in VS Command Prompt')
    }

    this.findVisualStudio2017OrNewer((info) => {
      if (info) {
        return this.succeed(info)
      }
      this.findVisualStudio2015((info) => {
        if (info) {
          return this.succeed(info)
        }
        this.findVisualStudio2013((info) => {
          if (info) {
            return this.succeed(info)
          }
          this.fail()
        })
      })
    })
  },

  succeed: function succeed (info) {
    this.log.info(`using VS${info.versionYear} (${info.version}) found at:` +
                  `\n"${info.path}"` +
                  '\nrun with --verbose for detailed information')
    process.nextTick(this.callback.bind(null, null, info))
  },

  fail: function fail () {
    if (this.configMsvsVersion && this.envVcInstallDir) {
      this.errorLog.push(
        'msvs_version does not match this VS Command Prompt or the',
        'installation cannot be used.')
    } else if (this.configMsvsVersion) {
      // If msvs_version was specified but finding VS failed, print what would
      // have been accepted
      this.errorLog.push('')
      if (this.validVersions) {
        this.errorLog.push('valid versions for msvs_version:')
        this.validVersions.forEach((version) => {
          this.errorLog.push(`- "${version}"`)
        })
      } else {
        this.errorLog.push('no valid versions for msvs_version were found')
      }
    }

    const errorLog = this.errorLog.join('\n')

    // For Windows 80 col console, use up to the column before the one marked
    // with X (total 79 chars including logger prefix, 62 chars usable here):
    //                                                               X
    const infoLog = [
      '**************************************************************',
      'You need to install the latest version of Visual Studio',
      'including the "Desktop development with C++" workload.',
      'For more information consult the documentation at:',
      'https://github.com/nodejs/node-gyp#on-windows',
      '**************************************************************'
    ].join('\n')

    this.log.error(`\n${errorLog}\n\n${infoLog}\n`)
    process.nextTick(this.callback.bind(null, new Error(
      'Could not find any Visual Studio installation to use')))
  },

  // Invoke the PowerShell script to get information about Visual Studio 2017
  // or newer installations
  findVisualStudio2017OrNewer: function findVisualStudio2017OrNewer (cb) {
    var ps = path.join(process.env.SystemRoot, 'System32',
      'WindowsPowerShell', 'v1.0', 'powershell.exe')
    var csFile = path.join(__dirname, 'Find-VisualStudio.cs')
    var psArgs = [
      '-ExecutionPolicy',
      'Unrestricted',
      '-NoProfile',
      '-Command',
      '&{Add-Type -Path \'' + csFile + '\';' + '[VisualStudioConfiguration.Main]::PrintJson()}'
    ]

    this.log.silly('Running', ps, psArgs)
    var child = execFile(ps, psArgs, { encoding: 'utf8' },
      (err, stdout, stderr) => {
        this.parseData(err, stdout, stderr, cb)
      })
    child.stdin.end()
  },

  // Parse the output of the PowerShell script and look for an installation
  // of Visual Studio 2017 or newer to use
  parseData: function parseData (err, stdout, stderr, cb) {
    this.log.silly('PS stderr = %j', stderr)

    const failPowershell = () => {
      this.addLog(
        'could not use PowerShell to find Visual Studio 2017 or newer, try re-running with \'--loglevel silly\' for more details')
      cb(null)
    }

    if (err) {
      this.log.silly('PS err = %j', err && (err.stack || err))
      return failPowershell()
    }

    var vsInfo
    try {
      vsInfo = JSON.parse(stdout)
    } catch (e) {
      this.log.silly('PS stdout = %j', stdout)
      this.log.silly(e)
      return failPowershell()
    }

    if (!Array.isArray(vsInfo)) {
      this.log.silly('PS stdout = %j', stdout)
      return failPowershell()
    }

    vsInfo = vsInfo.map((info) => {
      this.log.silly(`processing installation: "${info.path}"`)
      info.path = path.resolve(info.path)
      var ret = this.getVersionInfo(info)
      ret.path = info.path
      ret.msBuild = this.getMSBuild(info, ret.versionYear)
      ret.toolset = this.getToolset(info, ret.versionYear)
      ret.sdk = this.getSDK(info)
      return ret
    })
    this.log.silly('vsInfo:', vsInfo)

    // Remove future versions or errors parsing version number
    vsInfo = vsInfo.filter((info) => {
      if (info.versionYear) {
        return true
      }
      this.addLog(`unknown version "${info.version}" found at "${info.path}"`)
      return false
    })

    // Sort to place newer versions first
    vsInfo.sort((a, b) => b.versionYear - a.versionYear)

    for (var i = 0; i < vsInfo.length; ++i) {
      const info = vsInfo[i]
      this.addLog(`checking VS${info.versionYear} (${info.version}) found ` +
                  `at:\n"${info.path}"`)

      if (info.msBuild) {
        this.addLog('- found "Visual Studio C++ core features"')
      } else {
        this.addLog('- "Visual Studio C++ core features" missing')
        continue
      }

      if (info.toolset) {
        this.addLog(`- found VC++ toolset: ${info.toolset}`)
      } else {
        this.addLog('- missing any VC++ toolset')
        continue
      }

      if (info.sdk) {
        this.addLog(`- found Windows SDK: ${info.sdk}`)
      } else {
        this.addLog('- missing any Windows SDK')
        continue
      }

      if (!this.checkConfigVersion(info.versionYear, info.path)) {
        continue
      }

      return cb(info)
    }

    this.addLog(
      'could not find a version of Visual Studio 2017 or newer to use')
    cb(null)
  },

  // Helper - process version information
  getVersionInfo: function getVersionInfo (info) {
    const match = /^(\d+)\.(\d+)\..*/.exec(info.version)
    if (!match) {
      this.log.silly('- failed to parse version:', info.version)
      return {}
    }
    this.log.silly('- version match = %j', match)
    var ret = {
      version: info.version,
      versionMajor: parseInt(match[1], 10),
      versionMinor: parseInt(match[2], 10)
    }
    if (ret.versionMajor === 15) {
      ret.versionYear = 2017
      return ret
    }
    if (ret.versionMajor === 16) {
      ret.versionYear = 2019
      return ret
    }
    if (ret.versionMajor === 17) {
      ret.versionYear = 2022
      return ret
    }
    this.log.silly('- unsupported version:', ret.versionMajor)
    return {}
  },

  // Helper - process MSBuild information
  getMSBuild: function getMSBuild (info, versionYear) {
    const pkg = 'Microsoft.VisualStudio.VC.MSBuild.Base'
    const msbuildPath = path.join(info.path, 'MSBuild', 'Current', 'Bin', 'MSBuild.exe')
    if (info.packages.indexOf(pkg) !== -1) {
      this.log.silly('- found VC.MSBuild.Base')
      if (versionYear === 2017) {
        return path.join(info.path, 'MSBuild', '15.0', 'Bin', 'MSBuild.exe')
      }
      if (versionYear === 2019) {
        return msbuildPath
      }
    }
    // visual studio 2022 don't has msbuild pkg
    if (fs.existsSync(msbuildPath)) {
      return msbuildPath
    }
    return null
  },

  // Helper - process toolset information
  getToolset: function getToolset (info, versionYear) {
    const pkg = 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64'
    const express = 'Microsoft.VisualStudio.WDExpress'

    if (info.packages.indexOf(pkg) !== -1) {
      this.log.silly('- found VC.Tools.x86.x64')
    } else if (info.packages.indexOf(express) !== -1) {
      this.log.silly('- found Visual Studio Express (looking for toolset)')
    } else {
      return null
    }

    if (versionYear === 2017) {
      return 'v141'
    } else if (versionYear === 2019) {
      return 'v142'
    } else if (versionYear === 2022) {
      return 'v143'
    }
    this.log.silly('- invalid versionYear:', versionYear)
    return null
  },

  // Helper - process Windows SDK information
  getSDK: function getSDK (info) {
    const win8SDK = 'Microsoft.VisualStudio.Component.Windows81SDK'
    const win10SDKPrefix = 'Microsoft.VisualStudio.Component.Windows10SDK.'

    var Win10SDKVer = 0
    info.packages.forEach((pkg) => {
      if (!pkg.startsWith(win10SDKPrefix)) {
        return
      }
      const parts = pkg.split('.')
      if (parts.length > 5 && parts[5] !== 'Desktop') {
        this.log.silly('- ignoring non-Desktop Win10SDK:', pkg)
        return
      }
      const foundSdkVer = parseInt(parts[4], 10)
      if (isNaN(foundSdkVer)) {
        // Microsoft.VisualStudio.Component.Windows10SDK.IpOverUsb
        this.log.silly('- failed to parse Win10SDK number:', pkg)
        return
      }
      this.log.silly('- found Win10SDK:', foundSdkVer)
      Win10SDKVer = Math.max(Win10SDKVer, foundSdkVer)
    })

    if (Win10SDKVer !== 0) {
      return `10.0.${Win10SDKVer}.0`
    } else if (info.packages.indexOf(win8SDK) !== -1) {
      this.log.silly('- found Win8SDK')
      return '8.1'
    }
    return null
  },

  // Find an installation of Visual Studio 2015 to use
  findVisualStudio2015: function findVisualStudio2015 (cb) {
    return this.findOldVS({
      version: '14.0',
      versionMajor: 14,
      versionMinor: 0,
      versionYear: 2015,
      toolset: 'v140'
    }, cb)
  },

  // Find an installation of Visual Studio 2013 to use
  findVisualStudio2013: function findVisualStudio2013 (cb) {
    if (this.nodeSemver.major >= 9) {
      this.addLog(
        'not looking for VS2013 as it is only supported up to Node.js 8')
      return cb(null)
    }
    return this.findOldVS({
      version: '12.0',
      versionMajor: 12,
      versionMinor: 0,
      versionYear: 2013,
      toolset: 'v120'
    }, cb)
  },

  // Helper - common code for VS2013 and VS2015
  findOldVS: function findOldVS (info, cb) {
    const regVC7 = ['HKLM\\Software\\Microsoft\\VisualStudio\\SxS\\VC7',
      'HKLM\\Software\\Wow6432Node\\Microsoft\\VisualStudio\\SxS\\VC7']
    const regMSBuild = 'HKLM\\Software\\Microsoft\\MSBuild\\ToolsVersions'

    this.addLog(`looking for Visual Studio ${info.versionYear}`)
    this.regSearchKeys(regVC7, info.version, [], (err, res) => {
      if (err) {
        this.addLog('- not found')
        return cb(null)
      }

      const vsPath = path.resolve(res, '..')
      this.addLog(`- found in "${vsPath}"`)

      const msBuildRegOpts = process.arch === 'ia32' ? [] : ['/reg:32']
      this.regSearchKeys([`${regMSBuild}\\${info.version}`],
        'MSBuildToolsPath', msBuildRegOpts, (err, res) => {
          if (err) {
            this.addLog(
              '- could not find MSBuild in registry for this version')
            return cb(null)
          }

          const msBuild = path.join(res, 'MSBuild.exe')
          this.addLog(`- MSBuild in "${msBuild}"`)

          if (!this.checkConfigVersion(info.versionYear, vsPath)) {
            return cb(null)
          }

          info.path = vsPath
          info.msBuild = msBuild
          info.sdk = null
          cb(info)
        })
    })
  },

  // After finding a usable version of Visual Studio:
  // - add it to validVersions to be displayed at the end if a specific
  //   version was requested and not found;
  // - check if this is the version that was requested.
  // - check if this matches the Visual Studio Command Prompt
  checkConfigVersion: function checkConfigVersion (versionYear, vsPath) {
    this.validVersions.push(versionYear)
    this.validVersions.push(vsPath)

    if (this.configVersionYear && this.configVersionYear !== versionYear) {
      this.addLog('- msvs_version does not match this version')
      return false
    }
    if (this.configPath &&
        path.relative(this.configPath, vsPath) !== '') {
      this.addLog('- msvs_version does not point to this installation')
      return false
    }
    if (this.envVcInstallDir &&
        path.relative(this.envVcInstallDir, vsPath) !== '') {
      this.addLog('- does not match this Visual Studio Command Prompt')
      return false
    }

    return true
  }
}

module.exports = findVisualStudio
module.exports.test = {
  VisualStudioFinder: VisualStudioFinder,
  findVisualStudio: findVisualStudio
}
