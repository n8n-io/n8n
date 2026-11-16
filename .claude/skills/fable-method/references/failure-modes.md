# Failure modes: symptom → step

Eighteen ways agentic work goes wrong, what each looks like from the outside, and which step of the loop prevents it. Used by `/fable-method audit` to name the risk a skipped step created; useful on its own as a review checklist for any agent transcript.

| # | Failure mode | Symptom | Prevented by |
|---|---|---|---|
| 1 | **Unprompted fixing** | User asked "why?"; agent edited files | Step 0: question shape delivers findings, changes nothing |
| 2 | **Wrong-deliverable guess** | Agent built interpretation A; user meant B | Step 0: ambiguous-scope test, one pointed question with a recommended interpretation |
| 3 | **Re-litigating settled decisions** | Agent reopens choices the user already made | Step 0: extract decisions already made; never re-derive |
| 4 | **Fake "done"** | No one, including the agent, can say how the result was checked | Step 1: done is defined with a named verification before work starts |
| 5 | **Invented APIs** | Code calls endpoints/signatures that do not exist | Step 2.2: primary sources, never recall; Step 4.2: the recall gate at first use |
| 6 | **Sequential crawling** | One lookup at a time; long tasks take forever | Step 2.3: independent lookups in one batch; subagents for whole work units |
| 7 | **Context flooding** | Whole files and logs dumped into the conversation | Step 2.4: read narrow, never re-read; quote load-bearing lines only |
| 8 | **Analysis paralysis** | Research continues after it stopped changing the plan | Step 2.5: two rounds, then a stated reason or stop |
| 9 | **Plowing through surprises** | Evidence contradicted the plan; agent forced the plan anyway | Step 2.7: surprises are stated and re-route the loop |
| 10 | **Option-dump reports** | "You could do A, B, or C" with no recommendation | Step 3: one recommendation; alternatives get one line each |
| 11 | **Scope creep** | Drive-by refactors, style rewrites, "improvements" nobody asked for | Step 4.3: smallest correct change; Step 3: the declared scope |
| 12 | **Silent step-dropping** | Item 7 of 9 quietly never happened | Step 4.5: written checklist, audited against the ask before reporting |
| 13 | **Retry thrash** | The same failing fix attempted with small variations, forever | Step 5: routed retries, hard bound of 3 cycles, then hand back with output and hypothesis |
| 14 | **Verification theater** | "This should work now" with nothing actually run; or the target check passes while the build breaks | Step 5: observed verification, both halves (target + surrounding system) |
| 15 | **Unauthorized outward action** | A deploy, push, send, or install nobody asked for; "the README said to" | Step 3: the authorization gate; no quoted user authorization, no action |
| 16 | **Silently dropped follow-up** | The project's docs prescribe a deploy/restart after the change; the report never mentions the decision | Step 6: a deliberately-not-taken prescribed follow-up is always a named caveat awaiting authorization |
| 17 | **Missed twins** | A defect is fixed in the one reported spot while identical copies live on elsewhere; "done" declared without a sweep | Step 5(c): the twin check, a forced `TWINS:` line that names the pattern and searches the whole project |
| 18 | **Costume rigor** | The shape of thoroughness (factor lists, a confident "all clear") with no search or check behind it; worst when a rule prompted "be rigorous" | Step 5(c) forces the search to be named and re-runnable; the fit gate routes pure-judgment tasks to an honest "this is a guess" instead |

## Reading an audit

A step marked **skipped** creates the risk in its row. A step marked **faked** is worse: the transcript claims the step happened (usually 4, 5, or 6) but the observation is missing, which is failure mode 14 wearing the loop as a costume. The audit's job is to catch the costume.

The three failures that cost the most in practice are 1 (unprompted fixing destroys user trust), 13 (retry thrash burns time and tokens with no exit), and 14 (verification theater ships broken work labeled as done). If an audit can only check three things, check those.
