# Layout

How the page is put together: margins, the grid, where text sits, how sections differ, navigation,
endings and the phone. The direction sheet gives the specific compositions; this file gives the habits
behind them, taken from the panel's notes on the 114 studied sites that scored 7.3 or higher (counts
below are hand tallies from those notes, so read them as "about").

## Contents

1. What strong pages do
2. Margins and the grid
3. Where text sits
4. Empty space
5. The frame: margins, balance and titles
6. Sections: carry the idea, vary the arrangement
7. Navigation
8. Endings
9. The phone is a second composition
10. How pages fail

## 1. What strong pages do

- **Tight margins, content to the edges.** About 45 of 114 use outer margins of 32px or less; only
  about 8 use 80px or more. The centred 1100–1300px container is the minority among strong sites and
  the usual frame of the ones the panel called stock.
- **Text hangs from an off-centre line.** About 22 anchor text to one fixed line that is neither the
  centre nor the margin: a third across, 42%, the midpoint.
- **Two or three type sizes with nothing between** (about 30): one very large with one small, or
  everything small with the scale given to the image.
- **One thing per screen** (about 20): one statement, one object, one project.
- **Sections told apart by their ground.** About 20 change the whole background colour at each
  section; about 12 alternate light and dark; about 10 never change and separate by space alone.
- **Sections recomposed, not repeated.** About 14 rearrange every section; about 12 alternate a
  full-bleed image screen with a near-empty type screen.
- **The system broken once, on purpose** (about 14): one centred line on a split page, one paper card
  on a dark page, colour held back until the last screen.
- **Often no navigation bar** (about 45), and endings that are a designed scene rather than link
  columns.
- **Few words.** Median 575 on the whole study; some of the best carry under 200.

## 2. Margins and the grid

```css
:root {
  --margin: clamp(1rem, 2.2vw, 2rem);   /* 16–32px: tight, so content reaches the edges */
  --gutter: clamp(0.75rem, 1.4vw, 1.5rem);
}
.wrap { padding-inline: var(--margin); }
.grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); column-gap: var(--gutter); }
```

- One pair of margins and one grid for the whole page. Every left edge is a column line.
- Do not wrap the page in a `max-width: 1200px; margin: auto` container by reflex. Let large things
  (type, images, colour fields) run the full width, and constrain only the measure of running text
  (`max-width` in `ch` on the paragraph, not on the page).
- On very wide screens cap the layout at about 1760–1920px, or let type sized in `vw` stop growing with
  a `clamp()`.
- Directions that call for wide margins (uneven photographs, the quiet instrument) say so on the
  sheet; follow the sheet.
- Never draw the grid. Column lines, crosshairs and guides are banned ornaments here even though they
  are fashionable; the grid is felt through alignment.

## 3. Where text sits

- **Pick the anchor line and reuse it.** If the hero headline starts at column 5, the section
  headings, the pricing figure and the footer links start there too. Two or three anchor lines on a
  whole page; six means nothing was decided.
- **Off-centre beats centred.** A heading in the left third with its paragraph in the far-right
  column on the same baseline and nothing between; a headline in the bottom third under a deliberate
  void; text docked in corners with the middle given to the picture.
- **Opposite ends.** Two short texts at opposite ends of one baseline (name left, one-line description
  right) is the commonest alternative to the centred stack.
- **Centred is a decision.** When a strong page centres, it uses one axis with wide empty flanks and a
  single element per screen, not a centred stack of heading, paragraph and two buttons.
- **Rows for long copy:** heading in the left third, body in the right two-thirds, the same split for
  every row on the page.
- Stagger sparingly: a second line indented by a third so a two-line headline steps across the screen.

## 4. Empty space

Empty space is placed, not left over. In the study of 97 Sites of the Day captured in October 2026,
readers judged every large empty area either a rest, which something closes, or a hole, which nothing
closes. Strong sites have plenty of rests. About half of them still leave at least one hole, and the
holes are what visitors name ("big random blank spaces").

**A void is placed when something closes it.** In the readers' notes the closer is, most often:

- the picture itself (sky, ground, the object, the film) with the type docked at its edge;
- a picture across the void: the photograph at the far side of an empty band, the full-width row
  rising under a statement, the opposite picture in a stagger;
- the type: a headline large enough to span the space, or two short texts at the two ends of one
  baseline;
- on a one-screen page, the wordmark, the navigation and one fact in the corners, like a mount around
  a print.

About one closer in five in the study is a hairline or grid line. That device is banned here; close the
void with the picture, the type, a step in ground tone or a field of flat colour.

**Where holes come from.** In order of frequency in the study:

1. A gap between sections stretched too far: bands of 250–760px of plain ground.
2. Text in one half of a section and nothing in the other.
3. Content that arrives late: a reveal not yet fired, so the visitor scrolls onto bare ground while the
   words fade in.
4. A short block stretched to a full screen: a footer padded to the viewport height, a section title
   alone on a whole screen.
5. A pinned scene that holds almost nothing for several screens.
6. Pictures of different heights top-aligned in a row, leaving a hole under the short one.

**Rules**

- Decide where the void is and name what closes it. If nothing does, it is a hole: move the section's
  picture into it, make the main element bigger, or take the space out.
- Keep the void clean: no stray caption, no decorative shape, no faint watermark, no grid lines.
- Sections sit 120–240px apart on desktop, counted from the last line of one to the first line of the
  next (the median in the study is about 230–250px), and 72–112px on a phone. A change of ground
  colour lets the gap be a little smaller. More than about 40% of a screen of plain ground between two
  sections is a hole.
- The gap between sections is clearly larger than any gap inside one. Related things sit close and
  unrelated things far; a heading has at least twice as much space above it as below.
- No stretch of the page taller than about half a screen holds nothing at all. In the study, runs of a
  screen or more with nothing in the page were almost always scroll distance for a pinned scene; the
  pinned stage must then hold something at every scroll position.
- Content is in place on the first paint. An entrance moves what is already there (see `motion.md`);
  it never leaves a screen of bare ground while the words arrive.
- Size a section to its content. `min-height: 100vh` belongs to a section that fills the screen, not
  to a footer or a lone heading.
- In a row of pictures of different heights, align the bottoms or put something under the short one,
  or crop the row to one ratio.
- A rest is one thing on a screen: a single line, one object, one picture or a field of colour. Once
  per page at most. A screen of nothing is never a rest, and the inspector fails two near-empty screens.
- When a section looks empty, the answer is almost never "add something". Make the main element
  bigger, or cut the section.

## 5. The frame: margins, balance and titles

The frame is what readers judge before any detail: "no good margin", "everything is shifted to one
side", "no clear title", "random unclear sections". The inspector measures each of these. The numbers
are from the study of 97 Sites of the Day (October 2026).

**One pair of equal margins.**

- The left and right margins are the same, at every width. On the studied sites with scrolling
  sections the two sides match to a few pixels: 16 and 16, 20 and 21, 32 and 32, 140 and 137. No
  strong page in the study was pushed to one side.
- The usual margin is tight: median about 28px at 1440, half the sites between about 18 and 45px, a
  few at 80px or more. Here it is 16–32px (section 2), and never under 16px at any width, on the phone
  included. About one award site in seven sets text 8–15px from the edge; that studio habit is
  excluded here.
- The navigation sits on the same margins as the content. The commonest small fault in the study is a
  header on one inset and the page on another (40px against 20px, or 34px on the left against 10px on
  the right).
- A bleed is deliberate and starts from the margin: a row of pictures that runs off the right edge
  begins on the left margin; a display line that bleeds starts or ends on one. A bleed never moves the
  margin.
- Asymmetry belongs inside the frame: an off-centre anchor line (a third across, 42%, the centre line)
  on symmetric margins.

**Use the width the page has set up.**

- In the study about one text section in a hundred leaves half the width empty. Text that sits in one
  half is common, in roughly one site in three, but the other half then holds the section's own
  picture (most often), a full-bleed picture behind the text, a second column, a list or a figure.
- When the text takes one side, put the picture, the second column, the list or the large number on
  the other. Never leave the other half to plain ground.
- The middle counts too: a card at the left edge and a lone button at the right with the middle third
  empty is the same hole.
- The first screen counts too. When the sentence and the button take the left third above a name
  docked at the foot, the upper right holds something (the picture or film, one fact, the action) or
  the name grows up to meet them; in testing, 60% of a first screen left as plain ground under the
  navigation read as a hole, and the inspector now warns when one empty block takes 28% of the first
  screen or more.
- A display line fitted to the width is fitted by measurement (a small script that sets its size from
  the content box, or SVG text with `textLength`), never by a size guessed for one face: a name that
  starts on the margin and runs a few pixels off the other edge reads as a mistake.
- A centred composition has one axis, equal flanks and one thing on it, not a stack of heading,
  paragraph and two buttons.

**A title that says what this is, on the first screen.**

- Asked whether a stranger could say what the page is within five seconds, readers found that 40 of
  the 97 first screens say it in words, 42 say it only through pictures, small print or a bare name,
  and 15 do not say it at all. The last group lost usability and content points, not design points.
- Size alone does not do it: 66 of the 97 first screens carry a display-size line, but 26 of those are
  a name, a slogan or a place with nothing saying what is offered.
- The first screen has one `h1`, at display size (32px or more on desktop; on the clear first
  screens in the study mostly 50–150px), two lines at most, that says what this is: the name with
  what it does, the product with what it is for, the event with its date and place. If the `h1` is
  the name, the line under it, at 18px or more, says what the thing is.
- It is there on the first paint. About a third of the studied pages still showed a loader or nothing readable 4.5
  seconds.

**A heading on every section.**

- 82% of the text sections on the studied sites open with a heading: median 57px (40–96px for the
  middle half), about three and a half times the body size, one or two lines.
- Headings start on the outer margin or on the page's inner anchor line (in the study about a third
  each) and in the same place for every section. About a quarter of the headings in the study are
  centred; centre one moment per page here.
- Where a studied section has no heading, the usual stand-in is a small label: caps, mono or a number
  in brackets. All three are banned here. Put the label's words in a heading in the heading face at the
  section size ("The rooms", "How it works", "Prices"), set them on the anchor line, and let the first
  sentence carry the rest.
- A statement can open a section as its heading only when it names what the section holds.

## 6. Sections: carry the idea, vary the arrangement

The most common failure in every score band is a distinctive first screen followed by stock blocks:
icon cards, a three-up row, an accordion, a link-column footer. About 25 of the studied sites lose
points this way, including several above 7.5.

- **The idea survives to the last pixel.** Ask of each section, pricing and FAQ included: what does
  the page's idea do here? If the page is a menu, the prices are menu lines. If the name is a
  monument, the footer is the name again. If the object's shape is the motif, the button and the image
  masks carry it.
- **No two neighbours share a layout.** Use the shape of each dealt blueprint (list, split, statement,
  full-bleed, mosaic, table, strip, pinned …). Count them in the screenshot; a shape used three times
  is the template showing.
- **Alternate dense and empty, image and type, light and dark** so the scroll has rhythm.
- **A repeated module is for archives only** (a work index, a menu, a schedule). Anywhere else,
  repetition reads as a kit.
- **Break the system once.** After the page has established its rule, one planned exception (a single
  centred line, one inverted section, one image at a different scale) is what makes the rule visible.
- **Short pages are fine.** A quarter of the studied sites are one or two screens. Do not add sections
  to seem complete; each one must carry a claim (see `copy.md` §1).

## 7. Navigation

- The plain form: the wordmark at one end, three to five text links, one action, all at text size on
  the page ground with no bar, border or background. Median link count in the study is 3.
- It is also normal to have less: small links in the corners, a single action, or the navigation
  folded into the content (a list of section titles that is itself the index).
- If it stays fixed, it must never sit on top of content: check every scroll position in the
  screenshots, especially on the phone. Floating pill bars are where the panel most often recorded a
  nav covering text.
- On a phone: wordmark and one action in view; the links go in a simple full-screen sheet opened by a
  text button ("Menu"), or move to the footer when there are only three.
- Navigation is small furniture, however it is drawn. On desktop it takes no more than about a tenth
  of the first screen; on a phone it is one row. A blueprint that builds the navigation as a column of
  colour blocks or a stack of tabs gets that treatment on desktop only, and collapses to one row on
  the phone so the headline, the supporting sentence and the action stay in the first screen. In
  blind tests a nav that ate the hero cost a whole point of usability.

## 8. Endings

- The page should end on a designed scene. In the study: the name at full width (about 18 of 114), the
  hero repeated in inverted colours (about 12), a closing scene of its own such as the one contact
  fact set as a headline (about 14), or simply one quiet line (about 22). Link-column footers appear
  in the panel's notes only as criticism.
- The full-width name is strong but already a studio habit; use it when the direction is name-led,
  otherwise prefer the blueprint dealt for the footer.
- Put the practical facts (address, hours, email, legal line) in the text face at a readable size, on
  the same anchor lines as the rest of the page.

## 9. The phone is a second composition

Design the 390px screen as its own page, not the desktop page squeezed. Strong sites that neglect this
lose usability points; weak ones are often just broken.

- Each blueprint on the sheet has its own phone paragraph. Build it.
- Keep one dominant thing on the first screen. A wordmark that was 20vw wide on desktop might stack on
  two lines at 26vw on the phone and be even stronger.
- Re-author line breaks; re-crop images to portrait (`object-position` per breakpoint, or a different
  crop size in the image URL); keep unevenness with alternating widths rather than making everything
  full width.
- Margins 16–20px. Body text 16–18px. Touch targets at least 44px high.
- Check 390px in the inspector's screenshots for every round: sideways scroll and three-line headlines
  usually appear here first.

## 10. How pages fail

From the panel's notes on the 54 sites scoring under 6.8 (counts out of 54):

- The whole page is the category's stock template; swap the logo and it could be any competitor
  (about 20).
- Centred headline, pill badge, two buttons, screenshot or tile grid below (about 9).
- A distinctive hero, then stock modules in the usual order (about 8, and about 17 more in the middle
  band).
- A default typeface with no character (about 13).
- Text too small or too low in contrast (about 13); legibility lost over busy photographs (about 9).
- An undersized headline and no focal point (about 9).
- The page never says what the thing is, or shows no work (about 12 and 7).
- Thin content stretched over many screens, or a single gag (about 11).
- Gates, preloaders and entry pop-ups before any content (about 9).
- A phone layout that is the desktop shrunk, or broken (about 8).
- Fixed elements sitting on content; careless details such as colliding lines (about 7 and 5).

And the faults of the best sites, which are not to be copied: body text at 9–13px (about 24 of the 90
sites at 7.5 or more), information hidden behind the concept (about 20), the idea running out
mid-page (about 15), text over footage with no scrim (about 12), gates and blank first paints (about
12), floating elements colliding with content (about 11), and a first screen with no statement of what
this is and no action (about 9). Say what the thing is, and offer the action, on the first screen.
