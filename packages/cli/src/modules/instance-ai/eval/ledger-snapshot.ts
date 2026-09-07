/**
 * Ledger entries must be immutable snapshots. The served body is handed to node
 * code, and some nodes mutate it in place — e.g. the OpenAI node's json_schema
 * output mode parses `output[].content[].text` into an object — so an aliased
 * ledger entry rewrites history and the judge blames the mock for a body it
 * never sent.
 *
 * `structuredClone` rather than `deepCopy`: the latter deliberately drops own
 * `__proto__`/`constructor`/`prototype` keys (`n8n-workflow/utils.ts`), which are
 * legal JSON response keys — dropping them is the same evidence corruption in a
 * different disguise. Non-cloneable values (functions) throw here where
 * `deepCopy` coped silently; mock bodies are JSON or Buffers, so that trade
 * favours fidelity.
 *
 * Buffers are copied too: `callEvalMockHandler` hands the same Buffer to node
 * code, so passing it by reference would preserve the exact aliasing this
 * helper exists to remove. The copy is bounded — the largest synthesized binary
 * fixture targets 1 MiB (`SIZE_TARGETS.large`) — which beats relying on every
 * downstream parser staying read-only.
 *
 * Shared by both recording sites: the workflow eval ledger
 * (`EvalExecutionService`) and the agent tool ledger
 * (`EvalAgentExecutionService`).
 */
export function snapshotLedgerBody(body: unknown): unknown {
	if (typeof body !== 'object' || body === null) return body;
	if (Buffer.isBuffer(body)) return Buffer.from(body);
	return structuredClone(body);
}
