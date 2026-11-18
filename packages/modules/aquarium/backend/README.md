# @n8n/backend-module-aquarium

Live run counts for the aquarium view (`../frontend`). The module is on by default. Turn it off
with `N8N_DISABLED_MODULES=aquarium`. The frontend hides the aquarium when the module is off.

## What it does

`AquariumActivityService` listens to three execution lifecycle events:

| Event | Effect |
| --- | --- |
| `workflowExecuteBefore` | Marks the run as running and counts a start. |
| `workflowExecuteResume` | Marks a run that continues after a wait as running again. It is not a new start. |
| `workflowExecuteAfter` | Ends the run and counts a success (`success`) or a failure (`error`, `crashed`). |

`ActivityTracker` keeps the counts in memory, in one-second buckets for the last 60 seconds. The
response also gives the starts of each full second (`startedPerSecond`), so a client can see a
change in rate within seconds. The
memory does not grow with the run rate. Workflows with no run and no event in the window are
dropped. A run with no end after 6 hours is dropped.

`GET /rest/aquarium/activity` returns the counts for the workflows that the user can read
(`workflow:read`). The readable workflow ids of a user are cached for 15 seconds. When nothing ran,
the endpoint does not query the database.

## Limits

- **One main instance only.** The counts are in the memory of each main instance. With more than
  one main instance, a request sees only the runs of the instance that serves it.
- **Queue mode.** The main instance counts a run when it queues the job, so `running` includes
  queued runs. Runs that a webhook instance queues are not counted, because this module does not
  load on webhook instances.
- **Restarts.** A restart clears all counts.

## Checks

```bash
pnpm turbo typecheck --filter=@n8n/backend-module-aquarium
pnpm turbo lint --filter=@n8n/backend-module-aquarium
pnpm turbo test --filter=@n8n/backend-module-aquarium
```

Go through Turbo. It builds this package's workspace dependencies first.

Read `docs/backend/how-to/build-a-backend-module.md` for the module lifecycle, REST controller,
service, repository, entity, configuration, and testing patterns.

## Import rules

- Do not import from `packages/cli` or from the `n8n` package.
- Declare each workspace and third-party import in this package.
- Keep the module entrypoint in the `./module` export. Do not export it from `src/index.ts`.
- Use dynamic imports inside the module entrypoint. This keeps disabled modules unloaded.
