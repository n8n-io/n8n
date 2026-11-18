# AGENTS.md

`@n8n/frontend-module-aquarium` shows workflows and agents as pixel-art sea creatures at
`/aquarium`. Read `README.md` for the data flow and the data sources. This file tells you how to
extend the module, and which rules to obey.

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
| Background and sprite drawing | `src/engine/renderer.ts` |
| Tooltip, hover, click | `src/components/AquariumTank.vue` |
| Page header, demo switch, warnings | `src/views/AquariumView.vue` |
| Sidebar link (in the shell) | `packages/frontend/editor-ui/src/app/components/MainSidebar.vue` |
| Fake data for development | `src/sources/demo.source.ts` |
| Data set files (parse, limits) | `src/sources/dataset.ts`, `src/aquarium.constants.ts` |
| Simulated activity (demo and data set) | `src/sources/demo-activity.ts` |
| Live activity (polling, demo activity) | `src/aquarium.store.ts`, `src/sources/activity.source.ts`, `src/sources/demo-activity.ts` |
| Live activity (backend counts) | `../backend/src/` |

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
`SICK_FAILURE_RATE` gives a blinking green tint and a lower `speedFactor`. Copy its shape.

1. If no source gives the value, add a field to `EntityMetrics`. Set its default in
   `emptyMetrics()` in `src/sources/source.utils.ts`. Set the value in a source mapper.
2. If the mapping is numeric, put it in `scaling.ts` as a pure function, with its limits in
   `aquarium.constants.ts`.
3. Write a `TraitRule` in `src/engine/traits.ts`. Put its limits and colours in
   `aquarium.constants.ts`. A rule can set `tint`, `tintBlinkSeconds`, `speedFactor`, the species
   or `effects`.

4. Add the rule to `defaultTraitRules`. See "Rule order" below.
5. Add a row to the tooltip in `AquariumTank.vue` if a user must see the number.
6. Give some entities in `demo.source.ts` values that show the new look.
7. Add a test in `traits.test.ts`.

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

### Pixel grid and camera

- All engine coordinates are world coordinates in logical pixels. At the default zoom, one logical
  pixel is `PIXEL_SIZE` CSS pixels. The camera zoom changes that.
- Effects draw in world coordinates. The renderer moves the canvas to the camera before it calls
  them, so an effect does not need to know the camera.
- Convert a pointer position with `toWorld()` in `AquariumTank.vue`, not by dividing by
  `PIXEL_SIZE`.
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
