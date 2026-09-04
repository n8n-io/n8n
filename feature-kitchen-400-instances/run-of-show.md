# The 400 instances dilemma — Feature Kitchen

Facilitator plan for a ~40 person session.

## How to present it

Two options. Both are in this folder.

| File | Use it when |
|------|-------------|
| `the-400-instances-dilemma.pdf` | You want zero risk. 14 pages, 16:9, opens anywhere, works in Keynote / Preview / Acrobat presenter mode. |
| `slides.html` | You want the live deck. Open it in any browser, press `F11` (or `Cmd`+`Ctrl`+`F` on macOS) for fullscreen. |

Keys in the HTML deck: `→` / `space` next, `←` back, `Home` first, `End` last. It wraps at both ends.

The deck loads **no fonts, scripts, or images from the network**. It renders the same offline and on conference Wi-Fi. Keep it that way — do not add a webfont link or a remote image.

To regenerate the PDF after you edit `slides.html`, print to PDF from the browser. The print stylesheet already sets 16:9 pages and keeps the dark theme, so use default margins and enable "background graphics".

**Default slot: 50 minutes.** Cut list at the bottom for 40. Stretch for 60.

n8n is lowercase in every spoken line and on every slide.

---

## Intent of the room

This is not a product demo and not a roadmap pledge.

Take partners inside the problem:

1. Why teams run many instances
2. What they use today to move artifacts
3. Which promotion models we tried
4. Three hard problems we still do not like
5. What we would do **today**, and what we want to build **next**

Success: you leave with 10–15 concrete topologies and a ranked list of pains (credentials vs diff vs merge vs fleet).

---

## Roles

| Role | Job |
|------|-----|
| Host A | Story, slides, timebox |
| Host B | Whiteboard / stickies, harvest quotes, watch the clock |
| Both | One of you always faces the room during table talk |

Capture on a wall with four columns: **instances / promote today / never trust / solve first**.

---

## 50-minute run of show

| Min | Slide | What you do | What they do |
|-----|-------|-------------|--------------|
| 0–2 | 1 Title | Names, why this kitchen exists. Read the title as a customer quote, not a metric flex. | Sit. Phones down if you can get it. |
| 2–5 | 2 **Cold open** | Tell the invoice story end to end, anonymized. Land “nothing errored,” then pause two seconds. House rule last. | Wince. Someone in the room has the same story. |
| 5–11 | 3 Why many instances | Four reasons, fast. Extreme: hundreds, not two. Do not explain their own lives back to them. | **Hands:** 1 / 2–5 / 6–20 / 20+ / don’t ask. Host B tallies. |
| 11–15 | 4 Three failures | Duplicates, data loss, missing credentials. Bar = trust it will work in prod. | 30s shout: which one hit you last. |
| 15–20 | 5 Today’s workarounds | Source control (Git between instances). Full instance import for bootstrap/DR. Be honest: the UX is “you are a Git operator.” | Note who already runs `n8n-cli source-control pull` in CI. |
| 20–24 | 6 Four models | Fast map. Do not debate yet — the scorecard is next. | — |
| 24–29 | 7 **Scorecard** | The payoff the abstract promised. Do not read the grid aloud. Walk row 3 and admit it: the model we dropped is the only one that fits air-gapped prod. | Row 3 people identify themselves. Get their names. |
| 29–32 | 8 Direction | Promote in n8n, persist in Git. Secrets stay on the instance. | — |
| 32–35 | 9 Why not the other two | Security and identity. Migration and isolation. **Stage the disagreement here** (see below). | Watch two hosts actually differ. |
| 35–40 | 10 Puzzle: credentials | Read the mismatch. Point at A/B/C. | **2 min tables**, then 3 voices. |
| 40–44 | 11 Puzzle: diff | Text vs node-aware vs behavioral. Show the real artifact if you brought it. | **Vote** (hands): picture / param list / test run. |
| 44–47 | 12 Puzzle: merge & fleet | Two builders + 400 forks. Force a **single** priority. | Pick one. |
| 47–50 | 13–14 Recommend + close | “If this were our payroll.” Four asks on the closing slide. | Find you in the hall. |

Context is now ~15 minutes, not 21. That is deliberate: this room already lives the context. If the credential puzzle catches fire, let it burn and cut slide 12.

---

## Three things that decide whether this lands

Everything above is structure. These are the moments people will actually remember.

### 1. The cold open (slide 2)

Do not start with “why do teams run many instances.” They know. Start with a failure that has a Friday, a number, and a person. The invoice story on the slide is a placeholder — **replace it with a real one you have permission to tell**, anonymized, no customer name. Real beats plausible, and the room can tell the difference.

### 2. The staged disagreement (slide 9)

Two hosts is an asset most talks waste. Pick something you genuinely disagree on and let the room watch. Good candidates:

- Should n8n ever copy credential values between instances with a vault in the middle?
- Is direct instance-to-instance permanently out, or just out until the auth story is good?
- Do environments inside one instance solve the 80% case we keep ignoring?

Rules: 90 seconds, no resolution, hand it to the room. This is the single most “inside the kitchen” thing you can do. A workshop where the two presenters clearly rehearsed one opinion is a webinar.

### 3. One real artifact (slide 11)

Bring a screenshot of an actual workflow JSON diff — a real one, hundreds of lines, for a one-parameter change. Put it on screen and say nothing for three seconds. That image argues the diff problem better than the three cards do. Same for a credential-missing state if you can capture one.

Optional and stronger: do it live on two instances. Only if you have a rehearsed setup and a fallback screenshot. Conference Wi-Fi ends careers.

---

## Spoken spine (steal this)

**Open.** Teams who run critical operations tell us the same thing. They need a safe place to build, then they need to promote with confidence. When they do it by hand they get duplicate workflows, overwrites, and credentials that did not travel.

**Why 400.** Isolation is the feature. Stages, regions, brands, air-gapped prod. The instance count is a design input, not a customer doing it wrong.

**Today.** Environments in n8n already mean “multiple instances, Git in the middle.” Export/import still exists for move-the-world. Neither is a promote button a business owner trusts.

**Models.** Git as source of truth works for audit and review. Instance-to-instance through GitHub/GitLab/Bitbucket is the same model with better UX. Direct n8n-to-n8n means prod accepts writes from another server. Environments inside one instance look simple and explode migration plus credential isolation.

**Today’s recommendation.** Split instances. Git between them. Protect prod. One branch per environment. Variables and a vault, never keys in Git. Import for bootstrap and disaster recovery.

**Next.** Promote as an n8n action. Diffs a human can review. Credential mapping before go-live. A conflict story we will not fake with JSON merge.

---

## The three kitchen problems (facilitate, do not solve)

### 01 — Credentials

**Setup.** Same workflow id. Same credential id. Different secret. First prod execution is the test.

**Trap.** Copying secrets feels kind and is how incidents start. Blocking forever makes Git unusable. Promoting anyway trains people to ignore red badges.

**Listen for.** External secrets / vault already in use. Different IdPs per stage. “We recreate credentials by name, not id.” OAuth that cannot be copied.

**Do not promise** a vault product in the room.

### 02 — Diff

**Setup.** Git reports a 400-line JSON change. The human changed one URL.

**Trap.** Pixel position diffs. Pinned execution data. Reordered keys. Owners and folders changing under the workflow.

**Ask.** Would you approve a promote from a screenshot of the canvas, a list of parameter changes, or only after a run against prod-like data?

### 03 — Merge and fleet

**Setup A.** Two people, one workflow, Git conflict.

**Setup B.** One template, 400 regional copies with local forks.

**Trap.** Last-write-wins. Auto-merge of node JSON. Promote-all that stamps tax logic.

**Force a vote** so you get a priority, not a wishlist.

---

## Whiteboard prompts (print or project)

1. How many n8n instances, and what does each one mean?
2. What is allowed to differ between stages (credentials, variables, workflow graph, data tables)?
3. Who clicks promote — builder, lead, platform, CI?
4. Can production reach GitHub / GitLab / Bitbucket / other Git?
5. Do you fork workflows per region or client?
6. What must never leave an instance?

---

## What we are *not* saying

- We are not shipping a date.
- We are not telling them to delete instances.
- We are not saying Git is mandatory for every air-gapped site (collect those as constraints).
- We are not demoing a half-built promote UI unless you agreed that in advance.

---

## 40-minute cut

Compress slides 3–5 to 8 minutes total. Give puzzles 2 and 3 two minutes each (vote only, no table talk). Keep the cold open, the scorecard, and the credential puzzle — those are the three that carry the session.

## 60-minute stretch

After slide 5, 5 minutes: “draw your topology” (boxes and arrows, 60 seconds, then three groups show theirs). After slide 12, 5 minutes on **who is allowed to promote** (RBAC compared to Git CODEOWNERS compared to a change ticket).

---

## Slide list (14)

1. Title  
2. Cold open: it worked in dev  
3. Why so many instances (hands)  
4. Three failures  
5. Workarounds today  
6. Four models  
7. Scorecard: which model fits which team  
8. Direction: promote in n8n, persist in Git  
9. Why not direct / why not one-box envs (staged disagreement)  
10. Puzzle: credentials  
11. Puzzle: diff  
12. Puzzle: merge and fleet  
13. Do this today / next  
14. Close (four asks)  

Do not add slides. If you need a live Git screenshot, put it on slide 5 as a backup, not a 15th.

---

## After the session

Write down:

- Instance-count histogram from the hands
- Git-banned-in-prod: yes/no count
- Winning vote on each puzzle
- Verbatim quotes (no customer names in public artifacts)

That is the brief for whatever we build next.
