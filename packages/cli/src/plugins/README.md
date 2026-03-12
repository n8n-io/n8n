# Plugin Registry

The plugin registry allows third-party integrations to inject managed credentials
into n8n nodes at runtime. Instance owners configure the integration once in
**Settings → Plugins**; end users opt in per credential via a boolean toggle defined
on the credential type.

## How it works

1. A `PluginDescriptor` is added to `PLUGIN_REGISTRY` in `plugin-registry.ts`.
2. The credential type defines the opt-in toggle field and `displayOptions` to hide
   managed fields when the toggle is on (see "Credential type changes" below).
3. The backend exposes the registry via `GET /api/v1/plugins-settings`.
4. The frontend (`CredentialConfig.vue`) detects a matching plugin and shows a warning
   banner when the toggle is on but the plugin is disabled.
5. At execution time, `PluginsSettingsService.injectPluginManagedCredentials()` reads
   the admin-configured values and overwrites the managed credential fields.

## Adding a new plugin

### 1. Register the plugin

Add an entry to `PLUGIN_REGISTRY` in [plugin-registry.ts](./plugin-registry.ts):

```typescript
{
  id: 'myPlugin',              // unique ID, also used as DB key prefix: plugins.myPlugin.*
  displayName: 'My Plugin',   // shown in Settings UI and error messages
  description: 'Short description shown in Settings → Plugins',
  credentialType: 'myPluginApi',  // must match the n8n credential type name exactly
  managedToggleField: 'useManagedApiKey',  // boolean field name on the credential type
  managedFields: [
    {
      credentialField: 'apiKey',  // field name on the credential type to overwrite
      storageKey: 'apiKey',       // sub-key in DB: plugins.myPlugin.apiKey
      label: 'API Key',           // label shown in Settings UI
      placeholder: 'Enter your API key',
    },
  ],
},
```

If a plugin has no managed fields (`managedFields: []`), no credentials are injected
and the toggle can be omitted.

### 2. Update the credential type

> **Note:** Currently the credential type must be modified to define the toggle and
> hide conditions. This is a temporary requirement — see "Future improvement" below.

Add the toggle field and `displayOptions` to hide managed fields when the toggle is on:

```typescript
properties: [
  {
    displayName: 'Use Managed API Key',
    name: 'useManagedApiKey',        // must match managedToggleField in registry
    type: 'boolean',
    default: false,
  },
  {
    displayName: 'API Key',
    name: 'apiKey',
    type: 'string',
    typeOptions: { password: true },
    default: '',
    displayOptions: {
      show: { useManagedApiKey: [false] },  // hide when toggle is on
    },
  },
],
```

## Future improvement

> The requirement to modify the credential type file is a known limitation. The goal
> is to make this fully automatic: the framework should inject the toggle and
> `displayOptions` dynamically based on the registry, so original credential type files
> do not need to be touched. This work is tracked and will replace the manual step above.

## How injection works at runtime

`injectPluginManagedCredentials(type, data)` in `plugins-settings.service.ts`:

1. Looks up the plugin by credential type — skips if none found
2. Checks `data[managedToggleField]` — skips injection if falsy (toggle off or not set)
3. Checks if the plugin is enabled — throws `UserError` if not (user opted in but plugin
   is disabled)
4. Overwrites each `credentialField` with the admin-stored value

**Important:** `data` passed to injection is the post-`applyDefaultsAndOverwrites` data.
Because `useManagedApiKey` is defined in the credential type properties, it survives
`applyDefaultsAndOverwrites` and is present in `data` at injection time.

## Storage layout

All plugin data lives in the `Settings` table:

| Key | Value |
|-----|-------|
| `plugins.{id}.enabled` | `"true"` or `"false"` |
| `plugins.{id}.{storageKey}` | Cipher-encrypted field value |

Managed field values are encrypted with the instance encryption key via `Cipher`.
