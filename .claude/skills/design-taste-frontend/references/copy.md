# Words

Copy is the first design decision. A headline that needs four lines cannot be rescued by typography,
and a page of slogans cannot be rescued by layout. Write the page as plain text before any markup.

## Contents

1. Write the argument first
2. The two-line headline (with the character budget)
3. Headline shapes that work
4. Supporting line, body, buttons
5. Proof without inventing it
6. Things that read as generated
7. Micro-typography

## 1. Write the argument first

Answer in one line each, in a scratch note:

- Who is reading, and what do they already know?
- What is this, said the way its maker would say it to a friend?
- What single thing should the reader believe after one screen?
- What would make them believe it (a picture of the thing, a number, a name, a demonstration)?
- What do they do next?

Then list the page as claims, one per section, each with its proof:

```
1. It is a three-legged oak stool, made to order.             → the stool, large
2. Each seat is cut from one board, so the grain is yours.    → three close-ups
3. It takes six weeks, and you can follow it.                 → the stages, photographed
4. It costs 240 and is delivered by the maker.                → price, button
```

A section with no claim is filler; delete it. This is also how you escape the stock order of
hero, logos, features, testimonial, pricing, call to action: the order of the argument is the order of
the page.

## 2. The two-line headline

A headline is a title. It is held in one glance. On the studied gallery sites the hero headline has a
median of 5 words and 70% sit on one or two lines at desktop width. Every headline on your page, at
every viewport, fits in **two lines or fewer**. `inspect.mjs` measures this at 1440, 768 and 390 pixels
and fails the page otherwise.

The constraint is arithmetic, so do it before you fall in love with a sentence:

```
characters per line ≈ line width in px ÷ (font size in px × k)

k ≈ 0.40  condensed faces
k ≈ 0.50  most grotesks and serifs at display size, tight tracking
k ≈ 0.58  wide / extended faces, all-caps settings
```

| Where | Line width | Size | Per line | Two-line budget |
| --- | --- | --- | --- | --- |
| Phone 390, 20px gutters | 350px | 44px | ~16 | **~32 characters** |
| Phone 390, 20px gutters | 350px | 34px | ~21 | ~42 characters |
| Tablet 768 | 690px | 64px | ~22 | ~44 characters |
| Desktop, 12-col measure | 1100px | 104px | ~21 | ~42 characters |
| Desktop, half width | 620px | 72px | ~17 | ~34 characters |

So a hero headline of **about 32 characters or fewer** (four to six words) survives everywhere at a
confident size. Up to about 42 works if the phone size comes down to the mid-30s. Past that you are
writing a sentence; move the rest into the supporting line.

Controlling the break:

- Give the headline a `max-width` in `ch` so it breaks where you intend, and add
  `text-wrap: balance` so two lines come out even.
- Where the break matters (it usually does), author it: `Stools for<br> small kitchens`. Check the
  phone screenshot; if an authored line wraps there, hide the `<br>` under a breakpoint or shorten.
- Never fix a long headline only by shrinking it. A timid 28px headline of nine words is worse than
  five words at 64px.
- Avoid a single orphan word on line two. Rebalance by cutting a word, not by nudging the width.

Section headings follow the same rule and are shorter: two to five words.

**A statement is not a headline.** An intro sentence or a quotation set large (the manifesto line
after the hero, a testimonial) is a paragraph: mark it up as `<p>` or `<blockquote>`, keep it to about
25 words, and set it at statement size, which the inspector takes as 36px or less on desktop, 32px on
a tablet and 24px on a phone. It may then run to about three lines (four on a phone). Set larger than
that, or marked up as a heading, or placed as the main line of the first screen, it is a headline and
gets two lines. In blind judging, a sentence set big over three or more lines was read as a long
headline every time, whatever its markup; if the words matter that much, cut them to a two-line
headline instead.

## 3. Headline shapes that work

All seen repeatedly on the gallery sites. Pick the plainest one that is true.

- **The name.** The brand or the person, set very large, with a one-line description elsewhere.
  Strongest when the name is short and the subject is visual (studios, restaurants, hotels, people).
- **What it is.** "A vinyl shelf in your pocket." "Furniture for small rooms." Category, stated with
  one specific word.
- **The claim.** "Your bank won't do this." One sentence a competitor could not sign.
- **The instruction.** "Understand your money." Verb first, short.
- **The place or the moment.** "Antarctica." "Lisbon, since 1984." For hospitality, events, travel.

Shapes to avoid, because they are the average of every landing page:

- The mad-lib: "The AI-powered platform for modern teams".
- The tricolon: "Fast. Simple. Secure." or "Plan. Build. Ship."
- The correction: "It's not just a tool, it's a workflow". Also "More than a …".
- "X, reimagined / redefined / made simple". "Welcome to …". "Meet …" for a product nobody has met.
- A question the reader did not ask.
- A headline that needs its colon: "Ledgerly: invoicing for freelancers". Drop the name, it is in the
  navigation.
- One word of the headline styled differently (italic, serif, coloured, underlined, in a pill).

Sentence case. No full stop unless the direction's voice uses them everywhere.

## 4. Supporting line, body, buttons

**Supporting line.** One sentence, at most about 22 words, that says concretely what the thing is and
who it is for. It is where the detail cut from the headline goes. It never repeats the headline in
other words.

**Body.** Short paragraphs of plain statements. Prefer the specific noun and the real number: "ships
in a week" over "fast delivery"; "38 seats" over "intimate". Read every sentence and ask whether a
different company could print it unchanged; if so, sharpen it or cut it.

**Buttons.** Name the action or the thing: "Book a table", "See the plans", "Download for Mac".
One to three words. The primary action keeps one name everywhere on the page. One primary button per
screen; a second action is a plain text link. No arrow glyph on every link and button; at most one
arrow, on the primary action, if the direction uses arrows at all.

**Navigation.** The wordmark, up to five plain links, one action. Link labels are single nouns.

## 5. Proof without inventing it

Never invent customers, quotes from named people, press logos, user counts, ratings or benchmarks.
Invented proof is both dishonest and a recognised tell.

When the brief supplies no proof, use what is true by construction:

- Show the thing itself, large. A real demonstration outranks any quote.
- State how it works, specifically.
- Use facts from the brief (price, place, year, materials, what is included).
- If a testimonial or logo section is explicitly requested and no real ones exist, build the section
  with plainly fictional sample content and say so in your final report so it is replaced before
  launch. Do not put real company names or real people in it.

**Sample details are different from proof, and they are expected.** Where the brief gives the shape of
the content but not every detail (six rooms "from €140", "a short menu", twelve speakers), write the
full set of plausible details: each room with a name, a bed, a view and its own rate; each dish with
its price; each speaker with a talk title. A design can only be judged at its real density, and a page
that shows one rate where six rooms exist looks unfinished. List every sample detail in the report so
the client confirms or replaces it.

## 6. Things that read as generated

`lint.mjs` flags most of these.

- Verbs and adjectives of the genre: unlock, unleash, supercharge, elevate, empower, streamline,
  seamless, effortless, robust, cutting-edge, next-generation, world-class, all-in-one, blazing fast.
- Labels pretending to be editorial: "Field notes", "The details", "Our philosophy", "Quietly trusted
  by". A section heading can simply be "Pricing".
- Furniture text: locale or time strips, "Est. 2024", coordinates, version stamps, "Scroll", "(Scroll
  to explore)", fake photo credits, status lines such as "Available for work" with a dot, strings of
  words separated by middle dots or slashes.
- The em dash as a habit. One or two on a page read as writing; ten read as a model. Use a full stop.
- Explainer captions that narrate the design: "A clean, minimal layout for…".
- Step labels that duplicate numbers: "Step 1", "Phase 02".
- Three parallel items everywhere: three features, three stats, three steps. Use the number the
  content has.

## 7. Micro-typography

- Curly quotes and apostrophes (“ ” ’), a real ellipsis (…), an en dash for ranges (9–5).
- Non-breaking space between a number and its unit, and before the last short word of a headline
  when it would otherwise orphan (`&nbsp;`).
- `font-variant-numeric: tabular-nums` where numbers line up in columns (prices, tables).
- `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs.
- No all-caps for anything longer than three words; if you set caps, add 0.02–0.06em tracking.
- No text under 13px. No centred paragraphs longer than three lines. No justified text.
