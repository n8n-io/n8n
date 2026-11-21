# Sample prompts (copy/paste)

These prompt recipes are shared across both top-level modes of the skill:
- built-in `image_gen` tool (default)
- explicit `scripts/image_gen.py` CLI fallback

Use these as starting points. They are intentionally complete prompt recipes, not the default amount of augmentation to add to every user request.

When adapting a user's prompt:
- keep user-provided requirements
- only add detail according to the specificity policy in `SKILL.md`
- do not treat every example below as permission to invent extra story elements

The labeled lines are prompt scaffolding, not a closed schema. `Asset type` and `Input images` are prompt-only scaffolding; the CLI does not expose them as dedicated flags.

Execution details such as explicit CLI flags, `quality`, `input_fidelity`, masks, output formats, and local output paths depend on mode. Use the built-in tool by default; only apply CLI-specific controls after the user explicitly opts into fallback mode.

For prompting principles (structure, specificity, invariants, iteration), see `references/prompting.md`.

## Generate

### photorealistic-natural
```
Use case: photorealistic-natural
Primary request: candid photo of an elderly sailor on a small fishing boat adjusting a net
Scene/backdrop: coastal water with soft haze
Subject: weathered skin with wrinkles and sun texture
Style/medium: photorealistic candid photo
Composition/framing: medium close-up, eye-level
Lighting/mood: soft coastal daylight, shallow depth of field, subtle film grain
Materials/textures: real skin texture, worn fabric, salt-worn wood
Constraints: natural color balance; no heavy retouching; no glamorization; no watermark
Avoid: studio polish; staged look
```

### product-mockup
```
Use case: product-mockup
Primary request: premium product photo of a matte black shampoo bottle with a minimal label
Scene/backdrop: clean studio gradient from light gray to white
Subject: single bottle centered with subtle reflection
Style/medium: premium product photography
Composition/framing: centered, slight three-quarter angle, generous padding
Lighting/mood: softbox lighting, clean highlights, controlled shadows
Materials/textures: matte plastic, crisp label printing
Constraints: no logos or trademarks; no watermark
```

### ui-mockup
```
Use case: ui-mockup
Primary request: mobile app home screen for a local farmers market with vendors and daily specials
Asset type: mobile app screen
Style/medium: realistic product UI, not concept art
Composition/framing: clean vertical mobile layout with clear hierarchy
Constraints: practical layout, clear typography, no logos or trademarks, no watermark
```

### infographic-diagram
```
Use case: infographic-diagram
Primary request: detailed infographic of an automatic coffee machine flow
Scene/backdrop: clean, light neutral background
Subject: bean hopper -> grinder -> brew group -> boiler -> water tank -> drip tray
Style/medium: clean vector-like infographic with clear callouts and arrows
Composition/framing: vertical poster layout, top-to-bottom flow
Text (verbatim): "Bean Hopper", "Grinder", "Brew Group", "Boiler", "Water Tank", "Drip Tray"
Constraints: clear labels, strong contrast, no logos or trademarks, no watermark
```

### logo-brand
```
Use case: logo-brand
Primary request: original logo for "Field & Flour", a local bakery
Style/medium: vector logo mark; flat colors; minimal
Composition/framing: single centered logo on a plain background with generous padding
Constraints: strong silhouette, balanced negative space; original design only; no gradients unless essential; no trademarks; no watermark
```

### illustration-story
```
Use case: illustration-story
Primary request: 4-panel comic about a pet left alone at home
Scene/backdrop: cozy living room across panels
Subject: pet reacting to the owner leaving, then relaxing, then returning to a composed pose
Style/medium: comic illustration with clear panels
Composition/framing: 4 equal-sized vertical panels, readable actions per panel
Constraints: no text; no logos or trademarks; no watermark
```

### stylized-concept
```
Use case: stylized-concept
Primary request: cavernous hangar interior with tall support beams and drifting fog
Scene/backdrop: industrial hangar interior, deep scale, light haze
Subject: compact shuttle parked near the center
Style/medium: cinematic concept art, industrial realism
Composition/framing: wide-angle, low-angle
Lighting/mood: volumetric light rays cutting through fog
Constraints: no logos or trademarks; no watermark
```

### historical-scene
```
Use case: historical-scene
Primary request: outdoor crowd scene in Bethel, New York on August 16, 1969
Scene/backdrop: open field with period-appropriate staging
Subject: crowd in period-accurate clothing, authentic environment
Style/medium: photorealistic photo
Composition/framing: wide shot, eye-level
Constraints: period-accurate details; no modern objects; no logos or trademarks; no watermark
```

## Asset type templates (taxonomy-aligned)

### Website assets template
```
Use case: <photorealistic-natural|stylized-concept|product-mockup|infographic-diagram|ui-mockup>
Asset type: <hero image / section illustration / blog header>
Primary request: <short description>
Scene/backdrop: <environment or abstract backdrop>
Subject: <main subject>
Style/medium: <photo/illustration/3D>
Composition/framing: <wide/centered; note usable negative space only if needed>
Lighting/mood: <soft/bright/neutral>
Color palette: <brand colors or neutral>
Constraints: <no text; no logos; no watermark; leave room for UI if needed>
```

### Website assets example: minimal hero background
```
Use case: stylized-concept
Asset type: landing page hero background
Primary request: minimal abstract background with a soft gradient and subtle texture
Style/medium: matte illustration / soft-rendered abstract background
Composition/framing: wide composition with usable negative space for page copy
Lighting/mood: gentle studio glow
Color palette: restrained neutral palette
Constraints: no text; no logos; no watermark
```

### Website assets example: feature section illustration
```
Use case: stylized-concept
Asset type: feature section illustration
Primary request: simple abstract shapes suggesting connection and flow
Scene/backdrop: subtle light-gray backdrop with faint texture
Style/medium: flat illustration; soft shadows; restrained contrast
Composition/framing: centered cluster; open margins for UI
Color palette: muted neutral palette
Constraints: no text; no logos; no watermark
```

### Website assets example: blog header image
```
Use case: photorealistic-natural
Asset type: blog header image
Primary request: overhead desk scene with notebook, pen, and coffee cup
Scene/backdrop: warm wooden tabletop
Style/medium: photorealistic photo
Composition/framing: wide crop with clean room for page copy
Lighting/mood: soft morning light
Constraints: no text; no logos; no watermark
```

### Game assets template
```
Use case: stylized-concept
Asset type: <game environment concept art / game character concept / game UI icon / tileable game texture>
Primary request: <biome/scene/character/icon/material>
Scene/backdrop: <location + set dressing> (if applicable)
Subject: <main focal element(s)>
Style/medium: <realistic/stylized>; <concept art / character render / UI icon / texture>
Composition/framing: <wide/establishing/top-down>; <camera angle>; <focal point placement>
Lighting/mood: <time of day>; <mood>; <volumetric/fog/etc>
Constraints: no logos or trademarks; no watermark
```

### Game assets example: environment concept art
```
Use case: stylized-concept
Asset type: game environment concept art
Primary request: cavernous hangar interior with tall support beams and drifting fog
Scene/backdrop: industrial hangar interior, deep scale, light haze
Subject: compact shuttle parked near the center
Style/medium: cinematic concept art, industrial realism
Composition/framing: wide-angle, low-angle
Lighting/mood: volumetric light rays cutting through fog
Constraints: no logos or trademarks; no watermark
```

### Game assets example: character concept
```
Use case: stylized-concept
Asset type: game character concept
Primary request: desert scout character with layered travel gear
Subject: long coat, satchel, practical travel clothing
Style/medium: character render; stylized realism
Composition/framing: neutral hero pose on a simple backdrop
Constraints: no logos or trademarks; no watermark
```

### Game assets example: UI icon
```
Use case: stylized-concept
Asset type: game UI icon
Primary request: round shield icon with a subtle rune pattern
Style/medium: painted game UI icon
Composition/framing: centered icon; generous padding; clear silhouette
Constraints: no text; no background scene elements; no logos or trademarks; no watermark
```

### Game assets example: tileable texture
```
Use case: stylized-concept
Asset type: tileable game texture
Primary request: worn sandstone blocks
Style/medium: seamless tileable texture; PBR-ish look
Scene/backdrop: neutral lighting reference only
Constraints: seamless edges; no obvious focal elements; no text; no logos or trademarks; no watermark
```

### Wireframe template
```
Use case: ui-mockup
Asset type: website wireframe
Primary request: <page or flow to sketch>
Style/medium: low-fi grayscale wireframe
Composition/framing: <landscape or portrait to match expected device>
Subject: <sections in order; grid/columns; key labels>
Constraints: no color; no logos; no real photos; no watermark
```

### Wireframe example: homepage (desktop)
```
Use case: ui-mockup
Asset type: website wireframe
Primary request: SaaS homepage layout with clear hierarchy
Style/medium: low-fi grayscale wireframe
Subject: top nav; hero with headline and CTA; three feature cards; testimonial strip; pricing preview; footer
Composition/framing: landscape desktop layout
Constraints: label major blocks; no color; no logos; no real photos; no watermark
```

### Wireframe example: pricing page
```
Use case: ui-mockup
Asset type: website wireframe
Primary request: pricing page layout with comparison table
Style/medium: low-fi grayscale wireframe
Subject: header; plan toggle; 3 pricing cards; comparison table; FAQ accordion; footer
Composition/framing: desktop or tablet layout
Constraints: label key areas; no color; no logos; no real photos; no watermark
```

### Wireframe example: mobile onboarding flow
```
Use case: ui-mockup
Asset type: mobile onboarding wireframe
Primary request: three-screen mobile onboarding flow
Style/medium: low-fi grayscale wireframe
Subject: screen 1 headline and CTA; screen 2 feature bullets; screen 3 form fields and CTA
Composition/framing: portrait mobile layout
Constraints: label screens and blocks; no color; no logos; no real photos; no watermark
```

### Logo template
```
Use case: logo-brand
Asset type: logo concept
Primary request: <brand idea or symbol concept>
Style/medium: vector logo mark; flat colors; minimal
Composition/framing: centered mark; clear silhouette; generous margin
Color palette: <1-2 colors; high contrast>
Text (verbatim): "<exact name>" (only if needed)
Constraints: no gradients; no mockups; no 3D; no watermark
```

### Logo example: abstract symbol mark
```
Use case: logo-brand
Asset type: logo concept
Primary request: geometric leaf symbol suggesting sustainability and growth
Style/medium: vector logo mark; flat colors; minimal
Composition/framing: centered mark; clear silhouette
Color palette: deep green and off-white
Constraints: no text unless requested; no gradients; no mockups; no 3D; no watermark
```

### Logo example: monogram mark
```
Use case: logo-brand
Asset type: logo concept
Primary request: interlocking monogram of the letters "AV"
Style/medium: vector logo mark; flat colors; minimal
Composition/framing: centered mark; balanced spacing
Color palette: black on white
Constraints: no gradients; no mockups; no 3D; no watermark
```

### Logo example: wordmark
```
Use case: logo-brand
Asset type: logo concept
Primary request: clean wordmark for a modern studio
Style/medium: vector wordmark; flat colors; minimal
Text (verbatim): "Studio North"
Composition/framing: centered text; even letter spacing
Constraints: no gradients; no mockups; no 3D; no watermark
```

## Edit

### text-localization
```
Use case: text-localization
Input images: Image 1: original infographic
Primary request: replace "Bean Hopper", "Grinder", "Brew Group", "Boiler", "Water Tank", and "Drip Tray" with "Tolva", "Molino", "Grupo de infusión", "Caldera", "Depósito de agua", and "Bandeja de goteo"
Constraints: change only the text; preserve layout, typography, spacing, and hierarchy; no extra words; do not alter logos or imagery
```

### identity-preserve
```
Use case: identity-preserve
Input images: Image 1: person photo; Image 2..N: clothing references
Primary request: replace only the clothing with the provided garments
Constraints: preserve face, body shape, pose, hair, expression, and identity; match lighting and shadows; keep the background unchanged; no accessories or text
```

### precise-object-edit
```
Use case: precise-object-edit
Input images: Image 1: room photo
Primary request: replace only the white chairs with wooden chairs
Constraints: preserve camera angle, room lighting, floor shadows, and surrounding objects; keep all other aspects unchanged
```

### lighting-weather
```
Use case: lighting-weather
Input images: Image 1: original photo
Primary request: make it look like a winter evening with gentle snowfall
Constraints: preserve subject identity, geometry, camera angle, and composition; change only lighting, atmosphere, and weather
```

### background-extraction
```
Use case: background-extraction
Input images: Image 1: product photo
Primary request: isolate the product on a clean transparent background
Constraints: crisp silhouette; no halos or fringing; preserve label text exactly; no restyling
```

### style-transfer
```
Use case: style-transfer
Input images: Image 1: style reference
Primary request: apply Image 1's visual style to a man riding a motorcycle on a plain white backdrop
Constraints: preserve palette, texture, and brushwork; no extra elements
```

### compositing
```
Use case: compositing
Input images: Image 1: base scene; Image 2: subject to insert
Primary request: place the subject from Image 2 next to the person in Image 1
Constraints: match lighting, perspective, and scale; keep the base framing unchanged; no extra elements
```

### sketch-to-render
```
Use case: sketch-to-render
Input images: Image 1: drawing
Primary request: turn the drawing into a photorealistic image
Constraints: preserve layout, proportions, and perspective; choose realistic materials and lighting; do not add new elements or text
```
