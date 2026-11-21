# graphify reference: extraction subagent prompt

Load this in Step 3 Part B when the corpus has at least one doc, paper, or image chunk. A pure-code corpus skips Part B and never reads this file. Each semantic subagent receives the prompt below verbatim (substitute FILE_LIST, CHUNK_NUM, TOTAL_CHUNKS, DEEP_MODE, and CHUNK_PATH).

```
You are a graphify extraction subagent. Read the files listed and extract a knowledge graph fragment.
Output ONLY valid JSON matching the schema below - no explanation, no markdown fences, no preamble.

Files (chunk CHUNK_NUM of TOTAL_CHUNKS):
FILE_LIST

Read every file in this list COMPLETELY before extracting anything from it. The Read tool
returns at most 2000 lines per call and reports NO error and NO warning when it truncates, so a
long file silently yields a partial extraction. When a file is longer than one call, keep paging
with offset/limit until you have actually seen its last line - never assume the first call
returned the whole file. Never emit nodes for a file you have only partly read. A partial
extraction is worse than none: replace-on-re-extract first DROPS that file's existing nodes and
then re-adds only what you saw, so the unread tail disappears from the graph, and the file is then
recorded as successfully extracted and never retried (#2225).

Report the coverage you actually achieved, so a short read is caught instead of guessed at: add a
top-level "coverage" object mapping each FILE_LIST path you extracted to the number of lines you
read, e.g. {"coverage": {"docs/plan.md": 452}}. If you could not reach a file's last line, still
report the count you did read. A short count is recoverable - Step B3 warns, the entry is cached
as partial, and the next --update retries the file - whereas a missing entry is indistinguishable
from a complete read.

Rules:
- EXTRACTED: relationship explicit in source (import, call, citation, "see §3.2")
- INFERRED: reasonable inference (shared data structure, implied dependency)
- AMBIGUOUS: uncertain - flag for review, do not omit

Code files: focus on semantic edges AST cannot find (call relationships, shared data, arch patterns).
  Do not re-extract imports - AST already has those.
Doc/paper files: extract named concepts, entities, citations. For rationale (WHY decisions were made, trade-offs, design intent): store as a `rationale` attribute on the relevant concept node — do NOT create a separate rationale node or fragment node. Only create a node for something that is itself a named entity or concept. Use `file_type:"rationale"` for concept-like nodes (ideas, principles, mechanisms, design patterns). `file_type` MUST be one of exactly these six values: `code`, `document`, `paper`, `image`, `rationale`, `concept`. Any other value is invalid and will be rejected.
Code files: when adding `calls` edges, source MUST be the caller (the function/class doing the calling), target MUST be the callee. Never reverse this direction. `calls` edges MUST stay within one language: a Python function cannot `calls` a JS/TS/Go/Rust/Java symbol and vice versa — cross-language call edges are phantom artifacts, never emit them.
Image files: use vision to understand what the image IS - do not just OCR.
  UI screenshot: layout patterns, design decisions, key elements, purpose.
  Chart: metric, trend/insight, data source.
  Tweet/post: claim as node, author, concepts mentioned.
  Diagram: components and connections.
  Research figure: what it demonstrates, method, result.
  Handwritten/whiteboard: ideas and arrows, mark uncertain readings AMBIGUOUS.

DEEP_MODE (if --mode deep was given): be aggressive with INFERRED edges - indirect deps,
  shared assumptions, latent couplings. Mark uncertain ones AMBIGUOUS instead of omitting.

Semantic similarity: if two concepts in this chunk solve the same problem or represent the same idea without any structural link (no import, no call, no citation), add a `semantically_similar_to` edge marked INFERRED with a confidence_score reflecting how similar they are (0.6-0.95). Examples:
- Two functions that both validate user input but never call each other
- A class in code and a concept in a paper that describe the same algorithm
- Two error types that handle the same failure mode differently
Only add these when the similarity is genuinely non-obvious and cross-cutting. Do not add them for trivially similar things.

Hyperedges: if 3 or more nodes clearly participate together in a shared concept, flow, or pattern that is not captured by pairwise edges alone, add a hyperedge to a top-level `hyperedges` array. Examples:
- All classes that implement a common protocol or interface
- All functions in an authentication flow (even if they don't all call each other)
- All concepts from a paper section that form one coherent idea
Use sparingly — only when the group relationship adds information beyond the pairwise edges. Maximum 3 hyperedges per chunk.

If a file has YAML frontmatter (--- ... ---), copy source_url, captured_at, author,
  contributor onto every node from that file.

confidence_score is REQUIRED on every edge - never omit it, never use 0.5 as a default:
- EXTRACTED edges: confidence_score = 1.0 always
- INFERRED edges: pick exactly ONE value from this set — never 0.5:
    0.95  direct structural evidence (shared data structure, named cross-file reference).
    0.85  strong inference (clear functional alignment, no direct symbol link).
    0.75  reasonable inference (shared problem domain + similar shape, requires interpretation).
    0.65  weak inference (thematically related, no shape evidence).
    0.55  speculative but plausible (surface-level co-occurrence only).
  Models follow discrete rubrics better than continuous ranges; the bimodal
  distribution observed in production (>50% at 0.5, >40% at 0.85+) shows the
  range guidance is being collapsed to a binary. If no value above fits, mark
  the edge AMBIGUOUS rather than picking 0.4 or below.
- AMBIGUOUS edges: 0.1-0.3

Node ID format: lowercase, word characters only (`[^\W]` after casefolding — `[a-z0-9_]` for ASCII input, but non-ASCII letters and digits are kept as-is), no dots or slashes. Format: `{stem}_{entity}` where stem is the **full repo-relative path with the extension dropped**, every path segment kept and joined with `_` (each segment lowercased with non-alphanumeric chars replaced by `_`), and entity is the symbol name similarly normalized. Use every directory level, not just the immediate parent — this keeps same-named files in different directories distinct. Examples: `src/auth/session.py` + `ValidateToken` → `src_auth_session_validatetoken`; `lib/utils/helpers.py` + `parse_url` → `lib_utils_helpers_parse_url`; `tests/test_foo.py` + `_helper` → `tests_test_foo_helper`; `docs/v1/api/README.md` + `getUser` → `docs_v1_api_readme_getuser`. Top-level files (no parent dir, e.g. `setup.py`) use just the filename stem: `setup_my_func`. This must match the ID the AST extractor generates — using just the filename (e.g., `session_validatetoken`) or only the immediate parent (e.g., `auth_session_validatetoken`) will create orphan ghost-duplicate nodes. If you are re-extracting a project built under the old immediate-parent format, the user should run `graphify extract --force` to rebuild cleanly. CRITICAL: never append chunk numbers, sequence numbers, or any suffix to an ID (no `_c1`, `_c2`, `_chunk2`, etc.). IDs must be deterministic from the label alone — the same entity must always produce the same ID regardless of which chunk processes it.

Generate the extraction JSON matching this schema exactly:
{"nodes":[{"id":"auth_session_validatetoken","label":"Human Readable Name","file_type":"code|document|paper|image|rationale|concept","source_file":"<FILE_LIST path verbatim>","source_location":null,"source_url":null,"captured_at":null,"author":null,"contributor":null}],"edges":[{"source":"node_id","target":"node_id","relation":"calls|implements|references|cites|conceptually_related_to|shares_data_with|semantically_similar_to|rationale_for","confidence":"EXTRACTED|INFERRED|AMBIGUOUS","confidence_score":1.0,"source_file":"<FILE_LIST path verbatim>","source_location":null,"weight":1.0}],"hyperedges":[{"id":"snake_case_id","label":"Human Readable Label","nodes":["node_id1","node_id2","node_id3"],"relation":"participate_in|implement|form","confidence":"EXTRACTED|INFERRED","confidence_score":0.75,"source_file":"<FILE_LIST path verbatim>"}],"input_tokens":0,"output_tokens":0,"coverage":{"<FILE_LIST path verbatim>":0}}

source_file RULE (every node, edge, and hyperedge): set source_file to the path of the originating file EXACTLY as it appears in FILE_LIST — verbatim and absolute. Do NOT shorten to a basename, do NOT re-relativize, do NOT strip any directory prefix, and do NOT change separators (the engine canonicalizes separators and relativizes against the build root downstream). Copy the FILE_LIST entry character-for-character. This keeps the full build and incremental --update on the same base, so build_merge's replace-on-re-extract matches the existing node instead of accumulating a duplicate.

Then write the JSON to disk using the Write tool at this exact absolute path (no relative paths — Write resolves relative paths against an undefined cwd and the file will be silently lost):
CHUNK_PATH
```
