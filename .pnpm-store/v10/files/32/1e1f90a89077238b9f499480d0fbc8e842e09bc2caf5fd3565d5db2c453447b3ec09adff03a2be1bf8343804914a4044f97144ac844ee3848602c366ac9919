var releaseRegex = /distrib_release=(.*)/
var codenameRegex = /distrib_codename=(.*)/

module.exports = function ubuntuCustomLogic (os, file, cb) {
  var codename = file.match(codenameRegex)
  if (codename && codename.length === 2) os.codename = codename[1]
  var release = file.match(releaseRegex)
  if (release && release.length === 2) os.release = release[1]
  cb(null, os)
}
