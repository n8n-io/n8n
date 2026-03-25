var releaseRegex = /release (.*)/

module.exports = function amazonCustomLogic (os, file, cb) {
  var release = file.match(releaseRegex)
  if (release && release.length === 2) os.release = release[1]
  cb(null, os)
}
