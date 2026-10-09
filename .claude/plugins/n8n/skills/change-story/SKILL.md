---
name: n8n:change-story
description: Generate an evidence-backed "change story" for a branch or PR diff, a product-perspective interactive HTML page (why, what changed for the user, how it works now) with screenshots/test-output evidence, explicit risk flags, and deep links into the PR, saved outside the repo under ~/.claude/change-stories/ and opened in the browser; --review embeds a multi-discipline review (verdict plus severity-tagged findings) via the n8n:autodev reviewer agents. Use when the user asks for a change story, "/change-story", "explain this PR as a story", "story for this branch", "summarize this PR", "write up what this branch does", "walkthrough for the reviewer", or wants to understand or present a change from a product perspective instead of reading the diff.
---

# Change Story

Replace "read the diff" with "read a story about the change", backed by
evidence. Two consumers, both pre-merge: a reviewer deciding whether to
approve, and the author verifying the AI built what they meant.

The story's job is comprehension PLUS evidence PLUS flagging. Never write a
confidence-only narrative: show proof where proof is possible and explicitly
mark what you could not verify. An unmarked wrong "why" is the worst failure
mode: it confidently teaches the reviewer a false mental model.

Write the least text that explains the change accurately, as you would
to a teammate. Story volume scales with the conceptual size of the
change, never with the template: a trivial PR gets a gist and
one-liners. Padding a section to look thorough teaches readers to skim.

## Input

`/change-story [PR number | branch | nothing] [--review]`

- PR number: `gh pr view <n> --json headRefName,baseRefName,body,title,url`,
  then diff head vs base. The refs may not exist locally (fork PRs never
  do): `git fetch origin pull/<n>/head` first if needed
- Branch name: diff vs merge-base with the default branch
- Nothing: current branch vs merge-base with the default branch

Compute the diff with `git diff <merge-base>...<head>` plus
`git log <merge-base>..<head> --format='%h %s%n%b'` for commit messages.
When reviewing the current branch and the working tree is dirty, use
`git diff <merge-base>` (includes uncommitted work) instead: the author
use case usually runs before everything is committed. State in the story
header that uncommitted changes are included. A dirty tree while
reviewing some other branch or PR is irrelevant, ignore it.
If not in a git repo or the diff is empty, stop and tell the user.

`--review` adds a "Review findings" section produced by the plugin's
n8n:autodev review agents (see step 4b). It needs a resolvable PR;
without one, the section becomes a one-line "review skipped (no PR)"
note.

## Workflow

Linear. Do the steps in order.

### 1. Gather intent (the why)

The diff contains what, not why. Sources in priority order:

1. Linked Linear ticket or GitHub issue (extract IDs like ABC-123 / #123 from
   branch name, commits, PR body; fetch via Linear MCP or `gh issue view`)
2. Notion: feature specs and serious bug write-ups often live there. Search
   Notion (MCP) using the ticket title and branch keywords; if a relevant
   page exists, use it and cite it in the Why section. Skip silently if no
   Notion MCP or no match.
3. Commit messages on the branch
4. PR description if one exists

Then, if this is an interactive session, ask the author 2-3 targeted
questions, ONE AT A TIME, only where intent is missing or the diff contains
surprises (e.g. "this also changed X, was that deliberate?"). Skip questions
whose answers the artifacts already give.

If the author is absent or declines, infer the missing why from the code and
mark EVERY inferred claim with "(inferred)" in the story. Marking inference
is mandatory, not cosmetic.

### 2. Classify the change

A change can be several types at once. This drives evidence:

| Type | Signal | Evidence |
|------|--------|----------|
| UI | .vue/.tsx/.jsx/.css/templates/components changed | Before/after screenshots of the changed flow |
| API | routes/controllers/handlers/schemas changed | Real request/response captures |
| Logic | services/helpers/algorithms changed | Test output plus mermaid flow of the changed path |
| Config/infra | CI, deps, env, build files | Narrative only, flag blast radius |

No evidence where it would be decoration. Filler screenshots train readers
to skim, which kills the reviewer use case.

### 3. Analyze the diff

Read the full diff plus enough surrounding code to trace the changed paths
end to end. Produce (internally, not yet prose):

- User-visible behavior delta: before -> after, in product language
- The changed flow, for the mermaid diagram
- Risk flags:
  - shared helpers touched: grep the repo for callers of every modified
    shared function; list callers not exercised by this change
  - auth, payment, security, or data-deletion paths touched
  - surprising or unrelated hunks (changes the ticket never asked for)
  - deleted or weakened tests
  - behavior changes not mentioned in the ticket

### 4. Capture evidence (subagent)

Skip entirely for pure config/infra changes.

Compute the run directory once, before capturing anything:
`~/.claude/change-stories/<repo>/<branch-slug>/$(date +%Y-%m-%d-%H%M%S)/`
(the `<run-dir>`), where `<repo>` is the last path segment of
`git remote get-url origin` without `.git` (no remote: the repo root
directory name). Everything this run produces lives inside it; previous
runs are never touched. Deliberately outside the repository: no git
noise, no accidental commit, and it survives worktree removal, one
archive shared by every checkout of the project.

Dispatch ONE subagent (general-purpose) with the prompt template in
references/evidence-capture.md, filled in with: repo path, branch names,
change types, the specific flows/endpoints/tests to exercise, and the
assets output directory `<run-dir>/assets/`.

The subagent runs the app, drives the browser, hits endpoints, runs tests,
and returns ONLY file paths and short factual notes. Do not capture evidence
in the main context: browser snapshots flood it. Exception: when the only
evidence to capture is small and browser-free (one test run, a couple of
curl calls), capture it inline and skip the subagent; the subagent exists
to keep browser noise out of the story context, not as ceremony.

Every evidence failure degrades into a "Not covered" entry, never into a
fabricated claim.

**n8n repos only:** when the change touches a node, trigger, or
workflow-execution behavior, also build a minimal importable workflow JSON
that demonstrates the change and save it to
`<run-dir>/assets/demo-workflow.json`. Verify it by
importing and executing it against the running dev instance (the evidence
subagent does this). Link it from the Evidence section with one line on what
to look at after importing. Skip when a workflow would not exercise the
change (pure UI, infra, internal refactors).

### 4b. Review findings (--review only)

Sibling note: a personal-plugin variant of this skill exists
(`cst:change-story`), maintained in parallel with this one. This step is
their ONLY intentional divergence: the variant executes its own plugin's
pr-review command here, while this version fans out the `n8n:autodev-*`
reviewer agents. Edits to any other step belong in both copies.

Fan out the plugin's reviewer agents from the MAIN context: sub-agents
cannot spawn sub-agents, so never wrap the review in a single sub-agent.
Dispatch the reviewer agents and the step 4 evidence sub-agent in the
SAME message, so review and evidence capture run concurrently; compose
the story once both are back.

Reviewers, in parallel, each given the diff, the changed-file list, and
the PR title/description; findings come back tagged
[BLOCKER]/[MAJOR]/[MINOR] with file:line and a concrete fix:

- `n8n:autodev-architecture-reviewer`: boundaries, coupling, data flow
- `n8n:autodev-security-reviewer`: injection, authz, secrets, SSRF
- `n8n:autodev-conventions-reviewer`: n8n patterns, code quality
- `n8n:autodev-test-reviewer`: missing tests, test quality
- `n8n:autodev-vue-reviewer`: ONLY when the diff touches frontend code
  (`.vue`, `packages/frontend/**`, or `@n8n/design-system`); otherwise
  skip it and say so in the coverage note

Read-only: reviewers report back; nothing is posted to the PR and no
code is changed. Add an independent second-opinion pass (e.g. codex or
cubic) only when such a tool is available in the session.

Synthesize: one-line verdict (approve / approve-with-nits /
request-changes) with the single most important reason, findings
deduplicated across lenses, and a coverage note saying which lenses ran
and which were skipped and why.

### 5. Compose the story (interactive HTML)

Fixed section structure, flexible section size. Never omit a section
(Review findings exists only with --review): omission reads as
unchecked. A section may be one line: a one-liner reads as checked and
small. Volume scales with the change, never with the template.

1. Header: one-line what as the title; subtitle
   `<branch> | <date> | diff vs <base>`, plus a link to the PR when one
   exists.
2. The gist: 1-3 sentences directly under the header, the single most
   important thing about this change, in the voice you would use
   telling a teammate ("the library is a drop-in replacement except
   where it is not; this PR fixes two of those mismatch points"). A
   reader who stops here must leave with the right mental model. For a
   small change, the gist plus one-line sections IS the story.
3. Why: 2-4 sentences, product language. Mark unverified reasoning
   "(inferred)".
4. What changed for the user: behavior before -> after. Product
   language, not files.
5. How it works now: one mermaid diagram of the changed path only, not
   the whole system. When there is no meaningful flow (dep bump, config
   value, one-line fix), one plain sentence instead: a filler diagram is
   decoration. Mermaid text is code, not prose: a semicolon in message
   text is a statement separator and breaks the whole diagram into the
   "syntax error" bomb; use commas or periods, and avoid braces. If a
   browser tool is available, verify the diagram actually rendered (an
   svg inside pre.mermaid, no "Syntax error" text) before opening the
   page; browser MCPs often block file://, so briefly serve the run
   directory over localhost for the check.
6. Evidence: per change type: screenshots, real request/response pairs,
   test output. State how each was produced. Long output goes in
   collapsible blocks whose summary line carries the verdict (e.g.
   "Unit tests: 11/11 pass").
7. Look here: risk flags from step 3, each with the file path and one
   line on why a human should read that code. If genuinely empty, say
   why you believe there is nothing to flag.
8. Review findings (--review only, placed after Look here): the step 4b
   synthesis, clearly attributed as the review lenses' opinion, not
   verified fact. The verdict is the FIRST line inside this section,
   never in the page header: a story with a verdict on top reads as a
   judgment. Findings grouped by severity, BLOCKER and MAJOR expanded,
   MINOR collapsed, every file:line deep-linked like everywhere else.
   End with the coverage note. A finding on the same file:line as a
   "Look here" flag: badge that Look here entry ("review hit this too")
   instead of repeating it. Clean review: verdict plus one short
   positive line, no padding. Without --review, fill the template's
   {{REVIEW_NAV_HTML}} and {{REVIEW_SECTION_HTML}} with empty strings
   so section and nav link disappear.
8. Not covered: what this story did not verify (flows not exercised,
   evidence that failed to capture, inferred claims). Honesty section,
   never empty in practice.

Render with this skill's `assets/story-template.html`: copy it and fill
the {{PLACEHOLDER}} slots with HTML fragments. The template's comments
document the exact markup for figures, before/after toggles, and
collapsible output; it already ships section nav, lightbox, before/after
toggle, and mermaid rendering. Do not hand-roll a page from scratch.

Interactivity must be real wired-up state, not decoration: screenshots
open in a lightbox, before/after pairs toggle in place, long outputs
collapse. If a control has nothing behind it, leave the control out.

#### Deep links into the PR

When a PR exists, every file or file:line mention in the story is a link:

- File changed by the PR, at a line: the PR Files tab anchor
  `https://github.com/<owner>/<repo>/pull/<n>/files#diff-<sha256>R<line>`
  where `<sha256>` is the SHA-256 hex of the repo-relative file path
  (`printf '%s' "packages/foo/bar.ts" | shasum -a 256`). `R<line>` is the
  new side; use `L<line>` only for removed lines.
- File referenced but not changed by the PR: blob at the PR head commit,
  `https://github.com/<owner>/<repo>/blob/<headSha>/<path>#L<line>`.

No PR yet: keep plain `path:line` text, no links.

Rules:

- Product language throughout; file paths only in "Look here"
- Peer voice: write as you would explain it to a teammate, least text
  that is still accurate; never manufacture analysis to fill a section
- Under 3 minutes to read as a ceiling, never a target; cut before you
  compress into jargon
- No em dashes anywhere
- Reference assets by relative path so the story folder stays portable;
  the page must work from file:// (mermaid loads from a CDN and degrades
  to showing the diagram source when offline)

### 6. Save

- One self-contained directory per run: the `<run-dir>` from step 4,
  `~/.claude/change-stories/<repo>/<branch-slug>/<YYYY-MM-DD-HHMMSS>/`, where
  branch-slug is the branch name with `/` replaced by `-` and the
  timestamp was taken at run start
- The page is `index.html` in that directory; everything it references
  lives in `assets/` next to it, so the directory can be moved or
  shared as a unit
- Never overwrite or delete a previous run: re-running the skill on the
  same branch creates a new timestamped directory
- Create parent directories as needed
- Open the saved page in the default browser (`open <path>` on macOS,
  `xdg-open` on Linux); also print the path. Do NOT post to the PR.

## Error handling

- No ticket/issue found: proceed with commits plus inference, all marked
- App will not launch: skip screenshots, record in "Not covered"
- Diff too large to hold: write the story per logical area, merge into a
  single "Look here", and state that the story is segmented
