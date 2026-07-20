# Instance credentials

Instance credentials are credential rows with `availability: 'instance'`. Owners and
admins manage them through the global `credential:manageInstance` scope. They have no
`SharedCredentials` owner row and workflows cannot use them.

`InstanceCredentialBroker` is the only feature-facing API for consuming them. A
**consumer ID** is a stable feature-purpose key (for example `instance-ai:model`)
identifying trusted backend code, not a user. Unknown consumers, workflow
credentials, and disallowed credential types fail closed.

## Integrating a feature

1. **Register one consumer for each credential use** during module init:

   ```typescript
	Container.get(InstanceCredentialBroker).registerConsumer({
		id: 'my-feature:purpose',
		credentialTypes: ['someApi'],
	});
	```

2. **List matching credentials.** Only `id`, `name`, and `type` are returned:

   ```typescript
   await broker.listForConsumer('my-feature:purpose');
   ```

3. **Assign or clear the credential through the broker.** The broker validates the
   consumer, credential availability, and type before it writes the
   `instance_credential_assignment` row:

	```typescript
	await broker.assignForConsumer('my-feature:purpose', credentialId);
	await broker.clearForConsumer('my-feature:purpose');
	```

4. **Resolve at runtime** with the consumer ID. The broker reads the assignment,
   repeats the policy checks, and decrypts the credential on the server:

	```typescript
	await broker.resolveForConsumer('my-feature:purpose');
	```

Apply your feature's deployment and license gates before broker calls; the broker
enforces credential policy, not feature availability. The assignment foreign key
prevents credential deletion while any consumer uses it. Feature settings should
store only feature data. If that data depends on the credential, update it in the
same transaction as the assignment.

For a complete example, see the `instance-ai:model`, sandbox, and search consumers
in `packages/cli/src/modules/instance-ai/`.
