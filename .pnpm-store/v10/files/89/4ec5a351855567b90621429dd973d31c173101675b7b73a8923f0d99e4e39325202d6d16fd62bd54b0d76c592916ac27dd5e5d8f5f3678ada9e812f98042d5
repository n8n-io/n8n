'use strict'

const la = require('lazy-ass')

/* eslint-env mocha */
describe('utils', () => {
  const event = {
    pull_request: {
      head: {
        ref: 'test-ref',
        sha: 'test-sha'
      },
      base: {
        ref: 'test-ref',
        sha: 'test-sha'
      },
      issue_url: 'test-issue',
      html_url: 'test-html',
      title: 'test-title'
    },
    sender: {
      avatar_url: 'test-avatar',
      html_url: 'test-html'
    }
  }

  const eventResult = {
    headRef: event.pull_request.head.ref,
    headSha: event.pull_request.head.sha,
    baseRef: event.pull_request.base.ref,
    baseSha: event.pull_request.base.sha,
    issueUrl: event.pull_request.issue_url,
    htmlUrl: event.pull_request.html_url,
    prTitle: event.pull_request.title,
    senderAvatarUrl: event.sender.avatar_url,
    senderHtmlUrl: event.sender.html_url
  }

  describe('E2E gha event data', () => {
    const { getGhaEventData } = require('./utils')

    it('returns event data if file path and gha env are truthy', () => {
      const eventData = getGhaEventData(
        process.env.GITHUB_EVENT_PATH,
        process.env.GITHUB_ACTIONS
      )

      la(JSON.stringify(eventData) === JSON.stringify(eventResult), eventData)
    })
  })
})
