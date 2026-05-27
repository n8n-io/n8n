# Prompt Summary — Pokemon Node Take-Home

47 prompts over one session. This is the decision-making arc, not a chronological log. Full prompt-by-prompt log: `docs/prompts.md`.

## Setting the Stage

The session started with the full assignment spec and a deliberate choice: spec before code. I filed the assignment as a real project — PRD with user stories, data shapes, workflow patterns, and a visual description of what the node looks like in the n8n editor. The goal was to think through the user experience before touching TypeScript.

I also set expectations for the process: TDD/BDD discipline, an audit trail of agent decisions, and a running prompt log. The submission artifacts needed to show how the thing was built, not just that it works.

## Adversarial Review

Three specialist agents (QA, PM, Architect) reviewed the plan independently, then debated live via messaging. This wasn't a rubber stamp — they found real issues. QA caught that the reference node's pagination pattern wouldn't work with PokeAPI's envelope structure. The Architect flagged that the reference node uses a deprecated API (`helpers.request()`). The PM argued correctly that a single-resource node doesn't need a resource dropdown.

I overruled one consensus recommendation: the trio wanted to cut Return All because the list endpoint only returns stubs. I pushed back — cutting it would signal to reviewers that the candidate couldn't implement cursor-based pagination. The solution was a field description warning, not a feature cut.

A separate security audit found input validation gaps — the URL is constructed from user input, so without validation, path traversal and injection are possible. A trust audit verified that n8n's agent-readable documentation wasn't misleading us.

## Building with TDD

I corrected the team's initial TDD approach — they planned "all red tests, then all green." Real TDD is small increments: write one test, make it pass, refactor, commit. Each cycle is a separate commit so the git history shows the discipline.

Each user story got its own builder agent working on a dedicated branch. The scaffold (US-0) went first since everything depends on shared types. List and Get ran in parallel, then merged. I split "Get by name or ID" into separate stories — different edge cases for name vs ID lookup.

## Quality Gates

Every PR got a reviewer agent before merge. A senior code review pass caught two UX issues: whitespace in input (`" pikachu "` should work) and 404 error messages (should suggest correct name format, not show raw errors). Both were fixed.

The security audit produced concrete mitigations: allowlist regex validation on input, disabled HTTP redirects, and a pagination circuit breaker. These shipped, not just documented.

## Refinement

The PRD expanded from API-focused to UX-focused after I asked "what will the node look like in the visual editor? How would you plug it into flows?" This added workflow patterns and canvas appearance descriptions.

A final documentation audit compared all docs against the actual implementation and fixed inconsistencies. The performance assessment identified the Return All + Loop + Get (unsimplified) pattern as a memory risk (~780MB) and added field description warnings.

Throughout: corrections flowed both ways. I corrected agent behavior (TDD cadence, one builder per story, live debate not static reports). Agents caught things I hadn't considered (pagination pattern, deprecated API, performance risk).
