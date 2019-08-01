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


### Start with other Database

By default n8n uses SQLite to save credentials, past executions and workflows.
n8n however also supports MongoDB and PostgresDB. To use them simply a few
environment variables have to be set.


#### Start with MongoDB as Database

To use MongoDB as database you can provide the following environment variables like
in the example bellow:
 - `DB_TYPE=mongodb`
 - `DB_MONGODB_CONNECTION_URL=<CONNECTION_URL>`

Replace the following placeholders with the actual data:
 - MONGO_DATABASE
 - MONGO_HOST
 - MONGO_PORT
 - MONGO_USER
 - MONGO_PASSWORD

```bash
export DB_TYPE=mongodb
export DB_MONGODB_CONNECTION_URL=mongodb://MONGO_USER:MONGO_PASSWORD@MONGO_HOST:MONGO_PORT/MONGO_DATABASE
n8n start
```


#### Start with PostgresDB as Database

To use PostgresDB as database you can provide the following environment variables
 - `DB_TYPE=postgresdb`
 - `DB_POSTGRESDB_DATABASE` (default: 'n8n')
 - `DB_POSTGRESDB_HOST` (default: 'localhost')
 - `DB_POSTGRESDB_PORT` (default: 5432)
 - `DB_POSTGRESDB_USER` (default: 'root')
 - `DB_POSTGRESDB_PASSWORD` (default: empty)



```bash
export DB_TYPE=postgresdb
export DB_POSTGRESDB_DATABASE=n8n
export DB_POSTGRESDB_HOST=postgresdb
export DB_POSTGRESDB_PORT=5432
export DB_POSTGRESDB_USER=n8n
export DB_POSTGRESDB_PASSWORD=n8n

n8n start
```


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


## Keyboard Shortcuts

The following keyboard shortcuts can currently be used:

### General

 - **Ctrl + a**: Select all nodes
 - **Ctrl + Alt + n**: Create new workflow
 - **Ctrl + o**: Open workflow
 - **Ctrl + s**: Save current workflow
 - **Ctrl + v**: Paste nodes
 - **Tab**: Open "Node Creator". Type to filter and navigate with arrow keys. To create press "enter"


### With node/s selected

 - **ArrowDown**: Select sibling node bellow the current one
 - **ArrowLeft**: Select node left of the current one
 - **ArrowRight**: Select node right of the current one
 - **ArrowUp**: Select sibling node above the current one
 - **Ctrl + c**: Copy nodes
 - **Ctrl + x**: Cut nodes
 - **d**: Deactivate nodes
 - **Delete**: Delete nodes
 - **F2**: Rename node
 - **Shift + ArrowLeft**: Select all nodes left of the current one
 - **Shift + ArrowRight**: Select all nodes right of the current one


## License

[Apache 2.0 with Commons Clause](https://github.com/n8n-io/n8n/blob/master/packages/cli/LICENSE.md)


## Development

When developing n8n can be started with `npm run start:dev`.
It will then automatically restart n8n every time a file changes.
