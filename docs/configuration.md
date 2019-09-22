

# Configuration

It is possible to change some of the n8n defaults via special environment variables.
The ones that currently exist are:


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
