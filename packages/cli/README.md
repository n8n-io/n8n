# n8n - Workflow Automation Tool

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/docs/images/n8n-logo.png)

n8n is a free node-based "Open Source" (with Commons Clause)
Workflow Automation Tool. It can be self-hosted, easily extended, and
so also used with internal tools.

<a href="https://raw.githubusercontent.com/n8n-io/n8n/master/docs/images/n8n-screenshot.png"><img src="https://raw.githubusercontent.com/n8n-io/n8n/master/docs/images/n8n-screenshot.png" width="550" alt="n8n.io - Screenshot"></a>

Is still in beta so can not guarantee that everything works perfectly. Also
is there currently not much documentation. That will hopefully change soon.

## Contents

<!-- TOC -->
- [Demo](#demo)
- [Give n8n a spin](#give-n8n-a-spin)
- [Installation](#installation)
- [Start](#start)
- [Execute Workflow from CLI](#execute-workflow-from-cli)
- [Create Custom Nodes](#create-custom-nodes)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Run n8n on own server](#run-n8n-on-own-server)
- [Hosted n8n](#hosted-n8n)
- [What does n8n mean and how do you pronounce it](#what-does-n8n-mean-and-how-do-you-pronounce-it)
- [Upgrading](#upgrading)
- [License](#license)
- [Development](#development)
<!-- /TOC -->

## Demo

[:tv: A short demo (< 3 min)](https://www.youtube.com/watch?v=ePdcf0yaz1c)
which shows how to create a simple workflow which automatically sends a new
Slack notification every time a Github repository received or lost a star.

## Give n8n a spin

To spin up n8n to have a look you can run:

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

> **WARNING**: This is only meant for local development and testing. Should not be used in production!

To be able to use webhooks which all triggers of external services like Github
rely on n8n has to be reachable from the web. To make that easy n8n has a
special tunnel service (uses this code: [https://github.com/localtunnel/localtunnel](https://github.com/localtunnel/localtunnel)) which redirects requests from our servers to your local
n8n instance.

To use it simply start n8n with `--tunnel`

```bash
n8n start --tunnel
```

### Securing n8n

By default, n8n can be accessed by everybody. This is OK if you have it only running
locally but if you deploy it on a server which is accessible from the web you have
to make sure that n8n is protected!
Right now we have very basic protection via basic-auth in place. It can be activated
by setting the following environment variables:

```
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=<USER>
N8N_BASIC_AUTH_PASSWORD=<PASSWORD>
```


### Start with other Database

By default, n8n uses SQLite to save credentials, past executions and workflows.
n8n however also supports MongoDB and PostgresDB. To use them simply a few
environment variables have to be set.


#### Start with MongoDB as Database

> **WARNING**: Use Postgres if possible! Mongo has problems with saving large
> amounts of data in a document and causes also other problems. So support will
> may be dropped in the future.

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


## Passing Sensitive Data via File

To avoid passing sensitive information via environment variables "_FILE" may be
appended to some environment variables. It will then load the data from a file
with the given name. That makes it possible to load data easily from
Docker- and Kubernetes-Secrets.

The following environment variables support file input:
 - DB_MONGODB_CONNECTION_URL_FILE
 - DB_POSTGRESDB_DATABASE_FILE
 - DB_POSTGRESDB_HOST_FILE
 - DB_POSTGRESDB_PASSWORD_FILE
 - DB_POSTGRESDB_PORT_FILE
 - DB_POSTGRESDB_USER_FILE
 - N8N_BASIC_AUTH_PASSWORD_FILE
 - N8N_BASIC_AUTH_USER_FILE


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
 - **Ctrl + s**: Save the current workflow
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


## Run n8n on own server

To run n8n on your webserver with own domain some environment variables
should be set to the appropriate values.

A possible configuration to run n8n on `https://n8n.example.com/` would look
like this:

```
N8N_HOST: "n8n.example.com"
N8N_PROTOCOL: "https"
N8N_PORT: "443"
VUE_APP_URL_BASE_API: "https://n8n.example.com/"
```

***Important***: Make sure that you secure your n8n instance like described above in "Securing n8n"!


## Additional Configuration

It is possible to change some of the n8n defaults via special environment variables.
The ones that currently exist are:


### EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS

Normally executions which got started via the Editor UI will not be saved as
they are normally only for testing and debugging. That default can be changed
with this environment variable.

```
EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
```

This setting can also be overwritten on a per workflow basis in the workflow
settings in the Editor UI.


### EXECUTIONS_DATA_SAVE_ON_ERROR / EXECUTIONS_DATA_SAVE_ON_SUCCESS

When a workflow gets executed it will save the result in the database. That is
the case for executions that did succeed and for the ones that failed. That
default behavior can be changed like this:

```
EXECUTIONS_DATA_SAVE_ON_ERROR=none
EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
```

Possible values are:
 - **all**: Saves all data
 - **none**: Do not save anything (recommended if a workflow runs a very often and/or processes a lot of data, setup "Error Workflow" instead)

These settings can also be overwritten on a per workflow basis in the workflow
settings in the Editor UI.


### GENERIC_TIMEZONE

The timezone is set by default to "America/New_York". It gets for example used by the
Cron-Node to know at what time the workflow should be started at. To set a different
default timezone simply set `GENERIC_TIMEZONE` to the appropriate value like for example
for Berlin (Germany):

```
GENERIC_TIMEZONE="Europe/Berlin"
```

You can find the name of your timezone here:
[https://momentjs.com/timezone/](https://momentjs.com/timezone/)


### NODES_EXCLUDE

It is possible to not allow users to use nodes of a specific node type. If you, for example,
do not want that people can write data to disk with the "n8n-nodes-base.writeBinaryFile"
node and can not execute commands with the "n8n-nodes-base.executeCommand" node you can
set the following:

```
NODES_EXCLUDE="[\"n8n-nodes-base.executeCommand\",\"n8n-nodes-base.writeBinaryFile\"]"
```



## Hosted n8n

If you are interested in a hosted version of n8n on our infrastructure please contact us via:
[hosting@n8n.io](mailto:hosting@n8n.io)



## What does n8n mean and how do you pronounce it

**Short answer:** It means "nodemation"

**Long answer:** I get that question quite often (more often than I expected)
so decided it is probably best to answer it here. While looking for a
good name for the project with a free domain I realized very fast that all the
good ones I could think of were already taken. So, in the end, I choose
nodemation. "node-" in the sense that it uses a Node-View and that it uses
Node.js and "-mation" for "automation" what the project is supposed to help with.
Did however not like how long the name was and could not imagine writing
something that long every time in the CLI. That is when I then ended up on
"n8n". Sure does not work perfectly but does neither for Kubernetes (k8s) and
did not hear anybody complain there. So I guess it should be ok.



## Upgrading

Before you upgrade to the latest version make sure to check here if there are any breaking changes which concern you:
[Breaking Changes](https://github.com/n8n-io/n8n/blob/master/packages/cli/BREAKING-CHANGES.md)


## License

[Apache 2.0 with Commons Clause](https://github.com/n8n-io/n8n/blob/master/packages/cli/LICENSE.md)


## Development

When developing n8n can be started with `npm run start:dev`.
It will then automatically restart n8n every time a file changes.
