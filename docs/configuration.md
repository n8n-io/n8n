

# Configuration

It is possible to change some of the n8n defaults via special environment variables.
The ones that currently exist are:


## Publish

Sets how n8n should be made available.

```bash
# The port n8n should be made available on
N8N_PORT=5678

# This ones are currently only important for the webhook URL creation.
# So if "WEBHOOK_TUNNEL_URL" got set they do get ignored. It is however
# encouraged to set them correctly anyway in case they will become
# important in the future.
N8N_PROTOCOL=https
N8N_HOST=n8n.example.com
```


## Base URL

Tells the frontend how to reach the REST API of the backend.

```bash
export VUE_APP_URL_BASE_API="https://n8n.example.com/"
```


## Execution Data Manual Runs

n8n creates a random encryption key automatically on the first launch and saves
it in the `~/.n8n` folder. That key gets used to encrypt the credentials before
they get saved to the database. It is also possible to overwrite that key and
set it via an environment variable.

```bash
export N8N_ENCRYPTION_KEY="<SOME RANDOM STRING>"
```


## Execution Data Manual Runs

Normally executions which got started via the Editor UI will not be saved as
they are normally only for testing and debugging. That default can be changed
with this environment variable.

```bash
export EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
```

This setting can also be overwritten on a per workflow basis in the workflow
settings in the Editor UI.


## Execution Data Error/Success

When a workflow gets executed it will save the result in the database. That is
the case for executions that did succeed and for the ones that failed. That
default behavior can be changed like this:

```bash
export EXECUTIONS_DATA_SAVE_ON_ERROR=none
export EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
```

Possible values are:
 - **all**: Saves all data
 - **none**: Do not save anything (recommended if a workflow runs a very often and/or processes a lot of data, set up "Error Workflow" instead)

These settings can also be overwritten on a per workflow basis in the workflow
settings in the Editor UI.


## Exclude Nodes

It is possible to not allow users to use nodes of a specific node type. If you, for example,
do not want that people can write data to disk with the "n8n-nodes-base.writeBinaryFile"
node and can not execute commands with the "n8n-nodes-base.executeCommand" node you can
set the following:

```bash
export NODES_EXCLUDE="[\"n8n-nodes-base.executeCommand\",\"n8n-nodes-base.writeBinaryFile\"]"
```


## Custom Nodes Location

Every user can add custom nodes that get loaded by n8n on startup. The default
location is in the subfolder `.n8n/custom` of the user which started n8n.
Additional folders can be defined via an environment variable.

```bash
export N8N_CUSTOM_EXTENSIONS="/home/jim/n8n/custom-nodes;/data/n8n/nodes"
```


## Use built-in modules in Function-Nodes

By default is it for security reasons not allowed to import modules in Function-Nodes.
It is, however, possible to lift that restriction for built-in modules by setting the
environment variable `NODE_FUNCTION_ALLOW_BUILTIN`.

```bash
# Allows usage of all builtin modules
export NODE_FUNCTION_ALLOW_BUILTIN=*

# Allows usage of only crypto
export NODE_FUNCTION_ALLOW_BUILTIN=crypto

# Allows usage of only crypto and fs
export NODE_FUNCTION_ALLOW_BUILTIN=crypto,fs
```


## Timezone

The timezone is set by default to "America/New_York". It gets for example used by the
Cron-Node to know at what time the workflow should be started at. To set a different
default timezone simply set `GENERIC_TIMEZONE` to the appropriate value like for example
for Berlin (Germany):

```bash
export GENERIC_TIMEZONE="Europe/Berlin"
```

You can find the name of your timezone here:
[https://momentjs.com/timezone/](https://momentjs.com/timezone/)


## User Folder

User-specific data like the encryption key, SQLite database file, and
the ID of the tunnel (if used) get by default saved in the subfolder
`.n8n` of the user which started n8n. It is possible to overwrite the
user-folder via an environment variable.

```bash
export N8N_USER_FOLDER="/home/jim/n8n"
```


## Webhook URL

The webhook URL will normally be created automatically by combining
`N8N_PROTOCOL`, `N8N_HOST` and `N8N_PORT`. If n8n runs, however, behind a
reverse proxy that would not work. Because n8n does for example run internally
on port 5678 but is exposed to the web via the reverse proxy on port 443. In
that case, it is important to set the webhook URL manually that it can be
displayed correctly in the Editor UI and even more important that the correct
webhook URLs get registred with external services.

```bash
export WEBHOOK_TUNNEL_URL="https://n8n.example.com/"
```
