# Instance credentials

Instance credentials are credential rows with `availability: 'instance'`. Owners and
admins manage them through the global `credential:manageInstance` scope. They have no
`SharedCredentials` owner row and workflows cannot use them.

`InstanceCredentialBroker` is the only feature-facing API for using them. A
**credential use** is a stable feature-purpose policy (for example `instance-ai:model`)
that identifies trusted backend code, not a user. Workflow credentials and disallowed
credential types fail closed.

## Integrating a feature

1. **Define each credential use** as an exported const the feature passes to every
   broker call, so the feature uses one typed policy object consistently:

   ```typescript
   export const MY_FEATURE_CREDENTIAL_USE: InstanceCredentialUse = {
   	id: 'my-feature:purpose',
   	credentialTypes: ['someApi'],
   };
   ```

2. **Register every use during module initialization**, before loading settings or
   making broker calls:

   ```typescript
   broker.registerUse(MY_FEATURE_CREDENTIAL_USE);
   ```

   Unregistered use IDs fail closed. The broker always enforces the registered
   credential types, even if a caller passes a different policy object with the same ID.

3. **List matching credentials.** Only `id`, `name`, and `type` are returned:

   ```typescript
   await broker.listForUse(MY_FEATURE_CREDENTIAL_USE);
   ```

4. **Assign or clear the credential through the broker.** The broker validates the
   credential availability and type before it writes the
   `instance_credential_assignment` row:

   ```typescript
   await broker.assignForUse(MY_FEATURE_CREDENTIAL_USE, credentialId);
   await broker.clearForUse(MY_FEATURE_CREDENTIAL_USE);
   ```

5. **Resolve at runtime** with the credential use. The broker reads the assignment,
   repeats the policy checks, and decrypts the credential on the server:

   ```typescript
   await broker.resolveForUse(MY_FEATURE_CREDENTIAL_USE);
   ```

Apply your feature's deployment and license gates before broker calls; the broker
enforces credential policy, not feature availability. The assignment foreign key
prevents credential deletion while it has any assignment. Feature settings should
store only feature data. If that data depends on the credential, update it in the
same transaction as the assignment.

For a complete example, see the `instance-ai:model`, sandbox, and search credential uses
in `packages/cli/src/modules/instance-ai/`.
