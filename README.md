# n8n - Workflow Automation Tool

![n8n.io - Workflow Automation](https://n8n.io/n8n-logo.png)

n8n is a tool which allows to easily and fast automate different taks.

Is still in beta so can not guarantee that everything works perfectly. Also
is there currently not much documentation. That will hopefully change soon.


## Usage

Information about how to install and use it can be found in the cli package [here](packages/cli/README)

And information about how to run it in Docker [here](docker/images/n8n/README.md)


## Development Setup

1. Clone the repository
2. Go into repository folder
3. Run: `npm install`
4. Run: `npx lerna bootstrap --hoist`
5. Run: `npm run build` or `npx lerna exec npm run build` (if lerna is not installed)

## Start

Execute: `npm run start`


## License

[Apache 2.0 with Commons Clause](LICENSE)
