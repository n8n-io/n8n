var releaseRegex = /VERSION_ID="(.*)"/
var codenameRegex = /VERSION="[0-9] \((.*)\)"/

module.exports = function raspbianCustomLogic (os, file, cb) {
  var release = file.match(releaseRegex)
  if (release && release.length === 2) os.release = release[1]
  var codename = file.match(codenameRegex)
  if (codename && codename.length === 2) os.codename = codename[1]
  cb(null, os)
}
