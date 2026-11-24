---
name: deep-work-mode
description: A discipline for large tasks - a written plan in stages, one check per stage that can really fail, a self-review that looks for errors first, and an honest final report. Use when the user says "mode travail en profondeur", "deep work mode", "fais-le en étapes et vérifie tout", "be systematic", or when a task clearly spans many files, sources or sessions (a new feature across backend and site, a data migration, a long report). Not for ordinary small requests. Our own skill (2026-11-16), inspired by the idea of mrtooher/fable-mode; no third-party text. For a short step loop on any task, see fable-method.
---

# Deep work mode

Big tasks fail in the same places: no plan, checks that cannot fail, and a final
"it's done" that nobody verified. This mode fixes those three points. It changes the
procedure, not the intelligence of the model: use it as a checklist.

## 1. Plan in stages (write it before acting)

For each stage write one line:

`Stage N - what changes - how I will check it - what "done" means`

- 3 to 7 stages. A stage that cannot be checked alone is too big: split it.
- Order the stages so that the riskiest unknown is tested first (a data source that may
  be blocked, an API that may not exist, a licence that may forbid the copy).
- Mark the stages that touch something hard to undo (a database, a deploy, a message
  to real people). Those need the user's consent before they run.

Show the plan to the user in a few lines, then start. Do not wait for approval unless a
stage is hard to undo or the plan changes what the user asked for.

## 2. One check per stage, and it must be able to fail

A good check is something you run or look at whose result you do not know in advance:
a test, a query that counts rows, a screenshot compared with the target, a page loaded
in a browser, a number compared with a second source.

Not a check: "the code looks right", "the command exited 0" when the tool can fail
silently, a test written after the code to match what the code does.

Write down the result of each check. If it fails, fix that stage before the next one.

## 3. Self-review, errors first

Before the report, read your own work as a hostile reviewer:

1. **What is most likely wrong?** Name it, then check it. Typical places: edge cases
   (empty list, missing data, a new season), units and time zones, names spelled
   differently in two sources, a file that the deploy does not pick up.
2. **What did I not verify?** List it honestly.
3. **What did I change that was not asked?** Undo it or say why it was needed.

Only then ask "what went well".

## 4. Delegation

Split work between separate agents only when the user asked for agents or named this
mode. Each agent gets one stage, its check and its done line. Wait for every result and
run the checks yourself: an agent saying "done" is a claim, not evidence. Without that
request, run the stages yourself in this conversation.

## 5. Final report (to the owner: French, plain words)

1. The result in one sentence.
2. What was checked, and how (one short line per stage).
3. What was not checked, and why.
4. What the user must do now, if anything.

No stage numbers or method names in the report: the method is for the work, not for the
reader.
