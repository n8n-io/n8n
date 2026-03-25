var color = require('cli-color')
var execSync = require('child_process').execSync || require('execSync').exec
var fs = require('fs')
var path = require('path')

/**
 * So most of this stuff will be sync, because we are moving
 * files around building docker images, etc. These all have
 * to be done in a specific order or chaos ensues
 */
var cwd = path.join(process.cwd(), 'tests')
process.stdout.write('Fetching Distributions... ')
var distros = fs.readdirSync(cwd)
var failed = []
process.stdout.write('[' + color.green('OK!') + ']\n')
distros.forEach(function (v1) {
  if (!fs.statSync(path.join(cwd, v1)).isDirectory()) return
  process.stdout.write('Fetching versions of ' + capitalize(v1) + '... ')
  var versions = fs.readdirSync(path.join(cwd, v1))
  process.stdout.write('[' + color.green('OK!') + ']\n')
  versions.forEach(function (v2) {
    if (!fs.statSync(path.join(cwd, v1, v2)).isDirectory()) return
    // If Dockerfile already exists, delete it.
    if (fs.existsSync(path.join(process.cwd(), 'Dockerfile'))) { fs.unlinkSync(path.join(process.cwd(), 'Dockerfile')) }
    // Move the dockerfile to the base of our repo
    fs.linkSync(path.join(cwd, v1, v2, 'Dockerfile'), path.join(process.cwd(), 'Dockerfile'))
    // Build the docker image using the dockerfile
    process.stdout.write('Building version ' + v2 + ' of ' + capitalize(v1) + '... ')
    try {
      var dockerResult = execSync('docker build -t "getos:' + v1 + v2 + '" .', { stdio: [] })
    } catch (e) {
      dockerResult = dockerResult || {}
      dockerResult.code = e
    }
    if (dockerResult.code && dockerResult.code !== 0) {
      failed.push(dockerResult)
      process.stdout.write('[' + color.red('FAILED!') + ']\n')
    } else {
      process.stdout.write('[' + color.green('OK!') + ']\n')
      process.stdout.write('Running container... ')
      // Show output from distribution
      try {
        var nodeResult = execSync('docker run -d getos:' + v1 + v2, { stdio: [] })
      } catch (e) {
        nodeResult = nodeResult || {}
        nodeResult.code = e
      }
      if (nodeResult.code && nodeResult.code !== 0) {
        failed.push(nodeResult)
        process.stdout.write('[' + color.red('FAILED!') + ']\n')
      } else {
        try {
          var dockerLog = execSync('sleep 2s && docker logs ' + (nodeResult.stdout || nodeResult.toString()), { stdio: [] })
        } catch (e) {
          dockerLog = dockerLog || {}
          dockerLog.code = e
        }
        if (dockerLog.code && dockerLog.code !== 0) {
          failed.push(dockerLog)
          process.stdout.write('[' + color.red('FAILED!') + ']\n')
        } else {
          process.stdout.write('[' + color.green('OK!') + ']\n')
          process.stdout.write('Output from version ' + v2 + ' of ' + capitalize(v1) + ': \n')
          process.stdout.write(dockerLog.stdout || dockerLog.toString())
        }
      }
    }
    // Delete the dockerfile
    fs.unlinkSync(path.join(process.cwd(), 'Dockerfile'))
  })
})

if (failed.length > 0) {
  fs.writeFileSync('tests.log', JSON.stringify(failed, null, ' '))
}

function capitalize (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
