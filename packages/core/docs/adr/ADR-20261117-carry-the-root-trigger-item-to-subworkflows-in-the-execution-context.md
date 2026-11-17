# Carry the root trigger item to subworkflows in the execution context

Date: 2026-11-17

Status: Active

Decision Owner: API & OEM

Source: https://linear.app/n8n/issue/API-624

## Context

A workflow that starts from a trigger, for example a Webhook node, often calls subworkflows.
Nodes in a subworkflow cannot read the output of the root trigger. The caller must map the
values into the inputs of each call, at each level of the call chain.

An error workflow receives the error, the execution ID, and an allow-listed execution context.
It does not receive trigger data. The run that failed can be a subworkflow run. While a
subworkflow runs, its root run is still running, so the run data of the root is not saved and
an error workflow cannot fetch it.

Each run has an execution context. A context establishment hook can read the trigger items of
a root run. Each sub-execution copies the context of its parent when it starts, at every depth.
The context is saved with the execution, so it is still there after a run resumes.

## Decision

A workflow setting, `shareTriggerData`, controls the relay. It is off by default.

When the setting is on, the root run stores the JSON of the first item of its trigger in its
execution context, as `triggerData`. Only a root run stores it. A sub-execution keeps the value
that it inherits and never replaces it with the item of its own trigger.

Nodes read the value with the expression `$execution.triggerData`. This works in the root run
and in each sub-execution, at every depth.

The error workflow of the root run, or of one of its sub-executions, receives the value as
`execution.triggerData`. The allow-list of the error workflow context does not include the
field. The error workflow receives the value only as this separate property.

The root run does not store the value when its data is redacted.

The main reason: the execution context already travels to each sub-execution and is saved with
each run. One field in the context serves all subworkflows and all error workflows, and it
does not change the items that nodes produce.

## Alternatives Considered

1. **Map the values into the inputs of each call.** This works today. We rejected it as the
   only solution for three reasons. Each call at each level must repeat the mapping. A change
   to the trigger needs a change to each call. An error workflow of a subworkflow cannot get
   the values at all.
2. **Add the item to the output of the Execute Workflow Trigger.** We rejected it because it
   would change the shape of the items that the subworkflow receives. Subworkflows that define
   their input fields would fail, and the data would repeat on each item.
3. **Read the run data of the root when a node or an error workflow needs it.** We rejected it
   because the root run is still running when its subworkflows run. Its run data is not saved,
   so a lookup through the API would fail.
4. **Send trigger data only to error workflows, from the run data of the failed run.** We
   rejected it because subworkflows would get no access. Also, a sub-execution inherits the
   name of the root trigger node. A lookup by that name in the run data of a subworkflow could
   return the output of a different node with the same name.
5. **Encrypt the field, as the context does for secure artifacts.** We rejected it because the
   root run already saves the same item without encryption in its run data. Encryption would
   add cost to each sub-execution without new protection.
6. **Require that each subworkflow also turns on the setting.** We rejected it because the root
   workflow selects the subworkflows that it calls, and the caller policy of each subworkflow
   already controls which workflows can call it. A second setting would add work and no
   control.

## Consequences

1. Each sub-execution saves a copy of the root trigger item in its execution context. A large
   item, for example a large webhook body, increases the storage for each sub-execution. The
   capture needs a size limit.
2. Redaction applies to node output, not to the execution context. If a subworkflow redacts
   its own data, its saved execution still contains the root trigger item without redaction.
3. The root trigger item can reach a subworkflow or an error workflow in a different project
   when a caller policy allows the call. The owner of the root workflow accepts this when they
   turn on the setting.
4. The item contains all trigger values, including headers that a Webhook node uses for
   authentication. A workflow that shares trigger data must remove such values itself where it
   uses them.
5. The expression `$execution.triggerData` must be available in each place that evaluates
   expressions, including the task runner that runs Code nodes.
6. A new field in the execution context reaches an error workflow only when it is added to
   the allow-list or copied to a separate property, as this decision does.

## Links

RFC: -

Documentation: -

Related ADRs: -
