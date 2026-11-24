# AI Tells Checklist

A comprehensive reference for detecting AI-generated or AI-assisted writing patterns. Use this during Mode 1 (Detect) to audit content before editing.

**Last validated:** 2026-06 against then-current frontier models. AI-tell vocabularies age fast — the "delve"-era list below reflects 2023-2025 model output; newer models exhibit different tells. Re-validate this list every ~6 months against fresh model output and date the revision here.

Rate each finding: 🔴 Critical (rewrites required) / 🟡 Medium (edits needed) / 🟢 Minor (polish)

---

## Category 1: Overused Vocabulary

These words appear in AI output at 5-20x the frequency of human writing. One instance is fine. Multiple instances in a single piece is a tell.

### Red-flag verbs (overused)
| Word | Problem | What humans say instead |
|---|---|---|
| delve / delve into | Pretentious filler | look at, dig into, explore, examine |
| leverage | Jargon for "use" | use, apply, put to work, capitalize on |
| foster | Formal filler | build, develop, encourage, create |
| facilitate | Bureaucratic filler | help, make easier, allow, support |
| navigate | Overused metaphor | handle, manage, work through, deal with |
| ensure | Empty guarantee | check that, make sure, verify |
| utilize | Formal for "use" | just say "use" |
| prioritize | Often redundant | just say what to do first |
| streamline | Vague improvement promise | be specific about what gets faster/easier |

### Red-flag adjectives (overused)
| Word | Problem | What humans say instead |
|---|---|---|
| crucial / vital / pivotal | Overloaded intensifiers | just show why it matters |
| robust | Vague positive | specific: "handles X load," "covers Y cases" |
| comprehensive | Overpromise | specific: "covers the 5 most common..." |
| innovative | Meaningless | say what it actually does differently |
| holistic | Buzzword | say what it covers |
| seamless | Overused product adjective | describe the actual experience |
| cutting-edge | Dated marketing | say what's new or different specifically |
| dynamic | Filler adjective | usually just delete it |

### Red-flag nouns (overused)
| Word | Problem | What humans say instead |
|---|---|---|
| landscape | Overused metaphor | "how X works today," "the state of X" |
| ecosystem | Overused for "industry" or "community" | be specific |
| framework | Often vague | name the specific framework or approach |
| paradigm | Academic filler | usually replaceable with "approach" or "way of thinking" |
| synergy | Corporate cliché | delete or replace with what actually happens |

---

## Category 2: Hedging and Qualification Patterns

Humans hedge. AI hedges compulsively. The difference is frequency and context.

### Opening hedges (usually safe to cut)
- "It's important to note that..."
- "It's worth mentioning that..."
- "It should be noted that..."
- "Needless to say..."
- "It goes without saying..."
- "Of course, ..."
- "Naturally, ..."

### Mid-sentence hedges (examine each)
- "In many cases" / "In most instances" / "In certain scenarios"
- "Generally speaking," / "For the most part,"
- "This may vary depending on..."
- "Results may differ based on..."
- "While this isn't always the case..."

**Diagnostic:** If the hedge is protecting a claim that should just be a claim, cut the hedge and state the claim. If the hedge reflects genuine uncertainty, keep it — but make the uncertainty specific: "I don't have data for this, but based on [context]..."

### Vague authority claims (replace with specifics)
- "Studies show..." → "A 2023 McKinsey study of 400 SaaS companies showed..."
- "Research suggests..." → same — name the research
- "Many companies..." → "HubSpot, Slack, and several bootstrapped SaaS founders we've talked to..."
- "Experts agree..." → name one expert
- "It has been shown that..." → by whom, when, where

---

## Category 3: Structural Patterns

### The SEEB paragraph (most common)
Pattern: Statement → Explanation → Example → Bridge to next topic
When every paragraph follows this exact structure, the writing reads like a machine assembled it. Because it was.

**Fix:** Mix in fragments. Questions. Short paragraphs. Asides. Let sections breathe differently.

### Parallelism overload
AI loves parallel structure. Three-item lists. Four-item lists. Everything in threes. Alliteration sometimes.

Occasional parallelism is powerful. Three consecutive bulleted lists of three items each is a tell.

**Fix:** Break the rhythm. Some sections need bullets. Most don't.

### The summary conclusion
AI conclusions restate the introduction. Paragraph by paragraph. "In this guide, we covered X, Y, and Z. By applying these strategies, you can achieve [thing from the intro]."

Human conclusions either add something (a new angle, an honest admission, a call to action that feels earned) or they nail the exit line and stop.

### Symmetric section lengths
Every H2 section is roughly the same length. ~300 words. Every one. That's a machine maintaining consistency. Humans have opinions — some things deserve more space, some less.

---

## Category 4: Punctuation and Formatting Tells

### Em-dash frequency 🟡
One or two em-dashes per piece: fine. Three per page: suspicion. Five+: AI fingerprint.

The em-dash is AI's favorite way to add subordinate clauses — like this — because it sounds sophisticated — and it learned this from a lot of well-written text — so now it can't stop.

**Fix:** Replace most with periods. Break into shorter sentences.

### Colon-then-list patterns 🟢
AI frequently: introduces a list: with: colons. Multiple times per section. Lists are useful. But if every section has a colon-introducing list, it's mechanical.

### Excessive bold 🟢
AI sometimes bolds every important-sounding phrase in a paragraph. **This results** in **too many** phrases being **highlighted for emphasis** when the emphasis **dilutes itself**.

Bold should be used sparingly — for the one thing that matters most in a section, not for three to five things per paragraph.

---

## Category 5: Tonal Tells

### False warmth 🟡
"We hope this guide has been helpful in your journey to..." 
"We trust that you've found valuable insights in..."
"It's our sincere hope that these strategies will empower you to..."

No one talks like this. It's the corporate newsletter voice. Cut it.

### Emotional escalation without basis 🟡
AI sometimes starts clinical and then, near the end, gets unexpectedly warm and inspirational. "Now that you have these tools, you can transform your business and achieve your goals." The warmth wasn't earned by the preceding content.

### Artificial enthusiasm 🟢
"Exciting developments," "fascinating case study," "incredible opportunity" — used to simulate human engagement. Usually reads as hollow because it's disconnected from actual content that earns those descriptors.

---

## Quick Audit Scoring

For a 1,000-word piece, count:

| Signal | Count | Severity Threshold |
|---|---|---|
| Red-flag vocabulary words | | >5 = 🔴 |
| Opening hedges | | >2 = 🔴 |
| Vague authority claims ("studies show") | | >2 = 🔴 |
| Em-dashes | | >4 = 🟡 |
| SEEB paragraphs (all follow same structure) | | >60% of paragraphs = 🔴 |
| Instances of false warmth | | >1 = 🟡 |

**Scoring:**
- 0-5 total flags: Light edit (Mode 2 quick pass)
- 6-12 total flags: Full humanize pass (Mode 2 complete)
- 12+ total flags: Full rewrite recommended (Mode 1 audit → complete Mode 2 → Mode 3)
