var exec = require('child_process').exec
var lsbRelease = /Release:\t(.*)/
var lsbCodename = /Codename:\t(.*)/
var releaseRegex = /(.*)/

module.exports = function (os, file, cb) {
  // first try lsb_release
  return lsbrelease(os, file, cb)
}

function lsbrelease (os, file, cb) {
  exec('lsb_release -a', function (e, stdout, stderr) {
    if (e) return releasefile(os, file, cb)
    var release = stdout.match(lsbRelease)
    if (release && release.length === 2) os.release = release[1]
    var codename = stdout.match(lsbCodename)
    if (codename && release.length === 2) os.codename = codename[1]
    cb(null, os)
  })
}

function releasefile (os, file, cb) {
  var release = file.match(releaseRegex)
  if (release && release.length === 2) os.release = release[1]
  cb(null, os)
}
