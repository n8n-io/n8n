# @n8n/hooks-api

The versioned in-process contract between n8n and extensions that load into the
n8n process, for example n8n Cloud.

## Rules

- This package is additive only. Do not change or remove a released version.
  Add a new version instead (`HooksApiV2`, `OwnershipApiV2`, ...).
- The runtime `version` field is the contract. An extension must check which
  versions the running n8n offers, and not the n8n semver.
- Types use plain data only: no entities, no TypeORM, no Express.
- Errors carry a contract `code` (`HooksApiErrorV1`). Do not match on error
  classes or messages.

## How drift is caught

| Change | Check |
|---|---|
| A released version's types change, or a version is removed | `pnpm check:api` (runs as `test`) compares the generated declarations with `api/v<N>.d.ts` |
| n8n internals change in a way that breaks an adapter | The adapters in `packages/cli/src/hooks-api/` implement the V1 interfaces, so the CLI does not compile |
| The behaviour behind a V1 method changes | Contract tests in `packages/cli/src/hooks-api/__tests__/contract/` run the API against a real database |

To release a new version, add `src/v<N>/`, add `v<N>?` to `HooksApi`, then run
`pnpm api:freeze`. This stores `api/v<N>.d.ts`. It never overwrites a snapshot.

## Usage

Point `EXTERNAL_HOOK_FILES` to a file that exports `register`. n8n calls it once
when the instance is ready, before the legacy `n8n.ready` hooks. Legacy exports
in the same file keep working.

```js
// Example hook file that uses only the versioned in-process API.
/** @type {import('@n8n/hooks-api').RegisterHooks} */
exports.register = async (api) => {
	if (api.v1) return await registerV1(api.v1);
	throw new Error('No supported hooks API version');
};

/** @param {import('@n8n/hooks-api').HooksApiV1} api */
async function registerV1(api) {
	console.log(`[hooks-poc] register v1 on ${api.instance.type}, n8n ${api.instance.n8nVersion}`);

	if (!(await api.ownership.getOwner())) {
		const owner = await api.ownership.setupOwner({
			email: 'owner@example.com',
			firstName: 'Jane',
			lastName: 'Doe',
			password: 'Password123',
		});
		console.log('[hooks-poc] owner set up', owner);
	}

	api.http?.registerRoute({
		method: 'get',
		path: '/cloud/admin/executions/:executionId/workflow',
		handler: async ({ params }) => {
			const workflowId = await api.workflows.getWorkflowIdForExecution(params.executionId);
			return workflowId ? { status: 200, body: { workflowId } } : { status: 404 };
		},
	});

	api.hooks.workflow.onPreExecute(async ({ workflow, mode }) => {
		console.log(`[hooks-poc] preExecute ${workflow.id} (${mode})`);
		if (workflow.name.includes('blocked')) throw new Error('Blocked by hooks POC');
	});
}

// Legacy exports keep working next to `register`.
exports.n8n = { ready: [async () => console.log('[hooks-poc] legacy n8n.ready')] };
```
