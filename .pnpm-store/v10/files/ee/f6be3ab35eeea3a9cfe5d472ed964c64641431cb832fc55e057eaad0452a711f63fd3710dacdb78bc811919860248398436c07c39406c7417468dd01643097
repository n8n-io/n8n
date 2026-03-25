var releaseRegex = /release ([^ ]+)/
var codenameRegex = /\((.*)\)/

module.exports = function centosCustomLogic (os, file, cb) {
  var release = file.match(releaseRegex)
  if (release && release.length === 2) os.release = release[1]
  var codename = file.match(codenameRegex)
  if (codename && codename.length === 2) os.codename = codename[1]
  cb(null, os)
}
