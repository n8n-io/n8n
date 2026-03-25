/*
 * getAbsoluteFSPath
 * @return {string} When run in NodeJS env, returns the absolute path to the current directory
 *                  When run outside of NodeJS, will return an error message
 */
const getAbsoluteFSPath = function () {
  // detect whether we are running in a browser or nodejs
  if (typeof module !== "undefined" && module.exports) {
    return require("path").resolve(__dirname)
  }
  throw new Error('getAbsoluteFSPath can only be called within a Nodejs environment');
}

module.exports = getAbsoluteFSPath
