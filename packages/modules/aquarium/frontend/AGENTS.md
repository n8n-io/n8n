# AGENTS.md

`@n8n/frontend-module-aquarium` shows workflows and agents as pixel-art sea creatures at
`/aquarium`. Read `README.md` for the data flow and the data sources. This file tells you how to
extend the module, and which rules to obey.

## Design principles

Read this section before you add or change a look.

### What the aquarium is for

The aquarium is a one-look view of an n8n instance: what people built, and how it runs. A person
must feel the overall health before they read a number.

- **The vibe is the health.** The water, the background and how lively the tank is show the overall
  health. A healthy tank is bright and busy. A struggling tank is murky, slow and broken.
- **Each creature tells one story.** A creature is one workflow or agent. It shows how big it is,
  how busy it is, how healthy it is and how it is set up.
- **It is for everyone.** A person who does not build workflows must see that something is wrong,
  and which creature to click.
- **The numbers are one click away.** A look starts a question. The tooltip and the workflow answer
  it.
- **It is not a dashboard.** Choose a playful interpretation over an exact chart.

### Rules for every look

1. Use only data that a source loads. If no source gives a value, do not guess it. Treat an unknown
   value as Neutral.
2. Put a number behind every look. Add a tooltip row for the number that sets the look.
3. Neutral is the default. A missing good practice, for example no error workflow or no sticky
   notes, is Neutral, not Negative.
4. Use a failure rate only when the workflow has 10 or more runs.
5. Waiting is not failing. A paused run is not an error. Time in a Wait node must not make a
   creature look heavy.
6. One creature never changes the background. A tank uses the counts of all its workflows: its
   project in project view, or the whole instance in the single tank.
7. Show only what the viewer can read. Backend endpoints return only the workflows that the user
   can read (`workflow:read`).
8. Use a small, fixed set of colours and looks. The renderer caches each species and tint pair.
9. Drive animation from `creature.age`. Creatures then move out of step, and reduced motion stops
   them.
10. Put each threshold in `aquarium.constants.ts`. The thresholds are starting points.
11. Give each new look a demo entity in `demo.source.ts`.

### Look and feel

The aquarium is a tiny, living and deeply unserious world. It must feel like a forgotten browser
game from 2004.

- Use hand-made pixel art with clear silhouettes, a small palette with deliberate accents, crisp
  pixels, expressive faces, exaggerated proportions and short loops with a lot of character.
- Do not use polished mobile-game art, vector shapes, gradients, blur, glossy effects, realistic
  physics, or assets that do not match in resolution, light or perspective.
- More character, fewer pixels. More playful interpretation, less literal representation.
- Make the world feel alive, even when nothing happens. Keep the visual rules consistent, even when
  the creatures are not.

### Looks

**Built** means it is in the code. **Planned** means the team agreed it. **Open** means the team did
not agree it yet.

#### Creatures

The species says what an entity is and how big it is. Speed says how busy it is.

| Data | Meaning | Look | Status |
| --- | --- | --- | --- |
| Node count, plus a little for run time | How complex the workflow is | Species by size: minnow, tetra, angelfish, shark, whale | Built. Open: size from node count only |
| Execution count | How busy it is | Resting swim speed on a log scale. One run lifts it from `SWIM_SPEED.min` to `SWIM_SPEED.ranMin`. Bubbles from 10 runs | Built |
| No runs and no paused runs | Not in use | Stands still with no animation and slightly faded colours until a live run starts (`stillRule`, `isResting`, `toFaded`). Agents still move | Built |
| Live run rate | Busy right now | Faster swimming, fins and bubbles. A wave of gold sweeps over it while a run is in progress (`shimmerRule`, `shimmerProgressAt`) | Built |
| Tiny or small workflow with 100 or more runs, among the busiest 2% | A busy little helper | A penguin (`penguinRule`, `busyWorkflowKeys`). It overrides the turtle | Built |
| Agent | It exists, with a number of skills | A seahorse that holds one seaweed strand for each skill (`skillStrandsEffect`), coloured by the agent id | Built |
| Many workflows | A large instance | Zoom and pan, and a tank for each project | Built |

Agents stay Neutral and static until a source gives agent run stats.

#### Fish health

Health comes from failures. The worse a workflow does, the less its fish acts like a fish.

| Data | State | Look | Status |
| --- | --- | --- | --- |
| 0% failures, with 10 or more runs | Positive | A golden glint or sparkle | Planned |
| Under 20% failures, or fewer than 10 runs | Neutral | Normal colours | Built |
| 20–50% failures | Negative | Sick: glitches dark green often (3 px jump, scrambled rows, a green ghost) and swims at 40% speed (`sickRule`, `glitchStageAt`) | Built |
| Over 50% failures, with 10 or more runs | Critical | Belly-up: the sprite upside down at the surface, with a 1 px bob (`bellyUpRule`). It overrides sick | Built |
| Every run failed, with 10 or more runs | Critical | A skeleton: the species in bone colours with ribs, barely moving, with a rattle (`skeletonRule`, `toSkeleton`). It recovers when a run succeeds | Built |
| Failures in the last 60 s | Recent health | Hooked by a fishing line | Planned |
| A run that waits now | Paused, not broken | Asleep: sinks to the sand, stops swimming, and "Z"s rise from its head (`isAsleep`, `zzzEffect`). Belly-up and skeleton win over sleep | Built |

- `speedFactor` also cuts the live speed boost, so a sick fish is slow everywhere.
- A fish is asleep when one or more of its runs are paused now (`metrics.waitingCount`,
  `activity.waiting`). Do not use only the latest run. See "Show the workflow build or waiting".

#### Fish traits

Traits say how a workflow is set up. A trait adds an accessory or a companion. It never changes
health.

| Data | Meaning | Look | Status |
| --- | --- | --- | --- |
| Security risk: an unprotected webhook, an expression in a SQL query, or an Execute Command or SSH node | Negative: exposed | A cat in a diving helmet watches the fish (`securityRule`, `catEffect`) | Partly: proof of concept |
| Error workflow set (`design.hasErrorWorkflow`) | Positive: failures are handled | A remora trails behind the tail (`remoraRule`, `remoraEffect`). No error workflow stays Neutral | Built |
| Build quality (`maintainabilityOf()`): big with no sub-workflows, many Code nodes, copy-pasted nodes, disabled leftovers, many If, Switch and Merge nodes | Negative: hard to maintain | A really big whale: the whale at 2×, at 30% speed, turning to look around every 3 s, below a score of 70 (`bigWhaleRule`, `BIG_WHALE`) | Built |
| Redaction on | Neutral: private data | Glasses | Open |
| Credentials used | Connected to many services | Bling | Open |
| Created 90 or more days ago, and among the oldest 2% | Old | A turtle. A large or huge workflow is a bigger turtle (`turtleRule`, `oldWorkflowKeys`) | Built |
| Many saved versions | Changed a lot | A turtle | Open |
| Published or draft | Live, or not yet | To decide | Open |
| Sticky notes | Neutral: documentation | No look | Planned |

- The security checks are in `../backend/src/security-checks.ts`. They copy the node type lists of
  the security audit in `packages/cli/src/security-audit`, because a module cannot import from the
  CLI package. Keep the two lists the same.
- Do not flag HTTP Request or Code nodes as a security risk. The audit lists them, but almost every
  workflow has them.

#### Whole tank

Each tank's background shows the health of the creatures in that tank. In project view, each tank
shows the health of its own project. The single tank shows the whole instance. A tank uses the
counts of its workflows added up, and the status of the live poll.

| Data | State | Look | Status |
| --- | --- | --- | --- |
| All workflows healthy | Positive | Saturated colours. Background items, such as a volcano and seaweed, are animated and working | Planned |
| Many failures across workflows | Negative | Murky green water. Background items lag or show construction signs | Planned |
| Most workflows failing | Critical | Dark, gloomy and broken | Planned |
| The live poll fails, for example during an upgrade | The instance is unreachable | A drained tank, fish lying on their side | Planned |

The renderer draws the water once and caches it. Use a few fixed water palettes, not a colour from
a continuous value.

## Map

| You want to change | File |
| --- | --- |
| What a creature is made from (data) | `src/sources/*.source.ts`, `src/sources/index.ts` |
| The shape of the data | `src/aquarium.types.ts` (`EntityMetrics`, `AquariumEntity`) |
| Metric to size, speed or tier | `src/engine/scaling.ts`, `src/aquarium.constants.ts` |
| Metric to look (species, tint, effects) | `src/engine/traits.ts` |
| Creature art | `src/species/creatures/*.ts`, `src/species/builtin.ts` |
| Extra pixels each frame (bubbles, halo) | `src/engine/effects.ts` |
| Motion | `src/engine/simulation.ts` |
| Zoom, pan, world size | `src/engine/camera.ts`, `ZOOM` in `src/aquarium.constants.ts` |
| Project tanks (size, packing, hit test) | `src/engine/layout.ts`, `PROJECT_TANK` in `src/aquarium.constants.ts` |
| Which projects get a tank | `src/engine/projects.ts`, `SMALL_PROJECTS` in `src/aquarium.constants.ts` |
| Tank frames (styles, colours, textures) | `src/engine/frames.ts` |
| Background and sprite drawing | `src/engine/renderer.ts` |
| Tooltip, hover, click | `src/components/AquariumTank.vue` |
| Page header, demo switch, warnings | `src/views/AquariumView.vue` |
| Sidebar link (in the shell) | `packages/frontend/editor-ui/src/app/components/MainSidebar.vue` |
| Fake data for development | `src/sources/demo.source.ts` |
| Workflow build, maintainability score | `src/engine/design.ts` |
| Data set files (parse, limits) | `src/sources/dataset.ts`, `src/aquarium.constants.ts` |
| Simulated activity (demo and data set) | `src/sources/demo-activity.ts` |
| Live activity (polling, demo activity) | `src/aquarium.store.ts`, `src/sources/activity.source.ts`, `src/sources/demo-activity.ts` |
| Live activity (backend counts) | `../backend/src/` |
| Security risks (backend checks) | `../backend/src/security-checks.ts`, `src/sources/security.source.ts` |

## Recipes

### Add a creature

1. Copy `src/species/creatures/minnow.ts` to `src/species/creatures/<name>.ts`.
2. Draw each frame as an array of strings. One character is one pixel. `.` is transparent. Every
   other character must be a key of `palette`.
3. Draw the creature facing right. The renderer mirrors it when it swims left.
4. Give two or more frames. Make all frames the same width and height.
5. Set `kinds`, `sizeTiers`, `motion` (`swim` or `drift`) and `frameRate`. Set `mouthRow` if
   the creature blows bubbles from a specific row.
6. Add the species to `builtinSpecies` in `src/species/builtin.ts`.
7. Run the tests. `species.test.ts` validates every sprite in `builtinSpecies`.

If two species have the same kind and tier, `pickSpecies` uses a hash of the entity id to choose.
The same entity always gets the same species.

### Show a new metric

`sickRule` in `src/engine/traits.ts` is a worked example: a failure rate over
`SICK_FAILURE_RATE` gives a green glitch and a lower `speedFactor`. Copy its shape.

1. If no source gives the value, add a field to `EntityMetrics`. Set its default in
   `emptyMetrics()` in `src/sources/source.utils.ts`. Set the value in a source mapper.
2. If the mapping is numeric, put it in `scaling.ts` as a pure function, with its limits in
   `aquarium.constants.ts`.
3. Write a `TraitRule` in `src/engine/traits.ts`. Put its limits and colours in
   `aquarium.constants.ts`. A rule can set `tint`, `glitchEverySeconds`, `skeleton`,
   `speedFactor`, the species or `effects`.

4. Add the rule to `defaultTraitRules`. See "Rule order" below.
5. Add a row to the tooltip in `AquariumTank.vue` if a user must see the number.
6. Give some entities in `demo.source.ts` values that show the new look.
7. Add a test in `traits.test.ts`.

### Show the workflow build or waiting

The data is ready. A presentation change needs only a trait rule or an effect.

- `entity.design` has the counts of a workflow (`WorkflowDesign`). It is `undefined` for agents
  and when a source has no nodes.
- `maintainabilityOf(entity.design)` gives `score` (0 to 100) and `factors`, biggest first. Read
  it in a trait rule: it changes only when the entity list changes.
- `entity.design.hasErrorWorkflow` is `true` when a workflow runs on failure.
- Paused runs are `entity.metrics.waitingCount` (sample) and `creature.activity.waiting` (live).
  Use `waitingShareOf()` for the share, and `allRunsWaiting(metrics, activity)` to know that every
  run is paused. Compare paused runs with `finishedCount`, never with `executionCount`: insights
  replace `executionCount` with ended runs only.
- Never show waiting as sick. A workflow that waits a lot works as it should.
- `DEMO_ENTITIES` covers each case: "Contract approvals" has only paused runs, "Sync CRM contacts"
  waits a lot, "Lead enrichment" has a low
  score, and "Data warehouse ETL" is big but uses sub-workflows.

### Show live activity

Live activity is on `creature.activity` (`EntityActivity`): `running`, `started`, `succeeded`,
`failed`, `startedPerSecond` and `lastEventAt`. Swim speed already uses `startedPerSecond`, through
`targetSpeedOf()` in `simulation.ts`. `creature.activity` is `undefined` when the workflow had no
runs in the window. Read `creature.speed`, not `creature.traits.speed`, for the current speed.

1. Read `creature.activity` in an effect or in `stepCreature`. Do not read it in a trait rule:
   rules run only when the entity list changes, not when activity changes.
2. Treat `undefined` as "idle".
3. To see the effect without real traffic, turn on demo mode. `demo-activity.ts` makes new fake
   counts on each poll.

The tooltip in `AquariumTank.vue` shows the counts, so you can compare your effect with the data.

### Add an effect

1. Implement `CreatureEffect` in `src/engine/effects.ts`.
2. Add it to the effect registry in the same file.
3. Add its id to `traits.effects` from a trait rule. Do not add it from the renderer.

### Add a frame style

1. Add the style to `FrameStyle` and give it a thickness in `FRAME_THICKNESS`.
2. Add one or more palettes to `PALETTES`.
3. Add a `case` to `frameColorAt()`. It gets one pixel in frame coordinates and returns a colour, or
   `undefined` for a clear pixel. Use `across` (distance from the outer edge) and `along` for
   bands and patterns, and `noise()` for texture. Never use `Math.random()`: a frame must look the
   same on every paint.
4. Add the style to `STYLE_WEIGHTS`, once for each share of tanks it should get.
5. Add the style to the `it.each` list in `frames.test.ts`.

The renderer paints each frame once for each tank and draws it over the water, so a frame can also
cover parts of the tank, like the porthole corners.

### Add a live field

1. Count it in `ActivityTracker` in `../backend/src/activity-tracker.ts`. Keep the memory fixed:
   use the one-second buckets, not one entry for each run.
2. Add it to `aquariumWorkflowActivitySchema` in
   `packages/@n8n/api-types/src/schemas/aquarium.schema.ts`.
3. Map it in `toActivitySnapshot` (`src/sources/activity.source.ts`) and add it to
   `EntityActivity`.
4. Give it a fake value in `demo-activity.ts`.

### Add a data source

1. Make `src/sources/<name>.source.ts`.
2. Put the response-to-entity mapping in an exported pure function, for example
   `toWorkflowEntity`. Test that function in `sources.test.ts`. Do not test the request.
3. Implement `EntitySource` to add creatures, or `MetricsSource` to add numbers to creatures
   that already exist.
4. Add the source to `src/sources/index.ts`.

### Add an entity kind

1. Add the kind to `EntityKind` in `aquarium.types.ts`.
2. Give at least one species that kind. Cover all five size tiers, or `pickSpecies` uses the
   nearest tier.
3. Change the kind label in `AquariumTank.vue`. It handles only `workflow` and `agent` now.
4. Add the kind to the `it.each` list in `species.test.ts`.

## Rules

### Rules that compare entities

A rule sees one entity. When a trait depends on the others, for example "among the oldest 2%",
work the fact out once in `TraitContext` and read it in the rule:

1. Add a field to `TraitContext` in `src/engine/traits.ts`.
2. Compute it in a pure function, like `oldWorkflowKeys()` in `src/engine/age.ts`, over all
   entities.
3. Set it where `AquariumTank.vue` builds the context, before it calls `deriveTraits`.
4. Read `context` in the rule. Rules that do not need it can leave out the argument.

The context covers the entities that the tank shows, so a filter such as "My projects" changes it.

A species with `kinds: []`, like the turtle or the penguin, is never picked by `pickSpecies`. Only a
rule sets it.

### Rule order

Each rule gets the traits of the rules before it. `speciesRule` reads `sizeTier` from `sizeRule`.

- A rule that changes `sizeTier` must come before `speciesRule`.
- A rule that sets `speciesId` directly must come after `speciesRule`.
- A rule that adds to `effects` must keep the effects of earlier rules: `[...traits.effects, id]`.

### Performance

- Trait rules run when the entity list changes, not each frame. They can allocate.
- Effects and `stepCreature` run each frame for each creature. Do not allocate in them. Do not
  keep state in an effect. Calculate it from `time` and the creature.
- The renderer caches sprites by species id and tint. Use a small fixed set of tint colours.
  A tint from a continuous value makes a new cache entry for each value.

### Drawing cost

- Per-frame cost grows with the number of visible tanks. Something drawn pixel by pixel in each
  tank each frame, like the wave crest, is cheap in one tank and slow in 500.
- Below `ZOOM.detail`, draw animated scenery from a cached still image. See `stillOverlayFor()` in
  `renderer.ts`.
- Paint cached images through `ImageData`, not one `fillRect` for each pixel. Tank sizes from the
  treemap are almost all different, so a cache by size helps little.
- Measure in the browser with the internal data set in project view before and after a change.

### Pixel grid and camera

- All engine coordinates are world coordinates in logical pixels. At the default zoom, one logical
  pixel is `PIXEL_SIZE` CSS pixels. The camera zoom changes that.
- Effects draw in world coordinates. The renderer moves the canvas to the camera before it calls
  them, so an effect does not need to know the camera.
- Convert a pointer position with `creatureAt()` or `toWorld()` in `AquariumTank.vue`, not by
  dividing by `PIXEL_SIZE`.
- A creature's `x` and `y` are local to its tank (`creature.tankId`). The renderer moves the canvas
  to the tank before it draws the creature and its effects. Step a creature with the bounds of its
  own tank, never with the world size.
- In tests, jsdom has no layout, so tanks have no real size. Mock `regionAt` (see
  `AquariumTank.test.ts`), or mock `clientWidth` and `clientHeight` when a test needs real sizes.
- The renderer skips creatures outside the view. An effect that draws further than `CULL_MARGIN`
  (16) pixels from its creature can be cut at the edge of the view.
- Round positions with `Math.round` before you draw, or pixels blur.
- Keep `traits.scale` an integer.
- Hex colours in sprites and in `renderer.ts` are art, not UI. Use design tokens in Vue styles.

### Sources

- Build every key with `entityKey(kind, id)`. A metrics patch with an unknown key is dropped.
- Let a failed request throw. `loadFromSources` records the source id and keeps the other data.
  Do not catch errors inside a source.
- Metrics sources later in the list win. Put the most accurate source last.
- Most sources need a license, a module or a permission. The page warns only when every entity
  source or every metrics source fails (`isPartial` in the store).

### Live activity

- The page and the sidebar link need the backend module. It is on by default, and
  `N8N_DISABLED_MODULES=aquarium` turns it off. Demo mode needs it too, because the route checks it.
- The store polls only while `AquariumView` is mounted. Call `stopLiveUpdates()` when you add
  another view that starts the polling.
- A failed poll keeps the last snapshot and sets `hasActivityError`. Do not clear the creatures.

### Data sets

- Never commit a data set file. A scrape of a real instance can contain customer names. Keep it in
  `.context/` or another ignored folder.
- `parseDataset()` returns `undefined` for a file it cannot use. Do not throw from it: the view
  shows one translated message for all bad files.
- `store.load()` lets the newest call win. Keep that when you add a new source of entities, or a
  slow live load can overwrite a data set.

### Module boundaries

- Keep `aquarium.module.ts` import-light: types, the SDK and constants only. Load views lazily.
- Never import `@/…` (the shell) or another `@n8n/frontend-module-*`.
- Import subpaths: `@n8n/stores/useRootStore`, not `@n8n/stores`.
- Put all UI text in `packages/frontend/@n8n/i18n/src/locales/en.json` under `aquarium.*`.
- Read `packages/@n8n/module-cli/frontend-module-guide.md` for all module rules.

## Testing

- `scaling.ts`, `traits.ts`, `simulation.ts` and the source mappers have no DOM. Test them
  directly.
- jsdom has no canvas 2D context, so `AquariumRenderer` has no unit tests. Mock
  `../engine/renderer` if you test `AquariumTank.vue`.
- Pass a seeded random function to `spawnCreature` and `stepCreature` for stable results. See
  `simulation.test.ts`.
- To see a change, open `/aquarium?demo=true` in a local editor. Demo mode needs no workflows and
  sends no requests.

## Checks

```bash
pnpm turbo typecheck --filter=@n8n/frontend-module-aquarium
pnpm turbo lint --filter=@n8n/frontend-module-aquarium
pnpm turbo test --filter=@n8n/frontend-module-aquarium
pnpm --filter @n8n/frontend-module-aquarium format
```
