module.exports = getPathVar
const PATH_REGEX = /^PATH$/i

function getPathVar(env, platform) {
  let PATH = 'PATH'

  if (platform === 'win32') {
    PATH = 'Path'
    Object.keys(env).some(e => {
      const matches = PATH_REGEX.test(e)
      if (matches) {
        PATH = e
      }
      return matches
    })
  }
  return PATH
}
