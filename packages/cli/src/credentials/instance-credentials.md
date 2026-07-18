# Instance credentials

Instance credentials are credential rows with `availability: 'instance'`. They are
created and managed only by owners/admins (global scope `credential:manageInstance`,
Settings > Instance credentials), are ownerless (no `SharedCredentials` row), and can
never be used in the workflow canvas or by workflow executions. They exist so an
admin can configure a secret once for an instance-level feature (for example the
Instance AI model key) without exposing it to every user's workflows.

`InstanceCredentialBroker` is the only feature-facing API for consuming them. A
**consumer ID** is a stable feature-purpose key (for example `instance-ai:model`)
identifying trusted backend code, not a user. Unknown consumers, workflow
credentials, and disallowed credential types fail closed.

## Integrating a feature

1. **Register a consumer** during module init, with the allowed credential types and
   an in-use check that reads your feature's persisted settings (this powers generic
   deletion protection, so it must not depend on process-local state):

   ```typescript
   Container.get(InstanceCredentialBroker).registerConsumer({
		id: 'my-feature:purpose',
		credentialTypes: ['someApi'],
		isCredentialInUse: async (credentialId) =>
			await myFeatureSettings.isCredentialInUse(credentialId),
   });
   ```

2. **Store the selected credential ID in your feature's own settings.** The setting
   reference is the assignment; there is no credential-to-consumer table.

3. **List for your admin picker** through the broker, behind your feature's own
   management scope. Only `id`, `name`, and `type` are returned:

   ```typescript
   await broker.listForConsumer('my-feature:purpose');
   ```

4. **Resolve at runtime** through a purpose-specific wrapper that fixes the consumer
   ID, so ordinary callers never supply policy. Decryption happens backend-only;
   never return the data in an API response:

   ```typescript
   private async resolveMyCredential(credentialId: string) {
		return await this.instanceCredentialBroker.resolveForConsumer(
			'my-feature:purpose',
			credentialId,
		);
   }
   ```

Apply your feature's deployment and license gates before broker calls; the broker
enforces credential policy, not feature availability. For a complete example, see
the `instance-ai:model`, `instance-ai:sandbox`, and `instance-ai:search` consumers
in `packages/cli/src/modules/instance-ai/`.
