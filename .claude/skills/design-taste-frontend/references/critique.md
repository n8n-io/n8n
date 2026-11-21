# Critique — judging the render

`inspect.mjs` passing means nothing banned or broken was measured. It says nothing about whether the
page is good. This file is how you find out. Use it on the screenshots, never on the code: you wrote
the code, so you will read your intentions into it. The pictures only show what is there.

## Contents

1. How to look (fourteen passes, a few minutes)
2. The score
3. Caps
4. Writing the critique
5. What to fix first
6. When to stop

## 1. How to look

Open `desktop-fold.jpg`, then the `desktop-page-*.jpg` sheets, then `mobile-fold.jpg` and the mobile
sheets. Make each pass on its own; do not blend them.

1. **One second, then five.** Glance and look away. What did you see? There should be exactly one
   answer: a word, an image, an object. If the answer is "a website", there is no focal point. Then
   give the first screen five seconds as a stranger: can you say what this is, who it is for and
   what to do next? If the title only makes sense after scrolling, it is not a title.
2. **Squint.** Blur your attention until text becomes grey bars. The page should reduce to two or
   three large masses with clear size differences. Many small similar masses means everything is
   medium and nothing leads.
3. **Cover the logo.** Could this first screen belong to a competitor, or to a different industry?
   If swapping the name and the noun in the headline would produce an equally valid page, the page has
   no idea. Go back to the direction sheet; the idea is written there. Then scroll: does the idea reach
   the pricing, the FAQ and the footer, or does the page turn into stock blocks after the first screen?
4. **Edges.** Follow the left edge of every text block down the page. Count the distinct x positions.
   A composed page has two or three, reused on purpose. Six means things were placed one at a time.
5. **Space and frame.** Are related things close and unrelated things far? Is the gap between sections
   clearly larger than any gap inside a section? Is any region empty by accident (a hole) rather than
   by decision (a rest)? A hole usually sits beside a short column or under a removed decoration.
   Then look at the frame: are the left and right margins of the page the same? Does any section keep
   its text in one half and leave the other half empty? Is there a stretch of nothing taller than half
   a screen? Readers name these first ("it is pushed to the left", "random empty space"), before any
   detail; in the study of 100 Sites of the Day about 1 section in 100 left half the width empty.
6. **Type.** Is the jump from body text to headline decisive (three times or more)? Do you see more
   than five sizes? Any headline with one orphan word on its last line? Any paragraph wider than about
   75 characters or centred over more than three lines?
7. **Colour.** Name the proportions: which colour holds most of the surface, which supports, where is
   the accent? An accent that appears in ten places means nothing. One that appears on the single
   action and one detail means "here".
8. **Images.** Count the real pictures: are there at least four, and is there a moving one? A page of
   drawings only, or of type only, looks unfinished next to one with real photographs and footage.
   Is every image doing a job (showing the thing, setting the place, proving the claim)?
   Do the crops share ratios? Is anything a grey box, a stretched photo, a fake screen made of bars?
   Does the photography share one light and one grade, or is it a stock mix?
9. **Sameness.** Write one word for each section's layout (split, list, full-bleed, grid, statement,
   index …). The same word twice in a row, or three times on the page, is the template showing.
10. **Phone.** Is the mobile screen a composition of its own, with its own crop and its own line
    breaks, or the desktop page squeezed? Is the first screen still one clear thing?
11. **Fullness.** Go through the desktop sheets screen by screen. Is each screen a composed poster, or
    is it a narrow column of small text with dead ground either side? Is any statement held on screen
    for three screens? An austere page is not a restrained one: if the page could be mistaken for an
    unfinished wireframe (grey shapes, grey text, one small column), it is underbuilt. A single motif or
    drawing blown up to fill a whole screen with nothing to read is a hole too, however bold it looks.
12. **Substance.** Does every section the brief asked for deliver its information completely and at a
    readable size (the full menu, each room, every speaker, the price and what it includes)? Would the
    visitor leave knowing what they came to find out? Is the primary action a real button on the first
    screen?
13. **Collisions.** Is anything lying on top of a headline, a statement or a button at any scroll
    position? Does any element run off the edge of the phone screen? A row that scrolls sideways on
    the phone reads as cut off in a screenshot and to most visitors; wrap it unless the cut is
    plainly deliberate (a partial card showing at the edge).
14. **The competitor and the live thing.** Put the nearest competitor's name on the page: does the
    idea still work? Then name the one live thing (what the visitor can do or what differs each visit).
    If either answer is weak, that is the first problem of the round, ahead of any detail.

A note from testing: in blind comparisons a richer page full of template devices beat a cleaner page
that was thin, every time. The house rules remove the devices; passes 11–13 are where you make sure the
page did not lose its substance with them.

## 2. The score

Score like an Awwwards juror: four criteria, 1–10 each, weighted **design 40%, usability 30%,
creativity 20%, content 10%**.

**Design (40%)** — composition, typography, colour, imagery, craft.
- 9–10: every screen holds as a poster. Nothing could be removed or moved.
- 8: confident and coherent; one or two soft spots a designer would notice.
- 7: clean and professional, a clear system, little tension.
- 6: tidy but anonymous. Reads as a kit.
- 5 or less: weak hierarchy, accidental spacing, default type, mismatched images.

**Usability (30%)** — orientation in three seconds, readable text, obvious actions, honest mobile.
- 9–10: you know what it is, who it is for and what to do without scrolling; flawless on a phone.
- 8: clear and comfortable; minor friction (a long section, a small target).
- 7: works, with one real problem (weak contrast somewhere, a cramped phone layout).
- 6 or less: you have to hunt, or something breaks.

**Creativity (20%)** — an idea you can state in a sentence, carried through.
- 9–10: a concept specific to this subject that you have not seen applied this way.
- 8: a clear idea with one memorable move.
- 7: a tasteful execution of a known approach.
- 6 or less: the category default.

**Content (10%)** — words and pictures that are specific, true-sounding and edited.
- 9–10: every line could only be about this subject; imagery is the subject.
- 7–8: clear and concrete, some generic lines.
- 6 or less: slogans, filler, stock.

`overall = 0.4·design + 0.3·usability + 0.2·creativity + 0.1·content`

For calibration: real Sites of the Day land around 7.5–8.0 overall from the jury. An honest 8.5 is
rare. If your first score for your own work is 9, score it again as the juror who did not build it.

## 3. Caps

These override the arithmetic.

- Any `FAIL` still reported by `inspect.mjs`: overall cannot exceed **6.0**.
- A headline of three or more lines at any viewport, an eyebrow label, monospace labels, 01/02/03
  numbering, a decorative gradient, a shadow on a resting element, or a decorative hairline visible in
  a screenshot: overall cannot exceed **6.5**, whatever else is true.
- Pass 3 fails (the page could belong to anyone): creativity cannot exceed **6**.
- The idea passes for the nearest competitor (pass 14): creativity cannot exceed **7**.
- Fewer than four real pictures (photographs, archival images, footage; drawings do not count):
  design cannot exceed **6.5**.
- A page that barely moves (the inspector's `still-page`), or motion that is one identical fade on
  every block: design cannot exceed **7**.
- No live thing (pass 14): creativity cannot exceed **7.5**.
- Any placeholder (grey box, lorem, "Image here"): content cannot exceed **5**.
- Two or more desktop screens that are mostly empty ground, or a page whose running text is small and
  grey: design cannot exceed **6.5**.
- A section the brief asked for that is missing or reduced to a few words: content cannot exceed **6**.
- No real button for the primary action on the first screen: usability cannot exceed **7**.
- The five-second pass fails (no clear title saying what this is on the first screen): usability
  cannot exceed **6**.
- Unequal page margins, a section huddled on one side with the other half empty, or a blank stretch
  taller than half a screen: design cannot exceed **6.5**.
- A section of running text with no heading naming it: usability cannot exceed **7**.
- Anything covering a headline at any scroll position: usability cannot exceed **6**.
- A blank band where a reveal did not fire, or content clipped off-screen: usability cannot exceed **5**.

## 4. Writing the critique

Write it down; do not just think it. Use exactly this shape so rounds can be compared:

```
ROUND n
Seen in one second: …
Idea (one sentence): …
Live thing: …
Layout words by section: hero=… / …=… / …
Scores: design _ · usability _ · creativity _ · content _ → overall _._
Caps applied: …
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. …
2. …
3. …
```

Name problems the way a designer would to a colleague: "the supporting paragraph starts 40px left of
the headline's edge", "the testimonial section is the third split layout in a row", "the phone hero
crops the bottle out of frame". "Could be more polished" is not a finding.

## 5. What to fix first

Fix in this order; later items cannot rescue earlier ones.

1. **The idea.** If pass 3 fails, change the hero concept, not the details.
2. **Hierarchy.** One dominant element per screen. Make the big thing bigger and the small things
   fewer before touching anything else.
3. **Composition.** Shared edges, section spacing, variety of layout between sections, holes.
4. **Typography.** Scale contrast, line breaks, measure, leading.
5. **Imagery.** Replace weak pictures, unify crops and grade.
6. **Colour.** Proportion and accent discipline.
7. **Detail.** States, focus, small alignments, mobile refinements.
8. **Motion.** Last.

When removing something leaves a gap, do not refill it with an ornament. Close the gap, enlarge what
remains, or let a picture or a colour field take the space.

## 6. When to stop

Run at most three rounds: critique → fix the top three → re-inspect → critique. Stop early when a round
finds no problem a stranger would notice. If round three still scores under 7.5, say so plainly in
your report, with the remaining problems listed; do not round up.
