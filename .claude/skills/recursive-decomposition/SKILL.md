---
name: recursive-decomposition
description: "Decompose dense codebase-wide, multi-document, PDF, and aggregation work even when the input fits the context window, following Recursive Language Models (Zhang, Kraska, Khattab, 2025). Use when the user asks to analyse all files, a whole repo, all docs, large PDFs, or to aggregate or multi-hop across scattered sources. Skip one file, one function, a single needle, or a one-page PDF conversion. Triggers: long context, context rot, large codebase, many files, all files, big document, multi-document, PDF, aggregate, summarize everything, codebase-wide, multi-hop, recursive, sub-agents, map-reduce."
license: MIT
metadata:
  author: massimodeluisa
  version: "1.2.0"
  paper: https://arxiv.org/abs/2512.24601
---

# Recursive Decomposition

Long inputs rot. Details get missed, distant parts get glued together by guesswork, and the reasoning drifts. The RLM paper calls it context rot. Do not load the whole input into the window. Treat it as an environment you query: size it, narrow it, split it, hand independent parts to sub-agents, verify on a small window, synthesise in code. Based on [Recursive Language Models](https://arxiv.org/abs/2512.24601) (Zhang, Kraska, Khattab, 2025).

## How to use

- `/recursive-decomposition`: apply the protocol below to the current task.
- `/recursive-decomposition <path or question>`: size that input first, then run the protocol on it.

## When it applies

Fit is not the test. Dense work can rot inside a million-token window. In the paper, OOLONG-Pairs is 32k tokens and GPT-5 scores 0.1% F1; RLM(depth=1) reaches 58.0% (arXiv:2512.24601, Table 1). 30k and 50k below are harness caps.

| Situation | Approach |
|-----------|----------|
| One file, one function, or a single needle | Read directly |
| Linear aggregate or list-everything, and completeness matters | Decompose (this skill) |
| Pairwise, quadratic, or multi-hop across scattered sources | Decompose, even under 30k tokens |
| 10+ files or 50k+ tokens | Decompose |
| Under 30k tokens and a localised answer | Read directly |

## Protocol

1. **Size the input** before reading anything: count files (glob, `find`), lines (`wc -l`), bytes (`ls -lh`), pages for PDFs.
2. **Filter** the search space with searches (content search, file patterns, keywords, file types) before opening any file. Chain filters: file type, then keyword, then meaning.
3. **Chunk** what remains: natural units (functions, classes, sections), line ranges, or keyword partitions. Batches of 5 to 10 files.
4. **Recurse** at depth 1: one sub-agent per independent batch, self-contained brief (files, question, output schema); run one parallel wave. Write the batch count first. If more batches remain, run the next wave after the merge. Sub-agents answer; they do not spawn sub-agents.
5. **Verify** the synthesised answer on a smaller window: extract the minimal evidence and re-check it; settle disagreements with a targeted re-read.
6. **Synthesise programmatically**: aggregate the structured results, deduplicate, categorise, then write the answer with file and line references.

## Rules

- MUST size the input before reading it
- MUST search before reading a directory; NEVER list a tree recursively as a substitute for search
- MUST read large files by line range: over 2,000 lines or 50 KB never in one read; PDFs over 100 pages or 30 MB by metadata or split
- MUST convert PDFs and Office files to markdown before reasoning. Prefer local anydoc (`npx -y @firecrawl/anydoc FILE -o .firecrawl/FILE.md`) from the Firecrawl convert-documents-to-markdown skill. Use cloud `firecrawl parse` for OCR (`--ocr hosted` / `firecrawl parse`), `-Q`, or `-S`. Never dump the binary into context. Cloud parse caps at 50 MB and about 1 credit per PDF page; split first if larger.
- NEVER load more than 5 files into the main context without a written batch plan
- MUST give every sub-agent its own context: the files, the question, the output schema
- MUST keep recursion depth at 1: sub-agents answer; they MUST NOT launch sub-agents
- MUST write the batch count before launch; one parallel wave, then merge; further waves only after that merge
- MUST spot-check the synthesised result against the sources before answering
- SHOULD read definitions first (`grep -n "function"`) and bodies later; tables of contents and abstracts before full text
- NEVER run the same query over the same content in several sub-agents; partition once into disjoint batches
- NEVER raise depth because the merge looks thin; re-read the disagreement instead

## Tools, agent-agnostic

| Need | Use |
|------|-----|
| Find files | the file search or glob tool, or `find` |
| Find content | the content search or grep tool, never a full read |
| Size | `wc -l`, `ls -lh`, page count (`pdfinfo` if present) |
| Read | the file reader with an offset and a limit, or `sed -n 'START,ENDp'` |
| PDF or Office file | anydoc first (`npx -y @firecrawl/anydoc FILE -o .firecrawl/out.md`), then grep the markdown. Cloud `firecrawl parse` for OCR, `-Q`, or `-S`. Else `pdfinfo` and a split. Never a full binary read |
| Delegate | the sub-agent or task tool, one brief per batch |
| Aggregate | a scratch file or structured notes, then one final pass |

Tool names differ between agents (Claude Code, Codex, Cursor, Gemini CLI); map the row to your agent's equivalent.

## Patterns

### Codebase analysis

"Find all error handling patterns." Glob the source files, grep `catch|throw|Error|except`, batch the matches by module (5 to 10 files), one sub-agent per batch with a fixed report schema, merge into a categorised summary with file references. Worked example: [references/codebase-analysis.md](references/codebase-analysis.md).

### Multi-document question answering

"What features are planned across all PRDs?" Glob the documents, size them, define an extraction schema (name, priority, status, quarter), one sub-agent per document group, deduplicate and categorise, spot-check three entries against the sources. Worked example: [references/document-aggregation.md](references/document-aggregation.md).

### Aggregation

"Summarise all TODO comments." Grep `TODO|FIXME|HACK`, group by module, extract context and priority per group, produce a prioritised list.

### Large PDFs

Glob `*.pdf`, size bytes and page count (`pdfinfo`). Over 100 pages or 30 MB: do not ingest. Convert with anydoc to `.firecrawl/` (Firecrawl skill `convert-documents-to-markdown`), then grep and chunk the markdown. If anydoc exits 3 (scanned pages), rerun with `--ocr hosted` or `firecrawl parse` (Firecrawl skill `firecrawl-parse`, 50 MB / ~1 credit per page). Batch by document, depth 1, spot-check titles against PDF metadata.

A one-page convert-to-markdown job is not this skill. Hand it to anydoc or `firecrawl parse` alone.

### Long output

Split the output into sections, generate each independently, store intermediate results in a file, stitch them with a coherence pass.

## Cost and quality

Decomposition spends coordination tokens. In the paper (arXiv:2512.24601, Table 1 and Figure 1), RLM(GPT-5, depth=1) scored 91.3% on BrowseComp-Plus (6 to 11M tokens) at $0.99 average, versus 70.5% for compaction. On OOLONG it beat GPT-5 by 28.4%. On OOLONG-Pairs it reached 58.0% F1 against a 0.1% base. Figure 1 scales inputs from 2^13 to 2^20 tokens. Median cost stays comparable to the base model; averages can rise on outlier trajectories. Thresholds: [references/cost-analysis.md](references/cost-analysis.md).

## Anti-patterns

| Anti-pattern | Fix |
|--------------|-----|
| Reading everything first "to get context" | Size, filter, then read by range |
| Dumping a PDF binary into the window | Parse to markdown, then grep and chunk |
| Decomposing a single needle or one-file lookup | Read directly |
| Sub-agents without the question or the schema | Self-contained briefs |
| Sub-agents that spawn sub-agents | Depth 1: they answer, they do not delegate |
| Trusting the merged answer | Spot-check on a small window |
| Re-querying the same content in several sub-agents | Partition once, disjoint batches |

## References

- [references/rlm-strategies.md](references/rlm-strategies.md): decomposition strategies from the paper
- [references/cost-analysis.md](references/cost-analysis.md): when to decompose, break-even thresholds
- [references/codebase-analysis.md](references/codebase-analysis.md): worked example, error handling across a codebase
- [references/document-aggregation.md](references/document-aggregation.md): worked example, feature extraction across PRDs
- Paper: [Recursive Language Models](https://arxiv.org/abs/2512.24601), Zhang, Kraska, Khattab, arXiv:2512.24601
