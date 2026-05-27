# AI Prompt Log — Pokemon Node Take-Home

**Model:** Claude Opus 4.7 (1M context) via Claude Code CLI
**Why this model:** Multi-agent orchestration with team coordination, adversarial review, and parallel builders. Opus handles lead/coordination roles while Sonnet handles specialist agents (QA, PM, Architect, Builder).

---

## Prompt 1 — Session Start (PO → Lead)
**Timestamp:** 2026-05-27 ~11:00
**From:** Corey (PO)
**To:** Lead (Opus)

> what's the plan? load the launch script and lets go

*Context: Starting a new session. Launch script loaded, which directed us to "do something completely different than this project."*

---

## Prompt 2 — Task Assignment + Full Spec (PO → Lead)
**Timestamp:** 2026-05-27 ~11:02
**From:** Corey (PO)
**To:** Lead (Opus)

> I had cloned the n8n repo here as a submodule. I am doing a take home assignment and here's the specs. Let's do a planning session to get the basic plan prepped and then do an adversarial review of the specs with a QA, PM, and Architect to ensure that there's no gaps in the spec. Then we'll create a spec doc in the source repo on a branch alongside the implementation. Ask me any questions you need to get started. We'll also want to keep a running log of what weve done and a build journal at the end to show how we accomplished the task. I also want an audit trail of what the agents did and any corrections they received in a different file. I want to do a detailed write up afterwards. I also want to make sure that we follow TDD AND BDD QUITE WELL for this task, don't want to submit slop.
>
> [Full n8n take-home spec pasted — Pokemon node, List + Get operations, patch file submission]

*Context: PO provided the full assignment spec and set expectations for process rigor — TDD/BDD, audit trail, running log, adversarial review before implementation.*

---

## Prompt 3 — Clarification Answers (PO → Lead)
**Timestamp:** 2026-05-27 ~11:05
**From:** Corey (PO)
**To:** Lead (Opus)

Answered 4 clarification questions:
- **Workflow:** Branch in n8n/ directory, generate patch at the end
- **Docs location:** All in n8n repo (ships with patch), some copied to Snippets build log. Lessons learned in Snippets. Submission artifacts should be high quality.
- **Review style:** "This should be mediated by the lead and all three of them should be spun up by the lead. As agents can talk to each other, they should create a running log or other artifact as needed to record their 'discussion' as they are building the feature. I want visibility into the questions asked and the 'thinking' that went into it to get to the final ADR."
- **Prompt log:** "Yeah, I want ALL the prompts and then we can summarize later when we do a clean write up."

---

## Prompt 4 — Testing Standards Question (PO → Lead)
**Timestamp:** 2026-05-27 ~11:12
**From:** Corey (PO)
**To:** Lead (Opus)

> Nice to see that there's agentic navigation built in. That makes it easier for humans and agents to get started quicker. Do they have clear testing standards? Does it have visual and unit and integration tests?

*Context: PO noticed n8n has AGENTS.md + CLAUDE.md for agent onboarding. Asked about testing depth.*

---

## Prompt 5 — Live Debate Correction (PO → Lead)
**Timestamp:** 2026-05-27 ~11:18
**From:** Corey (PO)
**To:** Lead (Opus)

> We should have the agents debate live, not create docs as reports.

*Context: PO corrected the approach — agents were writing static reports to REVIEW-DISCUSSION.md. PO wanted live messaging debate instead. This became a harness lesson.*

---

## Prompt 6 — UI Question (PO → Lead)
**Timestamp:** 2026-05-27 ~11:19
**From:** Corey (PO)
**To:** Lead (Opus)

> Do we not need to visually create it in the UI? That was my assumption, but maybe they called it out in the spec?

*Context: PO asked whether the n8n node requires visual/frontend work. Answer: No — n8n auto-generates node UI from the TypeScript description property. Manual testing in the editor is the verification step.*

---

## Prompt 7 — TDD Correction (PO → Lead)
**Timestamp:** 2026-05-27 ~11:28
**From:** Corey (PO)
**To:** Lead (Opus)

> [Rejected plan exit] So, generally looks good, want you to reverify with the original specs that we will be meeting the requirements set out in the assignment. Also TDD is red -> green -> refactor NOT ALL RED TESTS, ALL GREEN PASSING, Refactor. The idea is small increments of work. Please make sure that when we are spinning up the builder agents that they are properly informed of how TDD should go so that we can show a clear history of prioritizing testing and tackling small increments of work. We will have many parallel builders using the swarm model and we want to make sure the thing works as expected and is fully tested. Are we able to set a baseline for the testing coverage now to ensure that we meet or exceed as we build?

*Context: Critical PO correction on TDD approach. Plan had bulk "all red then all green" — PO wants incremental Red→Green→Refactor per small feature. Each cycle = separate commit. Git history proves TDD discipline.*

---

## Prompt 8 — Detail-First Artifacts (PO → Lead)
**Timestamp:** 2026-05-27 ~11:30
**From:** Corey (PO)
**To:** Lead (Opus)

> I want a MUCH more detailed version of how we build the thing, not just a nice file. We will distill later, but I want all the deets first.

*Context: PO wanted raw detailed artifacts before polished summaries. "You can always cut detail later but you can't reconstruct it."*

---

## Prompt 9 — ADR + PRD Check (PO → Lead)
**Timestamp:** 2026-05-27 ~11:35
**From:** Corey (PO)
**To:** Lead (Opus)

> Have we made an ADR and PRD?

*Context: PO checked that formal architecture decision record and product requirements document were created. They hadn't been yet — Lead created both.*

---

## Prompt 10 — Harness Instructions + Snippets PR (PO → Lead)
**Timestamp:** 2026-05-27 ~11:38
**From:** Corey (PO)
**To:** Lead (Opus)

> Please make sure to follow all harness instructions, we have a very detailed build and workflow model. We should also enshrine the adversarial model into our snippets workflow. Please create a PR for that in the snippets repo. Have we learned anything that needs to be documented and then updated in the harness?

*Context: PO reminded Lead to follow Snippets harness protocol. Directed creation of adversarial review skill in Snippets repo. Led to PR #1121 (merged).*

---

## Prompt 11 — Lessons Workflow Correction (PO → Lead)
**Timestamp:** 2026-05-27 ~11:42
**From:** Corey (PO)
**To:** Lead (Opus)

> remember that we don't trust claude's memory and that we add lessons to lessons.md, create PRs for improvements, and then kick off builders to do those improvements.

*Context: PO corrected reliance on Claude memory. The harness pipeline is: observe → lesson in lessons.md → issue/PR → builder → merged improvement. Memory is supplementary, not the source of truth.*

---

## Prompt 12 — Branch Question (PO → Lead)
**Timestamp:** 2026-05-27 ~11:44
**From:** Corey (PO)
**To:** Lead (Opus)

> [Screenshot of GitHub showing no branches] says I have no branches

*Context: Branch was local-only, not pushed. PO expected to see it on GitHub.*

---

## Prompt 13 — Wait for Build (PO → Lead)
**Timestamp:** 2026-05-27 ~11:48
**From:** Corey (PO)
**To:** Lead (Opus)

> Wait for build [selected over "Start coding now"]

*Context: PO chose to wait for clean baseline build before writing any code.*

---

## Prompt 14 — Merge Harness PR (PO → Lead)
**Timestamp:** 2026-05-27 ~11:50
**From:** Corey (PO)
**To:** Lead (Opus)

> write the docs to the repo and push. lead can merge

*Context: PO directed Lead to merge the Snippets harness PR (Lead CAN merge harness-only PRs per CLAUDE.md).*

---

## Prompt 15 — Commit and Push Docs (PO → Lead)
**Timestamp:** 2026-05-27 ~11:55
**From:** Corey (PO)
**To:** Lead (Opus)

> I don't see any commits on github with the docs, prd, etc before we start the build on github. Please commit and push

*Context: Docs were written locally but not committed/pushed to the feature branch. PO wanted them visible on GitHub before implementation starts.*

---

## Prompt 16 — Prompt Log + Agent Audit Trail (PO → Lead)
**Timestamp:** 2026-05-27 ~12:00
**From:** Corey (PO)
**To:** Lead (Opus)

> Before we kick off, create a running log of all the prompts I used in this session and the ones going forward to ensure that I can tell the story. This should be in a file called prompts.md. After you complete that commit and push, I'd like to create a workflow upgrade to log the agent actions and decisions. I want to use the agent's slug name as an id and record a concise summary of what was decided for that piece of work they picked up. It should have a timestamp as well.

*Context: PO wants full prompt log for submission + agent audit trail with timestamps and decisions. This file is the prompt log. Agent audit trail will be a separate workflow upgrade.*

---

## Ongoing — Prompts will be appended as the session continues.
