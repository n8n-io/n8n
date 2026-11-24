# Deployment Gates

## Minimum Gate Policy

- `lint` must pass before `test`.
- `test` must pass before `build`.
- `build` artifact required for deploy jobs.
- Production deploy requires manual approval and protected branch.

## Environment Pattern

- `develop` -> auto deploy to staging
- `main` -> manual promote to production

## Rollback Requirement

Every deploy job should define a rollback command or procedure reference.
