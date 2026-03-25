const getPathVar = require('./get-path-var')
const getSeparator = require('./get-separator')

module.exports = managePath

function managePath(env = {}, {platform = process.platform} = {platform: process.platform}) {
  const pathVar = getPathVar(env, platform)
  const separator = getSeparator(platform)
  const originalPath = env[pathVar]
  return {push, unshift, get, restore}

  function push(...paths) {
    return change(true, paths)
  }

  function unshift(...paths) {
    return change(false, paths)
  }

  function get() {
    return env[pathVar]
  }

  function restore() {
    env[pathVar] = originalPath
    return get()
  }

  function change(append, paths) {
    if (!append) {
      paths = paths.reverse()
    }
    paths.forEach(path => {
      const pathArray = getPathArray(path)
      addExistingPath(pathArray, env[pathVar], append)
      env[pathVar] = pathArray.join(separator)
    })
    return get()
  }

}

function getPathArray(pathToAdd) {
  if (Array.isArray(pathToAdd)) {
    return pathToAdd
  } else {
    return [pathToAdd]
  }
}

function addExistingPath(array, path, appendMode) {
  if (!path) {
    return
  }
  if (appendMode) {
    array.unshift(path)
  } else {
    array.push(path)
  }
}

