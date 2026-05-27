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

## Prompt 17 — Harness Upgrades (PO → Lead)
**Timestamp:** 2026-05-27 ~12:05
**From:** Corey (PO)
**To:** Lead (Opus)

> Please make sure to follow all harness instructions... We should also enshrine the adversarial model into our snippets workflow. Please create a PR for that in the snippets repo.

*Context: Directed Lead to follow Snippets harness workflow and create adversarial review skill. Led to Snippets PRs #1121, #1125, #1126, #1127.*

---

## Prompt 18 — Lessons Workflow Correction (PO → Lead)
**Timestamp:** 2026-05-27 ~12:08
**From:** Corey (PO)
**To:** Lead (Opus)

> remember that we don't trust claude's memory and that we add lessons to lessons.md, create PRs for improvements, and then kick off builders to do those improvements.

*Context: Corrected reliance on memory. Pipeline is: observe → lesson → issue/PR → builder → merged improvement.*

---

## Prompt 19 — Prompt Logging Scope Correction (PO → Lead)
**Timestamp:** 2026-05-27 ~12:30
**From:** Corey (PO)
**To:** Lead (Opus)

> A few things to add. Prompt logging should be a general upgrade, not just for external deliverables. Agent audit should be a baseline skill for all development and the lead should ensure that it's done each session for all work types.

*Context: Widened scope of both skills from "external only" to "every session." Led to Snippets PRs #1130, #1131.*

---

## Prompt 20 — User Stories as GitHub Issues (PO → Lead)
**Timestamp:** 2026-05-27 ~12:40
**From:** Corey (PO)
**To:** Lead (Opus)

> All these user stories for n8n must be filed as github issues in my clone of the n8n repo and managed with our standard flow — builder builds using TDD, reviewer reviews, PR references issue, merged when passes review.

*Context: Directed standard workflow for n8n too. Filed issues #1-#8 in colabug/n8n.*

---

## Prompt 21 — Split Get by Name/ID (PO → Lead)
**Timestamp:** 2026-05-27 ~12:41
**From:** Corey (PO)
**To:** Lead (Opus)

> Shouldn't this one be two user stories? US-2: Get Pokemon by Name or ID

*Context: PO correctly identified that Get by name and Get by ID are distinct behaviors with different edge cases. Split into US-2 (#2) and US-3 (#3).*

---

## Prompt 22 — Cuts Challenge (PO → Lead)
**Timestamp:** 2026-05-27 ~12:45
**From:** Corey (PO)
**To:** Lead (Opus)

> Feels like we're being lazy here with these cuts. Were they called out in the assignment? Please revalidate.

*Context: PO challenged the Out of Scope decisions. Led to re-verification against original spec. All cuts were features we added then removed — none were in the original assignment.*

---

## Prompt 23 — GraphQL + Build Status (PO → Lead)
**Timestamp:** 2026-05-27 ~13:47
**From:** Corey (PO)
**To:** Lead (Opus)

> They are shipping graphql soon, should we consider this? Does look like the assignment was really quite minimal. Let's make sure we have a good and fast user experience. Have we been able to build the app locally yet? Can I launch it and see it somewhere?

*Context: PO noticed PokeAPI GraphQL v1beta2 banner. Decision: stick with REST v2 for submission, document GraphQL as future enhancement. n8n dev server started.*

---

## Prompt 24 — Data Shapes + UX Depth (PO → Lead)
**Timestamp:** 2026-05-27 ~13:55
**From:** Corey (PO)
**To:** Lead (Opus)

> In the data shapes section, is this just examples of data that's returned? Should include a blurb to make that clear. What will the node look like in the visual editor? How would you plug it into flows and actually use it? Have we thought that bit through deep enough?

*Context: PRD was too API-focused, not enough UX-focused. Led to adding 6 workflow patterns, canvas appearance section, and data shape context blurbs.*

---

## Prompt 25 — Declarative vs Programmatic (PO → Lead)
**Timestamp:** 2026-05-27 ~14:00
**From:** Corey (PO)
**To:** Lead (Opus)

> why wouldn't we do both? D1: Programmatic Node over Declarative

*Context: PO challenged single-pattern choice. Led to adding hybrid (declarative Get Many + programmatic Get) as a fast follow in ADR D1.*

---

## Prompt 26 — Return All Challenge (PO → Lead)
**Timestamp:** 2026-05-27 ~14:02
**From:** Corey (PO)
**To:** Lead (Opus)

> I'm not convinced on the D3: Cut Return All decision. Convince me.

*Context: PO challenged Return All cut. The case didn't hold — Return All reversed back to IN SCOPE. ADR D3 updated. US-5 (#5) filed.*

---

## Prompt 27 — Verify Operation Convention (PO → Lead)
**Timestamp:** 2026-05-27 ~14:10
**From:** Corey (PO)
**To:** Lead (Opus)

> On D8 let's make sure we're using the real best practice. Check other nodes for consistency.

*Context: Led to codebase audit. Result: 544 nodes use getAll vs 10 use getMany. Convention confirmed.*

---

## Prompt 28 — Performance Latency (PO → Lead)
**Timestamp:** 2026-05-27 ~14:15
**From:** Corey (PO)
**To:** Lead (Opus)

> Does D9 introduce latency for the user?

*Context: No — both fields are already in the fetched response. Two extra property accesses, nanoseconds.*

---

## Prompt 29 — Full Performance Assessment (PO → Lead)
**Timestamp:** 2026-05-27 ~14:16
**From:** Corey (PO)
**To:** Lead (Opus)

> How performant is our recommended implementation. Please have the architect assess.

*Context: Spawned Architect agent. Found all operations fast. One risk: Return All → Loop → Get (unsimplified) = ~780MB. Mitigation: field description warning.*

---

## Prompt 30 — Add Performance Findings (PO → Lead)
**Timestamp:** 2026-05-27 ~14:20
**From:** Corey (PO)
**To:** Lead (Opus)

> Yeah, add findings and as things you'd do later for the ones we're concerned about.

*Context: Added performance profile and 4 future enhancements (LRU cache, batch enrichment, GraphQL, cache node docs) to PRD and ADR D11.*

---

## Prompt 31 — Security Audit (PO → Lead)
**Timestamp:** 2026-05-27 ~14:22
**From:** Corey (PO)
**To:** Lead (Opus)

> Now do a deep security audit to see if there's any risk, supply chain bus, etc. that we could avoid by being more diligent in the specs.

*Context: Spawned Security Engineer agent. Found 2 critical (input validation, error wrapping), 3 important (redirects, limit bounds, circuit breaker), 3 accepted risks. ADR D12 created.*

---

## Prompt 32 — Trust Audit (PO → Lead)
**Timestamp:** 2026-05-27 ~14:25
**From:** Corey (PO)
**To:** Lead (Opus)

> Assess if any of the agent-readable docs might be telling us lies to lead us astray in the take home assignment.

*Context: Spawned Explore agent to verify 8 key claims from AGENTS.md/CLAUDE.md. All confirmed. "Never use any" exists but isn't enforced — following it is a differentiator.*

---

## Prompt 33 — Gap Analysis + BDD Scenarios (PO → Lead)
**Timestamp:** 2026-05-27 ~14:30
**From:** Corey (PO)
**To:** Lead (Opus)

> ok, do a last sense check on the requirements and our stories to find any gaps. Then create all the BDD scenarios — do those go in playwright or somewhere else? Want to use them to validate the feature as we're building/at the end.

*Context: Gap analysis found 4 blockers (APPROACH.md, BDD scenarios, scaffold story, Out of Scope contradiction). BDD goes in Jest, not Playwright. Created 20 BDD scenarios across 7 features.*

---

## Prompt 34 — Playwright Role (PO → Lead)
**Timestamp:** 2026-05-27 ~14:40
**From:** Corey (PO)
**To:** Lead (Opus)

> great, what role will playwright play in validating that our stuff works when plugged into other workflows?

*Context: Led to discovery that n8n DOES have node-specific Playwright tests (http-request-node.spec.ts). Created US-7 (#8) for Playwright E2E.*

---

## Prompt 35 — Can We Automate? (PO → Lead)
**Timestamp:** 2026-05-27 ~14:42
**From:** Corey (PO)
**To:** Lead (Opus)

> yes, do add that — but is there no way to automate it using their current infrastructure and patterns?

*Context: Found 3 automation approaches (Playwright UI, imported workflow, CLI execute). Added E2E scenarios and 7-step manual test script to BDD doc.*

---

## Prompt 36 — Let's Build (PO → Lead)
**Timestamp:** 2026-05-27 ~14:50
**From:** Corey (PO)
**To:** Lead (Opus)

> OK, let's build! Do it with quality, following my workflows, eg. TDD, and ensure that we build something we can be proud of. Also massively parallel where we can and divide it based on logical chunks of work (like user stories) not files based chunking. Conflicts are ok, that's what branches are for and rebasing.

*Context: Green light to build. Key directives: TDD, parallel by user story, conflicts OK.*

---

## Prompt 37 — One Builder Per Story (PO → Lead)
**Timestamp:** 2026-05-27 ~14:52
**From:** Corey (PO)
**To:** Lead (Opus)

> No no no. You should be creating a builder per user story and each builder owns it end to end. That way it's small incremental pieces of work with a clean commit history.

*Context: Corrected bundling of stories into fewer builders. One builder per story, each owns it end-to-end.*

---

## Prompt 38 — US-0 First (PO → Lead)
**Timestamp:** 2026-05-27 ~14:53
**From:** Corey (PO)
**To:** Lead (Opus)

> Probably should do US-0 first and then do the rest of the plan

*Context: Acknowledged scaffold must go first since all builders import from shared files. US-0 builder launched.*

---

## Prompt 39 — Prompts Not Logged (PO → Lead)
**Timestamp:** 2026-05-27 ~15:00
**From:** Corey (PO)
**To:** Lead (Opus)

> not seeing all my prompts being logged in the file prompts.md

*Context: prompts.md was stale at prompt 16. This update brings it current through prompt 41.*

---

## Prompt 40 — Reviewers Required (PO → Lead)
**Timestamp:** 2026-05-27 ~15:01
**From:** Corey (PO)
**To:** Lead (Opus)

> Make sure that we're having reviewers review the feature once the builders are done.

*Context: Reminder of standard workflow: builder builds → reviewer reviews → merge. Each PR gets a reviewer agent before merge.*

---

## Ongoing — Prompts will be appended as the session continues.
