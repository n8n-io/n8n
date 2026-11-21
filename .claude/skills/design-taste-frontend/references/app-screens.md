# App screens

Dashboards, admin, analytics, settings, inboxes, wallets and builders: the screens people work in.
Read this file whole before you start one. The page run in `SKILL.md` does not apply to them.

A generated dashboard is the average of every dashboard template: a dark or tinted sidebar with a
coloured pill on the active item, "Welcome back" and a waving hand, four KPI cards each with an icon
in a tinted circle, a green "+12.5%" and a sparkline, a gradient area chart, a zebra table under
uppercase headers. Nothing in it is wrong and none of it was decided.

This chapter is distilled from a study of 23 real product screens chosen by the owner: 17 products,
17 light screens and 6 dark, all at desktop width (1440 or 1512px). Each screen was measured from its
pixels and noted for what works and what fails; the numbers below are those measurements and their
medians. The products are not named. What separates these screens from the generated kind, in order
of how much it shows:

1. **Colour goes on data, not chrome.** The median screen has about 3% coloured pixels; 17 of 23 stay
   at 5% or less. 12 have no filled primary button at all.
2. **KPIs are type, not tiles.** No screen puts an icon in a coloured circle on a KPI, and none draws a
   sparkline on one.
3. **Surfaces are flat.** 17 of 23 give their cards no shadow; separation is a 1px line or one tone
   step.
4. **There is no hero header.** 9 screens have no heading over 16px; where there is one, its median is
   24px.
5. **Charts carry almost no chrome.** A single series has no legend; gridlines are 3-7 faint lines or
   none.
6. **Navigation recedes.** The active item is a neutral grey pill or a change of text colour; a
   coloured left bar appears once.
7. **Tables are rules and alignment.** No zebra striping, no header bands, numbers right-aligned.
8. **Data states are honest.** Zeros print as zeros, missing values as a grey dash, and an empty
   section keeps its frame.

Taking the template's devices away is half the job, as it is on a page. The other half is substance:
the product's real data, a screen that answers its one question first, and a grid whose arithmetic
closes.

**A warning learned in testing.** In the first blind round, screens built with this chapter were
clean, quiet and correct, and they lost to richer screens built without it. The judges' reasons were
the same every time, and each is now a rule below:

- **The first screen was thin.** One large chart of a flat line filled it, and half the blocks the
  brief asked for started below the fold. On a 1440×900 screen, every block the brief names shows its
  header and its first rows (§2.2).
- **The product was missing.** No name, no workspace, no mark: the screen could have belonged to
  anyone. The shell names the product and the scope (§3.2).
- **Restraint hid meaning.** A latency rise and a request rise were the same grey. Colour on a change
  says good or bad, not up or down (§5).
- **There was nothing to do.** No control for the job the screen exists for. The most frequent job is
  one click from the first screen (§2.2).
- **Rows ended ragged** and **a style's move was over-applied** (a tray around every card, an icon
  rail where people needed labels). Keep the move to where it carries meaning.

Quiet is the starting point, not the goal. A screen that a person would trust shows more of the
product than a template does: its people, its objects, its numbers and the one thing to do next.

**Give the product a face.** After four rounds the judges' top complaint was the same on most
screens: "a well-applied kit, not a product with its own identity" (stock Geist or Inter, a #f8f8f8
ground, white 12px cards, lime on black). The style's tokens make a screen correct; these make it
this product's, and choosing them is a step of the run, not a finish (§2.3):

- **One face from the sheet, chosen before you build.** Each style lists two or three ways it takes a
  face from the brief: a ground tinted from the product's world, a figure face with character, the
  brand's hue on the main data element. Choose one, write it in your notes next to the screen's
  question, and check that it shows on the first screenshot.
- **The dealt typeface, really loaded.** A build that fell back to the default face landed on the
  default look; the inspector now fails it.
- **The product's mark and name** at the top of the shell, drawn for this product (a simple
  monogram or symbol in the accent, from its name or its object), never a black square with a letter.
- **One element only this product has**, built from its own things: an energy home's power flow, a
  bakery's sell-out strip, a leave planner's cover against the minimum, the pace groups of a running
  club as a unit chart, the couple as three lanes, a deploy's commit as the hero of the overview. The
  sheet lists the library's signature elements whose words appear in the brief; otherwise invent one.
  Name it in your notes next to the screen's question.
- **The one chart hue on the main data element**: today's line, the booked bars, the current period,
  the margin that breaks. A screen whose only hue is a delta reads as a kit, and the inspector warns
  when a screen with charts carries no hue on its data (`no-data-hue`).
- **Its people and objects as themselves**: each person gets a stable initial and a pale tint of their
  own hue, with people listed next to each other at least 60 degrees apart. These tints are identity,
  not data: they stay pale and out of the chart legends. Products show their thumbnails, cover art
  shows the cover.
- **Words of the trade** in labels and empty states ("Waiting on the customer", "Off sick", "Due
  on the 28th"), never the generic noun of a template ("Items", "Records", "Status").

**Calendars and timelines** (house rule, from testing; the study has none). People down the left on a
fixed 160-220px column, grouped under a team subheader rather than repeating the team on every row;
days across with faint 1px day lines, weekends one tone step darker, and today marked by a 1px line
in the one data hue with its date in ink. Bars are 20-24px tall at radius 4. One-line names sit on a
32px pitch; a name with a subline (team, office) needs 40-44px, or the subline touches the next name.
**Every kind of booking has its own mark**, so sickness reads apart from a holiday at a glance:
holiday a pale fill, off sick a 1px diagonal hatch, long leave a darker grey step, working away an
outline, a pending request a dashed outline. A style with a hue budget may add a 3px left edge in the
hue for the kind the screen is about. Full colour is only for what needs a decision (a request that
breaks cover). A label sits inside its bar; a bar too short for it shows the kind's code inside and
the full label in its tooltip, or the label after the bar's end, never over the days before it.
Holiday markers name their office in a multi-office product. Every swatch in the legend is the mark
itself, scaled down, and lists only kinds on screen: `Charts.timeline(el, rows, kinds)` draws the bars
and returns that legend from the same kinds map.

## Contents

1. When this applies
2. The run for an app screen
3. The shell
4. The canvas and the page title
5. KPIs
6. Charts
7. Tables and lists
8. Forms and settings
9. Type and colour
10. Density
11. Empty, zero, loading and error states
12. The phone
13. House rules for app screens
14. Tells of generated dashboards

## 1. When this applies

An app screen is worked in rather than read. This chapter covers:

- dashboards and overviews: a seller's day, a project's health, a publication's growth;
- admin and back office: members, orders, events, a catalogue;
- analytics and reports, including a generated report with no app around it;
- settings and billing;
- list screens to work through: inboxes, queues, tables with filters;
- wallets and finance homes;
- builders and editors: flow, form and page builders, canvases;
- the detail page of one object: an event, a deployment, a customer.

A product site that shows its interface is a page; the interface fragments on it follow these rules
for their insides (mark each fragment's root with `data-ui`). When a request holds both, build each
with its own run and share one palette and one typeface.

The study is 23 desktop screens. It has no phone screens, no loading or error states, one settings
page, no inbox and no dense operations table (the densest screen shows about 120 data points). Where a
rule below goes past the study, it says **house rule**.

## 2. The run for an app screen

Do these in order. The first three steps decide whether the screen is any good.

### 2.1 Inventory the data and the jobs

The page run inventories the subject's world; an app screen inventories its data. Write in your notes,
in 8 to 12 lines:

- **the objects** the screen shows (deployments, invoices, members, events, conversations) and their
  fields, with units;
- **realistic magnitudes**: how many objects, a typical amount, the range of a rate, how values move
  over a day, a month, a year, and for a new account how small they really are;
- **the people**: who opens this screen, how often (a glance once a day, or an eight-hour session),
  on what device;
- **the jobs**: what they do next from here (approve, reply, pay, ship, invite), and which job comes
  up most;
- **the product's own things**: its name and mark, the workspace or account it is scoped to, the people
  in it (two partners, a team of six, the club's members), and the objects people recognise by sight
  (product photographs in a shop, cover art in a media tool, a map of the route). These are what make
  a screen belong to this product instead of to a template; plan where each one appears.

Then write the data itself: a small dataset in a JSON or JS file that the screen renders from, with
believable names, amounts that add up to their totals, dates in order and a unit on every figure.
Totals are computed from the rows, never typed in separately. Small numbers stay small: the studied
screens show new accounts with 1, 6 or 9 of something, drawn honestly at their real size. Write the
figures that must agree as assertions in the data file (`console.assert(sold - cancelled === rsvps)`,
the bins sum to the total, the parts to the whole) and read the console: in testing, a ticket table
that did not reconcile with its own KPI cost a judge's trust in the whole screen. Checks that need
computed values (allowance after a request, cover per day) go in the script that computes them.

**Data that tells the truth** (house rules, from testing; judges checked every one of these):

- **A fact shown twice is one variable.** A time window, a total or a state that appears in two cards
  (the battery full 13:30-16:30 in the KPI label, the shaded span and the battery card) is one value in
  the data file, and the copy and the chart annotation are both built from it. Two cards that
  disagree by half an hour cost more trust than a missing card.
- **Totals and deltas come from the parts as shown.** Sum the rounded pennies the screen displays,
  never round the unrounded total separately: £21.68 + £8.34 − £3.81 is £26.21, and a screen that
  says £26.22 is caught. A change is the difference of the two values on screen (£5.28 against
  £5.22 is +£0.06, not +£0.07).
- **Every relative figure names its baseline** in the same phrase: "3 h 40 m before close", "45 m
  earlier than last Sunday", "+5 on the usual Monday". "Early", "up" or a bare "+5" next to another
  time or figure reads as measured against that one.
- **One name per time.** Shops close at 15:00 and the tills are cashed up at 15:12; the header and
  the card use the same words for the same moment, and an error state rewrites the status line.
- **If a caption has to say which bars are which, encode it in the chart instead**: a marked period in
  a second tone with its own legend entry, a signed axis, a label on the mark.

### 2.2 Name the screen's one question

Every screen answers one question first: "Did today's sales come in?", "Which deploy broke?", "Who is
waiting for a reply?", "How much of this month's plan is left?". Write it in one line. It decides
three things:

- **what is biggest.** In the study the largest block is always the one that carries the screen's
  question, whatever form it takes (a chart, a plan, a ring, a list). The same holds for figures:
  the largest figure on the screen answers the question the title row's sentence answers. In testing,
  an 88% sun ratio at 32px out-shouted the 24px charging window the title led with;
- **what comes first** in the reading order;
- **what is left out.** The studied settings page shows three usage numbers and links to the
  analytics screen instead of drawing a chart; four screens draw no chart at all because a few
  numbers say it.

Then name the screen's **one finding**: the fact in today's data that most needs attention ("9 no-shows
while 8 people waited for a place", "the 23:28 deploy doubled the error rate", "eating out is £36 over").
Put it where it is read first, as the line under the title or the subline of the headline figure,
next to the action it drives. In testing, the finding that mattered sat in a 14px caption at the
bottom of a card and the screen read as flat.

**Do not rebuild a studied screen.** When the product is of the same kind as a screen in the study (a
finance home, a deploy overview), its arrangement is the trap: judges recognised the copies at once.
Take the structure from the product's own things instead: for a couple's budget, Mia, Joint and Tom
as three columns running through accounts, plan and bills; for a running club, the pace groups.

Then list the screen's blocks as the answers to its next questions, one line each, the way the page
run lists claims. A block with no question is deleted. This is how you avoid the stock order of KPI
row, big chart, two small charts, table.

Three more lines, each tested:

- **Everything the brief names is on the first screen.** At 1440×900, every block the brief asks for
  shows its header and its first rows or its figure. Size the headline block to the question (about
  200-360px tall), cap long lists at 4-6 rows with "View all", and put time-sensitive blocks (bills
  due, SLAs running out, a failed deploy) before long tables. A chart whose line is flat for most of
  the window does not get the full width: give it two-thirds and put the next answer beside it.
- **The most frequent job is one click away.** Name it ("pack the orders due today", "reply to the
  oldest breach", "redeploy the failed build") and put its control where the answer shows: a primary
  button in the title row, an action on the row that needs it, a "View logs" on the failed item. A
  screen with no control for its main job reads as a report, not as a tool.
- **Show the evidence beside the answer.** A judge trusts "Error rate 0.28%" more with its spike
  annotated ("peaked at 3.9% after the 23:28 deploy, reverted") than with the number alone. One line
  of explanation on the event that matters is worth more than a second chart.

### 2.3 Choose a style

```bash
node <skill>/scripts/draw.mjs --app --kind <kind> --brief "<one line about the product>" \
  --screens <screens> [--theme light|dark] [--keep palette,type] --options 3
```

This deals up to three styles from `library/app.json` (fewer when only two suit the kind and the
theme). `draw.mjs --app --list kinds` (or `styles`, `screens` or `signatures`) prints the choices; the
screens are `overview`, `analytics`, `list`, `detail`, `settings`, `wallet`,
`builder`, `inbox`, `home` and `report`. The library holds seven styles, each distilled from the
studied screens that share its move:

| Style | Theme | For | The move |
| --- | --- | --- | --- |
| `achromatic-ledger` | light | money homes, reports, settings with usage | No colour in the chrome; charts in ink; one small signal where a figure changed |
| `framed-sheet` | light | B2B analytics, developer platforms, builders | One tinted L-frame; the page on a white sheet inset 8px, no shadow |
| `accent-ladder` | light | creator and small-business admin with plans | The full hue on small marks only; its pale tints on every area |
| `editorial-greeting` | light | team and personal homes | The greeting as the h1 in a centred 12-column column; every figure at regular weight |
| `pastel-consumer` | light | wallets, budgeting | Pale same-hue tiles under one large radius; quiet money polarity |
| `true-black-flat` | dark | community, events, media | Elevation by lightness alone; colour only on data |
| `data-terminal` | dark | markets, monitoring | Every selection is the same 1px accent line; signs, not colour, on numbers |

Choose by how the product is used (long sessions or a quick look, money or media, a team or one
person, day or night), not by what is most familiar, and write one line on why. Then deal the sheet:

```bash
node <skill>/scripts/draw.mjs --app <the same arguments, without --options> --style <id>
```

The sheet gives the style's tokens and type, its shell and one pattern for each screen you named.
Keep the style's one move intact and take every other value from the defaults in this file. Redraw
(`--redraw style | shell | screen:<name>`) only for a reason you can state: it contradicts the brand,
or the product is used in a way the style does not suit. With an existing brand, pass
`--keep palette,type`, map its colours onto the roles in §9 and keep the style's colour budget.

**Then choose its face, before any markup.** The sheet's "Its face" list gives two or three ways this
style takes a face from the brief, and "Signature elements" lists the library's elements whose words
appear in the brief (a power flow for an energy home, a sell-out strip for a bakery, a cover matrix
and a kind-encoded timeline for a leave planner). Write in your notes, next to the screen's question:
the face you chose, the signature element (from the sheet, or your own built from the product's
things), and where each appears on the first screen. A style dealt to two products must not give them
the same face: in four rounds, the screens that skipped this step were scored as the same kit.

### 2.4 Build the shell

Build the frame first, empty: the sidebar or rail, the top bar if the shell has one, the canvas with
its gutters, the title row (§3 and §4). `<skill>/assets/app.css` is a neutral start for all of it:
copy it into the project and put the sheet's tokens in its `:root`. Look at it at 1440 and at 390 before any data goes in. Do the
grid arithmetic now and write it in a comment: the column count, the gutter, and the sum that proves
the cards land on the canvas edges.

### 2.5 Put in the data

Render every block from the dataset; draw the charts from it too, with `<skill>/assets/charts.js`
(`Charts.line`, `Charts.bars`, `Charts.diverging`, `Charts.ring`, `Charts.barList`, `Charts.plan`,
`Charts.bullet`, `Charts.timeline`, `Charts.matrix`, `Charts.timeStrip`; the file's header lists their
options) or your own SVG to the rules of §6, never a chart library's defaults and never a picture of a
chart. The newer helpers return `{ svg, legend }`: put that legend in the card's header rather than
drawing your own, so each swatch is the mark it explains. Format every figure by §7.4: separators, fixed decimals per
metric, a sign on every change, units as smaller grey suffixes, tabular figures, right alignment in
columns. Use the product's own words for labels. No placeholder data: the inspector fails lorem ipsum,
Acme, John Doe and their kind. Proof is not invented here either: no vanity totals, no "+12%" on an
account that is a week old.

### 2.6 Build the states

For every block, build its empty, zero, loading and error state (§11); for every row and control, its
hover, selected, focus and disabled state. Look at each one in the browser. A screen that only works
with full data is half built.

### 2.7 The check

```bash
node <skill>/scripts/lint.mjs --app <source files or folder>
node <skill>/scripts/inspect.mjs --app <url or path/to/index.html>
```

A sheet dealt with `--app` switches both tools to the app rules by itself. The inspector opens the
screen at 1440, 768 and 390 and measures what this chapter asks for: an h1 (and reports it as the
screen's hero); a sidebar that folds on the phone; the canvas used to its right edge; panel shadows
and borders; the number of corner radii; cards in one row that end apart, where a column of cards
stacked with the gutter counts as one block (`ragged-row`); a blank band inside a card of over 40px,
or over 64px before a new section's heading (`panel-void`); icons in tinted squares; numeric alignment and tabular figures; chart hues; colour
share, and a screen with charts but no hue on its data (`no-data-hue`); placeholder data; text under
11px; and the page rules that still hold (contrast, gradients, the banned palettes, emoji). Fix every
`FAIL`. Treat each `WARN` as wrong unless you can defend it to a designer in one sentence.

Then look at the screenshots, every width, and answer these in writing. This is the critique for an
app screen: the caps in `critique.md` for pictures, motion and the page's live element are page rules
and do not apply here.

1. Is the screen's question answered by the biggest thing on it, and is that read first? Is the
   largest figure the one that answers the title row's sentence?
2. Does every block share the screen's edges? Is there a dead strip on one side, a card stopping
   short, an orphan cell, a stretched card with a blank band (a legend pinned to its foot, four rows
   in a card kept at its neighbour's height)?
3. Is colour only on data, on status and on the one primary action, and does the main data element
   carry the one hue? Does the face you chose show on the first screen?
4. Do the numbers add up, and do they line up digit for digit? List every fact that appears twice
   and check that the copies agree; recompute each total and change from the values as displayed;
   check that every relative figure names what it is against.
5. Does every zero look like a zero and every missing value like a dash? Does every count badge sit
   on a queue that needs action, with its noun clear from the label?
6. Does every legend swatch match the mark it explains, and does any caption have to say which bars
   are which (then encode it in the chart)? Does any label collide with a line or another label?
7. On the phone, is the navigation folded away, and does each block still answer its question?

Fix the worst three, inspect again, look again. Three rounds at most. Judge the pictures: if a problem
shows in a screenshot, it is real, whatever the code says.

### 2.8 Report

Tell the user, briefly: the style dealt (name and seed) and any redraws with their reasons; the face
you chose and the signature element; each screen's one question; any check you allowed and why (for example `--allow icon-chips` for node-type
tiles in a builder); and the sample data that must be replaced with real data, listed so it can be
found.

App screens have no motion floor. Motion is feedback: press, hover, focus, a menu or a sheet opening,
a row arriving. Nothing on the screen performs an entrance (house rule).

## 3. The shell

### 3.1 Five archetypes

| Shell | In the study | What it is |
| --- | --- | --- |
| **Open plane** | 5 screens | A labelled sidebar on the page ground (or within 1-2% of it), separated by nothing or by one 1px hairline. No top bar: the header and the cards sit on the ground. The canvas is fluid with a 24-64px gutter, or a centred column. |
| **Tinted frame, white sheet** | 8 screens | Sidebar and top bar share one tinted ground (#f6f6f6-#f9fbfc) with no rule between them; the page sits on a white sheet inset 8px from the window's right and bottom edges, radius 10-16 (median 16), a 1px #eaeaea-#ededed edge and no shadow. Variants: a flush L-frame, the inset sheet, and floating panels inset 8-12px with a 12px gap. |
| **Ruled T-frame** | 4 screens | A 210-240px sidebar and a 64px top bar on one ground, divided only by 1px rules. The workspace switcher sits at the top bar's right end behind a full-height divider. Three of the four are dark. |
| **Icon rail** | 3 screens | An unlabelled rail 50-60px wide (median 55); 15-18px icons on a 34-49px pitch; the active item marked by colour or by a 2% tint band; groups split by 20px hairlines. It saves about 180px of width. |
| **No sidebar** | 3 screens | A 46-48px top bar over a centred 1088-1208px column with 152-212px gutters; the logo sits on the column's left edge. For reports, viewers and products with few destinations. |

All six dark screens use one ground everywhere, divided by 1px rules of #161616-#232323 or by nothing.
No screen in the study puts a dark or saturated sidebar against a light canvas (0 of 17).

### 3.2 Sidebar

- **Width.** Labelled sidebars run 210-292px; the median is 230 and most sit at 224-240. One floating
  sidebar card appears (280px wide, 40px in from the window edge).
- **Rows.** A 32px hit area on a 34px pitch is the mode (7 screens); the roomy versions run 40-52px on
  a 42-60px pitch. Icons are 14-20px, median 16, outline at about 1.5px stroke on 14 of 16 screens.
  Labels are 14px at 400 on 12 of 16, in ink or in a grey of #4b4d4f-#63666e, about 8-10px after the
  icon, with the label column at x 36-48.
- **Active item.** A neutral grey pill with the label unchanged, on 8 screens: radius 4-16 (median 8),
  inset 8-14px from the sidebar's edges, a fill of about #e9e9e9-#ededed. On dark, brightness alone:
  the label goes from #bbb to #fff (3 screens). Colour alone on the icon or label (3, all of them
  rails or a floating card). A tinted accent fill (3). A left accent bar once in 23. The weight
  changes on 2. Default: the grey pill on light, brightness on dark.
- **Groups.** Sentence-case grey labels at 12-13px, never uppercase (9 screens), with 22-56px of air
  above and 13-33px to the first item; or hairlines instead (4). Utilities such as settings and help
  pushed to the bottom (5).
- **Top and bottom.** The workspace or account switcher at the top of the sidebar (7 screens), at its
  bottom (2), or in the top bar. The bottom holds a user row (8) or one upsell (8); one of those
  upsells is a filled accent button.
- **The product is named** (house rule, from testing). The product's mark and name sit at the top of
  the sidebar or rail, and the scope (workspace, team, project, account) is shown as a switcher or a
  breadcrumb. A screen whose product cannot be named from the screenshot reads as a template.
- **Counts on nav items** (house rule, from testing). A count appears only on a queue that needs
  action, and its noun is clear from the label: "Requests 5", "Price changes 3". A bare "Range and
  prices 9" left the judge asking nine of what.
- **Labels by default.** A labelled sidebar unless the product has five destinations or fewer and the
  screen needs the width (a research or monitoring view); an icon rail always carries the product's
  mark at the top, a tooltip and an accessible name on every icon. Nav items are other screens, never
  anchors into the current page (a sidebar that scroll-spies one long page was marked down twice).

### 3.3 Top bar

14 of 23 screens have one; the default is none. Heights fall into two groups: 44-51px (median about
48) on light chrome, and 64px, usually with a 1px rule. A top bar must hold something real: search,
the workspace switcher, or the page or object name. Search sits centred on the window at 548x32 with
a shortcut hint (2 screens), or at 457-537x36 in a no-sidebar bar. The right cluster is inset 24-46px
from the edge. Two screens leave about 1070px of their top bar blank; both are flagged for it.

### 3.4 Right rail and pinned columns

One screen has a right rail: a fixed 384px column in a `1fr 384px` grid with a 24px gap, starting
level with the first card rather than with the title, its section headings outside the cards and 8px
above each. Use one only for a stable secondary stream: recent items, the details of the selected
object, share links. A pinned left column appears once: a 306px accounts card at the viewport height
minus 72px, so net worth stays in view while the rest of the screen scrolls.

Five screens float a button (24-56px), and one of those buttons covers the content it sits on and is
flagged. House rule: no floating button unless it is the screen's one primary action and covers
nothing at any width.

## 4. The canvas and the page title

### 4.1 Width and gutters

- **Fluid** (14 screens): side padding 17-64px, median 29, with 24 and 36-40 the common values;
  content 1120-1312px wide, median about 1204.
- **Centred** (8 screens): 624, 864, 1088, 1100, 1152, about 1190 and 1208px; median about 1126.
  Data pages land at 1100-1250 either way. Only two personal homes go narrow (624 and 864), and both
  are flagged for wasting the width.
- **Top offset**, from the canvas top to the title: 20-88px, median about 36. Tools sit at 20-36;
  greeting homes at 50-88.
- **One gutter.** Use one gap value horizontally and vertically. Mixed gutters (12 against 16, 20
  against 24, 16 against 12) are flagged on 8 screens.

### 4.2 One left edge, one right edge

The strongest screens run a single left edge from the header to the last row. One indents its page
header by the cards' 24px padding, so the title, the card titles, the numbers and the chart all start
on one line. Row rules may bleed 7-8px past the text column while the text stays on it.

The grid's arithmetic closes: 3 x 372 + 2 x 17 = 2 x 568 + 16 = 1152; 12 x 77 + 11 x 16 = 1100;
4 x 144 + 3 x 16 = 624; a second-row card exactly as wide as the two cards above it
(251 + 24 + 515). Write your sum down.

Failures to avoid, all from the study: cards stopping 120px short of the sheet's right edge; a 0px
right gutter against a 40px left one; a column centred on the window instead of on the area beside
the sidebar (204px on its left, 444px on its right); a medallion 108px off the column's axis. The
inspector warns when the content stops well short of the right edge.

**Dead space from a grid that does not fit the data** is the commonest failure in the study (10
screens): four KPI tiles in a three-column grid, orphaning the fourth; one card alone in a
three-column row beside 810px of nothing; a card stretched to its neighbour's height with 250px of
blank under its legend. Choose the column count from the number of items, let a lone card span, and
do not stretch a card's frame over empty space.

**Cards that share a row share a bottom edge.** In testing, rows whose cards stopped 26-190px apart
were marked down every time, by judges and by the inspector (`ragged-row`). Balance the row by its
content first: move a list's rows so the two columns hold the same number, cap both lists at the same
count, or pair blocks of similar height. Two cards stacked in one column beside a tall card count as
one block: they balance when the column ends level. Only when the contents cannot balance, stack the
two blocks, or let the shorter card fill the row height with its content top-aligned and the footer
action (a "View all", a total) pinned to its bottom so the extra height is not a hole.

**A stretched card stretches only when it has content to fill.** Only an action or a total may be
pinned to a stretched card's foot; a legend or a note stays directly under its chart. In testing, a
cover card stretched to its neighbour with its legend pinned to the bottom left 60px of blank under
the last row, and a sell-out card left 45px above its links. When the content is short, let the card
keep its own height (`align-items: start` on the row), move its footer link into its header, or give
the row a block of similar height. A filtered block shrinks to its rows, or keeps a fixed number of
rows with one sentence in the empty ones; four rows over 270px of empty card is a hole. The inspector
warns on a blank band of over 40px inside a card (`panel-void`).

**Narrow blocks do not span the canvas.** A table of five columns or fewer, or a list of six rows or
fewer, runs to about 760px at 1440 and pairs with the next block; stretched to 1300px it leaves
400-600px voids between a name and its first figure.

### 4.3 The title

- **Every screen has one h1**; the inspector fails a screen without one. 14 screens set it in the
  canvas at 18-48px, median and mode 24, at 600-700 (700 on 8). The rest have nothing over 16px: a
  breadcrumb or the top bar names the page. Then the breadcrumb's last item is the h1, at 16px, and
  the screen's name is still the first thing read.
- **A noun, not a greeting**: "Analytics", "Overview", the project's or the object's name. 3 of 23
  greet, and one adds an emoji, which goes. A greeting suits a personal or team home only.
- **An optional second line**: one 14-16px grey sentence about the data or the object (the finding,
  the period, the scope), never about the interface ("the filters narrow every block…", "this page
  shows…" read as instructions, not a product), or a 12px line
  naming the data's source.
- **Right of the title**: actions only when they are real (10 screens); otherwise nothing. A freshness
  stamp ("Updated Jul 27, 4:09 PM", with a refresh button) on 6.
- **The primary action.** 12 of 23 have no filled primary button; 5 make it near-black (#1d1f20,
  #1f2937) or inverted white on dark; 4 fill it with the brand hue. One primary per screen.

### 4.4 Tabs, filters and the date range

- **The date range** at page level (7 screens) or on each card (7), never both. A card that states its
  own period puts it in its header, right-aligned, in grey.
- **Underline tabs** (8 screens) always sit on a full-width 1px rule; the indicator is 1-4px (median
  2), as wide as the label or running 8-11px past it.
- **A segmented track** once: 48px, #f3f4f6, a white 36px active pill, and the date select inside its
  right end, so tabs and range read as one row. A segmented control is as wide as its options, and full
  width only below about 480px: three options spread across a 680px tablet card read as a progress bar.
- **Control height** in title and filter rows: 28-40px, median 34, clustering at 32 and 36.
- **Order**: scope on the left (the date first, then the filters), utility and refresh on the right.
- **Compound filters** that read as a sentence ("Date | Jun 14 - Jul 13 | Daily"), 28px tall and 8px
  apart, once.
- **To the first card**: 13-64px, median 24.

## 5. KPIs

- **No tile of its own.** 11 of the 20 screens with headline numbers give a KPI no tile: bare text on
  the page or on a card (5), or one container split by 1px hairlines (6). 9 use one card per KPI,
  61-147px tall (median about 108). The default is one container split by 1px dividers into equal
  columns. 7 screens have no KPI row at all and put each headline number in the card that explains
  it, which is often better.
- **Count.** 1-6 per row, median 3-4. The count matches the grid: four KPIs get four columns.
- **Size.** Values 16-40px, median 26, mode 24. Values in their own tile run larger (median 30) than
  in a shared strip (median 24). Nothing at 48px or over. Labels 12-16px, median 14; the value is
  about 1.7 times the label.
- **Weight.** An even split: 400 on 8 screens, 600 on 6, 700-800 on 6. A large number at regular
  weight under a semibold label is the common pattern. Bold for money only.
- **Order.** Label above the value on 14 screens; labels grey (#6b6b6b-#aaa) on 13; sentence case.
- **Nothing else.** No icon in a coloured circle (0 of 23), no sparkline (0 of 23), no tinted tile.
  An info icon beside the label is fine (5 screens). Units are a smaller grey suffix: "5 mins" at 24
  over 14, "2 m 24 s", "5 /10".
- **The answer figure leads.** When one figure is the screen's answer (a balance, net worth, the
  portfolio's value), it is 30-36px and at least 1.3 times its sibling figures (those at 18-24px). In
  testing, a 24px portfolio value beside two 24px figures left the screen without a lead. No other
  figure on the screen is larger: the biggest number answers the title row's sentence, so a
  secondary ratio in another card stays at the siblings' size.
- **One figure, one place.** A figure shown in the strip is not repeated in a legend beside it, and a
  KPI strip whose every cell names a panel below (RSVPs, then an RSVPs panel) is dropped: lead each
  panel with its own number instead.
- **A second job.** KPIs may be the chart's series tabs or the list's type filter (the selected card
  takes a 1.5px border). As tabs, the selected one carries a 2px rule or the active fill and an ink
  label; the others keep a grey label and their value in ink, at 400 against the selected one's 500.
  A grey value reads as disabled: in testing, three shops' takings set in grey because they were tabs
  read as secondary, though they were the brief's first ask. When the tabs are the per-entity
  breakdown the brief asks for, grey nothing and let the rule alone mark the selection. On a phone the
  tabs become a 2-up grid with the selected cell filled, or a row that scrolls sideways; never an
  underline floating inside the grid (`app.css` does both).

### Deltas

- Optional: 9 of the 20 KPI screens show one; 11 do not.
- 10-15px (median 14), never larger than the label. Text or a small glyph on 6 screens; a pale pill
  on 3.
- **The window in words**: "vs prior 30 days", "in the last 90 days", "from 0 (last 4 weeks)" (7 of
  the 9).
- **Colour only the number**, or set the whole delta in grey.
- **Colour says good or bad, not up or down** (house rule, from testing). Every metric has a good
  direction: latency, error rate, cost, churn and time-to-reply are better when they fall. A change
  in the bad direction puts `--negative` on the number (or a small down-pointing glyph in that
  colour); a change in the good direction is `--positive` or grey. A judge read a 2.5× rise in errors
  set in the same grey as a rise in visits as hiding the screen's only bad news.
- **Zero or undefined change is grey.** The study's commonest KPI failure is a zero or undefined change
  shown as a signal: three identical green "up 100%" pills grown from zero, a ">999%", a bold red
  "0.00%", a green "+0". When the prior period was zero, write "+4 (new)"; when there is nothing to
  compare, a short grey dash where the delta would be.

## 6. Charts

### 6.1 Which chart for which question

| Question | Form | In the study |
| --- | --- | --- |
| Is it moving over time? | One line; an area only with a fill of 15% or less | 9 screens |
| How much per period? | Columns with square corners | 3 |
| How is it distributed? | A histogram with equal bins | 1 (its unequal bins are flagged) |
| Who ranks? | A sorted horizontal bar list, or the row's fill as the bar in a one-figure list | 3 |
| What share? | A thin ring, or a 100% stacked bar with 2px seams; five parts at most | 5 |
| How far to the target? | A progress bar, both ends labelled, the fill the true ratio | 4 |
| How much of the plan is used? | A track as long as the plan, the spent part filled, what is already committed as a lighter segment, an overrun past the track's end in the negative colour (`Charts.plan`) | house rule |
| Has it drifted from its target? | One row per part: the current share as a bar with a 1px tick at the target (`Charts.bullet`); never two stacked bars to compare | house rule |
| Where? | A map with a list beside it; the list carries the magnitudes | 1 |
| Per period, and the running total? | The two side by side at equal width, with the same dates | 1 |
| Which way did it flow, and how much? | Columns above and below one zero line on one scale, the axis signed and captioned on each side ("Sold" above, "Bought" below), a marked period in a second tone with its own legend entry (`Charts.diverging`) | house rule |
| Who is away when? | A timeline of people by day, each kind of booking its own mark (`Charts.timeline`) | house rule |
| Is there enough cover? | A team-by-day matrix of slack against the minimum (+2, +1, 0, −1), one hue ramping toward the negative colour, the headcount on hover (`Charts.matrix`) | house rule |
| When in the day, against last time? | One row per item on a shared opening-to-closing axis: a 2px grey track, an ink dot for today, a hollow tick for the comparison day (`Charts.timeStrip`) | house rule |

Three more, from testing:

- **The pair of per-period bars and the running total is used once per screen**, and only when the
  total crosses a line that matters (capacity, a target). Three such pairs in six charts read as one
  pattern stamped out.
- **A series that is flat except for one event** gets at most two-thirds of the width and about 140px of
  height, or a range capped at about twice its reference line with the off-scale peak labelled
  (`Charts.line({ max })`). A full-width plot that is 85% empty was the biggest block on a first
  screen and was marked down.
- **A forecast is not a fact**: after today the line is dashed and the end value is labelled
  (`Charts.line({ today, endLabel })`), with the gap to the target bracketed when there is one.
- **What the brief asks to see over time is drawn on the first screen.** KPI cells may switch the chart
  only between metrics the brief did not name.

When there are only a few numbers, draw no chart: four screens skip it, and the settings page links
to the analytics screen with "View more".

### 6.2 One question, one series

One series per chart is the norm; three is the most any screen draws. To show another metric, switch
it with a control (a segmented control, a dropdown, the KPIs as tabs) instead of overlaying lines.
Plots run 112-264px tall (median about 195) and 316-1136px wide (median about 570), an aspect of 1.8
to 5.2.

### 6.3 Axes and gridlines

- **Gridlines** run horizontally only on 7 of the 12 cartesian charts, both ways on 3, and not at all
  on 2. Use 3-5 (the study runs 3-7, median 4-5): 1px, solid, about #e5e5e5 on light (range
  #cfcfd2-#f2f2f2), #2b2b2b on #111. Dashed lines are allowed in chart grids (4 screens: 3/3, 4/4,
  3/2.5) and nowhere else on the screen.
- **No y-axis line.** The baseline is the one heavier line (2px on two screens, 1px on one); full axes
  on one.
- **Y ticks**: 4-7, median 5, at 11-16px (median 12) in grey (#5f5f5f-#6c6c6c), on the left (8
  screens) or the right (2). Round, even steps (0/5/10/15%; 0-600 by 150), the top tick above the
  maximum, integers for counts, and zero as the baseline for bars and counts.
- **Never without a scale.** Two screens draw no y-scale and show magnitude only on hover; both are
  flagged. So are uneven ticks (0/3/6/10), a 0.8 tick on a count, a top tick equal to the maximum so
  the line hits the plot's edge, and a cumulative axis that starts at 1.
- **Axis text no larger than the data.** 15-16px ticks beside 14px values are flagged as louder than
  the numbers.
- **X labels**: 4-8 per chart, flat, never rotated (40 degrees is flagged), the first and last pulled
  inside the plot, on one step all the way: a forced closing label after 14:00 on a 90-minute step
  left a short last gap that a judge measured. Choose a step that lands on the end (hourly from 08:00
  to 15:00) or leave the end unlabelled. Labelling only the two ends hides when things happened. Irregular dates on a
  categorical axis are flagged: time goes on a time scale.

### 6.4 Marks

- **Lines** 1-3px, median 2, in straight segments. Four screens smooth their lines, and one smoothed
  curve invents values between daily totals (flagged), so draw straight segments. No point markers,
  except a hover dot (8px on one screen).
- **Fill**: none on 7 of 10 time charts. At most a flat tint of about 14%, or a fade from the line to
  transparent over 150-200px.
- **Bars** have square corners (4 screens), or at most a 4px top radius with a square bottom on the
  baseline. Stacked segments are split by a 1-2px seam.
- **Colour.** One hue per chart. The accent touches only data on 8 screens, and data ink is under 3%
  of the pixels on most. Neutral series are fine and often better: a near-black line that turns pale
  grey after the cursor; a white line against a red one; signs instead of colour ("+$24,000,000").
  But the one hue, when the style has one, goes on the screen's main data element (today's series,
  the booked bars, the current period, the margin that breaks), not on a secondary chart or a delta:
  in testing, an all-ink screen with no hue on any of its data read as a kit.
  One subject keeps one hue across the screen: the same subscribers drawn pink in one chart and indigo
  in the next is flagged. Unrelated hues on one screen (three, five) are flagged every time. Status
  colours are for status. The inspector warns over four hues and fails over six.
- **Legends.** None for a single series (9 charts): the title or the dropdown names it. Otherwise five
  items at most, as a 5-8px dot with a 12-14px grey label in the card's header, or as a small table
  (dot, name, value, change) that makes the legend carry data. Never list a series that has no data
  (flagged). Every swatch is the mark it explains, scaled down: the legend dot is the line's colour,
  a hatched bar's swatch is hatched. A swatch drawn separately from the mark drifted from it in testing
  (a black outline with a red edge explaining a red outline); the helpers return the legend built from
  the same style object as the marks.
- **Rings** only for three to five parts of a whole that are not already listed beside them (a ring
  redrawing the spent, due and left figures of the tile next to it was marked redundant). Never
  labelled on the slices; the total sits in the centre or beside the ring. The
  screens noted for their rings use thin strokes: 3-5px on a 90-154px ring, 8px on 182px. Two others
  use 28 and 37px.
- **Progress bars** are 4-24px tall (median 8), fully rounded, with both ends labelled ("Skilled 200"
  and "Expert 2,000"); the fill is the true ratio, so 303 on that scale fills 22px of 392. A zero has
  no stub (a 6px stub at zero is flagged).
- **Tooltips** are bare text or a plain box without an arrow: label and value on one line.
- **Annotate the event that matters.** A step or a spike more than about three times the usual change
  gets a 1px marker and a 12px label naming its cause ("Deploy a3f09c1", "Newsletter featured");
  reference lines (a budget, an SLO, a start time) are 1px dashed with their label at the end. In
  testing, an unexplained jump was the first thing a judge asked about. `Charts.line`,
  `Charts.bars` and `Charts.diverging` take `annotations` and `reference`.
- **Labels never collide.** Annotation labels sit in rows above the plot, each beside the top of its
  own leader line, and no leader line runs through another label; the rows are reserved only when a
  label exists, so a chart without one has no dead band above it. The "Now" label of a forecast goes
  on whichever side of its line the series does not cross. Lay labels out after the fonts load, or
  the label set changes between loads (it did in testing). The helpers do all of this; give a label
  that may not fit a `short` form.
- **Use the helper, then extend it.** Draw charts with `assets/charts.js` and add what a chart needs to
  it, rather than writing new axis code: in testing, every chart written from scratch on a phone put
  its y labels on top of its line.
- **Short and empty histories are drawn honestly**: a flat zero line with one spike, missing bars for
  empty periods, no padded y-range, no "No data" picture. Do not give one point the screen's largest
  plot, though: a lone dot in a full-size grid reads as barren (flagged once).

## 7. Tables and lists

### 7.1 Rows

- Single-line data rows: 36-53px, median 45.
- Two-line rows with media: 56-92px, median 72. The pitch is the media's height plus 24-32px
  (48 + 24, 48 + 32, 50 + 30).
- Key-value and legend rows inside cards: 21-32px.
- In a two-line cell, line 2 sits about 21px below line 1 (19-23), one size smaller (12-14px) and
  grey. Two-line labels need a 40-44px pitch at least: on a 32px pitch a subline nearly touched the
  next row's name and the list ran together (house rule, from testing).
- Overview lists show 2-5 rows.

### 7.2 Header

- 11-14px, median 12, mostly regular weight, grey, sentence case (9 of the 11 headed tables). The one
  uppercase header in the study is flagged as louder than the data.
- **No fill band** (0 of 11) and **no rule under it** on 8 of 11. Where there is a rule, it is the
  strongest line in the table (#e5e7eb over #f3f4f6 row rules).
- Header row 36-40px.
- Numeric headers are right-aligned and flush with their values; a header that stops 15px short of
  its column is flagged. A header over a control aligns with the control it labels (centred over a
  column of steppers), and a delta beside a stepper gets its own narrow unlabelled column; three
  alignments in one header row were flagged.
- A sort glyph on the active column only.

### 7.3 Dividers

- **No zebra striping** (0 of 23).
- No row dividers on about half the lists; they rely on a 61-92px pitch or on 2-8px gaps between
  filled rows.
- When present: 1px, 3-7% darker than the surface (#ededed-#f4f4f4 on white; #161616 on #000,
  #1b1a1f on #131217).
- Extent: bleeding 8-9px past the text edge; starting at the text column and skipping the media; or
  the full inner width. Pick one per screen.

### 7.4 Figures and alignment

- **Numbers right-aligned**, in tabular figures or a monospace. Every left-aligned numeric column and
  every column of proportional digits in the study is flagged (durations "00:00:12" and "00:00:04"
  that jitter, cents that drift).
- **Fixed decimals per metric**: money 2, percentages 1 or 2, counts none. Thousands separators
  everywhere ("$16,531.54"); abbreviate only in a capacity line ("12.7k of 20.0k"). A sign on every
  change ("-$0.09", "+10,100 (+0.20%)"). No space after the currency sign (one screen's "$ 89.00"
  beside "$15.00" is flagged).
- **The identity column gets the most width**, about a third to a half of the table, and it is never
  the one cut off at desktop width: shorten names editorially first (drop the issuer every row
  shares, the share class, "Ltd") and use the same short name at every width.
- **One right edge per row or card**: every right-aligned figure inside a card or row ends on the same
  padding line (a days-in-stage figure 18px short of the value above it reads as a second edge).
- **Two measures stack in one cell** rather than taking two columns: a count over its 12px grey
  percentage, a date over its time, a money value over the amount in units, both lines on one right
  edge.
- **Dates** in ISO form and right-aligned where rows are compared ("2024-02-15"); in words for
  recency ("Today", "Yesterday", "6 days").
- **IDs** in a monospace at body size, truncated to about 8 characters with an ellipsis and a copy
  icon 12px after.
- Truncate to one line with an ellipsis; never break inside a word.
- **A breakdown in a narrow card** ("Headingley 6 · Chapel Allerton 5 · Meanwood 3") goes in fixed
  mini-columns, or each item is `nowrap` with its separator attached to the next item, so no line ends
  on a dangling "·".
- **An edited cell shows that it changed** (house rule, from testing). In an editable grid a changed
  value carries a mark (a dot, a tinted border), and the column header or a caption names the
  baseline ("vs the usual Monday"); a bare grey "+5" beside a stepper was read as noise.

### 7.5 Ink inside rows

- Only the identity and the key number get the primary ink; everything else is grey ("5" in ink,
  " /10" in grey).
- A missing value is a grey dash; a real zero is printed ("$0", "0.00%", "0% (0)").
- The sign lives in the text, not in the colour: income green with a "+", expenses in ink, no red on
  every negative.
- Link colour on the name cell only, with no underline.

### 7.6 Status pills

- 15-28px tall (median 20), text 9-14px in the study (median 12) at 500; nothing under 11px here. A
  full pill or a 3-5px tag.
- A pale tint with dark text of the same hue, optionally a 1px border one step darker: #dcfae5 with
  #04250e, #ffedea with #831c1e.
- Neutral states are monochrome chips with a glyph ("Public" with a globe).
- A state machine uses one hue at three intensities: grey for off, the full hue for the call to
  action, a dark tint for running. A saturated fill with white text only for that one call to action,
  and only while it is rare: when more than about a fifth of the visible rows carry it, it becomes a
  stripe of black blobs louder than the data (marked down in testing); use the pale pair or a 6px dot
  with an ink label instead.
- **One status mark per row.** A tag and a badge that say the same thing are flagged.
- **A chip is never squeezed.** Tags and pills are `flex: none; white-space: nowrap`: in testing a
  table column collapsed an environment chip to a 12px box with its word spilling out.

### 7.7 Media

16px logos in dense rows; 24-32px avatars; 48-50px in two-line rows. Circles for people, tokens and
companies; a 2-3px radius for artwork and flags; 8px for photographs. One fixed media slot down the
list so the text starts on one edge (a 50px slot with the text 16px after it). Media-to-text gap
10-16px, median 12.

### 7.8 Actions and paging

- **No pagination on an overview** (0 of 23). Cap the rows and link out: "View all" in the section
  header, a 30px outlined button under the list, a full-width 32px bar. State the total ("3 tracks").
- Row actions: none on 9 screens; otherwise one kebab at the far right. Reserve a trailing action
  column only when most rows carry the action; otherwise the action is an ink text action on the
  row's second line and the figures stay flush to the card edge. When a row needs doing
  (a bill to pay, an order to pack, a failed deploy), its action is a visible ghost button or an ink
  text action in one fixed trailing column, at the same pitch for every row; never muted grey text,
  and never stacked under the amount so the rows change height.
- Checkboxes only where bulk actions exist (one screen: 18px, 2px stroke, 3px radius).
- Hover and selected: a 1px outline at 6px radius overhanging the panel by 1px, or a darker border
  with a 1px ring. No hover that changes the fill was seen. In a list that drives a detail pane (an
  inbox, a queue), the selected row takes the `--active` fill of the nav pill instead, so it cannot be
  mistaken for a focus ring or a hover (house rule, from testing).
- Toolbar: one search, 30-36px tall (256x30, 252x36, 316x32).
- **A full list screen** (house rule; the study has none): state the total above the table, keep the
  header row in view while scrolling, and page or load more at the end with the range shown
  ("1-50 of 1,284").

### 7.9 Lists that carry data

- **The row fill is the bar**: the row's rounded background (radius 8) as wide as its share of the
  largest share; 44px rows, 2px gaps. Only in a one-figure ranking list (a label and one value): in a
  row with several columns or two lines, the fill's edge cuts through the words (failed in testing).
  Planned against spent is a separate 6-8px track under the label (`Charts.plan`).
- **Bar list**: a 64px pitch, a label line, then a 10px pill bar with the value 5px after its end; the
  longest bar about 88% of the width; one colour, no track.
- **Inline bars in a list are thin and grey** unless they are the screen's main series: 2-3px at
  most. A ranked list of money in a narrow card carries a 2px proportional bar under each label, grey
  with the top item in ink (`Charts.barList(el, rows, { thin: true })`), so "most costly first" is
  seen and not only read. In testing, six 4px black bars were the loudest marks on the screen.
- **A timeline draws its comparison.** When the brief asks "against last Sunday", the comparison is a
  mark on the same axis (`Charts.timeStrip`: an ink dot for today, a hollow tick for the comparison
  day), not only a line of text.
- **Legend as table**: dot, name, pill, value and change on a 57px pitch.
- **Key-value well**: a tinted well, radius 8, 32px rows, label left, figure right.
- **Feed as row cards**: 63px tall, 8px gaps, radius 14, a fill one step lighter and a border one step
  darker than the panel, a relative date on the right.
- **Tree**: no dividers, 8px of indent per level, ink against grey by level, a pitch of about 30px,
  about 45px between groups.

## 8. Forms and settings

The study holds forms on three screens and one settings page, so this section rests on little. It is
enough for the defaults.

### 8.1 Fields

- **Label above the field**, 14px at 500, 8-10px gap. No floating labels and no placeholder standing
  in for a label.
- **Inputs** 38-40px in forms (radius 8-10); toolbar and filter controls 28-40px, median 32. One
  control height per context.
- Inputs stay white with a 1px #e5e7eb-#e8e8e8 border even on a grey panel; filter and select
  controls take a border one step darker (#cdcfcf-#d1d5db).
- A leading icon at 14px, 13px in from the edge, with the text starting at 38px.
- **Spacing**: 24px from a description to the first label, 16px between fields, 16px to the Save
  button.
- **A joined input and action** (a read-only link and its Copy button) share a border and square
  their inner corners.
- **Toggles** 28x16 to 33x20. The on colour is a semantic green or near-black, not the brand accent.
- **Disabled** controls stay legible and say why they are disabled: the study's disabled Save
  (#cecece on #f4f4f4, about 1.4:1) and its plan-locked panel at 30% opacity are flagged as
  unreadable.

### 8.2 Settings layout

- Each section is a row: a label column (about 450px: a 16/500 title and a 14px grey description)
  beside a panel (about 700px, #fafafa, radius 16, padding 16, no border, no shadow). The title's cap
  top aligns with the panel's first line, 6-8px below the panel's top.
- Sections are split by a full-width 1px rule with 32px above and below.
- A switch row: a 14/500 title, a status badge 8px after it, a 14px grey description, and the toggle
  on the right, 16px from the edge and centred on the title line.
- A plan-gated feature: a 48px tinted strip with a 32px button directly above the locked panel; the
  panel stays readable.
- Narrow containers stack: label, 10px, field, then 26px to the next pair.
- Do not leave the label column empty beside a tall panel (a 250px void is flagged): put the section's
  help or a summary of its current values there, or narrow the column.
- **Destructive actions** (house rule; none in the study) go last, in a section of their own, as a
  text or outlined button in the negative colour, with the consequence in words and a confirmation
  that names the object.
- **One view per area** (house rule, from testing). When settings span several areas (general,
  members, billing, notifications), each sidebar item opens its own view (a hash route is enough in
  a static build), with the area's name as the h1. One long page of every area, with the sidebar
  scrolling to anchors, put the first area the brief named four screens down and was marked down.
- **One save model per view**: every control saves itself and shows a quiet "Saved" stamp, or one
  Save per panel at the panel's bottom right. Never a mix of both on one view.
- **Show what the setting produces.** Beside the control that changes it, a small preview of the
  result (the invite email, the notification as it will arrive, the plan's next invoice) is the
  product-specific substance a settings screen otherwise lacks.
- A settings view opens with a usage strip only when usage is its question (a plan or quota view),
  and its figures stay smaller than its h1.

### 8.3 Buttons

Controls run 27-40px tall (median 34; 32 is the commonest), with a 6-8px radius in the tight styles
and full pills in the soft ones. One filled primary per screen, usually near-black; a secondary is
white with a 1px border; a tertiary is text. The controls in one row share one height.

## 9. Type and colour

### 9.1 Type

- **One grotesk.** All 23 screens use a neo-grotesk, and 14 use that one family alone. A second face
  always has one job: a monospace for every number or for IDs only, a serif for one greeting, a brand
  face kept to the wordmark or the switcher. Never three. Axis ticks, chart notes and labels stay in
  the text face even when IDs are in a monospace.
- **App type is not display type.** The h1 stays at 18-32px and no figure reaches 48px: in testing, a
  50px serif title and a 76px balance made a budgeting screen read as a landing page (the inspector
  warns at 34px and 48px).
- **Sizes**:

| Role | Range in the study | Median |
| --- | --- | --- |
| Page title | 14-48 | 24 |
| KPI value | 16-40 | 24 |
| Card title (500-600) | 14-24 | 16 |
| Body, nav, cells | 13-16 | 14 |
| Labels, meta | 11-14 | 12 |
| Axis ticks | 11-16 | 12 |
| Pills, badges | 9-14 | 11-12 (house floor 11) |

  A screen uses 4-9 sizes, median 6. The cleanest scales in the study are 12/14/18/24, 12/14/16/30
  and 12/14/16/24.
- **Weights**: a median of 3 per screen; 10 of 23 never go above 600; 700 does one job per screen
  (money, the greeting or the title).
- **Figures**: tabular on every number in a table, in a KPI, or anywhere it updates. Check that the
  face really has tabular figures: `font-variant-numeric: tabular-nums` must change its digit widths;
  if it does not, take another face.
- **Case**: sentence case on about 19 of 23; uppercase content labels on 4 only. Tracking 0, and
  negative only on large type (-0.02em at 32px). Line height 20px for 14px text, 24px for 16px.
- **Dark** screens set body at 13px on three, and titles at 18-20/600 or 26-28/700.

### 9.2 Colour on light screens

- **Ground models**: white cards on an off-white ground (10 screens; #f3f5f7 to #fdfdfd, median
  #f9f9f9-#f9fafb); grey panels on white (6); a framed sheet (7).
- **The sidebar is never dark or saturated** (0 of 17): it matches the page, sits 1-3 levels off it,
  or is white on a grey page.
- **Lines in three steps.** Card edges median #eaeaea, the working band #e5e7eb-#ededed (about 1.2:1 on
  white). Row rules one step lighter, #efefef-#f4f4f4. Control borders one step darker, median
  #d1d5db. #cbcecd on cards reads heavy; #f5f5f5 disappears.
- **Text in three tiers.** Primary about #111 (range #000 to a tinted #272446). Secondary about #606060
  (#3a3b3b-#8e8e8e). Tertiary in the study runs #969696-#9f9d9b and placeholders #9ca3af-#b0b2b6,
  which is 2.5-3:1 on white and under the house floor. House rule: every tier that carries words
  reaches 4.5:1 on the surface it sits on, placeholders included; #6b6b6b is about the lightest grey
  that holds on white and on #f9fafb.
- **Accent placement**: on data only with greyscale chrome (4 screens), on actions only (2), or no
  accent at all (2). The primary button is usually near-black. Every screen with more than one accent
  family is flagged.
- **Status**: positive greens in the study run #16a34a-#40a670, which is under 4.5:1 as text; use a
  darker green such as #247b50 (5.2:1) for text, and the pale pairs for pills: positive #dcfae5 with
  #04250e, negative #ffedea with #831c1e, a notice #fffbeb with a #fde68a border and #92400e text, a
  count badge #c4242a-#dc3532.

### 9.3 Colour on dark screens

- **Ground**: #000 (3 screens), #111 (2), #171719 (1). No navy and no slate.
- **Surfaces**, three ways: a lighter step with no border (#111 on #000, nested panels at
  #222-#2a2a2a); the ground's own fill with a 1px line (#2e2e2e on #111); darker than the ground with
  a soft shadow (once: #131217 on #171719 with 0 12px 28px rgba(0,0,0,.2)).
- **Lines**: structural lines 22-31 levels above the ground (#1a1a1a on #000, #2e2e2e on #111,
  #222224 on #171719); interactive outlines brighter, #373737-#4c4c4c, so an outlined button reads as
  clickable without a fill.
- **Text**: #fff; secondary about #aaa (#82848a-#bbb); tertiary about #888. #4c4c4f (about 2:1) is
  flagged. The house floor of 4.5:1 holds here too. Two greys at most, and far enough apart to read
  as two: about #b4b4b4 for secondary text and #949494 for meta (in testing, #aaaaaa, #969696 and
  #bbbbbb on one screen read as one grey used three ways).
- **Accent** on data only, or on one selected state. Active nav by brightness. Emphasis without
  colour: an inverted white pill, a grey-filled button (#212121), an outline.
- **Status** as a hue on a dark tint of itself: #3fc07a on #172a1d; #44a282 on #1b2828. **When the
  accent is green or yellow-green, `--positive` is the accent** (a lime accent: lime on a dark lime
  tint), or the sign carries the meaning in neutral ink; a mint "+£3.81" beside a lime "Sold" read as
  two greens. The same holds on light screens.
- **Colour share** at or under 3% on all six.

### 9.4 Surfaces, radius, icons, spacing

- **Edges.** A 1px border separates surfaces on 12 of the 17 light screens; three use a fill step
  alone and one a shadow alone. A border or a shadow, never both. The shadows that exist are faint
  (alpha .06 or less at 0 2px 8px; once 0 1px 4px at .12). Real shadows are for what floats: a menu,
  a popover, a tooltip, a composer.
- **Radius is bimodal**: tight, 4-8px (9 screens, plus square cards on one), or soft, 16-24px (10);
  11-12px on only 3. Controls follow the cards: 6px with tight cards, full pills with soft ones.
  Nested radii step down (20, 10, 8, 5, 4). The inspector warns over three panel radii.
- **Group, don't box.** A set of KPIs is one card split by 1px dividers, or a bare strip with 48-52px
  vertical dividers.
- **Icons**: outline on 22 of 23; nav icons 14-20px (median 16) at about 1.5px; inline icons 12-14px;
  about 10px to the label; grey (#454545-#73737f in a light nav, white or #81858a-#999 on dark). Never
  in a saturated circle (0 of 23). A container, if any, is neutral (a #f0f0f0 disc) or codes a node
  type in a builder.
- **Spacing** on a 4px base: card gap 6-24px (median 16); card padding 12-34px (median 20); section
  gap 24-64px; control height 27-40px (median 34).

### 9.5 Default tokens

Each style in `library/app.json` carries its own tokens. These are the study's medians for anything a
style does not set, with the greys moved to pass 4.5:1.

The names match the sheet `draw.mjs --app` prints and `assets/app.css`, a neutral start set to these
defaults (shell, title row, panels, the divided KPI strip, tables, pills, controls, tabs, empty states
and the phone fold). `assets/charts.js` draws the charts of §6 in SVG from your data (line, bars,
diverging columns, ring, bar list, plan, bullet, timeline, cover matrix and time strip), with these
rules built in and its colours read from these tokens.

```css
:root {
  /* light */
  --ground: #f9fafb;  --surface: #ffffff;  --raised: #f9f9f9;  --active: #eeeeee;
  --border: #e8e8e8;  --rule: #f2f2f2;     --control: #d1d5db;
  --text: #111111;    --muted: #5f6368;    --faint: #6b6b6b;    /* placeholders use --faint */
  --primary: #1d1f20;                      /* near-black fill, white label */
  --accent: /* one hue, about 3% of pixels: the data, plus at most one control */;
  --positive: #247b50;  --pill-positive-bg: #dcfae5;  --pill-positive-ink: #04250e;
  --negative: #c4242a;  --pill-negative-bg: #ffedea;  --pill-negative-ink: #831c1e;
  --pill-warning-bg: #fffbeb;  --pill-warning-ink: #92400e;  /* notice border #fde68a */
  --grid: #e5e5e5;  --chart-span: 0.06;  /* the opacity of a shaded span in a chart */

  --radius-card: 8px;  --radius-control: 6px;  --radius-chip: 4px;  /* soft styles: 20 / 14 / 999 */
  --gap: 16px;  --card-pad: 20px;  --pad: 24px;
  --nav-row: 34px;  --control-height: 32px;  --row-height: 48px;
  --font: "Inter", system-ui, sans-serif;                            /* one grotesk */
  --fs-title: 24px;  --fs-section: 16px;  --fs-kpi: 24px;  --fs-body: 14px;  --fs-small: 12px;
}
:root[data-theme="dark"] {
  --ground: #000000;  --surface: #111111;  --raised: #222222;  --active: #222222;
  --border: #1a1a1a;  --rule: #161616;     --control: #444444;  /* on a #111 ground the border is #2e2e2e */
  --text: #ffffff;    --muted: #b4b4b4;    --faint: #949494;  /* two greys that read apart */
  --primary: #ffffff;                      /* inverted: white fill, black label */
  --positive: #3fc07a;  --pill-positive-bg: #172a1d;  --pill-positive-ink: #3fc07a;  /* a green accent replaces these */
  --negative: #e5566f;  --pill-negative-bg: #2c1a20;  --pill-negative-ink: #e5566f;  /* the study's #d4405d, lifted for 4.5:1 */
  --grid: #2b2b2b;  --chart-span: 0.12;
}
.num { font-variant-numeric: tabular-nums; }
td.num, th.num { text-align: right; }
```

## 10. Density

- The studied screens hold 6 to about 120 data points, median about 25.
  - **Sparse** (6-25): homes, settings, a single object. Card padding 20-24px, rows 56-92px, body
    14-16px.
  - **Medium** (25-50): analytics overviews, finance homes, list screens. Rows 44-56px, padding
    16-24px.
  - **Dense** (about 120, one screen): research and monitoring, read in long sessions. A 13px body,
    28px list rows and 42px table rows, framed with generous air: 100px gutters, 64px between bands,
    32px of card padding.
- Density is three settings moved together: row pitch, padding and type size. Do not shrink the type
  and keep the padding.
- **Placed space reads as calm; leftover space reads as unfinished.** In the study, emptiness looks
  deliberate when it comes from a fixed grid and repeated gaps, and accidental when it comes from a
  grid that does not fit the data, a column that is empty in every row (a 300px dead band), a mostly
  empty top bar, or a card stretched to its neighbour's height.
- **Design for the data the account has as well as the data it will have.** Several studied screens
  were built for a busy account and show a new one: a 673x240 plot for a line that sits on zero for
  two thirds of its length. Keep the honest drawing, but size the block to the question, not to the
  data the product hopes for.

## 11. Empty, zero, loading and error states

- **A real zero** is printed in the normal style: "$0", "0", "0%", "0.00%", "0% (0)" (10 screens). A
  zero may be dimmed to grey when the caption beside it becomes the next step ("$0.00", then
  "Automate your savings with up to 3.50% APY").
- **Missing or not applicable** is a grey dash: an em dash, a "-", a 6x2px mark. Never a dash at full
  value size: "--" at 24px reads as loading (flagged).
- **Counts follow the view, and so does the frame.** Counts shown in scope (tabs, KPI tiles, "12
  open") are computed from the rows in the current view or filter and recomputed on every switch. A
  filtered block shrinks to its rows and its row-mate aligns to the top, or the block keeps a fixed
  number of rows with one empty-state sentence; each view's subline is computed for that view.
- **An empty side card fills with the reference data**, not one dashed box in 400px of white: before
  anything has sold out, last Sunday's sell-out times as a quiet list under "Nothing has sold out yet
  today".
- **Red is a signal, not a texture**: one red mark per object at most, on the overdue or failing fact;
  thirteen red strings on one board read as noise, and a list of deals needing attention does not
  repeat the same flags on the board beside it.
- **An empty section keeps its frame and its header** and adds one sentence spanning the block (in a
  row grid, `grid-column: 1 / -1`; a message squeezed into one 34px column broke word by word in
  testing): a 1px dashed box, radius
  8, about 38px tall ("No channel usage in this range."), or a bordered box with an add link
  ("+ Liability account"). In a builder, an empty slot is a dashed 1px box on the canvas colour.
- **An empty chart is drawn**: the zero line, missing bars for empty periods, no padded range, no
  picture.
- **First run** (the whole screen empty): keep the frame and the title, and put the first action where
  the data will appear, with a setup progress at its true percentage if there are steps (one screen
  shows "Complete your setup" at 67%; another a four-cell getting-started strip above its tables).
- **Loading** (house rule; not in the study): the final layout with each value replaced by a flat grey
  bar at its real size (a 24px value gets a 24px-tall bar; rows keep their pitch), labels and headers
  shown at once, no shimmer gradient, and no shift of the layout when the data lands. A refresh of
  data already on screen keeps the old values and updates the freshness stamp.
- **Error** (house rule; not in the study): inside the block that failed, never as a full-screen
  banner. One sentence saying what failed and when the data was last good ("Couldn't load
  deployments. Last updated 09:14."), and a Retry text button. The negative colour only on a small
  icon or in the pill pair.
- **Stale or static data**: a freshness stamp with a refresh button (6 screens). A snapshot that
  cannot refresh says so in one quiet notice (once: #fffbeb, a 1px #fde68a border, 12px #92400e
  text). A notice tint is never a ground; the inspector reads a pale amber ground as cream.
- **Limits and usage**: a bar at the true ratio with both ends labelled ("12.7k of 20.0k").

## 12. The phone

The study has no phone screens. This section is house rule, built from the skill's phone rules
(`layout.md` §9) and from what the desktop screens imply. The inspector fails a sidebar that still
takes more than 30% of a phone's width.

- **Navigation folds.** The sidebar becomes a 48px top bar with the screen's name, a menu button that
  opens a full-screen sheet (nav, workspace switcher, account) and at most one action; or a bottom
  bar of four or five destinations with short labels. An icon rail becomes that bottom bar.
- **Margins** 16-20px; touch targets at least 44px tall; data and labels at 14px, sublines no smaller
  than 12px.
- **The title stays**, at 20-24px. Header actions move into a kebab, except the one primary.
- **Filters** collapse into one row of chips or a Filters sheet; tabs scroll sideways inside their own
  row, never the page. The first list row starts in the top 60% of the phone screen: three rows of
  filter controls above it pushed the list off the first screen in testing.
- **KPIs**: a divided container becomes a 2-column grid, or a list with the label on the left and the
  value on the right. Never four squeezed columns. In a 2-column grid the count after any full-width
  lead is even; otherwise use three narrow columns or a divided list, or let the last cell take the
  full width (`app.css` does that for an odd count). A lone "Sold 3.18 kWh" beside an empty half-row
  was flagged.
- **At most one row of controls above a chart**: an office select and a week switch share one row.
  Two stacked full-width segmented controls pushed the data down in testing.
- **Charts** go full width, 160-200px tall, with 3-4 x labels and a legend of dots above, set in a
  2-column grid (or behind a "Key" disclosure) when it would wrap to three lines. The y ticks keep
  their own lane at the left (or move to the right edge); a tick label never sits on the line.
- **Row actions on a phone** are text actions or one compact trailing button, with one filled bulk
  action for the list ("Approve 3 that fit"); five 44px grey Approve blocks turned a list into a stack
  of buttons.
- **When a strip collapses, drop the item least relevant to the screen's main action**, not the last
  in source order: the live price stays on an energy screen whose plan depends on it.
- **Tables become lists of two-line rows below about 640px**: the identity and the key number on line
  1, the other fields the brief names in 13px grey on line 2 ("fra1 · 1m 38s"), the one action at the
  right. Fields move to line 2; they are never dropped. A table that must stay a table scrolls inside
  its own frame with its first column fixed; the page never scrolls sideways.
- **The tablet (641-1100px) is its own band**: the sidebar folds to the top bar, but tables keep four
  or five columns with secondary fields as sublines, two narrow panels stack once either would be
  under about 340px, and the identity column is never the one truncated while another has room.
- **Blocks that carry an action move up, not down**: a right rail with an action (low stock and its
  Reorder, bills due and Pay) becomes a one-line summary row above the list ("5 items low · Review"),
  never a block under twenty orders.
- **Several panes** (a list and its detail, an inbox): one region at a time. Choosing a row pushes the
  detail; back returns to the list at its scroll position.
- **Settings**: the label column stacks above its panel.
- **A right rail** moves under the main column or into a tab.
- **Builders** show the work read-only, with the palette as a bottom sheet if editing stays.
- Check 390px in the inspector's screenshots every round.

## 13. House rules for app screens

The house rules in `SKILL.md` were written for pages that are read once. An app screen is read every
day, and part of what those rules ban is the structure of a working screen. These relax, with limits:

| Allowed on app screens | Limit |
| --- | --- |
| **1px borders** on cards, panels, tables and controls | About 1.1-1.3:1 against the ground on light (#e5e7eb-#ededed on white); #1a1a1a on #000, #2e2e2e on #111. Controls one step stronger. A border or a shadow, never both. |
| **Row rules** in tables and lists | 1px, 3-7% darker than the surface. No zebra, no header band. |
| **Dashed lines** | In chart grids and empty slots only. |
| **Small labels** above values | 12-14px, sentence case, grey at 4.5:1. Meta and axis text 11-12px. Nothing under 11px. At most one tracked uppercase label on a screen (a switcher's context label). |
| **Rows of identical cards** | Peer metrics or peer objects only: 3-6 across, equal widths, one gap, no orphan, edges aligned across rows, no icon on top. Prefer one divided card; mixed spans beat a uniform grid. |
| **Monospace** | IDs, keys and code; or every figure, as one style's decision. Otherwise tabular figures in the text face. |
| **Pills** | Inside rows and beside a value only: 16-24px tall, a pale tint with dark text of the same hue. Never above a heading. |
| **Index numbers** | Only as data: a rank ("1."), a node number. |
| **Icons** | 14-20px outline, one set, grey: in the nav, before a label, or as a single affordance (kebab, chevron, info). A container only if it is neutral, or node-type tiles in a builder (pass `--allow icon-chips` and give the reason in the report). |
| **Shadows** | On what floats: a menu, a popover, a tooltip, a composer, a dialog. A resting card gets at most a small blur under 8% black. |
| **A second typeface** | With one job: a mono for IDs or figures, a serif for one greeting. |
| **A gradient** | Only as an area fade under one line chart; a flat tint of about 14% is safer. |

Still banned, as on pages, and checked:

| Banned | Instead |
| --- | --- |
| Gradients on grounds, buttons, cards, text and KPI tiles (the study's two gradient buttons are flagged) | Flat fills |
| Glows, glass, backdrop blur | Opaque surfaces one tone step from the ground |
| An icon in a coloured circle or tinted square on every KPI or card (0 of 23) | A label and a number |
| Rainbow charts: more than four hues, a hue per bar, one subject in two hues | One hue per chart, neutrals for the rest |
| Sparklines on KPIs (0 of 23) | The trend in its own chart, or nowhere |
| Emoji in greetings, labels, nav or empty states | Words |
| Lorem ipsum, Acme, John Doe, "User 1"; vanity figures ("10,000+ teams"); totals that do not add up | Believable sample data computed from rows, listed in the report |
| Status colour on a zero or undefined change | Grey, or the change in words ("+4 (new)") |
| A dark or saturated sidebar on a light screen; a navy or slate dark theme | The page ground for the sidebar; true neutral darks |
| The accent on chrome: a tinted nav row with a left bar, coloured tab pills, a brand fill on every button | The accent on data and at most one control; a near-black primary |
| Uppercase tracked table headers, zebra rows, header bands | 12px grey sentence-case headers; rules or space |
| Left-aligned numbers, proportional figures in columns | Right-aligned tabular figures |
| A hero header, a greeting with an emoji, an illustrated welcome banner | A noun title at 24px |
| Pagination under a five-row overview list | Capped rows, "View all", the total |
| Violet and indigo accents; cream with terracotta | The dealt style's palette |
| A landing-page title (over 32px) or a figure at 48px or more | An 18-32px title; figures at 16-40px |
| Icons in boxes repeated down a list or on top of every peer card, tinted or neutral | One plain 16px icon where it helps, or none |
| Every row a different hue, a "left" amount in green on every budget row | Grey for what is fine; colour only on the rows at risk or over |
| A screen that names no product and offers no action | The product's mark and scope in the shell; its main job one click away |

**On violet and indigo.** 10 of the 23 studied screens use violet or indigo, always as a data hue or a
single control. The ban is the owner's taste, not a finding of the study: the library deals other
hues for the styles that came from those screens, and the inspector's palette check stays on.

## 14. Tells of generated dashboards

Each line sets a habit of generated dashboards against what the 23 screens do instead.

| Tell | What replaces it |
| --- | --- |
| A dark navy or tinted sidebar with a coloured active pill and a left bar | The sidebar on the page ground; a neutral grey pill, or the label brightening on dark. A left bar appears once in 23. |
| "Welcome back, Alex" with a waving hand and a subtitle | A noun title at 24/600. Three screens greet; the one emoji goes. |
| Four KPI cards, each with an icon in a tinted circle | One container split by hairlines, label over value. No icons on any of the 23. |
| A green "+12.5%" pill on every KPI | A delta on 9 of 20 screens, in words with its window; grey for zero; "+4 (new)" from zero. |
| A sparkline on every KPI | None on any of the 23. The trend has its own chart. |
| KPI values at 36-48px, bold, in the brand colour | 24-30px at 400-600 in ink; nothing at 48. |
| A gradient area chart with a smoothed spline and a dot on every point | A 2px straight line, no fill on 7 of 10, no markers. |
| A rainbow palette, a hue per bar or per chart | One hue per chart; the accent on data only; four hues at most on a screen. |
| Gridlines every 20px, axis lines on both sides, a legend for one series | 3-5 faint lines, no y-axis line, no legend for a single series; round ticks above the maximum. |
| A fat donut with labels on the slices and a big total in the hole | A thin ring, no slice labels, the legend as a table with the values. |
| Cards with a 16-24px radius, a 1px border and a large soft shadow | A border or a tone step, no shadow; a tight or a soft radius, chosen once. |
| A zebra table under uppercase tracked headers, with a checkbox, an avatar, a status chip and a kebab on every row | Rules and alignment: 12px grey headers, one status mark, one action where it is needed. |
| Left-aligned numbers in proportional digits | Right-aligned tabular figures, fixed decimals, units in grey. |
| Saturated status chips with white text | Pale tints with dark text of the same hue. |
| The accent on every button, tab and link | No filled primary on 12 of 23; near-black where there is one. |
| A top bar with search, a bell and an avatar on every screen, or one left mostly empty | No top bar on 9 of 23; when there is one, it carries search, the switcher or the object's name. |
| Export, Share and a date picker clustered by the title | Actions only when they are real; a freshness stamp instead. |
| Placeholder people and companies, round vanity totals, growth on a week-old account | The product's own data, small numbers at their real size, totals summed from the rows. |
| Pagination under a short list | Capped rows and "View all". |
| An equal four-up grid whatever the data, with orphan cells and stretched cards | A column count chosen by the item count; spans that change by row and land on the same lines. |
| Neon on dark, glowing borders, glass | True neutral darks, lightness steps, colour on the data. |
| The kit's own face: Geist or Inter on #f8f8f8 with white 12px cards and no hue on the data, or lime on black | One face taken from the brief (a ground from the product's world, a figure face with character, the brand's hue on the main data element) and one element only this product has. |
| A coloured icon per category in a list | One grey icon set; colour, if any, on the numbers. |
| An illustration and "No data yet" in an empty chart | The zero line drawn, and one sentence in the frame. |

A screen with every tell removed and nothing put in their place is a tidy template. What fills the
space is the product: its own data at its real size, the screen's one question answered by its
biggest block, and a grid whose sums close.
