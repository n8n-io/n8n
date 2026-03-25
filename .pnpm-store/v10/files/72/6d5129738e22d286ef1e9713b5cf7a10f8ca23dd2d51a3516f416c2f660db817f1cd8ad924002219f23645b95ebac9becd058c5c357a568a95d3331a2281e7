var releaseRegex = /(.*)/

module.exports = function alpineCustomLogic (os, file, cb) {
  var release = file.match(releaseRegex)
  if (release && release.length === 2) os.release = release[1]
  cb(null, os)
}
