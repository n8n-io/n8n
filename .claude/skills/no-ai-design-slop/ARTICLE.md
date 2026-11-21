# No Design Slops: Pattern Library

This library combines the Impeccable slop catalog, the DesignCode anti-slop workflow, and the recurring principles in Meng's design skills. It is a heuristic inventory, not a blacklist.

Read only the sections relevant to the artifact. Mark each item as observed, absent, or unknown. Report or fix a pattern only when the artifact provides evidence and the pattern causes defaultness, incoherence, repetition, or harm.

## Philosophy

### Taste is contextual

A purple gradient can be right for one product and lazy for another. A single font can be expressive when size, width, weight, and spacing create hierarchy. Glass can explain a real layer. Overlap can create depth without covering content.

The failure is not the technique. The failure is reaching for it without a product reason, repeating it until everything has the same emphasis, or combining it with effects that tell different visual stories.

### Start from a system, not an empty prompt

Before designing, gather the strongest available evidence:

- the existing site or app
- a local `DESIGN.md`, tokens, components, and brand assets
- screenshots or URLs chosen for a specific quality
- real product copy, states, and media
- the user's named constraints and preferred design skills

Extract principles from references, then transform them for the current product. A reference is a starting point, not permission to clone its identity.

### Coherence beats decoration

Typography, layout, color, imagery, iconography, material, and motion should feel authored by the same point of view. One strong visual idea can carry a page. Five unrelated ideas create noise.

### Subtract before replacing

When a choice has no job, remove it. Replacement is justified only when deletion loses meaning, state, action, hierarchy, or brand character. Cleanup should make the existing direction clearer, not erase it.

### Learn the names of problems

Precise vocabulary produces precise corrections. Name `selected state`, `optical alignment`, `tracking`, `text measure`, `nested cards`, `radial spotlight`, `clipping context`, `active state`, or `layout shift` instead of asking to make a design "better."

## 1. Product and Direction

- The page has no clear product, audience, or primary job.
- The first viewport cannot explain what the product does.
- The visual style could belong to any startup with the copy swapped.
- The interface combines several unrelated style lanes without a hierarchy.
- A reference was copied literally instead of translated into a new identity.
- A named design system exists but the surface ignores it.
- New colors, fonts, radii, shadows, or spacing values appear outside the local system without a reason.
- The design follows the model's defaults even when they conflict with supplied references.
- The page has several focal points and no dominant one.
- The decoration communicates a different mood than the content or product.
- A section looks imported because it does not inherit the page's type, palette, shape, density, or motion.
- The design is polished locally but incoherent as a whole.

## 2. Composition, Layout, and Space

- Content overlaps accidentally, especially text, controls, and imagery at breakpoints.
- Intentional overlap lacks contrast, safe space, or a stable anchor.
- The selected navigation state is only an uneven border or arbitrary outline.
- Alignment changes from section to section without creating useful tension.
- Left, right, top, and bottom insets feel optically unbalanced.
- Related items are separated while unrelated items are crowded together.
- Headings sit closer to the previous section than to the content they introduce.
- The same spacing value is used everywhere, flattening the rhythm.
- Every section receives identical vertical padding regardless of content.
- One column extends far beyond its partner and leaves dead space.
- A scroller loses one gutter and feels clipped against the viewport.
- Body content touches the viewport edge.
- Text lines become too long to scan comfortably.
- Forced line breaks create awkward shapes or fail responsively.
- Content overflows its container or creates accidental horizontal scrolling.
- Tooltips, menus, or popovers are clipped by an ancestor's overflow.
- A long sentence is enlarged until it consumes the entire first viewport.
- Empty space is added as spectacle rather than to improve hierarchy.
- Dense product information is spread into oversized sparse sections.
- A dashboard is given marketing-page spacing that slows scanning.
- Desktop composition simply collapses into one long mobile stack with no re-prioritization.
- Sticky or fixed layers cover content, controls, or system UI.

## 3. Containers, Cards, and Shape

- Every paragraph, metric, feature, and action is placed in a card.
- Cards are nested inside cards without expressing a real hierarchy.
- A bento grid appears because it is fashionable, not because the content has varied importance.
- Identical icon-heading-description cards repeat until nothing stands out.
- Rounded rectangles become the default shape for every element.
- Small cards use extreme radii and become soft blobs.
- Pills are used for content that is not a compact status, tag, filter, or action.
- A thick accent stripe is attached to one side of a rounded card.
- A thin border and a broad diffuse shadow both try to define the same edge.
- Several borders, inner rings, highlights, and shadows wrap one surface.
- Containers are used where proximity, alignment, or a divider would be clearer.
- A modal contains a page-sized workflow, multiple columns, or deep scrolling.
- A border is added to every surface because the background hierarchy is weak.
- Corner radii drift between components that should belong to one family.
- Pricing cards use a different shape language from the rest of the page.
- A highlighted pricing tier relies on an arbitrary gradient or glow rather than a clear recommendation and content difference.

## 4. Typography and Hierarchy

- A tracked uppercase eyebrow sits above nearly every heading.
- An eyebrow has extreme letter spacing that consumes horizontal space.
- A hero pill repeats information already present in the headline or navigation.
- Tiny numbered labels imitate editorial structure without helping sequence or navigation.
- Heading, subheading, and body sizes are too similar to establish hierarchy.
- Display tracking is tightened until letterforms collide or lose shape.
- Body tracking is widened enough to break natural word shapes.
- Long body copy is set in all caps.
- Functional text is too small to read comfortably.
- Body text is tiny because the layout was designed before the content.
- Multi-line copy uses leading that is too tight for scanning.
- Centered paragraphs run longer than a short supporting statement.
- Justified text creates visible rivers of space on screen.
- Decorative italics are used as a shortcut to make a headline feel editorial.
- Gradient text reduces the clarity of headings or metrics.
- The same default font, weight, and width are used for every role.
- A popular AI-default font is used without contributing to the product's identity.
- Too many typefaces are added to manufacture hierarchy.
- Type roles change unpredictably between sections.
- Labels, captions, headings, and buttons repeat the same phrase.
- Tiny monospaced labels make ordinary content pretend to be technical.
- Buttons wrap to two lines because copy and sizing were not resolved together.
- Typographic punctuation, casing, or numeral styles are inconsistent.
- Line breaks isolate weak words or create accidental widows in focal copy.

## 5. Color, Lighting, and Material

- Purple-to-blue gradients appear across text, buttons, backgrounds, and decorative objects by default.
- Cyan accents on a dark surface imitate a generic futuristic product.
- Several accent colors compete without semantic or brand roles.
- Saturated radial lights float behind sections with no physical or narrative source.
- Gray surfaces clash with the hue or temperature of the primary accent.
- Glows appear on every active, hover, and featured state.
- Glass is used where no real foreground/background relationship exists.
- Blur, glow, gradient, border, shadow, and noise are stacked on one component.
- A warm cream surface is selected only because it signals generic tastefulness.
- Gradient text is used as the main source of emphasis.
- Gray text sits on a colored background and looks washed out.
- Text contrast fails at the actual rendered size and weight.
- Shadows are broad, muddy, and disconnected from an elevation model.
- White borders are applied uniformly instead of adapting to the surface.
- Decorative grid or repeating stripes cover a surface without supporting a canvas, map, measurement, or technical task.
- Texture is added uniformly and makes content less legible.
- Dark mode is treated as black plus neon instead of a complete tonal system.
- Light and dark sections switch without adapting imagery, borders, icons, and text roles.
- Selected, success, warning, and error colors are decorative rather than semantic.
- Color is the only way to communicate state.

## 6. Imagery, Illustration, and Icons

- A generic abstract illustration fills the hero because no visual concept was chosen.
- Hand-coded SVG scenery or mascots look like unfinished placeholders.
- Shapes assembled into pseudo-illustration have no relation to the product.
- Stock photography is used as product-specific evidence.
- Imagery is aesthetically pleasant but contextually wrong for the subject.
- Every image has a different lighting, crop, grade, or rendering style.
- A decorative dashboard, code window, browser frame, or device mockup does not show real product behavior.
- Product screenshots contradict the current interface or copy.
- Placeholder portraits, duplicated logos, or fake avatars imply adoption that is not proven.
- Image tags have missing, empty, broken, or placeholder sources.
- Huge icon containers outweigh the feature they introduce.
- A rounded-square icon tile sits above every feature heading.
- The default icon library is used without adapting stroke, weight, scale, or brand fit.
- Icons from several families are mixed without normalization.
- Brand marks are approximated with text or invented SVG paths when an official asset exists.
- Images are cropped without preserving the subject or safe area at responsive sizes.
- Decorative media consumes bandwidth or motion budget without adding meaning.
- Generated imagery is accepted without checking anatomy, text, logos, lighting, or context.

## 7. Components, States, and Interaction

- Several primary actions have equal emphasis.
- The primary action is visually weaker than a secondary decoration.
- Navigation, tabs, filters, or selections lack a clear active state.
- A random status pill appears without live data or user value.
- Static status uses a pulsing dot to pretend that data is live.
- Inputs, buttons, and links lack visible focus.
- Hover is the only way to reveal essential information.
- Hover effects move the target away from the pointer.
- Loading, empty, error, disabled, selected, and success states are missing where the flow requires them.
- State feedback is delayed or shown far from the action.
- Buttons use inconsistent heights, padding, corner radii, or icon alignment.
- Tap targets are too small or crowded.
- Controls look decorative because labels, roles, or affordances are unclear.
- A disabled control looks enabled or gives no explanation when context is needed.
- A destructive action resembles a routine action.
- Form validation appears only after submission when earlier feedback would help.
- Complex settings are forced into a modal instead of a stable workspace.
- Interaction patterns change between components that perform the same job.

## 8. Motion and Scroll

- Every element receives the same entrance animation.
- Motion exists to make a static composition feel more expensive.
- Several perpetual animations compete with reading and controls.
- A fake blinking cursor is attached to non-editable hero copy.
- An auto-scrolling marquee hides content and demands constant attention.
- Bounce or elastic easing is applied to ordinary interface state changes.
- Image hover defaults to scale or rotate with no product meaning.
- Hover motion causes nearby layout to shift.
- Width, height, margin, or padding animation causes layout work and jank.
- Scroll effects do not explain narrative, depth, chronology, or spatial movement.
- Smooth scrolling is added without checking keyboard, anchors, restoration, or reduced motion.
- Sticky storytelling traps the user for too long relative to the content.
- Content begins hidden and remains invisible when JavaScript or observers fail.
- Transitions block input or make the interface feel slow.
- Parallax changes readability or causes motion discomfort.
- Motion timing and easing vary without a system.
- The page lacks a complete static first frame.
- Reduced motion only shortens animation instead of presenting a stable final state.

## 9. Copy, Proof, and Page Structure

- The headline uses broad claims that could describe any product.
- Buzzwords replace a specific verb, object, or outcome.
- Copy repeats em-dashes, rebuttal fragments, or manufactured contrasts as a cadence template.
- Labels, helper text, and hints restate the same idea.
- Feature cards contain interchangeable heading-and-description filler.
- Section headings repeat the navigation or previous sentence.
- Tiny labels add ceremony without information.
- A page includes the default hero, logo wall, metrics, bento features, testimonials, FAQ, and CTA sequence regardless of the actual journey.
- A section exists only to make the page feel complete.
- Metrics are large and dramatic but unsupported or irrelevant.
- Testimonials, customers, ratings, awards, partnerships, or activity are invented.
- Fake dashboards and charts are presented as evidence.
- Logos imply customers or integrations without clarification.
- Pricing lacks a clear unit, cadence, included value, or plan distinction.
- The highlighted plan is emphasized visually but not substantively.
- Pricing language and component styling conflict with the rest of the product.
- Buttons use vague verbs when a specific action is available.
- Empty states contain marketing copy instead of helping the next action.
- Error messages describe failure without recovery.
- Success states celebrate without confirming what happened next.

## 10. Quality, Accessibility, and Production

- The page loads with uncaught errors or broken interactions.
- Important content remains at zero opacity because an animation did not initialize.
- Text, icons, and controls fail contrast requirements.
- Heading levels skip and weaken document structure.
- Controls lack accessible names, roles, or keyboard behavior.
- Focus is hidden under sticky layers or clipped containers.
- Reading order differs from visual order in a confusing way.
- Responsive layouts clip, overlap, overflow, or remove essential actions.
- Touch behavior is assumed from desktop hover behavior.
- Media has no static fallback or meaningful alternative.
- Animation ignores reduced-motion preferences.
- Large visual effects cause jank, battery drain, or delayed input.
- Layout shifts after fonts, images, or client state load.
- Real content breaks a component that only worked with short placeholders.
- Locale changes, long names, or large text break the layout.
- The interface contains dead links, placeholder copy, missing assets, or non-functional controls.
- Success is claimed from source code without checking the rendered surface.
- A visually polished state hides an incomplete or misleading product flow.

## High-Signal Clusters

Do not count isolated matches. Look for clusters that expose one root cause:

- **Generic AI SaaS:** tracked eyebrow, oversized sentence headline, purple gradient, radial lights, glass cards, icon tiles, bento grid, vague copy.
- **Card apocalypse:** outer section card, nested feature cards, pill labels, redundant borders, independent shadows, extreme radii.
- **Motion theater:** hidden-at-rest content, identical reveals, marquee, pulsing statuses, scale-on-hover, smooth scroll, no reduced-motion path.
- **Fake sophistication:** monospaced micro-labels, decorative grid, fake dashboard, invented metrics, browser chrome, technical copy with no product evidence.
- **Reference mismatch:** imported section, wrong font, alien radii, new accents, unrelated imagery, inconsistent motion, layout density that breaks the surrounding system.
- **Polish before truth:** beautiful effects covering unclear product copy, weak actions, missing states, broken responsiveness, or unverified proof.

Fix the root cause once. Do not treat every repeated instance as a separate design idea.

## Prompt Vocabulary

Use the exact problem name in follow-up prompts:

- "Replace the uneven outlined selected state with the navigation's existing active-state language."
- "Remove the tracked eyebrow; the heading already carries the hierarchy."
- "Remove the decorative radial lights and keep one product-led focal image."
- "Flatten the nested cards; use spacing and dividers to express grouping."
- "Adapt this pricing section to the page's existing type, radii, palette, and density."
- "Keep the overlap, but reserve a safe text area at mobile and tablet widths."
- "Replace the generic feature icon tiles with product screenshots or icons in flow."
- "Make the status static unless it reflects changing data."
- "Preserve the visual thesis and remove effects that repeat the same job."

Specific language keeps revisions surgical and prevents a broad style reset.
