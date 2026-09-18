# Prefer declarative routing for nodes that only send one HTTP request per item (`@n8n/community-nodes/prefer-declarative-style`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule reports a programmatic node when its `execute()` method only sends one HTTP request for each input item. Use `routing`, `requestDefaults`, and credential `authenticate` settings for this node instead.

The rule does not report trigger nodes, pagination logic, binary data handling, non-HTTP transports, multiple requests, multiple outputs, or workflow static data access.
