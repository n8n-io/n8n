# Evals

Large PDFs live in a git submodule. They are not copied into this repository.

Corpus: [tccao/mortgage-doc-rag](https://github.com/tccao/mortgage-doc-rag) (MIT). 131 public-domain mortgage PDFs, about 63 MB.

```bash
git submodule update --init --depth 1 skills/recursive-decomposition/evals/files/mortgage-doc-rag
```

Layout follows [Evaluating skills](https://agentskills.io/skill-creation/evaluating-skills). Runs go under `evals-workspace/` at the repository root (gitignored).

## Check (no agent)

```bash
bash .github/scripts/eval-skill.sh check
```

Validates trigger queries and, if the submodule is present, PDF count, byte floor, and the largest filename. CI does not clone the submodule. Missing PDFs print `SKIP`, not `ERROR`.

## Agent runs (with vs without the skill)

Same prompt twice, clean context:

```text
evals-workspace/iteration-1/eval-pdf-corpus/with_skill/outputs/result.json
evals-workspace/iteration-1/eval-pdf-corpus/without_skill/outputs/result.json
```

```json
{
  "decomposed": true,
  "depth": 1,
  "subagents_spawned_subagents": false,
  "pdf_count": 131,
  "largest": [{"path": "data/degraded/appraisal/urar_form_1004_epa_scan.pdf", "bytes": 1639534}]
}
```

```bash
bash .github/scripts/eval-skill.sh score evals-workspace/iteration-1
```

Trigger queries live in `trigger-queries.json`. Score those by whether the agent loaded this skill.

## Firecrawl document skills

| Skill | What it does |
|-------|----------------|
| [firecrawl/anydoc@convert-documents-to-markdown](https://skills.sh/firecrawl/anydoc/convert-documents-to-markdown) | Local `npx -y @firecrawl/anydoc FILE -o out.md`. Exit 3 means OCR; then `--ocr hosted`. |
| [firecrawl/cli@firecrawl-parse](https://skills.sh/firecrawl/cli/firecrawl-parse) | Cloud `firecrawl parse`. 50 MB cap, about 1 credit per page. |

Prefer anydoc. Many files in this corpus are scans; `pdftotext` on the whole tree extracts nothing useful. Size first, then parse only what the question needs.

Live pre/post (same prompt, 2026-09-11): size-first 0.02 s. anydoc on two digital PDFs 1.64 s, titles recovered. The largest file is a 4-page scan: anydoc exit 3, `firecrawl parse` 15.45 s, title Uniform Residential Appraisal Report. Naive `pdftotext` on all 131 files: 1.65 s and 0 bytes; on that scan, 4 bytes and no title.
