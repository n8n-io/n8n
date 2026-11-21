# Short-Form Vertical Video — Production Spec & Creator Formats

The platform-craft layer beneath any 9:16 video for TikTok, Reels, or Shorts — the constraints that decide whether a good idea survives contact with the feed — plus a tiered library of creator/UGC and founder formats that consistently perform for growth and paid.

Part 1 (the spec) applies to **every** vertical video this skill produces — the iMessage reveals in [imessage-video-ads.md](imessage-video-ads.md), the motion ads in [motion-video-ads.md](motion-video-ads.md), and the creator formats below. Part 2 is the format library.

---

## Part 1 — The Vertical Video Spec

### Canvas
- **1080×1920 (9:16), 30fps, MP4.** Footage of any resolution/orientation is center-cropped to fill (`object-fit: cover`) — mixed source resolutions are fine.

### Safe zones (the single most-missed constraint)
Platform UI covers the frame edges — the action rail, caption stack, music button, and account row all sit *on top of* your video. Text or key visuals in those bands get covered. Keep everything inside the **cross-platform safe band** — the worst case of TikTok and IG Reels margins on a 1080×1920 canvas:

| Edge | Keep clear | Why |
|---|---|---|
| **Top** | 220px | TikTok tabs + IG account row |
| **Bottom** | 500px | Caption / music / CTA stack (both platforms) |
| **Left** | 180px | Symmetry with right |
| **Right** | 180px | Action rail (like/comment/share/music) |

**Result: a 720×1200 centered text band, from y=220 to y=1420.** Compose all captions and load-bearing visuals inside it. Preview against a safe-zone overlay before a big push. (These numbers drift with app updates — re-verify occasionally; they're a well-sourced worst-case, not a permanent law.)

### Caption style (classic TikTok)
White fill, black outline, **no background pill** — the native look that reads as organic, not as an ad:

```css
color: #fff;
font-family: "TikTok Sans", sans-serif;  /* or a close variable sans; embed it, don't assume it's installed */
font-weight: 700;
paint-order: stroke fill;                  /* stroke behind fill — keeps glyphs crisp */
-webkit-text-stroke: 8px #000;
text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
```

- **Captions are static** — no entrance/exit transitions. A caption is at full visibility on the first frame of its window, and its window matches its video segment exactly (same start, same end). Animated captions read as "made by a brand."
- **Auto-size to fit the band.** Start at ~58px and shrink in ~2px steps until the text fits the safe band (fit box ~1150px tall), floor ~26px. Never overflow the band, never clip mid-glyph. Long wall-of-text hooks are a *supported* input, not a failure case — they just shrink. Re-measure after the font actually loads (`document.fonts.ready`) so sizing uses the real face, not a fallback.

### Audio defaults (and the organic-vs-baked decision)
- **Mute clip audio by default; let one music track carry the sound.** Per-clip audio is opt-in (e.g., keep a creator's voice at full, mute B-roll).
- **Fade music out over the final ~0.8s** — a hard cut to silence reads as broken.
- **The organic call:** for organic TikTok/Reels, often post **without baked-in music** and attach the trending sound *in-app* — the platform's algorithm rewards native/trending audio, and an in-app sound is discoverable/attachable by others. **Bake the music in** for paid ads and anywhere you can't attach a native sound (some cross-posting, some platforms). This one decision meaningfully affects organic reach.

### Determinism (if you generate programmatically)
Renders must be reproducible: no clocks (`Date.now()`), no `Math.random()`, no network fetches at render time. Same inputs → same MP4, every time. (Applies whether you're on Remotion, HyperFrames, or an ffmpeg pipeline — see the `video` skill for framework choice.)

---

## Part 2 — Creator Format Library

UGC- and creator-driven short-form formats that reliably perform for growth and paid. Each is a *structure*, not a script — feed it your own footage and hook. All obey Part 1.

**Tiers** rank a format on one axis: does it *scale a cold ad into net-new audiences* (a "unicorn scaling" format), or does it just *convert people already in mid/low funnel* (a "supporting cast" format)? **S** = the rare formats that both scale cold and carry heavy education. **A** = scales up well. **B** = solid supporting cast under the right conditions. **C** = situational or operationally complex (rights, specific talent, or better faked than captured). Build a *portfolio* across tiers — don't expect every format to scale. Meta's persona-based delivery is why creator-fronted formats (Yapper, Investigation, Authority, VSL) rank so high: they reach personas natively through the creators those personas already follow. For the full 51-format taxonomy and where each sits, see [meta-creative-formats.md](meta-creative-formats.md) (companion reference) and the tier/portfolio logic in [ads/references/meta-decision-system.md](../../ads/references/meta-decision-system.md).

### Format 1 — Reaction + Demo (hard cut) · A
**Shape:** creator reaction clip with a hook caption → **hard cut** to an app/product demo screen recording. ~9–12s total.

```
[ reaction · ~3s · hook caption ] → [ demo · full length · optional payoff caption ]
```

- **When:** you have (or can get) a genuine-feeling creator reaction and a crisp demo. The workhorse UGC format for apps/tools.
- **The hook caption** rides the reaction segment and does all the selling — it's the ad. Write it as the reaction's inner monologue ("i was about to hit it and this app talked me out of it"), not a product claim.
- **The hard cut is the mechanic** — no transition. Reaction earns attention, cut delivers the payoff. Optional second caption on the demo lands the result ("12/12 cravings resisted").
- Sourcing: real UGC reactions are the input bottleneck; the format is only as good as the reaction's authenticity.

### Format 2 — "No Yapping" Split-Screen Tutorial · B
**Shape:** silent, fast tutorial. Fullscreen intro → **50/50 split** (typing/action on one half, live result on the other), step captions at the seam. The "…but no yapping" promise = pure value, no talking.

```
[ intro · fullscreen · hook ] → [ split: input | output · ordered step captions at the seam ]
```

- **When:** a how-to where *showing* beats *narrating* — setup flows, prompt walkthroughs, tool tutorials. The silence is the selling point (people watch muted; "no yapping" filters for high-intent).
- **Captions carry the steps** — ordered, static, one per beat, placed at the split seam so both halves stay visible. Auto-size per Part 1.
- No voiceover; music-only (see the organic-sound note). Pace tight — dead air kills retention.

### Format 3 — Greenscreen Reaction · A
**Shape:** one video plays fullscreen; the creator is **cut out of their background** (greenscreen/segmentation) and composited on top — reacting to or narrating over the underlying content. Optionally start centered, then shrink/drag into a corner so the underlying video takes over.

```
[ fullscreen video (e.g. a screen recording / another post) + creator cutout overlay · optional hook text ]
```

- **When:** reacting to a competitor's post, a trend, a screen recording, or your own product — the TikTok-native "let me react to this" format. Reads as commentary, which the algorithm and audience treat as organic.
- **Both soundtracks can coexist** (underlying video + creator), unlike the mute-by-default rule — the reaction voice is the point here.
- The corner-drag move (creator starts big to establish presence, then shrinks to let the content breathe) is the signature beat.

### Format 4 — Yapper · A
**Shape:** one creator talks straight to camera, telling a personal story that lands on your product. No cuts required — the story *is* the ad. ~20–60s.

```
[ creator talking to camera · hook line first · personal story → product as the resolution ]
```

- **When:** you have the *right* creator (a person who reads as one level above the viewer, excited and specific) and a *scripted* story with a real narrative arc. Hard to nail — needs creator + script + setting all working — but scales into cold audiences when it lands.
- **Mechanics:** open on a strong take or a story hook ("I almost cancelled this app three times"), not a product claim. Structure as hook → story → the product entering as the turn, never as a feature list. Captions on (Part 1 style); low-fi setting (car, walk, one spot) reads native. Flat energy kills it — the delivery carries the format.
- Casting is the bottleneck: the format fails on the wrong creator far more than on the wrong script.

### Format 5 — Amateur Investigation · A
**Shape:** a creator "investigates" your product, niche, or a question on the viewer's behalf — visiting places, comparing options, testing claims. The discovery arc is the retention engine.

```
[ creator sets up the question · goes and investigates (real footage) · lands on your product as the finding ]
```

- **When:** your product wins on comparison or holds up to scrutiny — the investigation earns the recommendation instead of asserting it. Scales cold because it plays as content, not an ad.
- **Mechanics:** frame a genuine question ("are dealership warranties actually worth it?"), let the creator do legwork on camera, and let your product surface as the *conclusion the investigation reached* — not a sponsor slot. Real-world capture (locations, comparisons) is the credibility.

### Format 6 — David & Goliath · A
**Shape:** position the brand as the underdog (David) against a big industry, incumbent, or broken status quo (Goliath). Root-for-you storytelling.

```
[ name the Goliath (the villain / broken norm) · the brand's fight against it · why you win / how you're different ]
```

- **When:** you have a real antagonist — a bloated incumbent, an industry practice that rips people off, a category default that's worse than yours. The story makes the viewer *want* you to win.
- **Mechanics:** make the Goliath concrete and the stakes emotional; the brand's origin ("we built this because X was broken") powers it. Pairs naturally with founder delivery. Don't manufacture a villain that isn't real — the format lives or dies on a genuine antagonist.

### Format 7 — Authority · A
**Shape:** a credentialed expert — doctor, dermatologist, engineer, practitioner — presents or endorses the product on the strength of their expertise.

```
[ expert on camera (credentials clear) · the problem in their domain · why this product is the right answer ]
```

- **When:** hyper-competitive, trust-gated niches (supplements, skincare, health, anything regulated) where a credential does the persuading UGC can't. Adds validation and creative diversity beyond creator UGC.
- **Mechanics:** the expert must be real and the claims must be true and substantiated — this format sits closest to regulatory risk. Route health/medical/financial claims through legal review; never fabricate credentials or put words in an expert's mouth. Follows the skill's Grounded Inputs rules strictly.

### Format 8 — VSL (Video Sales Letter) · S
**Shape:** long-form (60s to several minutes) direct-response video that educates before it sells — problem → mechanism → proof → offer.

```
[ hook + problem · why it happens (the mechanism) · the solution + proof · the offer + CTA ]
```

- **When:** the sale needs *upfront education* — health, wellness, fitness, finance, anything where the buyer must understand the mechanism before they'll convert. One of the few formats that both scales cold and carries heavy teaching, hence S-tier.
- **Mechanics:** the craft is in the script — a tight problem hook, a believable mechanism, stacked proof, and a clear offer. Retention is engineered beat by beat (open loops, mid-script turns that add a new fact). Captions throughout; a real person or voiceover-over-broll both work. This is a writing discipline first — invest in the script.

### Format 9 — Green-Screen Commentary · A
**Shape:** the creator talks *over* full-frame imagery — screenshots, product shots, charts, a competitor's page — pairing an educational take with the visual it references. (Distinct from Format 3's reaction: this is a *teaching* overlay, not a reaction to a post.)

```
[ creator cutout + full-frame reference imagery behind them · educational narration keyed to what's on screen ]
```

- **When:** apparel, and anything with an educational angle where *showing the thing while explaining it* beats talking alone. Reads as commentary/teaching, which delivery treats as organic.
- **Mechanics:** swap the background imagery to match each beat of the narration (the visual should always illustrate the current point). Creator voice carries; keep the take genuinely useful, not a disguised pitch.

### Format 10 — Conversation · B
**Shape:** two people in a real exchange — interview, dialogue, back-and-forth — where the product surfaces naturally in the conversation.

```
[ two people talking · a real question/answer exchange · product enters as part of the dialogue ]
```

- **When:** you can stage a genuine-feeling two-person dynamic and the product fits a natural conversational moment. Solid supporting cast; converts more than it scales cold.
- **Mechanics:** hard to execute — the chemistry and the naturalness are the whole thing; scripted-sounding dialogue kills it. Best when the exchange surfaces a real objection and answers it in-flow.

### Format 11 — Duet / Reaction · C (rights needed)
**Shape:** react to, duet, or stitch another creator's video — your commentary alongside or after their clip.

```
[ original creator's clip · your reaction / duet / stitch responding to it ]
```

- **When:** there's a specific post worth responding to and it earns net-new pockets of audience. Situational.
- **Mechanics:** **you need rights** from the original creator to use their footage in a paid ad — this is the operational gate, not the creative. Without cleared rights, don't run it as an ad.

### Format 12 — ASMR · C
**Shape:** sensory-forward, sound-led video — tapping, unboxing, application, texture — with the product as the sensory object.

```
[ close-up sensory action · product-forward · ASMR audio carries (no VO) ]
```

- **When:** pet, beauty, food, or tactile products where the sensory experience *is* the appeal. Situational and needs the right ASMR-native creator.
- **Mechanics:** breaks the mute-by-default rule — the audio is the point; capture it clean. Requires talent who actually shoots ASMR; a generalist creator can't fake the sensory craft.

### Format 13 — Street Interview · C ("often better to fake")
**Shape:** person-on-the-street questions — real or recreated — capturing candid reactions to your product or category question.

```
[ on-the-street setup · question to passersby · candid answers → your angle ]
```

- **When:** you want the credibility of unscripted public reaction. Situational and operationally heavy to capture honestly.
- **Mechanics:** honest capture is painful (releases, dead takes, weather, luck), so this format is **often better staged/recreated** with the same visual language — the recreated version is faster, controllable, and reads the same. If you do stage it, keep the claims real (Grounded Inputs still apply).

### Founder / Organic Vlog Structures

For **founder-led video ads** and organic-native brand content, four narrative structures (Oren John) give a founder something to *say*, and a shooting + edit system makes it fast to produce. These aren't a separate tier — they're the story arc *inside* a Yapper, Investigation, or vlog. Founder's content is typically a brand's *first* top performer: telling the story of *why* you built the brand auto-connects with same-problem buyers.

**The four structures (pick the arc, then shoot to it):**
- **Hero's journey** — run whatever's happening in the business through: problem → backstory → attempt → failure → epiphany → breakthrough → cliffhanger. The reframe matters more than the events. Lets you post *less* — one great story-vlog a week can beat daily content because people follow the journey. (For this arc specifically, it's fine to run the raw situation through an LLM *for the outline only* — feed brand/persona context, ask for a 60–90s hero's-journey outline — then write the words yourself.)
- **Math** — money as the lever: a cost breakdown or a fixed-budget challenge ("I spent $200 on Meta ads. Here's the breakdown."). *Unexpectedly cheap* outperforms expensive; the affordability question creates intrinsic curiosity. Don't use luxury as the hook — it doesn't scale and reads as a flex.
- **Shiny object** — anchor on something visually novel the viewer hasn't seen and that you have *access* to (your factory, a machine, a craft process, a trade show). Never money/luxury as the shiny object.
- **Niche guide with expertise** — narrate the real world through your professional lens ("what I'd avoid as an interior designer," filmed in the store). A *learner* POV works too — just be honest which you are. Getting out into the world is the cheat code while everyone else yaps in their car.

**The three-capture shooting system** (makes any of the above fast):
- Film every moment **three ways — close / medium / wide (0.5x)** — to maximize usable footage from any moment.
- **2–3 second clips only** — many small clips, never long roaming takes (easy timeline assembly).
- **Motion rule:** if the subject is moving, hold the phone static; if nothing's moving, add a slow push-in or side-slide.
- Do the activity first, then run back through at the end (~5 min) grabbing three angles of 10–12 things — less interrupting.
- One phone folder per trip; **favorite your single best "hook shot"** so the opener is pre-chosen. Get **≥5 shots of yourself** — you're the through-line.

**The 0.5–1s cut formula** (the edit): every shot is **0.5–1 second** — a 45-second voiceover becomes ~45 one-second shots. Record the voiceover/talk track first, lay clips under it, reorder, trim. Cut in CapCut or Instagram's Edits app — don't reach for Premiere/DaVinci. This cut cadence is the vlog-speed cousin of Format 1's hard cut, and it's what makes the footage read as energetic rather than slow.

---

*Vertical-video spec (safe-zone band, caption recipe, auto-sizing, organic-vs-baked audio) and the first three creator formats are distilled from Daniel Hangan's `reelclaw-templates` (built on HeyGen's HyperFrames; TikTok Sans redistributed under SIL OFL 1.1) — patterns credited, no code vendored. The tiered format library (Yapper, Investigation, David & Goliath, Authority, VSL, and the tier logic) is adapted from Dara Denney's Meta creative-type tier list; the founder / organic-vlog structures, three-capture shooting system, and 0.5–1s cut formula are adapted from Oren John's vlog + yapping playbooks — sources credited, expressed originally. Safe-zone numbers are a cross-platform worst case; re-verify against current app UI. For framework/tooling choices to actually render these, see the `video` skill.*
