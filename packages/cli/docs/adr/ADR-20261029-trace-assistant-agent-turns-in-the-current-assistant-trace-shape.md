# Trace Assistant agent turns in the current Assistant trace shape

Date: 2026-10-29

Status: Active

Decision Owner: Assistant

Source: https://linear.app/n8n/issue/AST-1820

## Context

The n8n Assistant is getting a refactor to run on Agents runtime instead of its own.
The current runtime sends LangSmith traces with product spans: a `turn` or `resume` root,
an `agent: orchestrator` child, and model, tool, sandbox, and build spans under it.
The roots carry metadata such as `message_group_id`, `final_status`, and `first_visible_state`.

That new Agents runtime that Assistant will run on emits raw OTel spans natively. These spans
have no product span names and no root metadata.

LangTracer is the internal tool that reviews Assistant conversations and builds eval cases. It
imports the LangSmith project and reads the product spans and the root metadata. Both runtimes
run side by side, and LangTracer must review the conversations of both.

## Decision

The Assistant on agents runtime sends traces in the same shape as the current runtime. A turn,
a resume, and the orchestrator span have the same names, nesting, and metadata in both
runtimes. The roots carry `assistant_runtime: agents`, so a reader can tell the runtimes apart.

The main reason is consistency: one trace shape lets LangTracer, its eval cases, and the people
who read traces treat both runtimes the same, with no changes to LangTracer.

The Agents runtime stays independent of LangSmith. It gives a system-agent provider one
optional hook that runs the whole turn inside a context of the provider. The Assistant
provider uses the hook to keep its orchestrator span active during the turn.

## Alternatives Considered

1. **Teach LangTracer to read raw Agents runtime OTel spans.** Rejected it for two reasons.
   LangTracer would need a second import path and a second mapping to conversations, turns,
   and tool calls. The two runtimes would also give different traces for the same
   conversation, so reviews and eval cases could not compare them.
2. **Send both shapes.** Rejected it because each turn would export two trees. That doubles
   the trace volume and leaves the reader to pick the right tree.

## Consequences

1. LangTracer reviews Assistant agent conversations without changes.
2. The Assistant agent depends on the trace helpers of the current runtime. A change to the
   trace shape must keep both runtimes the same.
3. A behaviour that the current runtime does not have, such as a steered message, needs a new
   span. Its name and place must fit the existing shape.
4. Work that the Agents runtime starts outside the turn hook does not nest under the turn.
5. When the current runtime is removed, a new record can choose a trace shape for the Agents
   runtime alone, and we should probably take another look at supporting raw OTel traces at
   that point.

## Links

RFC: -

Documentation: -

Related ADRs: -
