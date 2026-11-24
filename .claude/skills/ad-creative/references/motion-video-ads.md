# Motion-Style Video Ads (Faceless, Fully Generated)

> Format popularized by Borja ([@borjafat](https://x.com/borjafat)) and the open `super-video-maker` motion-collage recipe by [Bomx](https://github.com/Bomx/super-video-maker-skill); this guide is an original re-expression of the method, extended with a multi-style library and production lessons from building and shipping it end-to-end.

Produce a 15–45s faceless video ad or explainer from nothing but a concept: a styled
poster still (image model) → brought to life with subtle motion (image-to-video model)
→ narrated (TTS) → word-timed captions. No footage, no presenter, no editor. Cost per
finished video is roughly $3–6 in API calls; wall-clock ~15 minutes.

The format works because the *still* carries the idea (one literal, slightly surreal
visual per beat) and the *motion* only makes it breathe. Resist the urge to make the
video do the storytelling — this is animated poster design, not filmmaking.

## When to use

- Concept/explainer ads: one idea made concrete ("your CRM is a junk drawer")
- Top-of-funnel social video (9:16 Reels/Shorts/TikTok, 4:5 and 1:1 feed)
- Brand-response hybrids where a distinctive owned style beats stock UGC
- NOT for: demo/proof ads (screen recordings win), testimonial/UGC formats,
  anything requiring a real product shot as evidence

## Pipeline (provider-agnostic)

1. **Script** 3–6 beats, 20–45s of VO. One idea per beat. Calm and specific beats
   hype. End on a single CTA line.
2. **Poster stills** — one per beat, using a *style formula* (below). Generate beat 1,
   approve it, then pass it as a reference image for every later beat so the set reads
   as one series. Fix garbled label text by regenerating with a shorter phrase.
3. **Animate** each approved still with an image-to-video model (5–8s per beat).
   Motion belongs to the objects in the frame; the composition must not change.
4. **VO + captions**: one continuous TTS take, transcribe with word timestamps
   (whisper), cut beats at sentence boundaries, burn 2–3-word caption groups.
5. **Assemble**: concat beats trimmed to their VO spans (hold the last frame to pad),
   loudness-normalize to `I=-16:TP=-1.5:LRA=11`, export per-placement aspect.

**Provider options** (any combination works; the recipe is model-agnostic):

| Stage | One-key Gemini path | Alternatives |
|---|---|---|
| Stills | Nano Banana Pro (`gemini-3-pro-image-preview`) — excellent label typography | GPT-Image, Flux, Ideogram |
| Motion | Veo 3.1 fast image-to-video (note: 1080p requires 8s clips) | Seedance 2.0 via fal.ai, Kling, Runway |
| VO | Gemini TTS (calm voices: Charon/Kore) | ElevenLabs, OpenAI TTS |
| Captions | whisper word timings + PIL/ASS burn-in | CapCut, platform auto-captions |

## The style library

Five proven looks. Each is a fill-in-the-slots prompt formula; keep ONE style per
campaign so the account builds a recognizable visual identity. All five animate well.

### A. Screen-print collage (editorial, "In a Nutshell" docu energy)
> Flat screen-print collage poster, single saturated `<COLOR>` background, subtle newsprint grain. Centerpiece: a black-and-white halftone cutout of `<SUBJECT DOING THE LITERAL CONCEPT>`, treated as a paper sticker with a thin white die-cut outline, slightly torn edges, and a soft drop shadow. Visible halftone dot texture, vintage editorial photo feel, grayscale subject. Accent cutouts: 2–4 flat shapes (cream circle sun, black zigzag, scattered dots). A torn-paper label near the bottom with the words "`<LABEL>`" in bold condensed uppercase newspaper type. Matte printed risograph aesthetic, limited palette. No gradients, no glow, no 3D, no photorealism, no extra text.

### B. Flat vector explainer (clean, techy, infinitely brandable)
> Flat vector explainer illustration in the style of a premium animated science channel: a friendly simplified `<SUBJECT>`, bold flat shapes with clean rounded edges, solid `<BRAND COLOR>` background, limited palette of `<2-3 ACCENTS>`, flat geometric accents, soft long shadows, completely flat 2D design. A clean rectangular banner near the bottom reads "`<LABEL>`" in bold geometric sans-serif uppercase. No outlines, no 3D, no photorealism, no texture, no extra text.

### C. Papercraft diorama (warm, tactile, premium-crafty)
> Layered papercraft diorama: `<SUBJECT>`, every element hand-cut from colored construction paper with visible paper thickness and real drop shadows between layers, `<COLOR>` paper background with cut-paper accents, tactile handmade craft feel with slightly imperfect scissor cuts. A cut-paper banner near the bottom reads "`<LABEL>`" in chunky cut-out paper letters. Soft studio lighting on the paper layers. No digital gradients, no photorealistic humans, no extra text.

### D. Pop-art comic (loud, scroll-stopping, promo-friendly)
> Vintage pop-art comic panel: `<SUBJECT>`, bold black ink outlines, Ben-Day halftone dots shading, flat process colors (`<PALETTE>`), comic starburst accents, thick panel border, aged newsprint paper texture. A comic caption box near the bottom reads "`<LABEL>`" in bold comic lettering. 1960s printed comic aesthetic, slight ink misregistration. No 3D, no photorealism, no gradients, no extra text.

### E. Claymation (charming, high pattern-interrupt)
> Stop-motion claymation scene: a charming handmade plasticine `<SUBJECT>`, visible fingerprints and clay texture, `<COLOR>` clay backdrop and floor, chunky clay props, warm soft studio lighting like a stop-motion film set, shallow depth of field. A small clay sign near the bottom reads "`<LABEL>`" in hand-molded clay letters. Handcrafted miniature feel. No 2D illustration, no photorealistic humans, no extra text.

## Brand-flexible styles (token-driven)

The five looks above are *characterful* — they impose their own palette. This second
tier is *brand-first*: each style is defined by *slots*, so any company's tokens drop
in and the output reads as that brand's own design system.

**The brand slots contract.** Before generating, resolve these from the brand's
guidelines (or `.agents/product-marketing.md`):

- `FIELD` — the neutral ground (brand white/off-white, or brand dark)
- `INK` — the drawing/type color (brand gray/charcoal, near-black)
- `ACCENT` — ONE brand color or gradient, used sparingly (a rule, a beam, a square)
- `TYPE FEEL` — the brand's typographic voice ("clean modern grotesque sans", "geometric sans", "mono captions")
- Any per-brand constraints (e.g. "gradients only on borders/edges, never fills")

Keep the accent genuinely scarce — one element per frame. Scarcity is what makes
these read as designed rather than generated.

### F. Monoline editorial (the most universally brandable)
> Minimal editorial monoline illustration poster: `<SUBJECT>`, drawn entirely in elegant thin single-weight `<INK>` lines on a clean `<FIELD>` background, the style of a premium tech company blog illustration. Sparse composition with generous whitespace, a few small monoline accent details, and ONE restrained `<ACCENT>` element: `<a thin accent underline sweep / a small accent arc>`. A small caption near the bottom reads "`<LABEL>`" in `<TYPE FEEL>`, `<INK>`, letterspaced uppercase, with a thin `<ACCENT>` underline. Precise, technical, refined. No fills except the single accent, no gradients, no 3D, no photorealism, no texture, no extra text.

### G. Swiss typographic (type IS the visual — any brand with a font and a color)
> Swiss International Typographic Style poster: the words "`<LABEL>`" set enormous in a bold `<TYPE FEEL>`, `<INK>` on a `<FIELD>` background, filling the upper two thirds with tight leading and cropped edges. A small black-and-white photographic cutout of `<SUBJECT>` sits on a thin baseline grid in the lower third, aligned to an asymmetric grid with one thin `<ACCENT>` rule line and a small `<ACCENT>` square as the only color. Visible faint grid lines, precise margins, mathematical composition. Flat, printed, matte. No gradients, no 3D, no decoration, no extra text beyond the label and one small letterspaced caption line.

### H. Wireglow (dark keynote — dev-tool / dark-mode brands)
> Dark minimal tech-keynote poster: `<SUBJECT>` rendered as an elegant thin light-gray wireframe line drawing on a near-black `<FIELD>` background with subtle film grain. From `<the focal object>` emanates a soft narrow beam of glowing `<ACCENT>` gradient light, the only color, feathered and atmospheric. Faint thin concentric geometric guide circles. A caption near the bottom reads "`<LABEL>`" in `<TYPE FEEL>`, light gray, letterspaced uppercase, with a hairline gradient rule beneath it. Restrained, premium, technical. No photorealism, no 3D render look, no busy elements, no extra text.

### I. Duotone screenprint (photo brands — editorial punch from two tokens)
> Bold duotone screenprint photo poster: a dramatic photograph of `<SUBJECT>`, reproduced as a two-color screenprint — `<INK>` for the shadows and `<ACCENT>` for the highlights — on an off-white `<FIELD>` paper background with visible coarse halftone grain and slight ink misregistration. Strong diagonal composition, the figure large and cropped. A wide solid `<INK>` bar near the bottom carries the words "`<LABEL>`" reversed out in bold condensed `<TYPE FEEL>` uppercase, with a small `<ACCENT>` square bullet. Editorial poster energy, matte printed feel. No gradients beyond the duotone, no 3D, no extra text.

**Motion notes for this tier**: F/G animate as drawing motions (lines extend, the accent
sweep draws itself, type settles by a few pixels); H animates as beam pulse + slow
wireframe rotation feel; I as grain shimmer + slow push. Same hard rules apply — motion
belongs to existing elements, composition never changes.

## Motion prompt formula

> Subtle living-`<style>` motion of the existing elements only. `<ONE literal motion tied to the concept: the pile inflates / the arrow creeps higher / the megaphone trembles with each shout>`. `<Secondary ambient motion: accents drift, gentle push-in>`. Every element that is visible now is the only thing that ever appears; the composition stays exactly as it is. Everything stays `<style descriptor: a flat printed collage / flat 2D vector / cut paper / printed comic / handmade clay>`. No camera whip, no scene change, no morphing, no added text.

## Hard-earned gotchas

- **Video models love adding photoreal "maker hands"** reaching into frame, especially
  on pressing/handling motions — and *negative prompts make it worse* ("no hands" is an
  attention trap). Never mention hands; describe motion as belonging to the objects,
  and include "the composition stays exactly as it is."
- **Always QC each clip's final 2 seconds** — that's where intruding objects and style
  drift appear. Trim before them or regenerate; never ship a "realified" frame.
- **One dominant motion per beat.** Two motions read as chaos at feed speed.
- **TTS + whisper disagree on sound-alikes** ("laws" → "loss"). Read the transcript
  against the script before burning captions; prefer phoneme-unambiguous CTA wording.
- **Keep captions clear of the label band** (captions ~60% height, label ~80%).
  Clamp caption groups so two never overlap; shrink-to-fit long groups.
- **Ad-specific**: put the brand/label in the poster itself (it survives sound-off
  autoplay), front-load the concept in beat 1 (the 3-second hook is the poster), and
  export 9:16 + 4:5 + 1:1 from the same beats by regenerating stills per aspect
  rather than cropping.

## Compliance

Fully synthetic characters — no likeness/UGC disclosure issues, but check platform
AI-content disclosure requirements (Meta and TikTok label AI-generated media).
Don't fabricate statistics or testimonials in the VO; ground every claim.
