---
name: n8n-memory-optimization
description: Diagnose memory pressure in n8n workflows and propose smaller batches, leaner data, and bounded subworkflows. Use for out-of-memory errors, large executions, or high memory use. Requires workflow and execution details, supplied by the user or read through n8n tools.
---

# Reduce workflow memory use

## Requirements

Use the n8n workflow and execution tools available in this session. If they are
unavailable, ask for the workflow JSON and the relevant execution error. Do not
assume access to a shell, files, instance settings, or deployment tools.

## Find the cause

1. Establish whether the failure affects one execution or the whole instance.
2. Check whether it occurs during a manual or production execution.
3. Inspect item counts, large fields, binary data, and nodes that collect all
   items. Use counts and small samples. Do not fetch a full large output just
   to inspect its size.
4. Check whether several executions run at the same time. Record the available
   memory evidence. Do not infer a memory leak from one failed execution.

## Change the workflow

- Retrieve fewer records per request. Use the source API's pagination.
- Remove large fields after their last use. Keep fields required by later nodes.
- Prefer a built-in transformation node when it performs the same operation as
  a Code node. Code nodes can require additional data copies.
- Process bounded batches. A Loop Over Items node alone does not remove data
  already loaded by an earlier node.
- For large work, process one batch in a subworkflow. Return a small result to
  the parent, such as a count or identifier. Do not collect every large result
  in the parent again.
- Inspect binary data separately. Do not convert files into large text fields
  unless a later operation needs that representation.

Choose the smallest change that addresses the observed cause. Preserve item
linking, error behavior, and output semantics. Explain any throughput tradeoff.

## Verify

Validate the edited workflow with the available n8n tools. Compare the original
and revised outputs with a small representative sample first. Then use a larger
bounded sample if execution is authorized and its external effects are safe.
Manual executions can use extra memory to supply editor data. Do not treat a
manual failure as proof that a production execution has the same memory profile.

Report the observed evidence, the change, the output comparison, and any memory
measurement. If memory cannot be measured, say so. Do not claim a measured saving
from a smaller item count alone.

## Instance capacity

If workflow changes are insufficient, explain the remaining options for the
operator. More simultaneous executions need more memory. Self-hosted instances
can require more allocated memory or a different Node.js heap limit. Cloud
instances can require a plan with more memory. Do not change instance settings
or purchase capacity as part of a workflow edit.

Source: [n8n memory guidance](https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/fix-memory-issues/).

See [license terms](references/LICENSE.md).
