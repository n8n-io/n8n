# Knowledge-Scout findings review — 2026-10-11

Two `act` findings for this project came from Knowledge-Scout
(`reviews/session-handoff-handover.md`, reports `reviews/2026-10-10.md` and
`reviews/2026-10-11.md`). This note says what each one would change in the
handoff, what it costs, and what this branch did about it. The yardstick is the
2026-10-05 recall eval (artifact "Session Recall Eval").

## The evidence both findings lean on

In the recall eval, a fact that sat in the newest handoff ("control") was found
by every plugin setup at about 11k–23k tokens, often with a single `Read`. A fact left
out of the handoff cost the ladder 31k–476k tokens, and the handoff-only setup
found none of 14. So every fact moved into the handoff turns a costly, sometimes
failing lookup into a cheap read. The question for each finding is whether it
moves the *right* facts in, at a cost per handoff that is small.

## Finding 1 — exact strings (from fast-jev-compaction)

**Claim:** summaries drop error text, commands and constraints first; copy them
verbatim.

**Assessment: accept.** The template asked for "terse and concrete" but nothing
stopped paraphrase, and `Where it started` asked for constraints in the
writer's words. The eval backs the claim: "exact" questions (an error message, a
setting name) were the ones the handoff-only setup lost (3 of 10). A paraphrased
error also cannot be found later by `grep` or keyword search, so verbatim text
helps the chapter index too.

**Change made:** a short `## Exact strings` section, and hard rule 7 (copy exact
strings in backticks wherever they appear). The section is scoped to what the
next step depends on, so it stays a few lines.

## Finding 2 — tried and ruled out (from WikiSkill, arXiv 2608.27454)

**Claim:** the handoff records what was decided, not what was abandoned; add a
ruled-out field and carry it forward.

**Assessment: accept the carry-forward; the field half was already there.** The
template already had a `Ruled out:` bullet under "Deferred + open questions",
so the report's premise is half wrong. Its real point holds, though: only the
newest handoff is read, and the writer is told to cover "THIS session" only, so
a dead end lasted exactly one handoff.

**Change made:**
- `Ruled out` becomes its own section, `## Tried and ruled out`, so it is
  always filled or marked "none", like the other sections. Each entry has the
  date it was ruled out.
- An exception to "only this session": if the session began by reading a
  handoff, its still-relevant entries are copied forward with their dates.
  The writer does not open the old file to do this. The handoff was already
  read at resume, and a tool call at 120k+ tokens of context is the expensive
  path the skill avoids.
- Entries drop when their work is finished or abandoned. If the list passes
  about 10 entries, that is the signal to promote it to a topic file (noted
  inline, not built).

**Option not taken:** a ledger the Stop hook appends to mechanically. It never
loses an entry when the chain breaks (a session that did not start with a
resume). But it grows forever, the hook cannot judge relevance, and the resumed
agent would need a second file read. Revisit if dead ends are seen being retried
after a chain break.

## Cost

- Writing: about 50–200 more output tokens per handoff, and 0 more tool calls.
- Resuming: the same few hundred tokens, read once, inside the read that
  already happens.
- Skill text: about 250 tokens more each time the skill loads. The
  always-loaded description grows by 5 words.
- The save hook only parses `## Pick up here`, so the new sections need no hook
  change. A new test (`hooks/test_handoff_save.py` case 6) shows both sections
  are saved byte for byte and kept out of the `MEMORY.md` pointer.

## Not acted on, but worth a decision

- **Context Language Models (scout: `know`)** is the strongest evidence for
  better recall: a running note kept during the session beat a fixed summary
  written at the end (51.0 vs 42.3). Claude Code cannot let the model edit its
  own context. A running progress note that the handoff is built from could be
  tested, though. That test is a redesign, not a template change.
- **The recall eval's own rule 2 held:** keyword search over the chapter index
  found 13 of 14 left-out facts, at about half native's tokens. `chapters.py`
  has no search command yet. Of everything here, that is the largest measured
  gain for both recall and cost.

## Handover lines to tick (in Knowledge-Scout's `reviews/session-handoff-handover.md`)

Once merged, mark the two lines (`id:7506729605479870464` and
`id:manual-20261011T172134-4`) as follows:

- ` — done YYYY-MM-DD: "Exact strings" section + hard rule 7 (copy verbatim) in both skills`
- ` — done YYYY-MM-DD: own "Tried and ruled out" section, dated entries carried forward from the resumed handoff; hook ledger considered and not built`
