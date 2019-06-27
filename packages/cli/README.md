# n8n - Workflow Automation Tool

![n8n.io - Workflow Automation](https://n8n.io/n8n-logo.png)

n8n is a free node based "Open Source" (with Commons Clause)
Workflow Automation Tool. It can be self-hosted, easily extended, and
so also used with internal tools.

<a href="https://n8n.io/n8n-screenshot.png"><img src="https://n8n.io/n8n-screenshot.png" width="550" alt="n8n.io - Screenshot"></a>

Is still in beta so can not guarantee that everything works perfectly. Also
is there currently not much documentation. That will hopefully change soon.


## Demo

A short demo (< 3 min) which shows how to create a simple workflow which
automatically sends a new Slack notification every time a Github repository
received or lost a star:

[https://www.youtube.com/watch?v=ePdcf0yaz1c](https://www.youtube.com/watch?v=ePdcf0yaz1c)


## Give n8n a spin

To simply spin up n8n to have a look and give it spin you can simply run:

```bash
npx n8n
```

It will then download everything which is needed and start n8n.

You can then access n8n by opening:
[http://localhost:5678](http://localhost:5678)


## Installation

To fully install n8n globally execute:

```bash
npm install n8n -g
```

## Start

After the installation n8n can be started by simply typing in:

```bash
n8n
# or
n8n start
```


### Start with tunnel

To be able to use webhooks which all triggers of external services like Github
rely on n8n has to be reachable from the web. To make that easy n8n has a
special tunnel service which redirects requests from our servers to your local
n8n instance.

To use it simply start n8n with `--tunnel`

```bash
n8n start --tunnel
```


### Start with MongoDB as Database

By default n8n uses SQLite to save credentials, past executions and workflows.
To use MongoDB instead you can either overwrite the default configuration on
startup like this:

```bash
n8n start \
  --NODE_CONFIG='{\"database\":{\"type\":\"mongodb\", \"mongodbConfig\":{\"url\":\"mongodb://MONGO_USER:MONGO_PASSWORD@MONGO_SERVER:MONGO_PORT/MONGO_DATABASE\"}}}'"
```

Or you can provide a custom configuration file by copying the default
configuration file [(config/defaults.ts)](https://github.com/n8n-io/n8n/blob/master/packages/cli/config/default.ts).
Make sure the file is also called `default.ts` and then set the path of the
parent directory as environment variable `NODE_CONFIG_DIR`.

For example like this:
```bash
export NODE_CONFIG_DIR=/directory-containing-config-file
```

Change in the config file the value under `database.type` from `sqlite`
to `mongodb` and adjust the Mongo connection URL
`database.mongodbConfig` accordingly.

n8n will then read your custom configuration and use MongoDB instead.


## Execute Workflow from CLI

Workflows can not just be started by triggers, webhooks or manually via the
Editor it is also possible to execute them directly via the CLI.

Execute a saved workflow by its ID:

```bash
n8n execute --id <ID>
```

Execute a workflow from a workflow file:
```bash
n8n execute --file <WORKFLOW_FILE>
```


## Create Custom Nodes

It is very easy to create own nodes for n8n. More information about that can
be found in the documentation of "n8n-node-dev" which is a small CLI which
helps with n8n-node-development.

[To n8n-node-dev](https://github.com/n8n-io/n8n/tree/master/packages/node-dev)


## License

[Apache 2.0 with Commons Clause](https://github.com/n8n-io/n8n/blob/master/packages/cli/LICENSE.md)


## Development

When developing n8n can be started with `npm run start:dev`.
It will then automatically restart n8n every time a file changes.
