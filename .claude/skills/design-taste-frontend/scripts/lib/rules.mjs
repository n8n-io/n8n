// Turns probe() metrics into findings. Each finding: { level: 'FAIL'|'WARN', id, message, fix }.
// FAIL = a banned tell or a broken page; the work is not done while one remains.
// WARN = usually wrong; keep only with a reason you could say out loud to a designer.

const inRange = (h, a, b) => (a <= b ? h >= a && h <= b : h >= a || h <= b);

// Colour families this skill treats as generated-page signatures.
export function colourFamily(hsl) {
  if (!hsl) return null;
  const { h, s, l } = hsl;
  if (inRange(h, 22, 62) && s >= 0.16 && l >= 0.88 && l < 0.995) return 'cream';
  if (inRange(h, 6, 30) && s >= 0.38 && s <= 0.85 && l >= 0.42 && l <= 0.72) return 'terracotta';
  if (inRange(h, 244, 295) && s >= 0.42 && l >= 0.3 && l <= 0.8) return 'ai-purple';
  return null;
}

const hexToHsl = (hex) => {
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return { h: Math.round(h), s, l };
};

export function judge(m, { width = m.viewport.w, allow = [] } = {}) {
  const out = [];
  const add = (level, id, message, fix) => { if (!allow.includes(id)) out.push({ level, id, width, message, fix }); };
  const mobile = width < 600;

  // --- headlines
  // A title holds to two lines. A statement (a paragraph, quotation or list item set large) may run
  // longer, but only at statement size; set at display size it is a headline again. In blind tests jurors
  // read any large sentence of three lines or more as a long headline, so statement size is kept modest.
  const stmtMaxPx = width < 600 ? 24 : width < 1100 ? 32 : 36;
  const stmtMaxLines = width < 600 ? 4 : 3;
  const isStatement = (h) => h.kind === 'statement' && h.size <= stmtMaxPx;
  const long = m.headings.filter((h) => h.lines > 2 && !isStatement(h));
  if (long.length) {
    add('FAIL', 'headline-lines', `${long.length} headline(s) wrap past two lines at ${width}px: ` + long.slice(0, 4).map((h) => `"${h.text.slice(0, 48)}" → ${h.lines} lines (${h.words} words, ${h.size}px${h.kind === 'statement' ? ', a paragraph set above ' + stmtMaxPx + 'px' : ''})`).join('; '),
      'Cut words first (a headline is a title, not a sentence). Then give it a wider measure. Lower the size only as a last resort and never below the scale you chose. A real statement paragraph belongs in a <p> or <blockquote> at ' + stmtMaxPx + 'px or less.');
  }
  const longStatements = m.headings.filter((h) => isStatement(h) && h.lines > stmtMaxLines);
  if (longStatements.length) {
    add('WARN', 'statement-length', `${longStatements.length} large-set statement(s) run past ${stmtMaxLines} lines at ${width}px: ` + longStatements.slice(0, 3).map((h) => `"${h.text.slice(0, 40)}…" → ${h.lines} lines at ${h.size}px`).join('; '),
      'A statement set large is about 30 words. Cut it, or set the rest as ordinary body text.');
  }
  if (m.hero && m.hero.words > 10) add('WARN', 'hero-words', `Hero headline is ${m.hero.words} words ("${m.hero.text.slice(0, 60)}"). Gallery median is 5.`, 'Say the one thing. Move the rest to the supporting line.');
  if (m.headingSummary.mixedFontHeadings) add('WARN', 'mixed-font-headline', `${m.headingSummary.mixedFontHeadings} headline(s) switch typeface or to italic mid-line (the "one italic serif word" move).`, 'Set the whole headline in one face. Emphasis comes from the words.');

  // --- banned furniture
  if (m.eyebrows.length) {
    add('FAIL', 'eyebrow', `${m.eyebrows.length} eyebrow/kicker label(s) above headings: ` + m.eyebrows.slice(0, 5).map((e) => `"${e.text}"${e.pill ? ' (pill)' : ''} above "${e.above}"`).join('; '),
      'Delete them. If the label carried real information, fold it into the headline or the supporting sentence.');
  }
  if (m.type.monoProseShare > 0) {
    add('FAIL', 'mono', `Monospace type outside code: ${m.type.monoFamilies.join(', ')} — e.g. ${m.type.monoSamples.slice(0, 4).map((s) => `"${s}"`).join(', ')}`,
      'Set it in the text face. Monospace is for literal code inside <pre>/<code> only.');
  }
  if (m.numbered.length) {
    add('FAIL', 'numbering', `Decorative index numbers: ${m.numbered.slice(0, 6).map((n) => `"${n.text}"`).join(', ')}`,
      'Remove them. If order truly matters, write it into the words ("First, …") or use a real <ol>.');
  }
  if (m.type.microLabels >= 3) add('FAIL', 'micro-label', `${m.type.microLabels} tiny uppercase letter-spaced labels (e.g. ${m.type.microSamples.slice(0, 4).map((s) => `"${s}"`).join(', ')}).`, 'Use sentence-case text at a readable size, or delete the label.');
  else if (m.type.microLabels > 0) add('WARN', 'micro-label', `${m.type.microLabels} tiny uppercase letter-spaced label(s): ${m.type.microSamples.slice(0, 3).map((s) => `"${s}"`).join(', ')}`, 'Prefer sentence case at body size.');
  if (m.page.emoji.length) add('FAIL', 'emoji', `Emoji in the page: ${m.page.emoji.join(' ')}`, 'Remove. Use words or real imagery.');

  // --- surfaces
  const s = m.surfaces;
  if (s.gradients) add('FAIL', 'gradient', `${s.gradients} gradient fill(s): ${s.gradientSamples.slice(0, 3).join(' | ')}`, 'Use a flat colour or a real image. The only gradient allowed by default is a neutral scrim over a photo for legibility.');
  if (s.gradientText) add('FAIL', 'gradient-text', `${s.gradientText} gradient-filled text element(s).`, 'Solid colour text.');
  if (s.shadowStatic) add('FAIL', 'shadow', `${s.shadowStatic} box-shadow(s) on elements at rest: ${s.shadowSamples.slice(0, 3).join(' | ')}`, 'Remove. Separate surfaces with a tone step or space. Shadows are for things that really float (menus, dialogs, sticky bars).');
  if (s.textShadow) add('FAIL', 'text-shadow', `${s.textShadow} text-shadow(s).`, 'Remove; fix legibility with a scrim or a different crop.');
  if (m.buttons.withGradient || m.buttons.withShadow) add('FAIL', 'button-fx', `Buttons with ${m.buttons.withGradient ? 'gradient fill' : ''}${m.buttons.withGradient && m.buttons.withShadow ? ' and ' : ''}${m.buttons.withShadow ? 'shadow/glow' : ''}.`, 'Flat fill, one colour.');
  if (s.hairlines) add(s.hairlines >= 2 ? 'FAIL' : 'WARN', 'hairline', `${s.hairlines} thin rule(s)/divider line(s): ${s.hairlineSamples.slice(0, 4).join(' | ')}`, 'Delete. Separate with space, a tone change, or scale. Lines are only for real tables and form fields.');
  if (s.outlinedBoxes >= 3) add('FAIL', 'outlined-box', `${s.outlinedBoxes} boxes drawn with a 1px outline.`, 'Define a surface by its fill (one tone step from the page) or leave the content unboxed.');
  else if (s.outlinedBoxes) add('WARN', 'outlined-box', `${s.outlinedBoxes} box(es) drawn with a 1px outline.`, 'Prefer a filled surface or no box.');
  if (s.dashed) add('WARN', 'dashed', `${s.dashed} dashed/dotted border(s).`, 'Remove unless it is a real drop zone.');
  if (s.blurred > 1) add('WARN', 'glass', `${s.blurred} backdrop-blur surfaces.`, 'One blurred sticky bar at most; glass cards are a tell.');
  const iconRows = s.cardRows.filter((c) => c.iconTopped);
  if (iconRows.length) add('FAIL', 'icon-cards', `${iconRows.length} row(s) of identical cards each topped with a small icon (${iconRows.map((c) => c.count).join(', ')} cards).`, 'Replace with one composed section from the direction: a narrative split, a list set in large type, or real imagery per item.');
  else if (s.cardRows.length >= 2) add('WARN', 'card-rows', `${s.cardRows.length} rows of identical boxed cards.`, 'Vary the composition; not every section is a card grid.');
  if (m.nav?.floatingPill) add('WARN', 'pill-nav', 'Floating rounded pill navigation.', 'Use a plain bar: wordmark left, a few links, one action.');

  // --- colour
  const fams = new Map();
  const note = (label, hsl) => { const f = colourFamily(hsl); if (f) fams.set(f, [...(fams.get(f) || []), label]); };
  note('page background ' + m.color.bodyBg, m.color.bodyBgHsl);
  for (const sb of m.color.sectionBgs) note('section ' + sb.color, sb.hsl || hexToHsl(sb.color));
  if (m.color.button) note('button ' + m.color.button.bg, m.color.button.hsl || hexToHsl(m.color.button.bg));
  for (const t of m.color.textColors) if (t.share >= 0.01) note('text ' + t.color, hexToHsl(t.color));
  if (fams.has('terracotta') && fams.has('cream')) add('FAIL', 'palette-claude', `Cream + terracotta palette (${[...fams.get('cream'), ...fams.get('terracotta')].slice(0, 4).join(', ')}).`, 'Re-draw the palette from the library. This pairing reads as an assistant brand, not yours.');
  else if (fams.has('terracotta')) add('FAIL', 'palette-terracotta', `Terracotta / rust-orange accent (${fams.get('terracotta').slice(0, 3).join(', ')}).`, 'Use the accent from the drawn palette.');
  else if (fams.has('cream')) add('WARN', 'palette-cream', `Yellow-cream background (${fams.get('cream').slice(0, 3).join(', ')}).`, 'Use the drawn palette. If you want warmth, take a low-chroma stone or bone, not a yellow cream.');
  if (fams.has('ai-purple')) add('FAIL', 'palette-purple', `Indigo / violet (${fams.get('ai-purple').slice(0, 3).join(', ')}).`, 'Use the accent from the drawn palette.');
  if (m.color.textColors.some((t) => t.color === '#0000ee' || t.color === '#551a8b')) add('WARN', 'default-link', 'Browser-default blue/purple link colour is showing.', 'Style every link: inherit the text colour and mark it with weight, underline offset, or the accent.');
  const veryLow = m.color.lowContrast.filter((c) => c.ratio < 2.6);
  if (veryLow.length) add('FAIL', 'contrast', `Unreadable text: ` + veryLow.slice(0, 4).map((c) => `"${c.text}" ${c.ratio}:1 (${c.fg} on ${c.bg})`).join('; '), 'Raise contrast to at least 4.5:1 for text, 3:1 for large display.');
  else if (m.color.lowContrast.length) add('WARN', 'contrast', `Low-contrast text: ` + m.color.lowContrast.slice(0, 4).map((c) => `"${c.text}" ${c.ratio}:1 needs ${c.need}:1`).join('; '), 'Darken or lighten the text colour.');

  // --- type system
  const realFams = m.type.families.filter((f) => f.share >= 0.02);
  if (realFams.length > 3) add('FAIL', 'font-count', `${realFams.length} typefaces in use (${realFams.map((f) => f.family).join(', ')}).`, 'Two at most: one display, one text. Often one is enough.');
  else if (realFams.length === 3) add('WARN', 'font-count', `3 typefaces in use (${realFams.map((f) => f.family).join(', ')}).`, 'Two at most.');
  if (m.type.notLoaded.length) add('WARN', 'font-fallback', `Typeface(s) declared but not loaded, so a fallback is rendering: ${m.type.notLoaded.join(', ')}`, 'Fix the font URL / family name, or the screenshots you are judging are not the design.');
  if (m.type.sizeCount > 9) add('WARN', 'size-count', `${m.type.sizeCount} different font sizes (${m.type.sizes.join(', ')}).`, 'A page needs about five: display, heading, lead, body, small.');
  // Tiny text is the fault the study's best sites share (about a quarter of them); it is not copied here.
  if (m.type.body && m.type.body.size < 15) add('FAIL', 'body-size', `Body text is ${m.type.body.size}px (the size most of the running text is set in).`, 'Body copy 16–20px. Map small sizes from blueprints onto your body step.');
  else if (m.type.body && m.type.body.size < 16 && !mobile) add('WARN', 'body-size', `Body text is ${m.type.body.size}px.`, 'Body copy 16–20px.');
  if (m.type.body?.contrast && m.type.body.contrast < 7) add('WARN', 'grey-body', `The running text is a soft grey on its ground (${m.type.body.contrast}:1).`, 'Set body copy in the full ink (7:1 or more). Keep the muted ink for secondary notes; pages read thin and unfinished when everything is grey.');
  if (m.buttons.inHero === 0) add('WARN', 'first-action', `No visible button in the first ${mobile ? 'phone ' : ''}screen.`, mobile ? 'On a phone the first screen still holds the headline, the supporting sentence and the action; move navigation into one row or a menu so it does not push them down.' : 'Give the one primary action a real button in the first screen (a filled or solid-bordered control, 44px or taller), not only a link in the navigation.');
  // Models skip pictures when nothing makes them: the page must carry real ones (see SKILL.md, imagery).
  if (width >= 1100 && m.page.realPictures != null) {
    const pics = m.page.realPictures + m.page.uiPictures;
    if (pics < 4) add('FAIL', 'few-pictures', `Only ${pics} picture(s) on the page (${m.page.realPictures} photographs, footage or raster images, ${m.page.uiPictures} interface fragments). Drawings in SVG do not count.`, 'Find real pictures of the subject\'s world with scripts/assets.mjs (photographs, archival images, maps, engravings, footage), download them to assets/ and give them room: a hero picture, one per section that has a subject, a full-width band. At least four, usually six to twelve.');
    else if (m.page.realPictures < 2) add('WARN', 'no-real-pictures', `Only ${m.page.realPictures} real photograph(s) or clip(s); the rest are interface fragments.`, 'Add two or more real pictures of the customer\'s world from scripts/assets.mjs, not stock of people at laptops.');
    if (!m.page.videoCount) add('WARN', 'no-footage', 'No video anywhere on the page.', 'Look for one honest clip with scripts/assets.mjs --video (the place, the material, the process) and use it as a muted loop with a poster frame. Defend its absence only if no clip fits the subject.');
  }
  if (m.page.videosNoPoster) add('WARN', 'no-poster', `${m.page.videosNoPoster} clip(s) without a poster.`, 'Give every clip a poster frame: in the study of 100 Sites of the Day only 31% had one, and the blank or grey boxes before the clips played were recorded as faults (references/imagery.md §11).');
  if (m.page.sideScrollers) add('WARN', 'side-scroll', `${m.page.sideScrollers} row(s) scroll sideways with content past their edge.`, 'Jurors and most visitors read a row cut at the edge as clipped, not as scrollable. Wrap it onto more lines, or end it inside the grid.');
  if (m.page.blendText) add('WARN', 'blend-text', `${m.page.blendText} text element(s) use mix-blend-mode difference or exclusion.`, 'Over anything but black, white or grey, blended text takes random hues (blue on orange, lilac on green) that jurors read as a glitch. Use a solid ink chosen for the ground, or keep the blended text over neutral grounds only.');
  if (m.type.measureChars && m.type.measureChars > 88 && !mobile) add('WARN', 'measure', `Longest paragraph runs about ${m.type.measureChars} characters per line.`, 'Cap paragraphs at 45–75 characters (max-width: 60ch).');
  if (m.type.smallText > 3) add('FAIL', 'small-text', `${m.type.smallText} text blocks under 13px.`, 'Nothing meant to be read goes below 13px.');
  else if (m.type.smallText > 0) add('WARN', 'small-text', `${m.type.smallText} text block(s) under 13px.`, 'Nothing meant to be read goes below 13px.');
  if (m.type.centerShare > 0.72 && m.headings.length >= 4) add('WARN', 'all-centred', `${Math.round(m.type.centerShare * 100)}% of the text is centre-aligned.`, 'Centre one moment at most; anchor the rest to a shared left edge.');

  // --- breakage
  if (m.page.uiAbuse) add('FAIL', 'ui-wrapper', 'A data-ui element wraps a heading or more than a screen and a half of the page.', 'data-ui marks a cropped interface fragment only. Remove it from page-level wrappers.');
  if (m.page.horizontalOverflow) add('FAIL', 'overflow', `Page scrolls sideways by ${m.page.horizontalOverflow}px at ${width}px.${m.page.overflowCulprits?.length ? ' Widest offenders: ' + m.page.overflowCulprits.join(', ') + '.' : ''}`, 'Constrain the element that is wider than the viewport (max-width: 100%, or overflow: clip on its section).');
  if (m.page.brokenImages.length) add('FAIL', 'broken-image', `Broken image(s): ${m.page.brokenImages.slice(0, 4).join(', ')}`, 'Fix the URL or replace the asset.');
  if (!m.hero) add('WARN', 'no-hero', 'No headline found in the first viewport.', 'The first screen needs a clear focal statement or image.');
  // One dominant thing per first screen: large type, or a picture that holds a third of it, or (for software) an interface fragment.
  else if (!mobile && m.hero.vw < 4.5 && (m.heroMedia[0]?.ratio || 0) < 0.3 && !m.page.uiFragments) {
    add('FAIL', 'focal-point', `The first screen has no dominant element: the largest type is ${m.hero.size}px (${m.hero.vw}vw) and no single picture holds a third of the viewport.`, 'Make one thing lead: the headline at display size, or one large picture. A grid of many small pictures is not one thing; in blind tests jurors marked a first screen without a headline down every time. On the strongest studied sites the largest type has a median of 8.4vw.');
  }

  return out;
}

// The frame of the page, measured once per width by layout(): margins, balance, blank stretches, titles.
// These catch the failures a reader names first: "no clear title", "random empty space", "it is all
// pushed to one side", "text touching the edge".
export function judgeLayout(L, { width = L.viewport.w, allow = [] } = {}) {
  const out = [];
  const add = (level, id, message, fix) => { if (!allow.includes(id)) out.push({ level, id, width, message, fix }); };
  const mobile = width < 600, H = L.viewport.h;
  // the outer frame: the two margins match (asymmetry belongs inside the grid, never in the frame)
  const { left, right } = L.margins;
  if (left != null && right != null) {
    const diff = Math.abs(left - right), wide = Math.max(left, right);
    if (diff >= Math.max(mobile ? 14 : 40, width * 0.045) && wide >= (mobile ? 28 : width * 0.07)) {
      add('FAIL', 'off-centre', `The page sits off-centre: its content comes to ${left}px from the left edge but only to ${right}px from the right, at ${width}px.`, `Give the page one pair of equal margins. Check the wrapper for a max-width without margin-inline: auto, a grid with an empty last column, or padding on one side only. If one side is meant to hold air, it must still be closed by something that reaches the margin (a picture, the navigation's last item, a figure).`);
    } else if (diff >= (mobile ? 12 : 16)) {
      // strong sites hold their two margins within a few pixels; a 20-30px drift is the "shifted" look
      add('WARN', 'off-centre', `The margins differ: ${left}px on the left, ${right}px on the right, at ${width}px.`, 'Put the navigation and the content on one pair of margins; check for padding on one side only, a scrollbar gutter, or a header on another inset than the page.');
    }
  }
  // sections whose content huddles on one side, leaving the other half of the screen empty
  if (!mobile && left != null) {
    const lop = L.sections.filter((s) => !s.hero && !s.footer && !s.fullBleed && !s.pinned && s.left != null && s.words >= 12 && s.height >= 180 && Math.min(s.left, s.right) <= Math.max(left, right) + 24 && Math.max(s.left, s.right) >= width * 0.42);
    if (lop.length >= 2) add('FAIL', 'lopsided', `${lop.length} sections keep all their content on one side and leave ${Math.round(Math.max(...lop.map((s) => Math.max(s.left, s.right))) / width * 100)}% of the width empty: ` + lop.slice(0, 4).map((s) => `${s.heading ? '"' + s.heading.text + '"' : s.sel} (${s.right > s.left ? 'right' : 'left'} ${Math.max(s.left, s.right)}px empty)`).join('; '), 'Use the whole width the page has set up: put the section\'s picture, its second column, its list or its figure in the empty half, or set the text larger across the grid. Empty space must be placed, with something on each side of it.');
    else if (lop.length) add('WARN', 'lopsided', `A section keeps its content on one side and leaves ${Math.max(lop[0].left, lop[0].right)}px of the width empty: ${lop[0].heading ? '"' + lop[0].heading.text + '"' : lop[0].sel}.`, 'Fill the other side with what the section has (its picture, a second column, the figure), or defend the void in one sentence.');
    // the same hole with the empty part in the middle: a card at the left, a lone button at the right
    const hollow = L.sections.filter((s) => !s.hero && !s.footer && !s.fullBleed && !s.pinned && s.words >= 12 && s.middle >= width * 0.45);
    if (hollow.length) add('WARN', 'empty-middle', `${hollow.length} section(s) have content at both edges and ${Math.max(...hollow.map((s) => s.middle))}px of nothing between: ` + hollow.slice(0, 3).map((s) => s.heading ? '"' + s.heading.text + '"' : s.sel).join('; '), 'Bring the two parts together on the grid, or put the picture or figure of the section in the middle. An empty middle third reads as a hole, the same as an empty half.');
  }
  // blank stretches: nothing at all for a long run down the page
  const big = L.gaps.filter((g) => g.height >= H * 0.6), mid = L.gaps.filter((g) => g.height >= H * 0.42 && g.height < H * 0.6);
  if (big.length || mid.length >= 2) add(L.stage ? 'WARN' : 'FAIL', 'blank-gap', `${big.length + mid.length} stretch(es) of the page hold nothing at all: ` + [...big, ...mid].slice(0, 4).map((g) => `${g.height}px at ${g.top}px`).join('; ') + ` (the screen is ${H}px tall).`, (L.stage ? 'A fixed picture layer covers the screen here, so the DOM cannot tell whether the stretch is empty: check the screenshots. ' : '') + 'Close the gap: a section gap is 120–240px on desktop and 72–112px on a phone. Look for a min-height: 100vh on a short section, an empty grid row, a hidden element still holding its space, or a reveal that never fired. A deliberate rest is a placed picture or colour field, not nothing.');
  else if (mid.length) add('WARN', 'blank-gap', `A ${mid[0].height}px stretch at ${mid[0].top}px holds nothing.`, 'Check that it is a deliberate rest (once per page at most); otherwise close it to the normal section gap.');
  // the title: one h1, on the first screen, that says what this is
  if (!L.h1s.length) add('FAIL', 'no-title', 'The page has no visible h1.', 'Give the first screen a clear title in an h1 that says what this is (a name with what it does, the product with what it is for, the event with its date and place).');
  else {
    const first = L.h1s[0];
    if (!first.firstScreen) add('FAIL', 'no-title', `The h1 ("${first.text.slice(0, 50)}") is not on the first screen (it starts ${first.top}px down).`, 'The title belongs on the first screen, where a visitor decides whether to stay.');
    else if (first.size < (mobile ? 26 : 32)) add('WARN', 'small-title', `The h1 is ${first.size}px ("${first.text.slice(0, 50)}").`, 'Set the title at display size, or make the large text of the first screen the h1.');
    if (first.firstScreen && first.text.split(' ').length <= 3 && L.explains === false) add('WARN', 'name-only-title', `The h1 is a bare name ("${first.text.slice(0, 40)}") and nothing else on the first screen says what this is.`, 'Keep the name if it leads, and give the line under it (18px or more) the plain words: what it is, for whom, where or when. In the study of 97 Sites of the Day, first screens that named nothing lost usability and content points.');
    if (L.h1s.length > 1) add('WARN', 'many-h1', `${L.h1s.length} h1 elements.`, 'One h1 per page; section titles are h2.');
  }
  // sections with running text but no heading: the reader cannot tell what they are
  const untitled = L.sections.filter((s) => !s.hero && !s.footer && !s.continues && !s.heading && s.words >= 30 && s.height >= 200);
  if (untitled.length >= 2) add('FAIL', 'untitled-section', `${untitled.length} sections carry text but no heading: ` + untitled.slice(0, 4).map((s) => `${s.sel} at ${s.top}px (${s.words} words)`).join('; '), 'Give each section a short heading that names what it holds (the menu, the rooms, how it works, the price), in the heading face at the section size.');
  else if (untitled.length) add('WARN', 'untitled-section', `A section carries text but no heading: ${untitled[0].sel} at ${untitled[0].top}px.`, 'Name it with a short heading unless it is the continuation of the section above.');
  // the first screen: a large empty rectangle that nothing closes reads as "random empty space"
  if (!mobile && L.voidShare >= 0.28 && !L.stage) add('WARN', 'hero-void', `${Math.round(L.voidShare * 100)}% of the first screen is one empty block (${L.voidBox.w}×${L.voidBox.h}px at ${L.voidBox.x},${L.voidBox.y}).`, 'Place the void on purpose or fill it: move the picture, the film or one fact into it, grow the headline to meet it, or shrink the screen to its content. A void reads as placed only when something closes it on the far side and it is the screen\'s one rest.');
  // display type that starts inside the margin but runs off the opposite edge by a sliver: a fit error
  if (L.slivers && L.slivers.length) add('WARN', 'one-sided-bleed', `${L.slivers.length} display line(s) start inside the margin but run off the ${L.slivers[0].side} edge by a few pixels: ` + L.slivers.map((t) => `"${t.text}" (${t.px}px)`).join('; '), 'Fit the line to the content box by measurement (a small fit script, or SVG text with textLength), or bleed it on purpose by a clear amount from the margin. A name sliced by a few pixels on one side reads as a mistake.');
  // text pressed against the screen edge
  const tight = L.edgeText.filter((t) => t.px < (mobile ? 12 : 16)), near = mobile ? L.edgeText.filter((t) => t.px >= 12) : [];
  if (near.length && !tight.length) add('WARN', 'edge-text', `${near.length} text block(s) sit 12–15px from the phone's edge: ` + near.slice(0, 3).map((t) => `"${t.text.slice(0, 30)}" (${t.px}px)`).join('; '), 'The page margin is 16–20px on a phone; the header and the corner labels sit on it too.');
  if (tight.length) add('FAIL', 'edge-text', `${tight.length} text block(s) sit within ${mobile ? 12 : 16}px of the screen edge: ` + tight.slice(0, 4).map((t) => `"${t.text.slice(0, 30)}" (${t.px}px from the ${t.side})`).join('; '), `Keep text inside the page margin (${mobile ? '16–20px' : '16–32px or more'}). Only display type deliberately bled past the edge may touch it.`);
  // too many left edges: nothing lines up
  if (!mobile && L.edges.length > 6 && L.leftBlocks >= 8) {
    const top3 = L.edges.slice(0, 3).reduce((a, e) => a + e.n, 0) / L.leftBlocks;
    if (top3 < 0.6) add('WARN', 'ragged-edges', `Left-aligned text starts at ${L.edges.length} different lines (${L.edges.slice(0, 7).map((e) => e.x + 'px').join(', ')}); the three most used hold only ${Math.round(top3 * 100)}% of it.`, 'Pick two or three anchor lines from the grid and start every heading and paragraph on one of them.');
  }
  return out;
}

// App screens (dashboards, admin, settings, inboxes) keep conventions a marketing page does not: tables
// and panels may have quiet borders, labels are small, cards repeat, there is no hero, no picture floor
// and no motion floor. These page rules do not apply to them; references/app-screens.md has the reasons.
export const APP_SKIP = new Set(['hero-words', 'eyebrow', 'mono', 'name-only-title', 'empty-middle', 'numbering', 'hairline', 'outlined-box', 'dashed', 'icon-cards', 'card-rows', 'pill-nav', 'grey-body', 'measure', 'first-action', 'few-pictures', 'no-real-pictures', 'no-footage', 'focal-point', 'no-hero', 'body-size', 'small-text', 'statement-length', 'shadow', 'glass', 'still-page', 'empty-screens', 'long-pin', 'side-scroll', 'pinned-over-picture', 'off-centre', 'lopsided', 'ragged-edges', 'untitled-section', 'size-count', 'all-centred']);

export function judgeApp(A, m, { width = A.viewport.w, allow = [] } = {}) {
  const out = [];
  const add = (level, id, message, fix) => { if (!allow.includes(id)) out.push({ level, id, width, message, fix }); };
  const mobile = width < 600;
  if (mobile && A.sidebar && A.sidebar.share > 0.3) add('FAIL', 'sidebar-phone', `The sidebar still takes ${Math.round(A.sidebar.share * 100)}% of the width on a ${width}px phone.`, 'On a phone the navigation folds into a top bar with a menu button or a bottom bar of four or five destinations; the screen\'s content gets the full width.');
  if (!mobile && width >= 1100 && A.canvas && A.canvas.right > Math.max(120, width * 0.1) && A.canvas.right > A.canvas.left + 80) add('WARN', 'unused-canvas', `The content stops ${A.canvas.right}px short of the right edge while it starts ${A.canvas.left}px from the sidebar.`, 'Let the grid fill the canvas (columns in fr units), or centre a capped canvas with equal margins. A dead strip on one side reads as unfinished.');
  if (A.panels.heavyShadows) add('FAIL', 'heavy-shadow', `${A.panels.heavyShadows} panel shadow(s) heavy enough to read as floating: ${A.panels.shadowSamples.join(' | ')}`, 'Panels sit on the ground: separate them with a fill one step from the ground or a quiet 1px border. A shadow, if any, is under 8% black with a small blur. Real overlays (menus, dialogs, popovers) may float.');
  if (A.panels.glass) add('FAIL', 'glass', `${A.panels.glass} blurred glass panel(s).`, 'Opaque surfaces only.');
  if (A.panels.heavyBorders >= 3) add('WARN', 'heavy-borders', `${A.panels.heavyBorders} panel borders are dark against their ground: ${A.panels.borderSamples.join(' | ')}`, 'A panel border is a whisper: about 1.1–1.3:1 against its ground on a light screen (#e5e7eb–#ededed on white), and about 1.2–1.5:1 on a dark one (#1a1a1a on #000, #2e2e2e on #111). Darker lines turn the screen into a grid of boxes; keep the stronger line for controls.');
  const radii = A.panels.radii.filter(([, n]) => n >= 2).map(([r]) => r);
  if (radii.length > 3) add('WARN', 'radius-mix', `Panels use ${radii.length} corner radii (${radii.join(', ')}px).`, 'One radius for panels, one for controls, full round only for pills and avatars.');
  if (A.chips.count >= 3) add(A.chips.hues >= 2 ? 'FAIL' : 'WARN', 'icon-chips', `${A.chips.count} icons sit in tinted squares or circles${A.chips.hues >= 2 ? ` in ${A.chips.hues} different colours` : ''}.`, 'This is the commonest tell of a generated dashboard. Drop the tinted square: a KPI is a label and a number; an icon, if it helps, is plain and in the text colour.');
  if (A.numbers.cells >= 6 && A.numbers.leftAligned / A.numbers.cells >= 0.5) add('WARN', 'numeric-align', `${A.numbers.leftAligned} of ${A.numbers.cells} numeric table cells are left-aligned.`, 'Right-align numbers, amounts and percentages (and their column headers) so the digits line up.');
  if (A.numbers.figures >= 6 && A.numbers.tabularShare != null && A.numbers.tabularShare < 0.5) add('WARN', 'tabular', `Only ${Math.round(A.numbers.tabularShare * 100)}% of the figures use tabular numerals.`, 'Set font-variant-numeric: tabular-nums on tables, KPIs and anything that updates, so digits keep their width.');
  if (A.chartHues > 6) add('FAIL', 'rainbow-chart', `The charts use ${A.chartHues} different hues.`, 'One hue for the series that matters, a neutral for the rest, and at most four series colours in total; status colours only for status.');
  else if (A.chartHues > 4) add('WARN', 'rainbow-chart', `The charts use ${A.chartHues} different hues.`, 'Four series colours at most; prefer one accent and neutrals.');
  if (A.colourShare != null && A.colourShare > 0.12) add('WARN', 'colour-sprawl', `${Math.round(A.colourShare * 100)}% of the first screen is strongly coloured.`, 'Keep the screen neutral and spend colour on data and status: the studied screens sit near 3%, and only tinted styles reach 10–15%, as pale tints rather than saturated fills.');
  if (A.placeholders.length) add('FAIL', 'placeholder-data', `Placeholder data on screen: ${A.placeholders.join(', ')}.`, 'Use believable data for this product: real-looking names, amounts that add up, dates in order, units on every figure.');
  if (A.type.tiny > 2) add('FAIL', 'tiny-text', `${A.type.tiny} text blocks under 11px: ${A.type.tinySamples.join(', ')}.`, 'Nothing below 11px; secondary text 12px, data 13–14px.');
  else if (A.type.under13 > 0.45) add('WARN', 'tiny-text', `${Math.round(A.type.under13 * 100)}% of the text is under 13px.`, 'Data and labels read at 13–14px; keep 11–12px for sublines and axis ticks.');
  if (!mobile && A.layout) {
    if (A.layout.ragged.length) add('WARN', 'ragged-row', `${A.layout.ragged.length} pair(s) of cards in one row end at different heights (by ${A.layout.ragged.map((r) => r.diff + 'px').slice(0, 3).join(', ')}).`, 'Cards that share a row share a bottom edge: balance them by their content (the same number of rows, a block of similar height beside it), or stack them. In testing, ragged rows were marked down every time.');
    if (width >= 1100 && A.layout.panels >= 4 && A.layout.firstScreen / A.layout.panels < 0.5) add('WARN', 'below-fold', `Only ${A.layout.firstScreen} of ${A.layout.panels} blocks start on the first ${width}px screen.`, 'Every block the brief names shows its header and first rows on the first desktop screen: size the headline block to its question, cap long lists with "View all", and put time-sensitive blocks before long tables.');
    if (width >= 1100 && A.layout.voids?.length) add('WARN', 'panel-void', `${A.layout.voids.length} card(s) hold a blank band inside: ${A.layout.voids.slice(0, 3).map((v) => `${v.gap}px in "${v.panel}"`).join(', ')}.`, 'A card stretches to its neighbour only when it has content to fill. Keep a legend or a note directly under its chart (only an action or a total may sit at a stretched card\'s foot), let a short card keep its own height (align-items: start), and let a filtered block shrink to its rows.');
  }
  // an achromatic screen with a chart or a timeline and no hue on any data reads as a kit: the one chart hue goes on
  // the main data element (today's line, the booked bars, the margin that breaks)
  if (!mobile && A.charts > 0 && A.chartHues === 0 && A.colourShare != null && A.colourShare < 0.002) add('WARN', 'no-data-hue', `The screen has ${A.charts === 1 ? 'a chart' : A.charts + ' charts or timelines'} but no hue on any of its data (${(A.colourShare * 100).toFixed(1)}% coloured pixels).`, 'Put the style\'s one chart hue (or the brand\'s) on the screen\'s main data element: today\'s line, the booked bars, the current period, the cover margin. Keep the chrome neutral; the hue still stays under the style\'s colour budget.');
  // in app mode the screen's hero is its h1 or the largest text on the first screen, not the page probe's guess
  // (which can be a figure below the fold read without its spaces); the report and the MEASURED line use this one
  if (A.hero && m) m.hero = A.hero;
  if (A.title && A.title.size > (mobile ? 28 : 34)) add('WARN', 'app-title-size', `The h1 is ${A.title.size}px ("${A.title.text.slice(0, 40)}").`, 'An app screen is not a landing page: the title is 18-32px (20-24px on a phone).');
  if (A.numbers.kpiMax && A.numbers.kpiMax >= 48) add('WARN', 'kpi-size', `A figure is set at ${Math.round(A.numbers.kpiMax)}px.`, 'Figures run 16-40px on app screens; none of the studied screens reaches 48px. Size and isolation make a number loud, not display type.');
  if (A.type.sizes.length > 10) add('WARN', 'size-count', `${A.type.sizes.length} font sizes (${A.type.sizes.join(', ')}).`, 'App screens use 4-9 sizes (median 6): a scale such as 12/14/16/24 with one figure size.');
  if (A.tiles >= 4) add('WARN', 'icon-tiles', `${A.tiles} icons sit in neutral boxes repeated down the screen.`, 'A boxed icon on every row or card is still the template habit, tinted or not. Keep one plain 16px icon where it helps the eye, or none.');
  if (!A.title) add('FAIL', 'no-title', 'The screen has no h1.', 'Name the screen in an h1 at the top of the canvas (18–28px): "Overview", "Payouts", the project\'s name.');
  if (m && m.type && m.type.monoProseShare > 0.15) add('WARN', 'mono', `Monospace is ${Math.round(m.type.monoProseShare * 100)}% of the text.`, 'Monospace for IDs, keys and code only; numbers use tabular figures in the text face.');
  return out;
}

export const RULE_IDS = ['headline-lines', 'statement-length', 'focal-point', 'hero-words', 'mixed-font-headline', 'eyebrow', 'mono', 'numbering', 'micro-label', 'emoji', 'gradient', 'gradient-text', 'shadow', 'text-shadow', 'button-fx', 'hairline', 'outlined-box', 'dashed', 'glass', 'icon-cards', 'card-rows', 'pill-nav', 'palette-claude', 'palette-terracotta', 'palette-cream', 'palette-purple', 'default-link', 'contrast', 'font-count', 'font-fallback', 'size-count', 'body-size', 'measure', 'small-text', 'all-centred', 'ui-wrapper', 'overflow', 'broken-image', 'no-hero', 'first-action', 'grey-body', 'blend-text', 'covered-text', 'clipped-text', 'pinned-over-picture', 'empty-screens', 'long-pin', 'side-scroll', 'few-pictures', 'no-real-pictures', 'no-footage', 'still-page', 'off-centre', 'lopsided', 'blank-gap', 'no-title', 'small-title', 'many-h1', 'name-only-title', 'empty-middle', 'untitled-section', 'edge-text', 'ragged-edges', 'sidebar-phone', 'unused-canvas', 'heavy-shadow', 'heavy-borders', 'radius-mix', 'icon-chips', 'numeric-align', 'tabular', 'rainbow-chart', 'placeholder-data', 'tiny-text', 'colour-sprawl', 'ragged-row', 'below-fold', 'app-title-size', 'kpi-size', 'icon-tiles', 'late-title', 'reduced-hidden', 'no-poster', 'hero-void', 'one-sided-bleed', 'font-not-dealt', 'panel-void', 'no-data-hue', 'scene-not-started', 'scene-not-live', 'many-scenes', 'scene-heavy', 'dev-server'];
