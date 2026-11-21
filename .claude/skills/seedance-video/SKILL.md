---
name: seedance-video
description: Write prompts and run generations for Seedance video models on Higgsfield (Seedance 2.0, 2.0 Mini, 2.5, 1.5 Pro) - product and e-commerce ads, TikTok/Reels/Shorts hooks, brand stories, app or SaaS promos, food, fashion, real estate, cinematic, action, anime, cartoon, 3D CGI, music videos, and multi-episode storyboards. Use whenever the user wants an AI video, a video ad, a reel, a promo, a short drama, or mentions Seedance, Higgsfield video, "vidéo pub", "vidéo produit", "réel TikTok", "storyboard", "court-métrage IA". Our own skill: model facts verified with the Higgsfield models API on 2026-10-29.
---

# Seedance video on Higgsfield

## 1. Pick the model (verified 2026-10-29; re-check with `models_explore get` before a big run)

| Model id | Duration | Resolution | Best for |
|---|---|---|---|
| `seedance_2_0` | 4–15 s | 480p–1080p, 4k (4k/1080p need `mode: "std"`) | Default for quality: identity and product consistency from references, start/end frames, native audio |
| `seedance_2_0_mini` | 4–15 s | 480p / 720p | Cheap drafts and volume tests |
| `seedance_2_5` | 4–30 s | 480p–1080p | Longer shots, `video_edit` of an existing clip, `video_extension` forward/backward, `draft: true` at 480p then finalize at 1080p within 7 days |
| `seedance1_5` | 4 / 8 / 12 s | 480p–1080p | Simple motion when references are not needed |

Shared: aspect ratios `auto, 16:9, 9:16, 4:3, 3:4, 1:1, 21:9`; `generate_audio` (default on);
2.0 has `genre` (`auto, action, horror, comedy, noir, drama, epic`) and
`mode` (`std` quality / `fast` cheaper, 480p–720p). References (2.0, 2.0 Mini, 2.5):
`start_image`, `end_image`, `image_references`, `video_references`, `audio_references`.

Cost discipline: test with Mini or `fast` at 480p–720p, keep the winner, then render the
final in `std` 1080p. Do not regenerate blindly: change one thing per attempt. Never buy a
plan or change account settings without the user asking.

## 2. Prompt anatomy (one shot)

Write in this order, one or two lines each:

1. **Format**: duration, ratio, style ("12 s, 9:16, photoreal commercial").
2. **Subject**: who/what, with fixed identifying details (colours, logo position, clothes).
3. **Action**: one main action per shot, physically plausible, with a clear end state.
4. **Camera**: one movement (push-in, pull-back, orbit, crane up, tracking, handheld,
   whip pan, static) + lens feel (macro, wide, telephoto).
5. **Light and setting**: time of day, light direction and quality, environment.
6. **Sound** (if `generate_audio`): ambience, effects, music mood; spoken lines in quotes
   with the language ("in French: …", "en lingala : …").
7. **Constraints**: what must not change (product shape, label, face), no on-screen text.

For a 10–15 s clip, give **timed beats** so the model paces the action:

```text
12 s, 9:16, photoreal. 
0–3 s: [hook image] – [camera]. 
3–7 s: [development] – [camera]. 
7–10 s: [peak / reveal] – [camera]. 
10–12 s: [end frame: hero shot, empty top third for the CTA].
```

## 3. References: what to attach

- **Product or character must look exactly the same** → its clean photos as
  `image_references` (front + 3/4 + detail). Name them in the prompt ("the bottle from
  reference 1").
- **Exact first or last image** → `start_image` / `end_image` (also how to chain shots).
- **Copy a movement or edit rhythm** → `video_references`.
- **Voice, music or beat to follow** → `audio_references`.
- Generate key stills first (an image model) when the composition matters, then animate
  them: fewer failed video generations.

## 4. Rules that save generations

- Do not ask the model for readable text, prices, phone numbers or logos drawn from
  scratch: they come out wrong. Leave empty space and add text in editing.
- One subject focus and one camera move per shot. Complex scenes = several shots.
- Hands, fast fights and crowds fail most: shorter shots, simpler actions, references.
- Keep identity details identical in every shot prompt of a series (copy the same block).
- Real people: only with their consent; no public figures, no brands the user does not
  own, no misleading "testimonials".

## 5. Genre guides (read the one you need)

| Need | File |
|---|---|
| Product ad, e-commerce, 360°, unboxing, food, fashion, beauty | `references/product-and-commerce.md` |
| TikTok / Reels / Shorts hooks, UGC style | `references/social-hooks.md` |
| Brand film, founder story, app or SaaS promo, motion design | `references/brand-and-app.md` |
| Cinematic, action, horror, anime, cartoon, 3D CGI, music video, real estate | `references/styles.md` |
| Multi-shot story, short drama, episodes, storyboard | `references/storyboard-series.md` |
| Camera, lens, light and sound vocabulary | `references/vocabulary.md` |

Higgsfield also has ready-made product video presets (`get_preset_instructions`):
`product-spin`, `half-turn`, `push-in`, `pull-back`, `light-sweep`, `macro-glide`,
`texture-track`, `label-trace`, `liquid-wrap`, `impact`, `floating-roll`, `whip-pan`,
`crane-reveal`, `topdown-dive`, `sunrise-pass`. Prefer a preset when it matches exactly.

## Gotchas

- Clip seconds ≠ story pace: put the important beat in the middle, not in the last second
  (endings are often cut or frozen).
- `mode: "fast"` cannot output 1080p or 4k; `std` needs a Plus plan or higher.
- `video_edit` on 2.5 is billed by the source video duration; `duration` is ignored.
- A pending job is not a failed job: wait for it before resubmitting.
