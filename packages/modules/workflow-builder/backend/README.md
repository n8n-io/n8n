# Workflow Builder backend

This package stores Workflow Builder sessions. It owns the session entity and repository.

Import `WorkflowBuilderSession`, `IWorkflowBuilderSession`, and
`WorkflowBuilderSessionRepository` from `@n8n/backend-module-workflow-builder`.
The public API does not register the backend module.

The CLI manifest loads `@n8n/backend-module-workflow-builder/module` on demand.
The module registers its entity before the database starts. Migrations stay in `@n8n/db`.

Run `pnpm build > build.log 2>&1` before you use the package from the CLI. The build writes JavaScript and
declarations to `dist`. It excludes tests.

Run `pnpm test --maxWorkers=1` for unit tests and SQLite persistence tests.
Run `pnpm test:postgres --maxWorkers=1` for persistence tests with the shared PostgreSQL harness.
The PostgreSQL harness needs Docker.
