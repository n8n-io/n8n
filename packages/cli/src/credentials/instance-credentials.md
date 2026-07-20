# Instance credentials

Instance credentials are credential rows with `availability: 'instance'`. Owners and
admins manage them through the global `credential:manageInstance` scope. They have no
`SharedCredentials` owner row and workflows cannot use them.

`InstanceCredentialBroker` is the only feature-facing API for using them. A
**credential use ID** is a stable feature-purpose key (for example `instance-ai:model`)
that identifies trusted backend code, not a user. Unknown credential uses, workflow
credentials, and disallowed credential types fail closed.

## Integrating a feature

1. **Register each credential use** during module init:

   ```typescript
	Container.get(InstanceCredentialBroker).registerUse({
		id: 'my-feature:purpose',
		credentialTypes: ['someApi'],
	});
	```

2. **List matching credentials.** Only `id`, `name`, and `type` are returned:

   ```typescript
   await broker.listForUse('my-feature:purpose');
   ```

3. **Assign or clear the credential through the broker.** The broker validates the
   credential use, credential availability, and type before it writes the
   `instance_credential_assignment` row:

	```typescript
	await broker.assignForUse('my-feature:purpose', credentialId);
	await broker.clearForUse('my-feature:purpose');
	```

4. **Resolve at runtime** with the credential use ID. The broker reads the assignment,
   repeats the policy checks, and decrypts the credential on the server:

	```typescript
	await broker.resolveForUse('my-feature:purpose');
	```

Apply your feature's deployment and license gates before broker calls; the broker
enforces credential policy, not feature availability. The assignment foreign key
prevents credential deletion while it has any assignment. Feature settings should
store only feature data. If that data depends on the credential, update it in the
same transaction as the assignment.

For a complete example, see the `instance-ai:model`, sandbox, and search credential uses
in `packages/cli/src/modules/instance-ai/`.
