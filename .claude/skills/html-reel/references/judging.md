# Scoring to 8/10 with blind judges

A reel is judged in a second, on a phone, with the sound off half the time. Judges see what a viewer sees: frames and a contact sheet, never the code or the plan.

## The bar

8 out of 10, set against reels the creator admires (for the shipped reel: "like the fil.design splash screen animations"). Say the bar before the first round and keep it.

## The rubric

Five criteria, each 0–2, for a section or the whole reel:

| criterion | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Background and atmosphere | flat or noisy | pleasant | a world, lit, that serves the subject |
| Camera, zoom and sharpness | soft, jumpy or empty frames | steady | moves with intent, crisp at every zoom |
| The reveal (the section's job) | missed | readable | lands on its word and surprises |
| Typography and titles | collides, cut by masks, outside the safe area | clean | cinematic: the serif sets up, the heavy word lands |
| Polish | visible glitches | minor nits | nothing to fix |

## A round

1. Render the section; take 12 frames at its key moments and a sheet every 0.25 s (`-vf fps=4,scale=216:-1,tile=…`).
2. Two absolute judges, blind (each a fresh agent given only the frames, the sheet, the bar and the rubric; no history, no names), each scoring 0–10 with a line per criterion and "what would make it a 9". **The lower score counts.**
3. A paired judge: two versions shown as X and Y in a random order (the key kept in a file the judge never sees), "which is better at each moment, and by how much". It catches a change that the absolute scores can't resolve.
4. Fix what both absolute judges name, structure before polish. Ignore what only a stills artefact causes (a word mid-mask in a still is fine in motion).

## When to stop

When the bar is met, or when the absolute scores come back flat for two rounds (within 0.5). Then say what's still short, as the judges named it, rather than polishing forever.

## The shipped scorecard (the hook, 0–8.6 s)

| round | judge A | judge B | kept | paired |
| --- | --- | --- | --- | --- |
| r1 | 7.0 | 6.5 | 6.5 | |
| r2 | 7.1 | 6.0 | 6.0 | |
| r3 | 7.5 | 7.3 | 7.3 | r3 beat r2 7–4–1 |
| r4 | 7.5 | 7.0 | 7.0 | r4 beat r3 7–3–2 |

Stopped after r4, flat at 7–7.5 for two rounds, short of 8. Still short, named by both judges: the zoom didn't fill the frame (a slab of background showed at one edge), the reveal's window was small with its tag chips about 11 px at phone width, and one serif line sat on the window's tab bar for a tenth of a second.
