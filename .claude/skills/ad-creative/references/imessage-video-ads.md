# iOS-Native Reveal Video Ads (iMessage, ChatGPT, Apple Notes, AirDrop)

A family of 9:16 social-native video formats that recreate a familiar iOS surface in real time and let the brand emerge inside it. The flagship is the **iMessage chat reveal** — someone sends a screenshot of a result or product, a friend reacts and asks what it is, and the conversation reveals the brand, usually with a promo code. Message bubbles pop in over ~15–22 seconds with authentic send/receive sounds, then a static brand end card lands the CTA. The same architecture powers **ChatGPT reveals**, **Apple Notes reveals**, and **AirDrop reveals** — covered in [Other iOS-Native Reveal Surfaces](#other-ios-native-reveal-surfaces) below.

The format works because it borrows the most-read UI on earth. A chat thread is a familiar, high-attention dramatization — it mirrors how real recommendations happen, so the viewer leans in instead of scrolling past. The CTA arrives conversationally ("use code FREEPACK") instead of as a hard sell, which keeps the ad-skip reflex from firing until the pitch has already landed. Run it only as a clearly labeled paid placement (Meta's "Sponsored" tag does the disclosure work); never seed it organically as if it were a real leaked conversation.

Credit: this reference distills the format popularized by Shiv Sakhuja and the Gooseworks team ([@shivsakhuja](https://x.com/shivsakhuja), [gooseworks-ai/gooseworks-ads-skills](https://github.com/gooseworks-ai/gooseworks-ads-skills)), who report the format performing strongly on Meta.

---

## When to Use This Format

**Good fit:**
- Reaction/discovery ads where the punchline is the recipient's curiosity ("wait, what app is that?")
- Promo-code offers — the conversational delivery feels far less ad-like than a code on a slate
- Products with a screenshot-able result: a number, a dashboard, a receipt, a before/after
- UGC-style angles when you don't have UGC creators on tap

**Poor fit:**
- Considered B2B purchases where a casual text exchange undercuts credibility
- Products with nothing visual or numeric to screenshot (fix the hook first, not the format)
- Brands whose compliance review can't approve dramatized conversations (regulated industries — check first)

**Platform fit:** Built for Meta Reels/Stories placements (9:16, 1080×1920) with a 1:1 center-crop variant for feed. Works on TikTok and YouTube Shorts with the same master file.

---

## Compliance and Grounding

This is a **dramatization** — a scripted conversation, not a real one. That's a standard, legitimate ad device, but two rules keep it honest and on the right side of FTC guidance:

1. **Every claim in the thread must be true of the product.** The race time, the savings math, the "5 minutes a day" — ground each one in a real customer result, review, or verifiable product fact, exactly as the Grounded Inputs rules in SKILL.md require. The conversation is fictional; the facts inside it can't be.
2. **Don't present the thread as a real testimonial.** No real customer names, no "this is an actual text from a customer" framing, no fabricated endorsements. The format persuades through recognizability, not through pretending to be found footage.

If a claim needs a disclaimer on your landing page, it needs one on this ad too.

---

## Concept Angles

Most iMessage ads fit one of six angles. Pick the angle before writing any copy — the most common failure mode ("script is fine but the ad feels off") is an angle mismatch, not bad lines. The strongest hooks share one of three traits: a specific number, a small act of self-trust, or a physically novel product mechanic.

| Angle | The hook attachment | The reveal |
|---|---|---|
| **Result-as-screenshot** | A number that brags by itself — race time, app summary, dashboard stat | "X minutes a day. that's it." |
| **Setup flex** | A photo of your space — tiny apartment gym, race-kit corner, desk setup | "this is the whole setup" |
| **Cancellation moment** | A confirmation receipt — gym cancellation email, "subscription cancelled" page | "$X/mo → $Y/mo. do the math" |
| **Feature-as-punchline** | A short clip of the product mechanic in motion | The mechanic *is* the brand |
| **Friend-asks-friend (inverse)** | The *peer* opens with the wow — "how are you doing this 😭" | *You* reply with the brand |
| **Receipt-as-hook** | A mundane financial document — statement, App Store receipt | A small act of self-trust |

---

## Anatomy of the Ad

```
0:00  Hook attachment lands (the screenshot the whole chat is about)
      ↓ short reactions, 250–450ms apart ("bro no way" / "wait is that real")
0:06  The question — "what app is that??"
      ↓ typing indicator … then the brand-name reply
0:12  The pitch, in texting voice — one or two bubbles max
0:15  The code — "use FREEPACK, first pack's free" (code renders link-underlined)
0:17  Beat of silence, then the closer — "bet" / "ok downloading"
0:18  300ms crossfade → static brand end card: logo, code, tagline (~3s)
```

**Script rules:**

- **8–14 bubbles total.** Shorter reads thin; longer loses the scroll-past viewer.
- **Write in real texting voice.** Lowercase, fragments, one emoji max per message, no marketing adjectives. Read it aloud as two friends — any bubble that sounds like ad copy gets cut.
- **The brand appears once, late.** The thread is about the *result* until someone asks. Naming the brand in bubble two kills the reveal.
- **Pacing has rhythm, not a metronome.** One-word reactions fire 250–450ms apart; sentence replies get 600–900ms of air after them; leave ~600ms of silence before the final reaction so it lands.
- **Typing indicators go before sentence-length peer replies**, optional before short reactions. The indicator appearing is silent (see SFX rules below).
- **The promo code goes inside a bubble**, styled with iOS's link-detection underline, *and* on the end card. Conversational delivery first, reinforcement second.

---

## Production Routes

Two ways to produce it, in order of control:

### Route 1: Code-based pipeline (full control)

The architecture that produces a convincing result: render the chat as HTML/CSS mimicking the iMessage UI, drive the animation with a timeline script, record it headlessly with Playwright, and assemble audio + end card with ffmpeg.

1. **Script as data.** Store the thread as JSON: participants (peer name, initials, avatar color), ordered messages (`from`, `text`, attachment paths, typing-indicator flags), theme, header. The script is reviewable and re-renderable without touching code.
2. **Render the chat UI in HTML/CSS.** Dark theme reads most native. Two variants: full-bleed chat, or the chat inside an iPhone frame (status bar + Dynamic Island) over a brand-relevant background photo — the framed variant reads more native in-feed and is the better default.
3. **Animate with a timeline, record in ONE continuous session.** All bubbles exist in the DOM but hidden (`display: none` — not `opacity: 0`, or the thread pre-allocates space and never "grows"). A driver script walks a timeline array revealing each bubble, driving the composer, and auto-scrolling. Never record scene-by-scene and concat — every page reload causes a visible micro-flicker.
4. **Type the composer for every sent bubble.** The typed text must exactly equal the sent text (a mismatch reads fake on second watch). Pace ~12–15 chars/sec with ±30% per-character jitter so it feels like thumbs, not a script.
5. **Record at native output resolution.** Set both the Playwright `viewport` *and* `recordVideo.size` to 1080×1920 — if you omit `recordVideo.size`, Playwright records a scaled-down video by default. Recording small and upscaling ships soft, blurry bubble text.
6. **Layer audio with ffmpeg.** SFX cues computed deterministically from the same timeline that drove the recording, so sounds land exactly on bubble pops.
7. **Stitch: chat → 300ms crossfade → static end card.** ffmpeg's `xfade` requires both inputs to match in resolution, pixel format, and frame rate — render the end card to a fixed-frame MP4 at the same specs as the chat recording before fading. Export the 9:16 master plus a 1:1 center crop.

### Route 2: Code-based video (templated scale)

Once a winning script structure emerges, rebuild it as a Remotion or Hyperframes composition (see [generative-tools.md](generative-tools.md)) with the thread JSON as props. Then variations — new hooks, new codes, new personas — are data changes, not re-productions. Right move at the "we're testing 10 script variants a week" stage, not for the first ad.

---

## Craft Rules (the details that sell the illusion)

These are the difference between "feels like a real chat" and "feels like a mockup":

- **The real send/receive sounds, never generic notification sounds.** The iMessage feel is mostly the audio. BigSoundBank hosts recordings of Apple's message sounds under CC0: send whoosh (`bigsoundbank.com/UPLOAD/mp3/1313.mp3`, ~0.5s) and receive tritone (`bigsoundbank.com/UPLOAD/mp3/1111.mp3` — trim to ~1.4s with a 400ms fade). Normalize loud (≈ -9 LUFS) so they cut through the music. Note the recordings being CC0 doesn't mean Apple has licensed its sound marks or UI trade dress — this is standard practice in the format, but regulated brands and risk-averse legal teams should review the iMessage mimicry as a whole; a generic chat-app skin (neutral bubbles, non-Apple sounds) is the fallback that keeps the mechanic.
- **No sound on the typing indicator.** iOS is silent when someone starts typing. Play the receive sound only when the actual bubble replaces the dots. This is the single most common tell.
- **Music bed: quiet lofi/hip-hop instrumental.** ~30% volume, highpass around 60Hz to clear room for the SFX, fade out ~1.5s before the code reveal so the CTA lands in relative silence.
- **Static end card — no zoom, no Ken Burns drift.** The brand slate must land hard; a drifting end card reads as filler.
- **Real brand logo SVG on the end card, never CSS-styled text.** Font-approximated wordmarks look amateur even when close. Pull the official SVG from the brand's press kit, Wikimedia, or brandfetch.com.
- **Hook screenshots: mimic the real app's UI, don't AI-generate it.** AI-generated app UIs ship garbled chrome that reads as slop. Build a small HTML page copying the actual app's brand colors, typography, and layout conventions (the Strava-orange strip, the "Public · 2h ago" timestamp) and screenshot it. Reserve AI image generation for *photographic* hooks — a beach photo, a lifestyle shot, the framed variant's background.
- **Audio mixing gotcha:** ffmpeg's `amix` divides volume by input count by default — pass `normalize=0` or the whole mix comes out mysteriously quiet. Then run the mix through a limiter with the ceiling just under full scale (e.g. `alimiter=limit=0.95`, ≈ -0.4 dB) so it's loud without clipping.

---

## Quality Checklist

Before shipping:

- [ ] Every factual claim in the thread traces to a real review, result, or product fact (Grounded Inputs)
- [ ] Script reads as real texting voice when read aloud — no marketing adjectives in bubbles
- [ ] Brand name appears only after the peer asks
- [ ] No sound on any typing indicator; receive SFX fires when the text bubble lands
- [ ] SFX land exactly on bubble pops (spot-check first and last)
- [ ] Every sent bubble had a full composer drive; typed text equals sent text
- [ ] No micro-flicker anywhere in the chat — the only cut is chat → end card (300ms crossfade)
- [ ] Promo code is link-underlined in its bubble and repeated on the end card
- [ ] End card is static with the real logo SVG
- [ ] Master is native 1080×1920; 1:1 variant is a crop, not a squeeze
- [ ] Final bubble gets ~600–800ms of air before the crossfade
- [ ] Audio is limited just under full scale (no clipping); music never fights the SFX

---

## Iterating the Format

Treat the thread as the variable and the pipeline as fixed. Test in this order — hook first, everything else after:

1. **Hook attachment** — the screenshot is the thumbnail and the first 2 seconds; it decides the scroll-stop
2. **Angle** — result-flex vs. cancellation vs. inverse changes who the viewer identifies with
3. **Code reveal phrasing** — "first pack's free with FREEPACK" vs. "FREEPACK gets you one free"
4. **Peer persona** — name, avatar, and texting style shift the perceived audience
5. **Length** — try a 12-bubble and an 8-bubble cut of the same script

The same architecture extends to further surfaces too — WhatsApp, Slack, a search box — same timeline-driven recording, different UI shell.

---

## Other iOS-Native Reveal Surfaces

Everything above about production (UI mockup → timeline-driven continuous recording → deterministic SFX cues → static end card), grounding, and disclosure carries over unchanged. What changes per surface is the *persuasion mechanic* and a handful of craft details.

| Surface | Persuasion mechanic | Reach for it when |
|---|---|---|
| **iMessage** | A friend's recommendation — social proof through dialogue | The product is discovered through results people share ("what app is that?") |
| **ChatGPT** | An authoritative answer to the viewer's own question | The problem is question-shaped — something people would literally type into ChatGPT |
| **Apple Notes** | A private confession made public — first-person, no dialogue | The angle is transformation or realization ("things nobody told me about 45") |
| **AirDrop** | A spontaneous peer share — "someone nearby thought this was worth sending you *right now*," with a built-in accept/decline decision | The product is something people pass to each other (a deal, a link, a find, a file) and the accept-tap can *be* the reveal |

The strongest signal for choosing: which of these surfaces already fills your audience's day. Recommendation products want iMessage; advice-seeking problems want ChatGPT; identity/transformation stories want Notes; and anything people spontaneously pass to each other wants AirDrop.

### ChatGPT Reveal

The viewer identifies with the *asker*. The typed question is the hook and must be the target customer's verbatim question — awkward phrasing and all ("why is my stomach so bloated all of a sudden at 47?"). The streaming answer names the problem's real mechanism, then the solution category; the brand lands in the answer's recommendation or in a typed follow-up ("what's the best one?").

**Craft details:**
- **Stream the answer in word chunks**, not character-by-character (that's typing, not generation) and not whole paragraphs at once. A subtle tick underneath the stream and a clean stop when the response completes; no iMessage tritones anywhere.
- **Type the question like thumbs, stream the answer like a model.** Two distinct rhythms — the contrast is what reads as "real ChatGPT."
- **Keep the answer scannable:** short paragraphs, a bolded phrase or a short list, exactly the way ChatGPT actually formats. A wall of text breaks the illusion and loses the viewer.
- OpenAI's interface is their trade dress — same legal-review posture as the Apple UI mimicry note above, with a generic "AI assistant" skin as the fallback.

**Compliance — stricter here than anywhere else in this family.** The "answer" is your ad copy wearing a lab coat: an authority costume. Every claim in it needs the same substantiation as a claim in your own voice, and the format's borrowed authority raises the bar, not lowers it. Do not put health, medical, or financial advice in a fabricated AI answer without legal review — that's the highest-risk version of this format. And never present the exchange as a real, unprompted ChatGPT output endorsing your product; it's a dramatization, same as the iMessage thread.

### Apple Notes Reveal

A different genre from the chat formats: **confession, not conversation.** The viewer watches someone type a private note — a list of realizations, a "things I wish I knew" entry — with the keyboard visible. The note's title is the hook and does the job slide 1 does in a carousel ("Things nobody told me about 45."). The product appears as one item in the list, named the way a person would actually write it to themselves — not the way a brand would.

**Craft details:**
- **Audio is keyboard taps only.** No chat SFX, no receive tones — a note has no other party. A quiet music bed still works underneath.
- **Type at real thumb pace with jitter**, same as the iMessage composer rule. One typo-and-correction reads as human; several read as staged.
- **Get the Notes chrome right:** title styled larger than body, the formatting bar above the keyboard, iOS-yellow accents. Same HTML-mimicry approach — and the same Apple trade-dress review note and generic-notes-app fallback — as everything else here.
- **Fit the note to the frame.** Write short enough that the whole note fits without scrolling, or scroll once, deliberately, late.
- **First person or it doesn't work.** The moment the note reads like ad copy ("[Brand] changed everything!"), the intimacy that makes the format convert is gone. The product mention should be the *least* enthusiastic line in the note.

The grounding rule hits differently here: the confession is a dramatization of a *composite, true* customer story — pull the realizations from real reviews and interviews (the Grounded Inputs corpus), and keep any numbers or outcomes to documented ones.

### AirDrop Reveal

The one interaction-native format in the family: the hook is an **incoming AirDrop request**, and the **Accept tap is the reveal**. The viewer watches from the *receiver's* POV — a translucent AirDrop card slides up, "[Sender] would like to share [preview]," with a gray Decline and a blue Accept. The curiosity is structural ("what is this and who's sending it?") and the accept/decline choice is a built-in micro-conversion beat baked into iOS itself. Tapping Accept transfers the item — and *that's* where the product, the offer, or the result lands.

**Craft details:**
- **The preview thumbnail is the hook.** It's the one image on the AirDrop card before Accept, so it has to earn the tap — same job as the iMessage screenshot attachment. Make it the result, the product money-shot, or the offer.
- **Cast the sender name like a real share.** "Sarah's iPhone," "Mom," "Jordan's MacBook" reads native; a brand name in the sender slot reads like an ad — save brand-as-sender for the reveal, not the incoming card.
- **The transfer progress ring is the signature motion — don't skip it.** Incoming card → a beat of hesitation ("accept?") → the Accept tap → the circular progress fills → the item lands + end card. That progress-ring beat is what makes it read as a real AirDrop and not a cut.
- **Audio is the AirDrop swoosh / received tone**, not the iMessage tritones. Same CC0-Apple-sounds sourcing and the same Apple trade-dress review note as the rest of the family, with a generic "nearby share" skin as the fallback.
- **Keep it short and get the material right.** The card's blur/translucency and the gray Decline / blue Accept button pair are the recognizable cues; a flat opaque sheet breaks the illusion. The whole beat is faster than the chat formats — the interaction *is* the ad.
- **Receiver POV by default; sender POV as the flex.** Receiving reads as discovery ("someone sent me this"); sending reads as a recommendation you're making ("had to AirDrop this to the group") — use sender POV when the angle is advocacy rather than discovery.

Grounding is the same family rule: it's a dramatization of a share, not a claim that a real person actually AirDropped your product. Every claim on the transferred item is substantiated per the Grounded Inputs rules, and the exchange is never presented as a real, unprompted endorsement.
