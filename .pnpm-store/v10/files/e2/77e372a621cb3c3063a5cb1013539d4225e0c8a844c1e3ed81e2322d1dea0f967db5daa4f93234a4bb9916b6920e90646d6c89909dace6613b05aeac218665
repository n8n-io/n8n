# `@actions/github`

> A hydrated Octokit client.

## Usage

Returns an authenticated Octokit client that follows the machine [proxy settings](https://help.github.com/en/actions/hosting-your-own-runners/using-a-proxy-server-with-self-hosted-runners) and correctly sets GHES base urls. See https://octokit.github.io/rest.js for the API.

```js
const github = require('@actions/github');
const core = require('@actions/core');

async function run() {
    // This should be a token with access to your repository scoped in as a secret.
    // The YML workflow will need to set myToken with the GitHub Secret Token
    // myToken: ${{ secrets.GITHUB_TOKEN }}
    // https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
    const myToken = core.getInput('myToken');

    const octokit = github.getOctokit(myToken)

    // You can also pass in additional options as a second parameter to getOctokit
    // const octokit = github.getOctokit(myToken, {userAgent: "MyActionVersion1"});

    const { data: pullRequest } = await octokit.rest.pulls.get({
        owner: 'octokit',
        repo: 'rest.js',
        pull_number: 123,
        mediaType: {
          format: 'diff'
        }
    });

    console.log(pullRequest);
}

run();
```

You can also make GraphQL requests. See https://github.com/octokit/graphql.js for the API.

```js
const result = await octokit.graphql(query, variables);
```

Finally, you can get the context of the current action:

```js
const github = require('@actions/github');

const context = github.context;

const newIssue = await octokit.rest.issues.create({
  ...context.repo,
  title: 'New issue!',
  body: 'Hello Universe!'
});
```

## Webhook payload typescript definitions

The npm module `@octokit/webhooks-definitions` provides type definitions for the response payloads. You can cast the payload to these types for better type information.

First, install the npm module `npm install @octokit/webhooks-definitions`

Then, assert the type based on the eventName
```ts
import * as core from '@actions/core'
import * as github from '@actions/github'
import {PushEvent} from '@octokit/webhooks-definitions/schema'

if (github.context.eventName === 'push') {
  const pushPayload = github.context.payload as PushEvent
  core.info(`The head commit is: ${pushPayload.head_commit}`)
}
```

## Extending the Octokit instance
`@octokit/core` now supports the [plugin architecture](https://github.com/octokit/core.js#plugins). You can extend the GitHub instance using plugins. 

For example, using the `@octokit/plugin-enterprise-server` you can now access enterprise admin apis on GHES instances.

```ts
import { GitHub, getOctokitOptions } from '@actions/github/lib/utils'
import { enterpriseServer220Admin } from '@octokit/plugin-enterprise-server'

const octokit = GitHub.plugin(enterpriseServer220Admin)
// or override some of the default values as well 
// const octokit = GitHub.plugin(enterpriseServer220Admin).defaults({userAgent: "MyNewUserAgent"})

const myToken = core.getInput('myToken');
const myOctokit = new octokit(getOctokitOptions(token))
// Create a new user
myOctokit.rest.enterpriseAdmin.createUser({
  login: "testuser",
  email: "testuser@test.com",
});
```
