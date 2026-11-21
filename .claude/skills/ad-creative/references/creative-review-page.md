# The Creative Review Page

A shareable, self-contained web page that presents generated ad concepts for a client or stakeholder to **review and pick** — the visual upgrade to `INDEX.md`. Where the markdown outputs are built for the operator, the review page is built for the person approving the spend: it shows each concept as an in-feed platform mockup, breaks carousels into a labeled frame-by-frame storyboard, lets them toggle copy variations, and discloses what's grounded in real assets.

The template ships at [assets/creative-review-template.html](../assets/creative-review-template.html). It's one file — inline CSS and JS, no build, no dependencies, no network. Open it locally, host it on any static host (Vercel/Netlify/GitHub Pages), or hand off the `.html` file directly.

## When to produce one

- **Presenting a batch for approval** — after Mode 1 or Mode 3 generation, package the top concepts into a review page instead of (or alongside) `INDEX.md`. Picking 5 of 50 is a *visual* decision; a client shouldn't have to read markdown to make it.
- **Pitching a whitelist / co-branded partnership** — the format the source pattern was built for: show the partner exactly what the ad looks like under each handle, with the rollout mechanics spelled out.
- **A monthly slate review** (Mode 4) — render the slate's concepts so the account-state call and the pick happen off one link.

Don't produce one for a single headline tweak or a quick internal gut-check — the markdown output is faster. Reach for the review page when a human who isn't you needs to choose.

## How it's built

The template renders entirely from a JSON block near the top of the file — `<script type="application/json" id="review-data">`. Populate it from your generated concepts and everything else renders — tabs, previews, storyboard, copy panel. You do not edit the render code below the data block. The annotated model below is shown with `//` comments for readability; **the file itself is strict JSON** — no comments, no trailing commas (see "Populating the data safely").

### Data model

```jsonc
{
  project: {
    brand: "Truvani",              // required
    agency: "Light Labs",          // optional — adds the co-brand line + the default handle fallback (partner label/initials)
    date: "2026-07-12",            // optional
    note: "one-line context"       // optional
  },
  platforms: ["instagram", "facebook"],   // previews to offer; first is the default. Supported: instagram, facebook
  concepts: [                              // each concept is one strategic ANGLE (see SKILL.md "Define Your Angles")
    {
      name: "Heavy-Metal Proof",           // required — the angle name
      tagline: "Lifestyle hero, then the lab results",   // one line, what makes this concept distinct
      handles: [                            // optional. 1 entry = normal post; 2 = whitelist handle toggle
        { name: "truvani", partner: "Paid partnership with lightlabs", initials: "TV" },
        { name: "Light Labs", partner: "Paid partnership with truvani", initials: "LL" }
      ],
      frames: [                             // 1 frame = single ad; multiple = carousel storyboard
        {
          label: "Hook",                    // the frame's job in the narrative arc
          prompt: "Product bag hero on soft pink, gold-lace overlay",  // image description (shown as placeholder if no image)
          image: "images/heavy-metal-01.png",   // optional — local path/file URL or data URI; omit for text-only concepts
          headline: "Finally, a plant-based protein that's third-party tested for heavy metals.",  // optional per-frame overlay
          headlineTheme: "dark"             // optional: "dark" (default, white text) or "light" (dark text on light imagery)
        }
        // … one object per frame
      ],
      headlines: [                          // selectable variations; the picked one overlays frame 1 in the preview
        "Finally, a plant-based protein that's third-party tested for heavy metals.",
        "We tested our protein for heavy metals. Here's what an independent lab found.",
        "Most protein powders are never tested for heavy metals. Ours is."
      ],
      primaryText: "The caption / body copy.",
      likes: "6,240",                       // optional — Instagram like count; omit and no count is shown
      destination: { url: "shop.truvani.com", cta: "Shop now", offer: "72% OFF Protein Starter Kit" },
      rollout: {                            // optional — the mechanics of how this runs (whitelist, launch plan)
        title: "How the whitelist runs",
        steps: ["step 1", "step 2", "…"]
      },
      grounding: "What in this concept is real — the required disclosure. See below."
    }
    // … 2–4 concepts is the sweet spot; more than that and the tabs stop being a decision
  ]
}
```

### The frame storyboard = a carousel narrative arc

A concept's `frames` are its storyboard. Label each frame by the *job it does*, not its content — `Hook`, `The problem`, `The results`, `The ask`. This is the same narrative-arc thinking as the carousel frameworks: a proof-led concept is literally Hook → Problem → Mechanism → Results → Context → Ask. For the five reusable carousel arcs (Value-Stack, Problem-Proof, Hack List, Rant Callout, Demo Walkthrough), see `carousel-frameworks.md` in the **social** skill and pick the arc that fits the angle before writing frames.

### Images vs. placeholders

Every frame renders one of two ways:
- **`image` provided** — the real creative (from the Mode 3 `images/` folder or a data URI) fills the frame.
- **`image` omitted** — a styled placeholder shows the frame `label` + `prompt`. This is the intended state for concepts that are copy + image-prompt but not yet rendered to image — the review page is useful *before* images exist, and stays useful as they get filled in.

Remote and protocol-relative image URLs are blocked, including URL spellings the browser normalizes. Download authorized creative assets into the local `images/` folder and keep paths relative when hosting or sharing; hosted relative assets still load from that host. This restriction applies to the supplied image sources, not a sandbox for arbitrary edits to the HTML or an assurance about a hosting server.

Ship review pages with placeholders freely; they communicate the concept. Swap in images as they're generated.

## Grounding — the disclosure block is required

Every concept must carry a `grounding` line, and it must be true. This is the same rule as the Grounded Inputs corpus, surfaced to the client: state exactly what is real (which lab panel, which review, which product photography) and, by omission, what is illustrative. The source pattern's line is the model — *"Results are Truvani's actual Light Labs panel (Vanilla, tested Nov 13, 2025). Imagery is Truvani's own product & lifestyle photography."*

Never present invented stats, fabricated test results, or stock imagery as the brand's own. If a concept's proof isn't real yet, the grounding line says so ("Results shown are illustrative pending the lab panel") — a review page that launders fiction as fact is worse than no review page.

## Populating the data safely

The `DATA` lives in a `<script type="application/json" id="review-data">` block — it's inert data (parsed with `JSON.parse`), not executable code, so a value can never run as script. Two rules when you write it:

- **Valid JSON only** — double-quoted keys and strings, no comments, no trailing commas. (The page shows a clear error banner if the JSON is malformed, so a typo fails loud, not silent.)
- **Escape `<` as `\u003c` in every text value.** A value literally containing `</script>` would otherwise close the data block early. Since agents write the JSON, apply this escape mechanically to all string values. All values are HTML-escaped again at render time, so this is defense-in-depth, but the source-level escape is the one that matters — do it.

## Producing and delivering it

1. Copy `assets/creative-review-template.html` into the batch's output folder as `review.html` (e.g. `outputs/YYYY-MM-DD/review.html`).
2. Replace the `DATA` object with the real project — concepts, frames, copy, grounding. Populate `image` paths for any frames you've rendered (keep them relative to the html file so the folder stays portable).
3. Verify it renders: open it in a browser, click through every concept tab, both platform and handle toggles, and each frame in the storyboard.
4. Deliver: hand off the folder (html + `images/`), or host it. For a client link, `vercel deploy` or any static host works — it's a single page with local assets.

Keep the review page next to the markdown outputs, not instead of them: `INDEX.md` and the per-concept files remain the operator's record and the grounding audit trail; `review.html` is the approval surface built on top.

## Common mistakes

- **Too many concepts** — 2–4 tabs is a decision; 10 is a menu nobody finishes. Curate before you present.
- **Unlabeled or content-labeled frames** — label by narrative job (`The proof`), not by what's pictured (`Table screenshot`).
- **Missing or dishonest grounding** — every concept discloses what's real; illustrative proof is labeled illustrative.
- **Editing the render code** — everything is data-driven; if something won't show, it's a `DATA` field, not the JS.
- **Absolute image paths** — keep image paths relative so the output folder can be zipped, moved, or hosted intact.
