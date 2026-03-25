const { getGitBranch } = require('./git-api')
const debug = require('debug')('commit-info')
const fs = require('fs')

function firstFoundValue (keys, object = process.env) {
  const found = keys.find(key => {
    return key in object
  })
  return found ? object[found] : null
}

const getValue = name => o => {
  if (name in o) {
    return o[name]
  }
  return null
}

/**
 * Uses "git" command to find the current branch
 *
 * @param {string} pathToRepo
 * @returns {Promise<string|null>} Resolves with Git branch or null
 */
function getBranch (pathToRepo) {
  pathToRepo = pathToRepo || process.cwd()
  debug('using Git tool to find branch')
  return getGitBranch(pathToRepo)
}

/**
 * Looks up commit information from environment keys.
 */
function getCommitInfoFromEnvironment (env = process.env) {
  return {
    branch: getValue('COMMIT_INFO_BRANCH')(env),
    message: getValue('COMMIT_INFO_MESSAGE')(env),
    email: getValue('COMMIT_INFO_EMAIL')(env),
    author: getValue('COMMIT_INFO_AUTHOR')(env),
    sha: getValue('COMMIT_INFO_SHA')(env),
    timestamp: getValue('COMMIT_INFO_TIMESTAMP')(env),
    remote: getValue('COMMIT_INFO_REMOTE')(env)
  }
}

/**
 * Returns list of Git properties that this module searches for
 */
function getFields () {
  return ['branch', 'message', 'email', 'author', 'sha', 'remote', 'timestamp']
}

/**
 * Gets the event data in github actions environment
 * @param {string} eventFilePath
 * @param {string 'true' | 'false' | undefined} isGha
 * @returns {headRef: string; headSha: string; baseRef: string; baseSha: string; issueUrl: string; htmlUrl: string; prTitle: string; senderAvatarUrl: string; senderHtmlUrl: string;}
 */
function getGhaEventData (eventFilePath, isGha) {
  try {
    if (!eventFilePath || isGha !== 'true') {
      return
    }

    debug('Retreiving GitHub Actions data from %s', eventFilePath)
    const data = JSON.parse(fs.readFileSync(eventFilePath))

    return {
      headRef: data.pull_request.head.ref,
      headSha: data.pull_request.head.sha,
      baseRef: data.pull_request.base.ref,
      baseSha: data.pull_request.base.sha,
      issueUrl: data.pull_request.issue_url,
      htmlUrl: data.pull_request.html_url,
      prTitle: data.pull_request.title,
      senderAvatarUrl: data.sender.avatar_url,
      senderHtmlUrl: data.sender.html_url
    }
  } catch (e) {
    debug('Retreiving GitHub Actions data error: %s', e)
  }
}

module.exports = {
  firstFoundValue,
  getBranch,
  getCommitInfoFromEnvironment,
  getFields,
  getGhaEventData
}
