# Prepare the workspace when the model starts a tool that declares it

Date: 2026-10-29

Status: Active

Decision Owner: Assistant

Source: https://github.com/n8n-io/n8n/pull/42382

## Context

An agent workspace can be lazy. The first tool call that uses it creates it. In n8n Assistant,
this creation starts a remote sandbox, which takes about 5 seconds. The tool call starts only
after the model has streamed all of its arguments, for example a whole workflow file. So the
user waits for the arguments and then for the sandbox, one after the other.

The runtime cannot know in advance which turns will use the workspace. Many turns never use it.
A sandbox that starts for such a turn costs money and setup load. A skill load does not show a
build reliably: an agent can load a skill and not build, and skills change often.

## Decision

A tool declares that its handler uses the workspace. When the model begins to stream the input
of such a tool, the agent runtime asks the workspace to start its preparation in the
background. The tool call then joins the preparation that is in progress.

Preparation is best effort. It does not throw, and the runtime can request it more than once.
The tool call still owns the result: if preparation fails, the tool call makes its own attempt
to create the workspace and reports the error of that attempt.

The trigger is the start of the tool call that needs the workspace. It is the earliest signal
that does not guess.

## Alternatives Considered

**Prepare at turn start.** We rejected it because every turn would start a sandbox, also a turn
that only chats. It would hide the most latency, but it moves the cost to all turns.

**Prepare when the workflow builder skill loads.** We rejected it for two reasons. A skill load
does not always lead to a build, so it would start sandboxes that no tool uses. Also, the
trigger would depend on the name and the role of one skill, and skills are reworked often.

**Keep a list of tool names in the host.** We rejected it because the list would live far from
the tools. A new tool that uses the workspace would not be on the list, and nothing would show
the gap.

**Give each tool a hook that runs when its input starts.** We rejected it because it is more
general than the problem. It would let any tool run side effects while the model still writes
its arguments.

## Consequences

- The preparation overlaps only with the argument stream of one tool call. A first call with
  small arguments, such as a short command, hides little of the setup.
- A tool that uses the workspace and does not declare it keeps the old behaviour: the setup
  blocks its call. A tool that declares it and does not use it starts a workspace early. Neither
  case is a correctness error.
- A workspace that wraps another workspace must pass the preparation request through.
- Tools outside the runtime, such as the latency benchmark, see only tool names. They must keep
  their own list of the tools that declare the workspace.

## Links

RFC: -

Documentation: -

Related ADRs: -
