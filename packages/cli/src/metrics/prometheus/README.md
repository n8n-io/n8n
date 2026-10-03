# Database access in metrics

Use `DatabaseMetricQueryService` for database reads. Its methods return cached
queries that skip database access after a disconnection is detected.

```ts
const query = this.databaseQueries.activeWorkflowCount(cacheTtl);

new promClient.Gauge({
	name: `${this.config.prefix}active_workflow_count`,
	help: 'Total number of active workflows.',
	async collect() {
		this.set(toGaugeValue(await query.get(), (count) => count));
	},
});
```

Add new database queries to `DatabaseMetricQueryService`. Create each query through
`CachedMetricQueryFactory`. Add outage and recovery cases to its tests. Keep raw
repository results inside the cached query callback.

The `no-unsafe-metrics-imports` lint rule applies to this directory and its helpers.
It rejects repository imports outside the query service. It also rejects new runtime
dependencies unless they are on the explicit allowlist. This includes services that
could query the database indirectly, dependency-container imports, and dynamic imports.
Type imports remain allowed. The rule checks re-exports too.

Existing event and memory readers are allowed. The pool collector reads connection
state without a query. Review the behavior of a dependency before adding it to the
allowlist in `packages/@n8n/eslint-config/src/rules/no-unsafe-metrics-imports.ts`.

This is a lint boundary, not a runtime sandbox. Changes to an allowed dependency or
the query service still need review. An in-progress query can still wait for its
timeout if it starts before the monitor detects disconnection.
