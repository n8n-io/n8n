import { deepCopy } from 'n8n-workflow';

/**
 * Ledger entries must be immutable snapshots. The served body is handed to node
 * code, and some nodes mutate it in place — e.g. the OpenAI node's json_schema
 * output mode parses `output[].content[].text` into an object — so an aliased
 * ledger entry rewrites history and the judge blames the mock for a body it
 * never sent. `deepCopy` matches the artifact's JSON semantics.
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
	if (body === undefined || body === null) return body;
	if (Buffer.isBuffer(body)) return Buffer.from(body);
	return deepCopy(body);
}
