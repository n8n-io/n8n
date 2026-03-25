/**
 * Things we will need
 */
var async = require('async')
var distros = require('./os.json')
var fs = require('fs')
var os = require('os')

/**
 * Begin definition of globals.
 */
var cachedDistro = null // Store result of getLinuxDistro() after first call

/**
 * Module definition.
 */
module.exports = function getOs (cb) {
  // Node builtin as first line of defense.
  var osName = os.platform()
  // Linux is a special case.
  if (osName === 'linux') return getLinuxDistro(cb)
  // Else, node's builtin is acceptable.
  return cb(null, { os: osName })
}

/**
 * Identify the actual distribution name on a linux box.
 */
function getLinuxDistro (cb) {
  /**
   * First, we check to see if this function has been called before.
   * Since an OS doesn't change during runtime, its safe to cache
   * the result and return it for future calls.
   */
  if (cachedDistro) return cb(null, cachedDistro)

  /**
   * We are going to take our list of release files from os.json and
   * check to see which one exists. It is safe to assume that no more
   * than 1 file in the list from os.json will exist on a distribution.
   */
  getReleaseFile(Object.keys(distros), function (e, file) {
    if (e) return cb(e)

    /**
     * Multiple distributions may share the same release file.
     * We get our array of candidates and match the format of the release
     * files and match them to a potential distribution
     */
    var candidates = distros[file]
    var os = { os: 'linux', dist: candidates[0] }

    fs.readFile(file, 'utf-8', function (e, file) {
      if (e) return cb(e)

      /**
       * If we only know of one distribution that has this file, its
       * somewhat safe to assume that it is the distribution we are
       * running on.
       */
      if (candidates.length === 1) {
        return customLogic(os, getName(os.dist), file, function (e, os) {
          if (e) return cb(e)
          cachedDistro = os
          return cb(null, os)
        })
      }
      /**
       * First, set everything to lower case to keep inconsistent
       * specifications from mucking up our logic.
       */
      file = file.toLowerCase()
      /**
       * Now we need to check all of our potential candidates one by one.
       * If their name is in the release file, it is guarenteed to be the
       * distribution we are running on. If distributions share the same
       * release file, it is reasonably safe to assume they will have the
       * distribution name stored in their release file.
       */
      async.each(candidates, function (candidate, done) {
        var name = getName(candidate)
        if (file.indexOf(name) >= 0) {
          os.dist = candidate
          return customLogic(os, name, file, function (e, augmentedOs) {
            if (e) return done(e)
            os = augmentedOs
            return done()
          })
        } else {
          return done()
        }
      }, function (e) {
        if (e) return cb(e)
        cachedDistro = os
        return cb(null, os)
      })
    })
  })() // sneaky sneaky.
}

function getName (candidate) {
  /**
   * We only care about the first word. I.E. for Arch Linux it is safe
   * to simply search for "arch". Also note, we force lower case to
   * match file.toLowerCase() above.
   */
  var index = 0
  var name = 'linux'
  /**
   * Don't include 'linux' when searching since it is too aggressive when
   * matching (see #54)
   */
  while (name === 'linux') {
    name = candidate.split(' ')[index++].toLowerCase()
  }
  return name
}

/**
 * Loads a custom logic module to populate additional distribution information
 */
function customLogic (os, name, file, cb) {
  try { require(`./logic/${name}.js`)(os, file, cb) } catch (e) { cb(null, os) }
}

/**
 * getReleaseFile() checks an array of filenames and returns the first one it
 * finds on the filesystem.
 */
function getReleaseFile (names, cb) {
  var index = 0 // Lets keep track of which file we are on.
  /**
   * checkExists() is a first class function that we are using for recursion.
   */
  return function checkExists () {
    /**
     * Lets get the file metadata off the current file.
     */
    fs.stat(names[index], function (e, stat) {
      /**
       * Now we check if either the file didn't exist, or it is something
       * other than a file for some very very bizzar reason.
       */
      if (e || !stat.isFile()) {
        index++ // If it is not a file, we will check the next one!
        if (names.length <= index) { // Unless we are out of files.
          return cb(new Error('No unique release file found!')) // Then error.
        }
        return checkExists() // Re-call this function to check the next file.
      }
      cb(null, names[index]) // If we found a file, return it!
    })
  }
}
