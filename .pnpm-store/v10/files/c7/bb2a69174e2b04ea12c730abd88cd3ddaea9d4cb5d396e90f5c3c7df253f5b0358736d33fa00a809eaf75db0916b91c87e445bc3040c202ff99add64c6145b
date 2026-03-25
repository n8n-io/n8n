'use strict'

const debug = require('debug')('commit-info')
const {
  getSubject,
  getBody,
  getMessage,
  getEmail,
  getAuthor,
  getSha,
  getTimestamp,
  getRemoteOrigin
} = require('./git-api')
const {
  getBranch,
  getCommitInfoFromEnvironment,
  getGhaEventData
} = require('./utils')
const Promise = require('bluebird')
const { mergeWith, or } = require('ramda')

function commitInfo (folder) {
  folder = folder || process.cwd()
  debug('commit-info in folder', folder)

  return Promise.props({
    branch: getBranch(folder),
    message: getMessage(folder),
    email: getEmail(folder),
    author: getAuthor(folder),
    sha: getSha(folder),
    timestamp: getTimestamp(folder),
    remote: getRemoteOrigin(folder),
    ghaEventData: getGhaEventData(
      process.env.GITHUB_EVENT_PATH,
      process.env.GITHUB_ACTIONS
    )
  }).then(info => {
    const envVariables = getCommitInfoFromEnvironment()
    debug('git commit: %o', info)
    debug('env commit: %o', envVariables)
    return mergeWith(or, envVariables, info)
  })
}

module.exports = {
  commitInfo,
  getBranch,
  getMessage,
  getEmail,
  getAuthor,
  getSha,
  getRemoteOrigin,
  getSubject,
  getTimestamp,
  getBody
}
