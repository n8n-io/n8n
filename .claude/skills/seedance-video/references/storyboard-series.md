# Multi-shot stories, short dramas, episodes

## Workflow: script → assets → shots → edit

1. **Script.** For short vertical dramas: episodes of ~15 s. Episode 1 opens on a strong
   image, line, conflict or contrast in the first 3 seconds, sets the hero's goal and the
   main conflict. Each episode: one small turn, ends on a hook.
2. **Assets.** One reference sheet per character (front, 3/4, profile, same outfit), one
   image per key location and prop, generated with an image model. These become
   `image_references` in every shot.
3. **Shot list.** Write each episode as timed beats (below). Same identity block copied
   into every prompt.
4. **Generate and chain.** Continuity between shots or episodes:
   - take the accepted clip's last clean frame → `start_image` of the next shot, or
   - with Seedance 2.5, `mode: "video_extension"`, `extension_mode: "forward"` on the
     previous clip.
   Check the seam (position, scale, light, direction) before going on.
5. **Edit.** Assemble, add dialogue subtitles, titles, music; fix weak shots by extracting
   a frame, correcting it as an image, and animating it again.

## Script format (per episode)

```text
EPISODE 2 — "The empty shelf" (15 s)
△ [Establishing] Morning, small grocery on a Lubumbashi market street, shutters half open. Slow push-in.
△ Mama Neema stares at an empty shelf, phone in hand. Close-up, handheld.
   NEEMA (French): « Encore en rupture… »
△ Phone screen glow on her face, a notification sound. Hold.
△ [Hook] A motorbike horn outside; she turns. Cut on the turn.
```

`△` marks each shot: framing + action + camera. Dialogue under the shot with the language.

## Shot prompt (Seedance format)

```text
[Style line], 15 s, 9:16, [mood].
Characters: [identity block copied from the sheet] (reference 1 = Neema, reference 2 = courier).
0–3 s: [establishing] – [camera], [light], [atmosphere].
3–6 s: [character enters / acts] – [camera], [precise action], [emotion].
6–9 s: [development / conflict] – [camera], [key action], [detail close-up].
9–12 s: [peak / turn] – [camera], [emotional or visual impact].
12–15 s: [ending / hook] – [camera], [final image].
Sound: [ambience], [effects], dialogue in [language]: "…".
```

## Rules

- 3–5 beats per 15 s; more beats = blur.
- Same character block, same outfit, same lighting description in every shot.
- Complex or extreme shots: make the image first, then image-to-video.
- Plan the series budget before starting: shots × attempts × cost per second.
