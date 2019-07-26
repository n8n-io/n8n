# n8n - Workflow Automation Tool

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/docs/images/n8n-logo.png)

n8n is a free node based "Open Source" (with Commons Clause)
Workflow Automation Tool. It can be self-hosted, easily extended, and
so also used with internal tools.

<a href="https://raw.githubusercontent.com/n8n-io/n8n/master/docs/images/n8n-screenshot.png"><img src="https://raw.githubusercontent.com/n8n-io/n8n/master/docs/images/n8n-screenshot.png" width="550" alt="n8n.io - Screenshot"></a>

Is still in beta so can not guarantee that everything works perfectly. Also
is there currently not much documentation. That will hopefully change soon.

## Demo

A short demo (< 3 min) which shows how to create a simple workflow which
automatically sends a new Slack notification every time a Github repository
received or lost a star:

[https://www.youtube.com/watch?v=ePdcf0yaz1c](https://www.youtube.com/watch?v=ePdcf0yaz1c)


## Usage

Information about how to install and use it can be found in the cli package [here](https://github.com/n8n-io/n8n/tree/master/packages/cli)

And information about how to run it in Docker [here](https://github.com/n8n-io/n8n/tree/master/docker/images/n8n)


## Development Setup

1. Clone the repository
2. Go into repository folder
3. Run: `npm install`
4. Run: `npx lerna bootstrap --hoist`
5. Run: `npm run build` or `npx lerna exec npm run build` (if lerna is not installed)

## Start

Execute: `npm run start`


## License

[Apache 2.0 with Commons Clause](https://github.com/n8n-io/n8n/blob/master/packages/cli/LICENSE.md)
