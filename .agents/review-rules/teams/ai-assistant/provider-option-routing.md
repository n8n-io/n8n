Applies to: model selection and thinking configuration in packages/@n8n/instance-ai/.

Trace each environment option to the selected provider and the wire request.
Custom-model options must not change another provider's request body. Check
that thinking and reasoning settings reach same-provider sub-agents through
the shared Agents configuration. A unit test of the parser alone does not
show that the request uses the setting.
