# Imagery

Pictures are where generated pages most obviously give up: a grey box, an icon in a square, a fake
dashboard, an abstract blob. This file is how to decide what the pictures are, where to find real ones,
how to crop and place them, and what to do when there are none.

## Contents

1. What the study measured
2. Decide what imagery exists
3. Real pictures from the open collections
4. The dealt photographs
5. Cropping and placing
6. Treatment
7. Showing software
8. Drawing the subject
9. Type and colour alone
10. Markup and credits
11. Video
12. Where pictures and footage go

## 1. What the study measured

- On 60% of the studied sites one piece of media covers at least half of the first screen; on half of
  them it covers nearly all of it. Top-scored sites: 68% and 56%. Weak sites: 48% and 39%.
- Only 15% of heroes have no media at all, and those are deliberate typographic statements.
- Media has square corners on 73% of sites. Where corners are rounded the usual radius is about 12px,
  applied to every image alike.
- Top-scored pages carry far more imagery (a median of 37 images against 5 on weak pages): the strong
  sites show, the weak ones tell.
- What the imagery is, by the panel's classification: a mix of kinds 32%, photography 14%, generative
  or WebGL scenes 13%, real product interface 12%, 3D renders 11%, illustration 9%, video 6%, type only
  3%.
- Among the 54 sites the panel scored under 6.8, legibility (text lost over a busy image, or too
  little contrast) was named as a weakness in 13.
- In the October 2026 study of 91 Awwwards Sites of the Day (section 12), the median page carries 7
  pictures (top sites 8, the lowest 2) and footage appears on 42% of sites (half of the top ones, one
  of the 16 lowest).
- Pictures come in whole screens: 42% of scrolled screens hold none and 19% are 90% picture or more.
- 94% of pictures have square corners, and on a typical site two ratios hold three-quarters of them.

## 2. Decide what imagery exists

In order of preference:

1. **The project's own images.** Product shots, the place, the people, the work. Even ordinary
   photographs of the real thing beat beautiful photographs of something else. Ask what exists; look in
   the repository.
2. **Images you can generate** with an image tool in this session. Write prompts as a photographer's
   brief: subject, angle, light, background, crop ratio, and "no text". Generate the hero first and
   make the rest match its light.
3. **Real pictures of the subject's world from the open collections** (section 3). Archives,
   museums and photographers have published millions of pictures anyone may use with a credit: the
   client's city and street in old postcards, maps of its neighbourhood, its materials, its trade in
   engravings, museum objects of its kind. Whenever an honest one exists, it beats a drawing of the
   same thing: it is real, it has detail no drawing in a page's budget reaches, and it carries history.
   Honest means nobody could take it for the client's own product, room, dish, person or team.
4. **Pictures you draw in code from the subject itself** (section 8), for what no honest picture
   exists of: the product's own objects as flat shapes, the place's tiles and windows, a map of its
   streets, the document a tool produces, the interface of a piece of software. In testing, pages that
   drew their subject with care beat pages that borrowed unrelated photographs every time, and beat
   pages that showed nothing.
5. **The photographs dealt on the direction sheet.** Real photographs of places, light, texture and
   weather. Use them only where an honestly generic picture fits (the open sea for a house on the sea,
   fog for a quiet retreat). They cannot stand in for a specific product, dish, room, person or
   screen: a foggy motorway on a restaurant page reads as stock at once, and jurors notice.
6. **Type and colour alone,** done on purpose (section 9).

Tell `draw.mjs` the truth with `--have`. If you have no product photographs and no image tool, do not
pass `product-photo`; the draw will avoid the directions that depend on showing the object. Pictures
found in the open collections are not the project's own: do not pass `photography` for them.

## 3. Real pictures from the open collections

`scripts/assets.mjs` searches four open sources without keys and prints, for each find, a direct image
URL, the page it comes from, its size, its creator, its licence and a credit line:

- **Openverse**: one index over Flickr, Wikimedia Commons, museums and libraries.
- **Wikimedia Commons**: archival photographs, old maps, scans of prints and books, places as they
  look now.
- **The Art Institute of Chicago** and **The Metropolitan Museum of Art**: public-domain paintings,
  prints, drawings, photographs, textiles and objects, in large scans.

```bash
node <skill>/scripts/assets.mjs "ghent postcard"
node <skill>/scripts/assets.mjs "fig" --source museums --orientation portrait
node <skill>/scripts/assets.mjs "basalt texture" --min-width 2400 --source openverse,commons
node <skill>/scripts/assets.mjs --get commons:36649959,met:707892     # download, record the credits
node <skill>/scripts/assets.mjs --credits                             # footer line and report list
```

By default it keeps only licences that allow commercial use (CC0, public domain, CC BY, CC BY-SA) and
pictures at least 1000 pixels wide, and checks that every image it prints actually loads.
`--license pd` keeps only pictures that need no credit; `--orientation`, `--min-width` and `--limit`
narrow the list; `--source` picks the sources; `--json` gives the raw results. Each result has a ref
(`commons:36649959`) that `--get` takes.

**What to search for.** The inventory (SKILL.md step 1), not the category: "bakery" finds other
people's bakeries. The subject's world is specific:

- **Its place:** the city, the street, the harbour, the valley, in old postcards and photographs
  ("ghent postcard", "rotterdam harbour 1920") and as it looks today ("gent korenmarkt").
- **Its maps:** the street plan, the chart of its bay, the geology of its valley ("ghent old map",
  "nautical chart lisbon").
- **Its materials,** close enough to read as a surface: the stone of its quay, the grain of its oak,
  its glaze, its tiles ("azulejo tiles", "basalt cobblestones", "oak grain").
- **Its trade's history:** the old tools, the craft in engravings and trade catalogues, patent
  drawings ("bread oven engraving", "potter's wheel", "bicycle patent drawing").
- **Museum objects of its kind,** with `--source museums`: a coffee set from about 1810 for a studio
  that makes coffee sets, a woodblock print of a wave for a surf school, a porcelain plate painted
  with figs for a fig orchard.
- **Scientific imagery:** botanical and zoological plates ("botanical engraving fig"), star charts,
  microscope photographs, satellite views of its coast, geological sections.

Search in the place's own words (azulejo, not "blue tile"; Korenmarkt, not "market square"), add a
medium (postcard, engraving, old map, lithograph, aerial photograph) or a decade, and try two or three
queries per idea. The museum sources match best on one or two words ("fig", "harbour", "teapot").

**What makes a good find.**

- It belongs to this subject's world and would not fit the nearest competitor's page.
- It still reads at the crop the slot needs. Look at it before deciding: `--get` downloads it, then
  open the file. A title is not a picture.
- It is large enough: twice the width it is shown at for anything full-bleed (the script prints the
  largest size available). A 1024-pixel Flickr photograph is a half-width picture at most.
- It belongs to one family with the others on the page: all engravings, or all photographs from one
  era, or all close surfaces in one light. A 1900 postcard beside a modern stock photograph beside a
  botanical plate reads as a scrapbook.
- No watermark, no burned-in text or logo, no frame or scanner edge you cannot crop away, and no
  recognisable living person who could be taken for the client's staff or customers.

**Use it creatively.** Found pictures are material, not decoration:

- **One archival photograph as the hero,** full-bleed: the street as it was a century ago, behind the
  name of the business that stands in it today, with the year in the caption.
- **A museum engraving enlarged until its line becomes texture,** cropped tight and returning at
  different scales as the page's one motif (the whole fig plate in the hero, a single leaf of it
  beside the menu).
- **An engraving or a map on white paper set with `mix-blend-mode: multiply` on the page's colour
  field,** so the ink sits on the ground (section 6).
- **The real map of the street as the contact section,** the door marked, the north and the scale
  taken from the original.
- **A material close-up as a whole field:** the quay's stone behind the opening hours.
- **A run of old postcards or plates as the gallery,** one size, one treatment.

Treatments stay within section 6: untouched, greyscale for the whole set, or multiply on a field.

**Stay honest.**

- **A found picture is never the client's own.** It may show the client's city, its materials, its
  history, the kind of thing it makes; it may never stand in for the client's product, room, dish,
  person, team or customers. If a visitor could take it for the client's own (a bakery counter, a
  plate of pasta, a smiling barista, a guest room), do not use it.
- **Caption from the source** when a caption helps: what it is and when, as the archive describes it
  ("Gand, unloading a steamer, 1905"). Never write a caption that ties it to the client.
- **Record and credit every picture.** `--get` writes the source, creator, licence and page of each
  download to `assets/credits.json`. CC BY and CC BY-SA require a credit with the title, the creator,
  a link to the source and a link to the licence; `--credits` prints them as one line of HTML for
  the footer (section 10). Public-domain pictures need no credit; give one anyway.
- **Respect the licence.** CC BY-SA: an altered version (recoloured, combined with other pictures)
  must be shared under the same licence. Non-commercial (NC) and no-derivatives (ND) licences are out
  for a client's site, which is why the script leaves them out unless asked. Read the `note` lines:
  some pictures carry personality rights or a trademark, are public domain only in the United States,
  or come with an archive's statement instead of a licence.
- **Download, do not hotlink.** Save what you use into the project: `--get` puts it in `assets/` at
  1920 pixels wide (pass `--width 1280` for a picture shown at half the screen, `--width 3840` for a
  very large hero where the source has it). The page then works offline, does not break when an
  archive moves a file, and does not load from someone else's server. Every licence the script
  allows by default permits copying.
- **List them in the report:** file, title, creator, licence, source page, and where the credit sits.
  `--credits` prints that list too.

If two or three honest queries per idea find nothing that fits, draw (section 8). A drawing made for
the subject is better than a found picture that is merely nearby. If the script cannot reach any
source (no network), draw, and say so in the report. For moving pictures, the same script searches
real footage with `--video` (section 11).

## 4. The dealt photographs

- The sheet lists eight from one set so they share a subject and a light. Use three to six.
- Each line says where the calm area is. Put text there or keep text off the image.
- More from the same or another set: `node scripts/draw.mjs --photos list`, `--photos <set>`, or
  `--photos "fog coast"` to search descriptions.
- URLs have the form `https://picsum.photos/id/<id>/<width>/<height>`. Request the exact pixel size you
  render at twice the CSS size for sharpness, capped around 2400 wide. Add `?grayscale` for
  black-and-white.
- These are photographs from Unsplash served by Lorem Picsum under the Unsplash licence. List the ids
  you used in your report; they are meant to be replaced by the project's own pictures.

## 5. Cropping and placing

- **Choose a small set of ratios and stick to them:** for example 4:5 for portraits, 16:10 for
  landscapes and 1:1 for details. Random ratios look like a stock dump.
- **Go large.** A photograph at full width, or at half the screen and full height, has presence. Six
  small ones in a grid have none. If the image is good, give it the room; if it is not, cut it.
- **Crop with intent.** Use `object-fit: cover` with an `object-position` chosen per image so the
  subject sits where the composition needs it (off-centre, on a third, against the text side).
- **Let images touch edges.** Full-bleed, or bleeding off one side, reads as designed. An image
  floating with equal margins on all sides reads as placed by default.
- **Overlap sparingly and on purpose:** a headline whose last line runs over the top edge of the
  picture, a small image overlapping a large one by a fixed 40–80px. One overlap per screen at most.
- **Square corners** unless the direction or the one-motif shape says otherwise. If rounded, one radius
  for every image on the page.
- **No frames:** no borders, no shadows, no device mock-ups, no browser chrome around pictures.
- **Captions** are one short line in the small size and soft ink under the image, left-aligned to its
  edge. Most images need none.
- Where each picture goes on the page, how large, and what the phone does with it: section 12.

## 6. Treatment

One treatment for the whole page:

- **Untouched.** The default. Pick images whose light already agrees.
- **Greyscale.** `filter: grayscale(1) contrast(1.05)`, or `?grayscale` on the URL. Unifies a mixed
  set instantly and suits editorial and typographic directions. Apply to every image or none.
- **Multiply on a field.** On a light flat ground, `mix-blend-mode: multiply` makes a white studio
  background vanish so a product sits directly on the colour.
- **Darkened for a dark page.** `filter: brightness(0.85) contrast(1.05)` so the image edges sink into
  the ground.

Not treatments: colour washes over photographs, duotone overlays, blur, grain overlays, vignettes,
tilted "polaroid" frames with shadows.

For text on a photograph, a neutral scrim covering only the text area: a solid block at 40–55% black,
or a fade from 55% black to transparent over the lower third. Never a coloured overlay.

## 7. Showing software

- Build a real fragment of the interface in HTML at its true size, with believable content, instead of
  a shrunken screenshot or a decorative mock-up. Crop to the part that makes the point: one control,
  one row, one panel.
- Believable means real labels, real numbers that add up, one item hovered or selected, proper
  alignment. Grey bars standing in for text are worse than no image.
- Put the fragment directly on the page or on one flat stage colour. No laptop, no phone frame unless
  the product is a phone app and the frame is a plain rounded rectangle.
- Inside a fragment the product's own interface conventions apply (its small radii, its 1px control
  borders, a shadow on its open menu). Put the attribute `data-ui` on the fragment's root element: the
  inspector and the linter then leave what is inside alone, and hold the page around it to the house
  rules. `data-ui` is for cropped fragments only; wrapping a heading or a whole section in it fails.
  Write the fragment's CSS under a `[data-ui]` selector (`[data-ui] .row { … }`) so the linter can
  tell it apart from page styles.
- If the user supplies real screenshots, show them large and uncropped at least once.

## 8. Drawing the subject

When nothing real can be photographed and the open collections hold no honest picture of it, draw it,
and draw it well. Inline SVG and CSS are enough. Drawings and found pictures can share a page: the
found ones show the world around the client, the drawings show the client's own things.

- **Draw the subject's own things,** not decoration: the stool's three legs and the grain of its seat,
  the enamel sign over the bakery door, the hut's two windows and its stove pipe, the street plan, the
  invoice the tool produces, the festival's stage. If you cannot name what a drawing depicts in the subject's world, it is decoration.
- **One graphic language for the whole page:** flat filled shapes, no outlines or one consistent
  stroke weight, the same corner and curve vocabulary everywhere, drawn in the palette's real colours
  (fields and accent at full strength, not greys). A set of drawings that obviously belong together
  reads as an identity; a mix of styles reads as clip art.
- **Colour is the material.** A product sold on its finish is drawn in that finish's colours; a sea house in the
  sea's blues and the sand; never a page of grey placeholders.
- **Draw with three levels of detail.** Jurors called simple drawings "basic" every time. Give each
  drawing big shapes that read at a glance, middle shapes that describe the thing (the handle, the
  window frame, the step), and small details that reward a second look (the maker's mark, the house
  number, the chipped tile, the hinge, a bird on the roof). Make light with flat tone steps (a lit face
  and a shaded face of each volume), not gradients. A drawing that would pass as a placeholder icon at
  full size is not finished.
- **Draw large and let it work:** the drawing is the hero's dominant element, a full-width band, a set
  of tiles, the footer mark. Small doodles scattered around read as filler.
- **Let it carry the idea through the page,** the way a motif does: the same drawn object returns at
  different scales, the tile grid becomes the opening hours, the map becomes the booking section.
- **Honesty:** say plainly, in small text near the first drawing or in the footer, that the pictures
  are drawn until photographs exist, if the client might otherwise be taken to be showing real
  products. In your report, list which drawings are placeholders for photography.
- **Not this:** gradient-shaded 3D-looking blobs, isometric clip art, generic line illustrations of
  people at laptops, abstract floating shapes, icons in squares. Those are the generated look.

## 9. Type and colour alone

This is a legitimate design, not a gap to disguise. Only 7 of the studied sites use no imagery at all,
and they hold their own: a median panel score of 7.5 against 7.2 for the whole set.

- Make the typography the image: one statement at 10–14vw, a list set at 5vw, numerals at display size.
- Use colour at scale: a full field, an inverted section, a two-field split.
- Use the subject's own shape as one flat motif if the direction calls for it (a circle, an arc, a
  notch), drawn in CSS, cropped by the viewport.
- Do not add: icons in squares, abstract gradients, dot grids, wave dividers, floating shapes, emoji,
  generic line illustrations, or an empty box where a picture "will go".

## 10. Markup and credits

A found picture, downloaded into the project with `--get`, used as the hero:

```html
<img src="assets/fig-engraving.jpg" width="1920" height="2807" fetchpriority="high" decoding="async"
     alt="Hand-coloured engraving of a fig cut open, with its flowers and seeds, in black, pink and green">
```

A dealt photograph further down the page:

```html
<img src="https://picsum.photos/id/626/2400/1500" width="2400" height="1500"
     alt="Red and white lighthouse in a turquoise sea below a chalk cliff" loading="lazy" decoding="async">
```

The credits, as `--credits` prints them, in the footer:

```html
<p class="credits">Pictures: <a href="https://commons.wikimedia.org/wiki/File:Fig_(Ficus_carica_L.);_57_segments_of_flowers_and_fruits_at_Wellcome_V0043000.jpg">“Fig (Ficus carica L.): 57 segments of flowers and fruits”</a>, <a href="https://creativecommons.org/publicdomain/mark/1.0/">public domain</a>, via Wikimedia Commons.</p>
```

- Always `width` and `height` (or `aspect-ratio` in CSS) so nothing jumps while loading.
- `loading="lazy"` on everything except the hero image, which gets `fetchpriority="high"`.
- `alt` describes the picture in plain words. Decorative repeats get `alt=""`. The script's suggested
  alt is the archive's title; rewrite it to say what the picture shows.
- A coloured `background-color` on the image container (the ground or surface tone) so the layout is
  whole before the image arrives.
- The credit line is part of the footer's design, at full contrast, with its links. Set it at the body
  size; one step smaller only on a page with plenty of running text, because a long credit line in
  small type can become the page's most common text size and fail the inspector's body-size check.
  One line for all pictures; no credit captions laid over the pictures themselves. Credit only the
  pictures the page still uses.
- A broken image fails the inspector. Check every picture in the screenshots.

## 11. Video

A moving picture of the subject's world can carry a section the way a photograph does: the river at
the end of the street, the roaster's drum turning, a timber frame going up. `assets.mjs --video`
searches real footage without keys: Wikimedia Commons (every video there comes with web-sized
transcodes; the best source for short clips), the Internet Archive's Prelinger Archives (industrial,
educational, city and home films from the 1920s to the 1970s, mostly public domain and mostly long)
and NASA (the Earth from orbit, launches, aircraft, laboratories). The rest of the Internet Archive is
left out: anyone can upload there, and the licence claims are unchecked.

```bash
node <skill>/scripts/assets.mjs "coffee roasting" --video
node <skill>/scripts/assets.mjs "river" --video --source commons,nasa --orientation landscape
node <skill>/scripts/assets.mjs --get commons:49769620        # the clip, a poster frame, the credit
```

It takes a rendition of 720p or smaller (`--res` changes that), lists short clips first, prints each
clip's length and file size, and flags anything over 25 MB or longer than a minute. `--get` refuses a
clip over 25 MB unless you pass `--max-mb`, and saves the source's still frame beside it as the
poster (Commons and NASA; the archive's own stills are too small). An archive film of ten minutes is
too heavy as it stands: trim a few seconds from it with ffmpeg if it is installed, or choose a
shorter clip. Licences, credits and honesty work exactly as for pictures (section 3).

**Choosing a clip.**

- **Short:** 5 to 20 seconds that loop without a visible jump: water, smoke, a turning drum, traffic,
  leaves, a crowd from far away. Watch it to the end before choosing.
- **Light:** under about 5 MB for a section and 10 MB for a hero. In the study sources are 1920×1080
  (the commonest) or 1280×720, median length 10 s; 720p is plenty behind type. For a full-bleed hero,
  cut a tall 720×1280 version for the phone, or set `object-position` on the subject.
- **Clean:** no slate, title card, logo, watermark or burned-in caption. NASA and archive films often
  open with a slate, and the source's poster frame may be that slate. No recognisable person who could
  be taken for the client's staff or customers.
- **Never the client's own:** a found clip of a roastery is not this roastery.
- **Found clips: one per page, two at most.** A found clip shows the world around the client; a
  third makes a theme of it. The project's own footage can carry more: in the study a site with
  footage carries a median of three or four clips. Either way, **one moving picture per screen**;
  two loops running side by side are noise.

**On the page.**

- Muted, looping, inline, with a poster and a fixed size, as `--get` prints it:
  `<video autoplay muted loop playsinline preload="metadata" poster="assets/river-poster.jpg"
  width="854" height="480" aria-hidden="true"><source src="assets/river.webm" type="video/webm"></video>`.
  No sound and no controls on a decorative loop. `aria-hidden` because it is decoration: whatever the
  clip says that matters belongs in the text beside it.
- The poster shows before the clip plays, on slow connections and under reduced motion, so it must
  work as a picture on its own. If the source's still is a slate or a blur, take a frame from the clip
  yourself or use a found picture.
- In the study only 31% of clips had a poster, and the panel recorded the blank and grey boxes
  before they played as faults. Here every clip has one.
- Play a clip only while it is in view, and none under `prefers-reduced-motion: reduce`, where the
  poster shows instead:

  ```html
  <script>
    const calm = matchMedia('(prefers-reduced-motion: reduce)');
    const clips = [...document.querySelectorAll('video[autoplay]')];
    const inView = new Set();
    const sync = (v) => {
      if (calm.matches) return;
      if (inView.has(v)) v.play().catch(() => {}); else v.pause();
    };
    const settle = () => {
      for (const v of clips) {
        if (calm.matches) { v.removeAttribute('autoplay'); v.pause(); v.load(); }
        else if (inView.has(v)) v.play().catch(() => {});
      }
    };
    const watch = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) inView.add(e.target); else inView.delete(e.target);
        sync(e.target);
      }
    }, { threshold: 0.2 });
    clips.forEach((v) => watch.observe(v));
    settle();
    calm.addEventListener('change', settle);
  </script>
  ```

- Crop and place it like a photograph (sections 5 and 6): `object-fit: cover`, one ratio, square
  corners, no frame, a ground-coloured `background-color` while it loads.
- Never under body text. On a clip put a headline, one line and one action at most, and check the
  contrast where they sit across the whole loop, not only on the poster: footage that is dark at
  one second can be bright at the next. If any frame drops below 4.5:1 (3:1 for 24px and up), use the
  scrim in section 6 or move the text off the clip. Nothing lies on top of a headline or a statement.
- It is motion: let it be the page's one moving thing, or sit in a section where nothing else moves.
- Credit it with the pictures: `--credits` prints one footer line for both ("Pictures and footage:")
  and the list for the report, with each clip's length.
- Where footage goes (hero background, inline loop, the frame that grows, a docked card), and what
  the study measured about it: section 12. Nothing that matters plays on hover only, and a full film
  with sound sits behind a play button that opens a player with controls.

## 12. Where pictures and footage go

What strong pages do with their pictures, measured on the latest 100 Awwwards Sites of the Day
(10 July to 17 October 2026, captured at 1440×900 and 390×844). 91 were usable. A panel described where
every picture sat and scored each site the Awwwards way, and a script measured how much of each screen
is picture. "Top" means a panel score of 7.5 or more (36 sites), "lowest" under 7.3 (16 sites). The
scores sit close together (6.7 to 7.9) and a single score carries about half a point of noise, so read
the links between a placement and the score as leanings, not laws.

### How much of each screen is picture

- **All or nothing.** Counting photographs, footage and picture backgrounds (not canvases), the median
  scrolled screen in the study is 16% picture, but few screens sit near it: 42% hold no picture and
  19% are 90% picture or more. Only 19% fall between 20% and 60%. A picture either leads its screen or
  stays out of it.
- **About a third, with rests.** On the 67 sites that put pictures in the page, the average screen is
  36% picture (middle half 18–69%). Top sites sit at 30% and leave 28% of their screens with no picture
  at all: screens of type are the rests between picture screens.
- **The first screen.** A picture covers at least half of it on 41% of the sites and nearly all of it
  on 32%. A full-bleed photograph or film is the whole first screen on 29%; footage is the main hero
  picture on about a quarter.
- **A scene is not a picture.** 66 of the 91 keep a WebGL canvas over at least 30% of the screen, so
  counting canvases the median screen is entirely covered. On the lowest-scored sites that canvas is
  often all there is: the five lowest usable sites (6.7 to 7.0) draw everything in it and put two
  pictures at most in the page.
- **Text is small in area.** The median screen is 8% text. Type is set large and sparse around the
  pictures, not packed beside them.
- **Off-centre.** Measured per section across the crawled sites, pictures sit to the left or right
  939 times, centred 273 times, and full-bleed or behind text 269 times.
- **The phone carries more picture,** not less: 19% of a phone screen at the median, and 27% of the
  first phone screen against 17% on desktop. Full-bleed pictures re-crop to portrait and fill the
  screen; splits put the picture first at full width.

### How many

- **Seven pictures per page** at the median (middle half 1–25). Top sites 8 (middle half 4–27), lowest
  2 (0–4). The floor in SKILL.md step 6, four and usually six to twelve, is the strong half of the
  study.
- **Footage on 42% of sites:** on half of the top sites and half of the middle band, and on one of the
  16 lowest. A site with footage carries a median of three or four clips.
- **Three to five placements.** Sites that use two or fewer of the placements below average 7.31;
  sites that use three or more average about 7.5. The median top site uses four, the median lowest
  site one. Where the pictures go changes from section to section on a designed page.

### The placements, ranked

| Placement | Sites (of 91) | Top (of 36) | Lowest (of 16) | Mean score with / without |
| --- | --- | --- | --- | --- |
| Split: picture in a half or two-thirds | 32 | 17 | 2 | 7.50 / 7.38 |
| Horizontal gallery | 32 | 13 | 4 | 7.44 / 7.41 |
| Full-bleed band between sections | 31 | 14 | 3 | 7.48 / 7.40 |
| Full-bleed picture or film as the first screen | 26 | 10 | 3 | 7.45 / 7.41 |
| Uneven mosaic | 25 | 11 | 1 | 7.49 / 7.40 |
| Picture held while text scrolls | 23 | 12 | 1 | 7.52 / 7.39 |
| Footage behind text | 22 | 8 | 2 | 7.46 / 7.41 |
| Even grid | 20 | 11 | 2 | 7.48 / 7.41 |
| Scattered collage | 19 | 6 | 3 | 7.47 / 7.41 |
| Panel sliding over a held picture | 19 | 8 | 2 | 7.48 / 7.41 |
| Inset frame that grows | 17 | 7 | 1 | 7.52 / 7.40 |
| One picture centred on a field | 14 | 5 | 3 | 7.38 / 7.43 |
| Cut-out object on a flat field | 13 | 7 | 1 | 7.57 / 7.40 |
| Index with hover preview | 12 | 6 | 1 | 7.49 / 7.41 |
| 3D gallery | 12 | 4 | 4 | 7.30 / 7.44 |
| Small card docked in a corner | 11 | 5 | 1 | 7.47 / 7.42 |
| Picture inside or in front of display type | 11 | 7 | 1 | 7.50 / 7.41 |
| One small picture beside a statement | 8 | 5 | 0 | 7.56 / 7.41 |
| Small pictures between words | 6 | 4 | 0 | 7.52 / 7.42 |

- Found on top pages more than their share and almost never on the lowest: the split, the picture held
  while text scrolls, the uneven mosaic, the inset frame that grows, the cut-out on a flat field, and
  pictures set with the type (the last three rows together: 24 sites, 16 of them top, 1 lowest).
- The horizontal gallery is common in every band and lifts nothing. Use it where browsing is the point.
- The 3D gallery is the one placement that goes with lower scores, and with the lowest usability in the
  table (5.9 against 6.35 for all sites).

### Each placement

Each entry gives when to use it, the geometry at 1440×900, the phone version and how it fails.

**Split: picture in a half or two-thirds**

- *When.* A claim and the picture that proves it. The commonest way strong pages pair words and a
  picture.
- *Geometry.* The picture takes 42% of the width at the median (middle half 33–49%), up to two-thirds,
  at the full height of its section: 680×850 and 720×900 are typical. 38% of these pictures are
  portrait, mostly 4:5 or 3:4. The text starts on the 50% line (x = 720) or on the line where the
  picture ends, top-aligned or docked low, not centred in its half. Let the picture touch the viewport
  on its outer side: only about 30% do in the study, and the ones with margin on every side read as
  placed by default (section 5). Alternate sides only across three or more rows.
- *Phone.* Picture first at full width (4:5, or 4:3 for a landscape), text under it.
- *Fails.* The same split in three sections running; a picture floating in the middle of its half; a
  text column narrower than about 30 characters.

**Full-bleed band**

- *When.* One picture carries a whole screen between type screens: the place, the work, the object at
  full size. One every three or four screens at most.
- *Geometry.* 100% wide and one to one and a half screens tall (median 900px at 1440×900, middle half
  890–1,170px; ratios 1.4 to 1.9). For a slow parallax the picture is oversized in its frame by 4–10%
  (32–72px a side in the study) and travels no further than that. Text is a headline and one line, or
  nothing, docked 32–64px in from a corner over the calm part of the picture.
- *Phone.* A portrait re-crop that fills the screen, with `object-position` set on the subject; the
  text moves to the bottom quarter.
- *Fails.* 11–14px white text over a bright area; three bands with nothing between them; a band that
  only decorates.

**Picture held while text scrolls**

- *When.* A list, steps or a long paragraph that all belong to one picture. If the picture changes for
  each item, it is the index with a preview, below.
- *Geometry.* A 100vh sticky stage inside a section two to six screens long (runways of 1,800–5,400px
  are typical in the study). The picture holds one half (685×880 is a typical portrait), two-thirds, or
  the whole screen with the text passing over it on a solid panel. Text rows about 150px apart, so two
  or three are in view at once.
- *Phone.* Release the stick: picture first, text under it. If the picture swaps per item, keep it as
  a band in the top 40% of the screen.
- *Fails.* Long runways where the text has faded out and the held picture is all that is left (the
  panel recorded several empty stages on phones); body copy set on the held picture.

**Inset frame that grows**

- *When.* Once per page, for the film or picture the page is about, as the move from type into
  picture.
- *Geometry.* The frame starts centred at 35–50% of the width (549×366, 710×480 and 864×540 in the
  study) or as a 16px inset round a full screen, and grows to the full width and height over
  720–2,700px of scroll. Any corner radius goes to 0 as it reaches the edges. A headline sits above it
  before it starts; nothing else on the screen moves while it grows.
- *Phone.* Start at full width inside the 16px margins and grow to a full-bleed portrait, or skip the
  growth.
- *Fails.* The growth is the only thing on screen for three scrolls; a loading spinner or a blank box
  in the first frame (give it a poster, start loading before it enters); used twice.

**Uneven mosaic**

- *When.* A body of work, or one place seen several ways: five to twelve pictures.
- *Geometry.* Two columns, or rows of three on a 24-column grid. Two or three picture widths (for
  example 32%, 48% and 65% of the width, or 5, 7 and 12 columns), neighbours offset vertically by
  120–190px, 130–450px between rows, one or two ratios, a caption under each.
- *Phone.* One column alternating full width and about 70% width, or two columns of 120–180px tiles
  that keep the offsets.
- *Fails.* Random ratios with random offsets, which read as a stock dump. Captions in 9–12px mono with
  index numbers, the award-site habit: here the caption is one line in the text face at body size, with
  no number.

**Horizontal gallery**

- *When.* A set people browse in any order: products, rooms, events, a team.
- *Geometry.* Cards 25–35% of the width (435×326 with 20px gaps at 1440: three in full and a fourth
  cut by the edge), or a strip at one fixed height with mixed widths (576px tall in the study), or a
  slider whose centre slide is about 73% of the width with 170–180px of each neighbour showing. Always
  cut by the right edge so it reads as more. A marquee of pictures moves slowly: 60–120s per loop.
- *Phone.* One card at 75–80% of the width (290–300px of 390) with the next one showing; swipe.
- *Fails.* Arrows and no drag or swipe; a marquee of things people need to read; a carousel holding the
  page's one important picture.

**Panel sliding over a held picture**

- *When.* A change of chapter: the picture holds, and the next section rises over it.
- *Geometry.* The picture is sticky at 100vh; the next section's ground slides up over it at full width,
  its top edge straight or shaped from the subject (the study has the arch of a building's windows).
  Here it is a solid panel with square corners: no rounded sheet tops, no frosted glass.
- *Phone.* Unchanged.
- *Fails.* Decks of five or six cards whose earlier cards linger as slivers; stacking for its own sake.

**Even grid**

- *When.* An archive only (layout.md §5): a shop range, the team, a menu, the full list of work.
- *Geometry.* Two, three or four across, equal cells, 8–16px gaps, one ratio (4:5 is the commonest),
  the caption under each picture.
- *Phone.* Two across for products, one for work and people.
- *Fails.* Three equal cards as "features". Cards with a dark gradient at the foot so the label can sit
  on the picture, common in the study: here the label goes under the picture.

**Index with hover preview**

- *When.* A list of eight or more projects or clients where the names matter as much as the pictures.
- *Geometry.* Rows on a 45–80px pitch, names at 30–60px. One picture at a time, about a third of the
  width at 16:9 or a portrait 300–450px tall, at a fixed place (the right half from the 50% line, or
  the centre), swapped within 0.3s. A version that needs no mouse: the names scroll across a picture
  fixed at the centre and the picture shows whichever name is crossing it. In the study the picture
  sits on top of the names; here nothing lies on top of large type, so the names pass in front of it.
- *Phone.* No hover. Give each row a thumbnail about 100px wide, or use the scroll version.
- *Fails.* Pictures that never appear on a touch screen. Rows divided by hairlines, the award-site
  habit: here rows are separated by space, and the active row by ink or a change of ground.

**One picture on a field, or one small picture beside a statement**

- *When.* A pause in the page: a single portrait or object. Or a small picture that gives a statement
  a face.
- *Geometry.* A single centred picture at 3:4 and 75% of the viewport height, on a ground taken from
  the picture. Or a small picture 7–26% of the width (108–374px) beside, above or between the lines
  of a 48–136px statement, aligned to one of its lines.
- *Phone.* The picture above the statement at 60–100% of the width.
- *Fails.* Used as the default for every picture: a picture with equal margins on all sides reads as
  placed by default (section 5).

**Small pictures between words**

- *When.* A statement about the things themselves (materials, people, products), on a screen of its
  own.
- *Geometry.* Two to four chips in the statement, from the cap height to three-quarters of the type
  size tall and one to one and a half times as wide (50×46px in a 60px line; 113×75px between the two
  words of a 150px name), all from one shoot, square corners. Give them a width and height so the lines
  do not jump while they load.
- *Phone.* Keep them inline at the height of the text.
- *Fails.* More than four; chips from different shoots; a chip that carries information the words do
  not.

**Picture inside or behind display type**

- *When.* The object is the subject: a product, a building, a person.
- *Geometry.* A small picture window sits inside a block of 150–200px display type and later opens
  into the next screen; or the object stands behind the type, showing between and around the letters;
  or it touches the edge of the word without covering a letter. In the study the object more often
  stands in front and covers one or two letters, or a line of type runs behind a square picture; here
  nothing lies on top of a headline (the inspector fails large text a fifth or more hidden), so the
  type stays in front.
- *Phone.* Keep it, with the type at about 15vw, and check the word still reads.
- *Fails.* An object over the letters; type displaced or glitched by the picture.

**Cut-out object on a flat field**

- *When.* Products and objects. The highest mean score in the table, on 7 of the 36 top sites.
- *Geometry.* The object at 35–60% of the width on a flat ground taken from its own colours, standing
  on the bottom edge or running off one side, with the type behind or beside it.
- *Phone.* The object at 80–90% of the width under the headline.
- *Fails.* A render floating in a void with no ground; a drop shadow added to a cut-out (no resting
  shadows here; keep a contact shadow only if it was photographed).

**Scattered collage**

- *When.* Archives, ephemera, a festival of many small things. Sparingly: it is about as common on the
  lowest pages as on the top ones.
- *Geometry.* Six to sixteen pictures of 100–300px at a few sizes around a centred heading, never over
  it.
- *Phone.* Re-stack as overlapping pairs in one column.
- *Fails.* Tilted prints and stickers with offset shadows, common in the study and not a treatment
  here (section 6); pictures crossing the text.

**Small card docked in a corner**

- *When.* A standing pointer to the reel or to the next thing.
- *Geometry.* About 216×144 to 240×140, 30–43px from the corner; one per page.
- *Phone.* Drop it, or move it into the flow.
- *Fails.* Content scrolling under it; a second one.

**3D gallery**

- *What.* Pictures on a ring, sphere, helix or tunnel in a WebGL scene, turned by the wheel or by
  dragging.
- *In the study.* 12 sites, 4 of them among the 16 lowest; mean score 7.30 against 7.44, usability 5.9
  against 6.35.
- *Here.* Do not build one. Show the same pictures as an index with previews or a horizontal gallery.

### Footage

**What the study measured.**

- Footage on 38 of 91 sites (42%): 18 of the 36 top sites, 19 of the 39 in the middle, 1 of the 16
  lowest. A site with footage carries a median of three or four clips (middle half 1–8).
- Footage covers at least half of the first screen on about a quarter of the sites, and is full-bleed
  on nearly all of them.
- Clips are short: median 10s, middle half 5–14s; 61% run 10s or less and 88% 20s or less.
- Every decorative clip is muted, loops, plays inline and has no controls. The autoplay attribute is on
  44% of clips; the rest are started by script, mostly as they come into view.
- Only 31% of clips have a poster (13 of the 38 sites). The rest show a blank or grey box until they
  play, and the panel recorded those as blank first paints. Here a poster is required (section 11).
- Sources: 1920×1080 is the commonest, then 1280×720; tall clips at 450×800 or 540×960 for phones and
  portrait tiles. Median source width 1,080px.
- On the page: 16:9 41%, square 19%, portrait (4:5 to 9:16) 25%, 4:3 or 3:2 12%. Corners square on 75%
  (the rest 8px or less, or 20–32px). `object-fit: cover` on 84%, contain on 16% (product strips, letterboxed
  films).

**Where it goes.**

- **Hero background:** full-bleed, cover, often oversized by 1–25% so a drift or zoom never shows an
  edge. Either one slow take or a montage cutting every second or two.
- **Inline, as a picture:** in splits, tiles and cards, at about a third of the width (median 33%,
  middle half 24–45%); a third of these clips are under a quarter of the width and fewer than one in
  ten is full width. Slow, near-still subjects (water, skin, light, a turning object) read as living
  photographs and sit well among stills.
- **The frame that grows** (above), for a reel.
- **A docked card** (above): one small clip in a corner.
- **On hover:** only two or three sites play clips on hover, all of them in an index or list. Nothing
  that matters should play on hover only; phones have no hover.
- **Full films:** about ten sites offer a full film behind a play button that opens a player with
  controls. None autoplays it.
- **Sound:** six sites offer sound behind a toggle; no clip starts with sound.

**How text sits on it.**

- Of about 30 sites with a full-bleed picture or film behind text on the first screen, about 14 set the
  type straight on it and rely on the footage being graded dark where the type sits; about 10 dim it
  (to half brightness, under a 30–40% dark layer, or with a dark fade along the bottom 180–590px);
  about 6 keep the text off the picture, above it or on a solid card.
- What goes on footage in the study is the name or a headline at 47–136px and one short line, docked
  bottom-left or centred. Where body text at 11–14px went on footage or a busy photograph, the panel
  named it as a fault, on top-scored sites too.
- Here: one headline, one line and one action on footage at most, and never body text. Check contrast
  where the type sits across the whole loop, not only on the poster; if any frame drops below 4.5:1
  (3:1 for type of 24px and up), use the scrim in section 6 or a solid band.

**On the phone.** Footage re-crops to a full-screen portrait (a separate tall source, or
`object-position` on the subject); inset frames go full-bleed. One site in the study adds a 40% scrim
on the phone only, where the type covers more of the picture.

### Crops and treatment

- **Ratios.** Of 1,356 pictures and clips measured: 4:5 21%, 16:9 19%, 1:1 16%, 16:10 10%, 3:2 7%, 2:3
  5%, 4:3 5%, 5:4 4%, 3:4 3%, wider than 2:1 6%, 9:16 or taller 3%. Landscape 52%, portrait 33%,
  square 15%.
- **Two ratios do most of the work.** On sites with four pictures or more, the two commonest ratios
  hold 76% of the pictures. The others (five ratios in all at the median) are exceptions with a reason:
  one tall portrait in a run of landscapes, one wide band.
- **Square corners** on 94% of pictures; 62 of the 68 sites with pictures in the page keep at least 80%
  of them square. Where corners are rounded, it is 5px or less on two-thirds of them, or 20–32px on
  card interfaces, one value per site.
- **Cover.** `object-fit: cover` on 78%, contain on 10% (a product on a tile, a letterboxed film).
- **Untouched.** CSS filters touch pictures on only 9 sites, mostly for hover states. A handful use
  black-and-white photography as a set; two multiply scanned paper onto the ground. Several keep the
  interface black, white and grey and let the photographs carry all the colour.
- **Common in the study, not treatments here** (section 6): a fixed grain layer over the whole page
  (about a third of the sites), duotone or tinted photographs, blurred copies behind a picture as a
  glow, tilted prints and stickers with offset shadows.
- **Oversize only by the distance it moves.** 22 sites move pictures with the scroll, oversizing them by
  1–25%. Oversize by the travel and no more, on one picture per screen.
- **Resolution.** The study serves pictures at a median 1.9 times their CSS width, but 17% are served
  smaller than they are shown and full-width pictures at a median of only 1,440px. Here: twice the CSS
  width, capped at about 2,400px (section 4).

### Text over pictures

- In the study, text sits on pictures often and is checked rarely: about 28 notes record text set
  straight on a picture with no scrim, and the faults of 16 sites include text lost over pictures: 8–14px
  labels and body over photographs, and navigation in a difference blend or with no backing passing
  over them.
- Where it works, the text is display size and sits over the calm part (sky, a dark wall, the shadow
  side), docked in a corner or along one edge. Two other forms in the study: a solid card in the
  ground colour inset over the photograph and carrying the heading, and text on the white of a picture
  that fades into the page.
- Here: on a picture put only display text, one short line and one action. Body text, captions and
  labels go beside or under it. Measure contrast at the text's own position (4.5:1, or 3:1 for 24px and
  up). If it fails, move the text to a calmer part, put it on a solid card in the ground colour, or use
  the scrim in section 6. A fixed navigation that passes over pictures gets a solid band, or hides
  while scrolling down.

### Rules for a generator

1. **About a third of the page is picture.** Across the scrolled screens, pictures fill 30–40% of the
   area, and at least one screen in four carries no picture (top sites: 30% and 28%).
2. **A picture leads its screen or stays small.** A leading picture takes at least 60% of its screen;
   an accent stays under 10% of it. Avoid screen after screen of pictures at 20–40%: in the study 42% of
   screens are 0% and 19% are 90% or more.
3. **Three to five placements per page,** and no two neighbouring sections with the same one. Sites
   with two or fewer average 7.31, sites with three or more about 7.5.
4. **Six to twelve pictures, never fewer than four.** Study median 7; top sites 4–27; lowest 2.
5. **Two ratios for at least 75% of the pictures** (76% in the study), a third only for a deliberate
   exception. Defaults: 4:5 for portraits, 16:9 or 3:2 for landscapes.
6. **Square corners on every picture** (94% in the study). If the direction rounds them, one radius of
   4px for every picture and clip.
7. **Split pictures take 42–50% of the width, or two-thirds,** at the full height of the section and
   touching the viewport on their outer side; the text starts on the 50% line. On the phone the
   picture goes first, full width.
8. **Full-bleed bands are 100% wide and 100–150vh tall,** one every three or four screens, oversized by
   10% at most for parallax, with text only in one corner at least 32px in. On the phone, re-crop to a
   full-screen portrait.
9. **One inset frame that grows per page,** from 35–50% of the width to the full screen over
   720–2,700px of scroll, with nothing else moving on that screen.
10. **Horizontal galleries show three cards and a cut fourth:** cards 25–35% of the width with 16–20px
    gaps; on the phone one card at 75–80% of the width with the next one showing.
11. **One moving picture per screen.** Clips of 5–15s (median 10s), muted, looped, inline, with a
    poster, paused out of view; a hero source of 1920×1080 under 10MB, inline clips at 1280×720 or
    smaller under 5MB.
12. **Only display text on a picture:** a headline, one line and one action at most, with contrast
    measured at the text's position across the whole loop. Body text, 16px or more, goes beside or
    under the picture, never on it.
