Applies to: provider options and model request adapters in packages/@n8n/agents/.

Gate each provider quirk to that provider. Check the serialized request, not
only the option type. A custom-provider fix must not add fields to requests
for other providers. Check the default path with the option unset.
