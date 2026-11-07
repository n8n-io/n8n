# Persisted format compatibility boundaries

This reference tracks the formats in DEVP-1228. A reader must remain until its
removal condition is met. The support owner must approve each removal condition
before code drops that reader. Do not infer a minimum supported version from the
age of a deprecation annotation.

| Format | Current writer | Reader and removal condition |
| --- | --- | --- |
| Code Builder `userMessages` checkpoint | `conversationEntries` | `decodeSessionCheckpoint` converts old strings to build requests. Saving the session writes only `conversationEntries`. Remove the decoder when no live Code Builder process can hold an old `MemorySaver` checkpoint. The checkpointer is process-local. |
| Scaling `JobFinishedMessageV1` | Workers send version 2 with result details. | The main process still ends the job wait on V1 messages. Remove V1 after the minimum supported worker version sends version 2 and all older workers and in-flight jobs have drained. Deploy the reader before relying on version 2 results. |
| Workflow SDK `subnodes.embeddings` | Code generation and prompts use `embedding`. | `processSubnodes` still accepts `embeddings` in previously generated code. Remove the alias only when the supported SDK and generated-code upgrade policy no longer permits that code. Keep the `embeddings()` factory until its separate public API support window closes. |
| Instance AI `verificationPinData` and `usesWorkflowPinDataForVerification` | New build outcomes use `nodeSimulationPlan` and `simulationFixtures`. | Stored outcomes still parse `verificationPinData` for verification. The unused boolean is stripped on load. Remove the pin-data decoder only after stored thread outcomes from older releases expire or are migrated. |
| Instance AI `WorkspaceSdkTarball` / `packWorkspaceSdk` | Sandbox setup packs linked workspace packages with `WorkspacePackageTarball`. | No callers use the old helper or its `sdkPath` alias. The internal alias is removed. |
| CLI `execute --file` | CLI callers use `--id`. | The flag reports how to import and run the workflow. Remove the flag and its diagnostic only after the CLI caller support window ends. |

Before removing a remaining reader, record the first unsupported release and
check the relevant stored data or mixed-version deployment. Remove its
deprecation disable and compatibility test in the same change. Do not remove
the V1 scaling reader while an older worker can still publish job progress.
