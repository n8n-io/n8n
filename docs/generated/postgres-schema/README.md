# n8n database schema (PostgreSQL)

## Description

Auto-generated from the PostgreSQL migrations in @n8n/db. Do not edit by hand.

## Tables

| Name | Columns | Comment | Type |
| ---- | ------- | ------- | ---- |
| [public.credentials_entity](public.credentials_entity.md) | 11 |  | BASE TABLE |
| [public.execution_entity](public.execution_entity.md) | 17 |  | BASE TABLE |
| [public.workflow_entity](public.workflow_entity.md) | 20 |  | BASE TABLE |
| [public.webhook_entity](public.webhook_entity.md) | 6 |  | BASE TABLE |
| [public.tag_entity](public.tag_entity.md) | 4 |  | BASE TABLE |
| [public.workflows_tags](public.workflows_tags.md) | 2 |  | BASE TABLE |
| [public.user](public.user.md) | 15 |  | BASE TABLE |
| [public.settings](public.settings.md) | 3 |  | BASE TABLE |
| [public.installed_packages](public.installed_packages.md) | 6 |  | BASE TABLE |
| [public.installed_nodes](public.installed_nodes.md) | 4 |  | BASE TABLE |
| [public.workflow_statistics](public.workflow_statistics.md) | 7 |  | BASE TABLE |
| [public.event_destinations](public.event_destinations.md) | 4 |  | BASE TABLE |
| [public.auth_identity](public.auth_identity.md) | 5 |  | BASE TABLE |
| [public.auth_provider_sync_history](public.auth_provider_sync_history.md) | 11 |  | BASE TABLE |
| [public.variables](public.variables.md) | 5 |  | BASE TABLE |
| [public.execution_data](public.execution_data.md) | 4 |  | BASE TABLE |
| [public.workflow_history](public.workflow_history.md) | 11 |  | BASE TABLE |
| [public.project](public.project.md) | 9 |  | BASE TABLE |
| [public.project_relation](public.project_relation.md) | 5 |  | BASE TABLE |
| [public.shared_credentials](public.shared_credentials.md) | 5 |  | BASE TABLE |
| [public.shared_workflow](public.shared_workflow.md) | 5 |  | BASE TABLE |
| [public.execution_metadata](public.execution_metadata.md) | 4 |  | BASE TABLE |
| [public.invalid_auth_token](public.invalid_auth_token.md) | 2 |  | BASE TABLE |
| [public.execution_annotations](public.execution_annotations.md) | 6 |  | BASE TABLE |
| [public.annotation_tag_entity](public.annotation_tag_entity.md) | 4 |  | BASE TABLE |
| [public.execution_annotation_tags](public.execution_annotation_tags.md) | 2 |  | BASE TABLE |
| [public.user_api_keys](public.user_api_keys.md) | 9 |  | BASE TABLE |
| [public.processed_data](public.processed_data.md) | 5 |  | BASE TABLE |
| [public.folder](public.folder.md) | 6 |  | BASE TABLE |
| [public.folder_tag](public.folder_tag.md) | 2 |  | BASE TABLE |
| [public.insights_metadata](public.insights_metadata.md) | 5 |  | BASE TABLE |
| [public.insights_raw](public.insights_raw.md) | 5 |  | BASE TABLE |
| [public.insights_by_period](public.insights_by_period.md) | 6 |  | BASE TABLE |
| [public.test_run](public.test_run.md) | 16 |  | BASE TABLE |
| [public.test_case_execution](public.test_case_execution.md) | 14 |  | BASE TABLE |
| [public.scope](public.scope.md) | 3 |  | BASE TABLE |
| [public.role](public.role.md) | 7 |  | BASE TABLE |
| [public.role_scope](public.role_scope.md) | 2 |  | BASE TABLE |
| [public.data_table](public.data_table.md) | 5 |  | BASE TABLE |
| [public.data_table_column](public.data_table_column.md) | 7 |  | BASE TABLE |
| [public.chat_hub_sessions](public.chat_hub_sessions.md) | 13 |  | BASE TABLE |
| [public.chat_hub_messages](public.chat_hub_messages.md) | 17 |  | BASE TABLE |
| [public.chat_hub_agents](public.chat_hub_agents.md) | 13 |  | BASE TABLE |
| [public.oauth_clients](public.oauth_clients.md) | 9 |  | BASE TABLE |
| [public.oauth_authorization_codes](public.oauth_authorization_codes.md) | 13 |  | BASE TABLE |
| [public.oauth_access_tokens](public.oauth_access_tokens.md) | 3 |  | BASE TABLE |
| [public.oauth_refresh_tokens](public.oauth_refresh_tokens.md) | 7 |  | BASE TABLE |
| [public.oauth_user_consents](public.oauth_user_consents.md) | 4 |  | BASE TABLE |
| [public.workflow_dependency](public.workflow_dependency.md) | 9 |  | BASE TABLE |
| [public.binary_data](public.binary_data.md) | 9 |  | BASE TABLE |
| [public.workflow_publish_history](public.workflow_publish_history.md) | 6 |  | BASE TABLE |
| [public.dynamic_credential_resolver](public.dynamic_credential_resolver.md) | 6 |  | BASE TABLE |
| [public.dynamic_credential_user_entry](public.dynamic_credential_user_entry.md) | 6 |  | BASE TABLE |
| [public.secrets_provider_connection](public.secrets_provider_connection.md) | 7 |  | BASE TABLE |
| [public.project_secrets_provider_access](public.project_secrets_provider_access.md) | 5 |  | BASE TABLE |
| [public.workflow_published_version](public.workflow_published_version.md) | 4 |  | BASE TABLE |
| [public.dynamic_credential_entry](public.dynamic_credential_entry.md) | 6 |  | BASE TABLE |
| [public.chat_hub_tools](public.chat_hub_tools.md) | 9 |  | BASE TABLE |
| [public.chat_hub_session_tools](public.chat_hub_session_tools.md) | 2 |  | BASE TABLE |
| [public.chat_hub_agent_tools](public.chat_hub_agent_tools.md) | 2 |  | BASE TABLE |
| [public.workflow_builder_session](public.workflow_builder_session.md) | 9 |  | BASE TABLE |
| [public.role_mapping_rule](public.role_mapping_rule.md) | 7 |  | BASE TABLE |
| [public.role_mapping_rule_project](public.role_mapping_rule_project.md) | 2 |  | BASE TABLE |
| [public.credential_dependency](public.credential_dependency.md) | 5 |  | BASE TABLE |
| [public.instance_version_history](public.instance_version_history.md) | 5 |  | BASE TABLE |
| [public.instance_ai_threads](public.instance_ai_threads.md) | 7 |  | BASE TABLE |
| [public.instance_ai_messages](public.instance_ai_messages.md) | 8 |  | BASE TABLE |
| [public.instance_ai_resources](public.instance_ai_resources.md) | 5 |  | BASE TABLE |
| [public.instance_ai_observational_memory](public.instance_ai_observational_memory.md) | 32 |  | BASE TABLE |
| [public.instance_ai_workflow_snapshots](public.instance_ai_workflow_snapshots.md) | 7 |  | BASE TABLE |
| [public.instance_ai_run_snapshots](public.instance_ai_run_snapshots.md) | 11 |  | BASE TABLE |
| [public.instance_ai_iteration_logs](public.instance_ai_iteration_logs.md) | 6 |  | BASE TABLE |
| [public.token_exchange_jti](public.token_exchange_jti.md) | 3 |  | BASE TABLE |
| [public.trusted_key_source](public.trusted_key_source.md) | 8 |  | BASE TABLE |
| [public.trusted_key](public.trusted_key.md) | 4 |  | BASE TABLE |
| [public.user_favorites](public.user_favorites.md) | 4 |  | BASE TABLE |
| [public.deployment_key](public.deployment_key.md) | 7 |  | BASE TABLE |
| [public.ai_builder_temporary_workflow](public.ai_builder_temporary_workflow.md) | 4 |  | BASE TABLE |
| [public.evaluation_config](public.evaluation_config.md) | 12 |  | BASE TABLE |
| [public.evaluation_collection](public.evaluation_collection.md) | 9 |  | BASE TABLE |
| [public.agents](public.agents.md) | 12 |  | BASE TABLE |
| [public.agent_checkpoints](public.agent_checkpoints.md) | 6 |  | BASE TABLE |
| [public.agents_resources](public.agents_resources.md) | 4 |  | BASE TABLE |
| [public.agents_threads](public.agents_threads.md) | 6 |  | BASE TABLE |
| [public.agents_messages](public.agents_messages.md) | 8 |  | BASE TABLE |
| [public.agent_execution_threads](public.agent_execution_threads.md) | 17 |  | BASE TABLE |
| [public.agent_execution](public.agent_execution.md) | 20 |  | BASE TABLE |
| [public.instance_ai_checkpoints](public.instance_ai_checkpoints.md) | 8 |  | BASE TABLE |
| [public.agents_observations](public.agents_observations.md) | 11 |  | BASE TABLE |
| [public.agents_observation_cursors](public.agents_observation_cursors.md) | 6 |  | BASE TABLE |
| [public.agents_observation_locks](public.agents_observation_locks.md) | 7 |  | BASE TABLE |
| [public.agents_memory_entries](public.agents_memory_entries.md) | 13 |  | BASE TABLE |
| [public.agents_memory_entry_locks](public.agents_memory_entry_locks.md) | 6 |  | BASE TABLE |
| [public.agents_memory_entry_sources](public.agents_memory_entry_sources.md) | 9 |  | BASE TABLE |
| [public.agents_memory_entry_cursors](public.agents_memory_entry_cursors.md) | 6 |  | BASE TABLE |
| [public.agent_history](public.agent_history.md) | 9 |  | BASE TABLE |
| [public.instance_ai_observations](public.instance_ai_observations.md) | 10 |  | BASE TABLE |
| [public.instance_ai_observation_cursors](public.instance_ai_observation_cursors.md) | 5 |  | BASE TABLE |
| [public.instance_ai_observation_locks](public.instance_ai_observation_locks.md) | 6 |  | BASE TABLE |
| [public.instance_ai_pending_confirmations](public.instance_ai_pending_confirmations.md) | 12 |  | BASE TABLE |
| [public.mcp_registry_server](public.mcp_registry_server.md) | 7 |  | BASE TABLE |
| [public.agent_files](public.agent_files.md) | 8 |  | BASE TABLE |
| [public.agent_task_definition](public.agent_task_definition.md) | 7 |  | BASE TABLE |
| [public.agent_task_snapshot](public.agent_task_snapshot.md) | 8 |  | BASE TABLE |
| [public.agent_task_run_lock](public.agent_task_run_lock.md) | 6 |  | BASE TABLE |
| [public.instance_ai_mcp_registry_connections](public.instance_ai_mcp_registry_connections.md) | 7 |  | BASE TABLE |
| [public.workflow_publication_outbox](public.workflow_publication_outbox.md) | 7 |  | BASE TABLE |
| [public.agent_chat_subscriptions](public.agent_chat_subscriptions.md) | 6 |  | BASE TABLE |

## Stored procedures and functions

| Name | ReturnType | Arguments | Type |
| ---- | ------- | ------- | ---- |
| public.uuid_nil | uuid |  | FUNCTION |
| public.uuid_ns_dns | uuid |  | FUNCTION |
| public.uuid_ns_url | uuid |  | FUNCTION |
| public.uuid_ns_oid | uuid |  | FUNCTION |
| public.uuid_ns_x500 | uuid |  | FUNCTION |
| public.uuid_generate_v1 | uuid |  | FUNCTION |
| public.uuid_generate_v1mc | uuid |  | FUNCTION |
| public.uuid_generate_v3 | uuid | namespace uuid, name text | FUNCTION |
| public.uuid_generate_v4 | uuid |  | FUNCTION |
| public.uuid_generate_v5 | uuid | namespace uuid, name text | FUNCTION |
| public.increment_workflow_version | trigger |  | FUNCTION |

## Relations

```mermaid
erDiagram

"public.credentials_entity" }o--o| "public.dynamic_credential_resolver" : "FOREIGN KEY (#quot;resolverId#quot;) REFERENCES dynamic_credential_resolver(id) ON DELETE SET NULL"
"public.execution_entity" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.workflow_entity" }o--o| "public.workflow_history" : "FOREIGN KEY (#quot;activeVersionId#quot;) REFERENCES workflow_history(#quot;versionId#quot;) ON DELETE RESTRICT"
"public.workflow_entity" }o--o| "public.folder" : "FOREIGN KEY (#quot;parentFolderId#quot;) REFERENCES folder(id) ON DELETE CASCADE"
"public.webhook_entity" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.workflows_tags" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.workflows_tags" }o--|| "public.tag_entity" : "FOREIGN KEY (#quot;tagId#quot;) REFERENCES tag_entity(id) ON DELETE CASCADE"
"public.user" }o--|| "public.role" : "FOREIGN KEY (#quot;roleSlug#quot;) REFERENCES role(slug)"
"public.installed_nodes" }o--|| "public.installed_packages" : "FOREIGN KEY (package) REFERENCES installed_packages(#quot;packageName#quot;) ON UPDATE CASCADE ON DELETE CASCADE"
"public.auth_identity" }o--o| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id)"
"public.variables" }o--o| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.execution_data" |o--|| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE CASCADE"
"public.workflow_history" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.project" }o--o| "public.user" : "FOREIGN KEY (#quot;creatorId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"
"public.project_relation" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.project_relation" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.project_relation" }o--|| "public.role" : "FOREIGN KEY (role) REFERENCES role(slug)"
"public.shared_credentials" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialsId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.shared_credentials" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.shared_workflow" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.shared_workflow" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.execution_metadata" }o--|| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE CASCADE"
"public.execution_annotations" }o--|| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE CASCADE"
"public.execution_annotation_tags" }o--|| "public.execution_annotations" : "FOREIGN KEY (#quot;annotationId#quot;) REFERENCES execution_annotations(id) ON DELETE CASCADE"
"public.execution_annotation_tags" }o--|| "public.annotation_tag_entity" : "FOREIGN KEY (#quot;tagId#quot;) REFERENCES annotation_tag_entity(id) ON DELETE CASCADE"
"public.user_api_keys" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.processed_data" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.folder" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.folder" }o--o| "public.folder" : "FOREIGN KEY (#quot;parentFolderId#quot;) REFERENCES folder(id) ON DELETE CASCADE"
"public.folder_tag" }o--|| "public.tag_entity" : "FOREIGN KEY (#quot;tagId#quot;) REFERENCES tag_entity(id) ON DELETE CASCADE"
"public.folder_tag" }o--|| "public.folder" : "FOREIGN KEY (#quot;folderId#quot;) REFERENCES folder(id) ON DELETE CASCADE"
"public.insights_metadata" }o--o| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE SET NULL"
"public.insights_metadata" }o--o| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE SET NULL"
"public.insights_raw" }o--|| "public.insights_metadata" : "FOREIGN KEY (#quot;metaId#quot;) REFERENCES insights_metadata(#quot;metaId#quot;) ON DELETE CASCADE"
"public.insights_by_period" }o--|| "public.insights_metadata" : "FOREIGN KEY (#quot;metaId#quot;) REFERENCES insights_metadata(#quot;metaId#quot;) ON DELETE CASCADE"
"public.test_run" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.test_run" }o--o| "public.evaluation_config" : "FOREIGN KEY (#quot;evaluationConfigId#quot;) REFERENCES evaluation_config(id) ON DELETE SET NULL"
"public.test_run" }o--o| "public.evaluation_collection" : "FOREIGN KEY (#quot;collectionId#quot;) REFERENCES evaluation_collection(id) ON DELETE SET NULL"
"public.test_case_execution" }o--o| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE SET NULL"
"public.test_case_execution" }o--|| "public.test_run" : "FOREIGN KEY (#quot;testRunId#quot;) REFERENCES test_run(id) ON DELETE CASCADE"
"public.role_scope" }o--|| "public.scope" : "FOREIGN KEY (#quot;scopeSlug#quot;) REFERENCES scope(slug) ON UPDATE CASCADE ON DELETE CASCADE"
"public.role_scope" }o--|| "public.role" : "FOREIGN KEY (#quot;roleSlug#quot;) REFERENCES role(slug) ON UPDATE CASCADE ON DELETE CASCADE"
"public.data_table" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.data_table_column" }o--|| "public.data_table" : "FOREIGN KEY (#quot;dataTableId#quot;) REFERENCES data_table(id) ON DELETE CASCADE"
"public.chat_hub_sessions" }o--|| "public.user" : "FOREIGN KEY (#quot;ownerId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.chat_hub_sessions" }o--o| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE SET NULL"
"public.chat_hub_sessions" }o--o| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE SET NULL"
"public.chat_hub_sessions" }o--o| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE SET NULL"
"public.chat_hub_messages" }o--o| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE SET NULL"
"public.chat_hub_messages" }o--o| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE SET NULL"
"public.chat_hub_messages" }o--|| "public.chat_hub_sessions" : "FOREIGN KEY (#quot;sessionId#quot;) REFERENCES chat_hub_sessions(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--o| "public.chat_hub_messages" : "FOREIGN KEY (#quot;revisionOfMessageId#quot;) REFERENCES chat_hub_messages(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--o| "public.chat_hub_messages" : "FOREIGN KEY (#quot;retryOfMessageId#quot;) REFERENCES chat_hub_messages(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--o| "public.chat_hub_messages" : "FOREIGN KEY (#quot;previousMessageId#quot;) REFERENCES chat_hub_messages(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--o| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE SET NULL"
"public.chat_hub_agents" }o--|| "public.user" : "FOREIGN KEY (#quot;ownerId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.chat_hub_agents" }o--o| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE SET NULL"
"public.oauth_authorization_codes" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.oauth_authorization_codes" }o--|| "public.oauth_clients" : "FOREIGN KEY (#quot;clientId#quot;) REFERENCES oauth_clients(id) ON DELETE CASCADE"
"public.oauth_access_tokens" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.oauth_access_tokens" }o--|| "public.oauth_clients" : "FOREIGN KEY (#quot;clientId#quot;) REFERENCES oauth_clients(id) ON DELETE CASCADE"
"public.oauth_refresh_tokens" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.oauth_refresh_tokens" }o--|| "public.oauth_clients" : "FOREIGN KEY (#quot;clientId#quot;) REFERENCES oauth_clients(id) ON DELETE CASCADE"
"public.oauth_user_consents" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.oauth_user_consents" }o--|| "public.oauth_clients" : "FOREIGN KEY (#quot;clientId#quot;) REFERENCES oauth_clients(id) ON DELETE CASCADE"
"public.workflow_dependency" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.workflow_publish_history" }o--o| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"
"public.workflow_publish_history" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.workflow_publish_history" }o--o| "public.workflow_history" : "FOREIGN KEY (#quot;versionId#quot;) REFERENCES workflow_history(#quot;versionId#quot;) ON DELETE SET NULL"
"public.dynamic_credential_user_entry" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.dynamic_credential_user_entry" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.dynamic_credential_user_entry" }o--|| "public.dynamic_credential_resolver" : "FOREIGN KEY (#quot;resolverId#quot;) REFERENCES dynamic_credential_resolver(id) ON DELETE CASCADE"
"public.project_secrets_provider_access" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.project_secrets_provider_access" }o--|| "public.secrets_provider_connection" : "FOREIGN KEY (#quot;secretsProviderConnectionId#quot;) REFERENCES secrets_provider_connection(id) ON DELETE CASCADE"
"public.workflow_published_version" |o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE RESTRICT"
"public.workflow_published_version" }o--|| "public.workflow_history" : "FOREIGN KEY (#quot;publishedVersionId#quot;) REFERENCES workflow_history(#quot;versionId#quot;) ON DELETE RESTRICT"
"public.dynamic_credential_entry" }o--|| "public.credentials_entity" : "FOREIGN KEY (credential_id) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.dynamic_credential_entry" }o--|| "public.dynamic_credential_resolver" : "FOREIGN KEY (resolver_id) REFERENCES dynamic_credential_resolver(id) ON DELETE CASCADE"
"public.chat_hub_tools" }o--|| "public.user" : "FOREIGN KEY (#quot;ownerId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.chat_hub_session_tools" }o--|| "public.chat_hub_sessions" : "FOREIGN KEY (#quot;sessionId#quot;) REFERENCES chat_hub_sessions(id) ON DELETE CASCADE"
"public.chat_hub_session_tools" }o--|| "public.chat_hub_tools" : "FOREIGN KEY (#quot;toolId#quot;) REFERENCES chat_hub_tools(id) ON DELETE CASCADE"
"public.chat_hub_agent_tools" }o--|| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE CASCADE"
"public.chat_hub_agent_tools" }o--|| "public.chat_hub_tools" : "FOREIGN KEY (#quot;toolId#quot;) REFERENCES chat_hub_tools(id) ON DELETE CASCADE"
"public.workflow_builder_session" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.workflow_builder_session" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.role_mapping_rule" }o--|| "public.role" : "FOREIGN KEY (role) REFERENCES role(slug) ON UPDATE CASCADE ON DELETE CASCADE"
"public.role_mapping_rule_project" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.role_mapping_rule_project" }o--|| "public.role_mapping_rule" : "FOREIGN KEY (#quot;roleMappingRuleId#quot;) REFERENCES role_mapping_rule(id) ON DELETE CASCADE"
"public.credential_dependency" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.instance_ai_threads" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.instance_ai_messages" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_observational_memory" }o--o| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE SET NULL"
"public.instance_ai_run_snapshots" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_iteration_logs" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.trusted_key" }o--|| "public.trusted_key_source" : "FOREIGN KEY (#quot;sourceId#quot;) REFERENCES trusted_key_source(id) ON DELETE CASCADE"
"public.user_favorites" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.ai_builder_temporary_workflow" |o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.ai_builder_temporary_workflow" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.evaluation_config" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.evaluation_collection" }o--o| "public.user" : "FOREIGN KEY (#quot;createdById#quot;) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"
"public.evaluation_collection" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.evaluation_collection" }o--|| "public.evaluation_config" : "FOREIGN KEY (#quot;evaluationConfigId#quot;) REFERENCES evaluation_config(id) ON DELETE CASCADE"
"public.agents" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.agents" }o--o| "public.agent_history" : "FOREIGN KEY (#quot;activeVersionId#quot;) REFERENCES agent_history(#quot;versionId#quot;) ON DELETE SET NULL"
"public.agent_checkpoints" }o--o| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_messages" }o--|| "public.agents_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES agents_threads(id) ON DELETE CASCADE"
"public.agent_execution_threads" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.agent_execution_threads" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_execution_threads" }o--o| "public.agent_history" : "FOREIGN KEY (#quot;taskVersionId#quot;) REFERENCES agent_history(#quot;versionId#quot;) ON DELETE SET NULL"
"public.agent_execution" }o--|| "public.agent_execution_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES agent_execution_threads(id) ON DELETE CASCADE"
"public.instance_ai_checkpoints" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.agents_observations" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_observations" }o--o| "public.agents_observations" : "FOREIGN KEY (#quot;supersededBy#quot;) REFERENCES agents_observations(id)"
"public.agents_observations" }o--o| "public.agents_observations" : "FOREIGN KEY (#quot;parentId#quot;) REFERENCES agents_observations(id)"
"public.agents_observations" }o--|| "public.agents_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES agents_threads(id) ON DELETE CASCADE"
"public.agents_observation_cursors" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_observation_cursors" }o--|| "public.agents_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES agents_threads(id) ON DELETE CASCADE"
"public.agents_observation_locks" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_observation_locks" }o--|| "public.agents_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES agents_threads(id) ON DELETE CASCADE"
"public.agents_memory_entries" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entries" }o--|| "public.agents_resources" : "FOREIGN KEY (#quot;resourceId#quot;) REFERENCES agents_resources(id) ON DELETE CASCADE"
"public.agents_memory_entries" }o--o| "public.agents_memory_entries" : "FOREIGN KEY (#quot;supersededBy#quot;) REFERENCES agents_memory_entries(id)"
"public.agents_memory_entry_locks" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entry_locks" }o--|| "public.agents_resources" : "FOREIGN KEY (#quot;resourceId#quot;) REFERENCES agents_resources(id) ON DELETE CASCADE"
"public.agents_memory_entry_sources" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entry_sources" }o--|| "public.agents_observations" : "FOREIGN KEY (#quot;observationId#quot;) REFERENCES agents_observations(id) ON DELETE CASCADE"
"public.agents_memory_entry_sources" }o--|| "public.agents_memory_entries" : "FOREIGN KEY (#quot;memoryEntryId#quot;) REFERENCES agents_memory_entries(id) ON DELETE CASCADE"
"public.agents_memory_entry_sources" }o--|| "public.agents_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES agents_threads(id) ON DELETE CASCADE"
"public.agents_memory_entry_cursors" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entry_cursors" }o--|| "public.agents_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES agents_threads(id) ON DELETE CASCADE"
"public.agent_history" }o--o| "public.user" : "FOREIGN KEY (#quot;publishedById#quot;) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"
"public.agent_history" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.instance_ai_observations" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_observations" }o--o| "public.instance_ai_observations" : "FOREIGN KEY (#quot;supersededBy#quot;) REFERENCES instance_ai_observations(id)"
"public.instance_ai_observations" }o--o| "public.instance_ai_observations" : "FOREIGN KEY (#quot;parentId#quot;) REFERENCES instance_ai_observations(id)"
"public.instance_ai_observation_cursors" |o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_observation_locks" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_pending_confirmations" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.instance_ai_pending_confirmations" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_pending_confirmations" }o--o| "public.instance_ai_checkpoints" : "FOREIGN KEY (#quot;checkpointKey#quot;) REFERENCES instance_ai_checkpoints(key) ON DELETE CASCADE"
"public.agent_files" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_task_definition" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_task_snapshot" }o--|| "public.agent_history" : "FOREIGN KEY (#quot;versionId#quot;) REFERENCES agent_history(#quot;versionId#quot;) ON DELETE CASCADE"
"public.agent_task_run_lock" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.instance_ai_mcp_registry_connections" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.instance_ai_mcp_registry_connections" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.instance_ai_mcp_registry_connections" }o--|| "public.mcp_registry_server" : "FOREIGN KEY (#quot;serverSlug#quot;) REFERENCES mcp_registry_server(slug) ON DELETE CASCADE"
"public.agent_chat_subscriptions" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"

"public.credentials_entity" {
  varchar_128_ name
  text data
  varchar_128_ type
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  varchar_36_ id
  boolean isManaged
  boolean isGlobal
  boolean isResolvable
  boolean resolvableAllowFallback
  varchar_16_ resolverId FK
}
"public.execution_entity" {
  integer id
  boolean finished
  varchar mode
  varchar retryOf
  varchar retrySuccessId
  timestamp_3__with_time_zone startedAt
  timestamp_3__with_time_zone stoppedAt
  timestamp_3__with_time_zone waitTill
  varchar status
  varchar_36_ workflowId FK
  timestamp_3__with_time_zone deletedAt
  timestamp_3__with_time_zone createdAt
  varchar_2_ storedAt
  json tracingContext
  varchar_255_ deduplicationKey
  bigint jsonSizeBytes
  varchar_36_ workflowVersionId
}
"public.workflow_entity" {
  varchar_128_ name
  boolean active
  json nodes
  json connections
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  json settings
  json staticData
  json pinData
  character_36_ versionId
  integer triggerCount
  varchar_36_ id
  json meta
  varchar_36_ parentFolderId FK
  boolean isArchived
  integer versionCounter
  text description
  varchar_36_ activeVersionId FK
  json nodeGroups
  varchar sourceWorkflowId
}
"public.webhook_entity" {
  varchar webhookPath
  varchar method
  varchar node
  varchar webhookId
  integer pathLength
  varchar_36_ workflowId FK
}
"public.tag_entity" {
  varchar_24_ name
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  varchar_36_ id
}
"public.workflows_tags" {
  varchar_36_ workflowId FK
  varchar_36_ tagId FK
}
"public.user" {
  uuid id
  varchar_255_ email
  varchar_32_ firstName
  varchar_32_ lastName
  varchar_255_ password
  json personalizationAnswers
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  json settings
  boolean disabled
  boolean mfaEnabled
  text mfaSecret
  text mfaRecoveryCodes
  date lastActiveAt
  varchar_128_ roleSlug FK
}
"public.settings" {
  varchar_255_ key
  text value
  boolean loadOnStartup
}
"public.installed_packages" {
  varchar_214_ packageName
  varchar_50_ installedVersion
  varchar_70_ authorName
  varchar_70_ authorEmail
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.installed_nodes" {
  varchar_200_ name
  varchar_200_ type
  integer latestVersion
  varchar_241_ package FK
}
"public.workflow_statistics" {
  bigint count
  timestamp_3__with_time_zone latestEvent
  varchar_128_ name
  varchar_36_ workflowId
  bigint rootCount
  integer id
  varchar_128_ workflowName
}
"public.event_destinations" {
  uuid id
  jsonb destination
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.auth_identity" {
  uuid userId FK
  varchar_255_ providerId
  varchar_32_ providerType
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.auth_provider_sync_history" {
  integer id
  varchar_32_ providerType
  text runMode
  text status
  timestamp_3__with_time_zone startedAt
  timestamp_3__with_time_zone endedAt
  integer scanned
  integer created
  integer updated
  integer disabled
  text error
}
"public.variables" {
  varchar_50_ key
  varchar_50_ type
  text value
  varchar_36_ id
  varchar_36_ projectId FK
}
"public.execution_data" {
  integer executionId FK
  json workflowData
  text data
  varchar_36_ workflowVersionId
}
"public.workflow_history" {
  varchar_36_ versionId
  varchar_36_ workflowId FK
  varchar_255_ authors
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  json nodes
  json connections
  varchar_128_ name
  boolean autosaved
  text description
  json nodeGroups
}
"public.project" {
  varchar_36_ id
  varchar_255_ name
  varchar_36_ type
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  json icon
  varchar_512_ description
  uuid creatorId FK
  json customTelemetryTags
}
"public.project_relation" {
  varchar_36_ projectId FK
  uuid userId FK
  varchar role FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.shared_credentials" {
  varchar_36_ credentialsId FK
  varchar_36_ projectId FK
  text role
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.shared_workflow" {
  varchar_36_ workflowId FK
  varchar_36_ projectId FK
  text role
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.execution_metadata" {
  integer id
  integer executionId FK
  varchar_255_ key
  text value
}
"public.invalid_auth_token" {
  varchar_512_ token
  timestamp_3__with_time_zone expiresAt
}
"public.execution_annotations" {
  integer id
  integer executionId FK
  varchar_6_ vote
  text note
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.annotation_tag_entity" {
  varchar_16_ id
  varchar_24_ name
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.execution_annotation_tags" {
  integer annotationId FK
  varchar_24_ tagId FK
}
"public.user_api_keys" {
  varchar_36_ id
  uuid userId FK
  varchar_100_ label
  varchar apiKey
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  json scopes
  varchar audience
  timestamp_3__with_time_zone lastUsedAt
}
"public.processed_data" {
  varchar_36_ workflowId FK
  varchar_255_ context
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  text value
}
"public.folder" {
  varchar_36_ id
  varchar_128_ name
  varchar_36_ parentFolderId FK
  varchar_36_ projectId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.folder_tag" {
  varchar_36_ folderId FK
  varchar_36_ tagId FK
}
"public.insights_metadata" {
  integer metaId
  varchar_36_ workflowId FK
  varchar_36_ projectId FK
  varchar_128_ workflowName
  varchar_255_ projectName
}
"public.insights_raw" {
  integer id
  integer metaId FK
  integer type
  bigint value
  timestamp_0__with_time_zone timestamp
}
"public.insights_by_period" {
  integer id
  integer metaId FK
  integer type
  bigint value
  integer periodUnit
  timestamp_0__with_time_zone periodStart
}
"public.test_run" {
  varchar_36_ id
  varchar_36_ workflowId FK
  varchar status
  varchar errorCode
  json errorDetails
  timestamp_3__with_time_zone runAt
  timestamp_3__with_time_zone completedAt
  json metrics
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  varchar_255_ runningInstanceId
  boolean cancelRequested
  varchar_36_ workflowVersionId
  varchar_36_ evaluationConfigId FK
  jsonb evaluationConfigSnapshot
  varchar_36_ collectionId FK
}
"public.test_case_execution" {
  varchar_36_ id
  varchar_36_ testRunId FK
  integer executionId FK
  varchar status
  timestamp_3__with_time_zone runAt
  timestamp_3__with_time_zone completedAt
  varchar errorCode
  json errorDetails
  json metrics
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  json inputs
  json outputs
  integer runIndex
}
"public.scope" {
  varchar_128_ slug
  text displayName
  text description
}
"public.role" {
  varchar_128_ slug
  text displayName
  text description
  text roleType
  boolean systemRole
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.role_scope" {
  varchar_128_ roleSlug FK
  varchar_128_ scopeSlug FK
}
"public.data_table" {
  varchar_36_ id
  varchar_128_ name
  varchar_36_ projectId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.data_table_column" {
  varchar_36_ id
  varchar_128_ name
  varchar_32_ type
  integer index
  varchar_36_ dataTableId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.chat_hub_sessions" {
  uuid id
  varchar_256_ title
  uuid ownerId FK
  timestamp_3__with_time_zone lastMessageAt
  varchar_36_ credentialId FK
  varchar_16_ provider
  varchar_256_ model
  varchar_36_ workflowId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  uuid agentId FK
  varchar_128_ agentName
  varchar_16_ type
}
"public.chat_hub_messages" {
  uuid id
  uuid sessionId FK
  uuid previousMessageId FK
  uuid revisionOfMessageId FK
  uuid retryOfMessageId FK
  varchar_16_ type
  varchar_128_ name
  text content
  varchar_16_ provider
  varchar_256_ model
  varchar_36_ workflowId FK
  integer executionId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  uuid agentId FK
  varchar_16_ status
  json attachments
}
"public.chat_hub_agents" {
  uuid id
  varchar_256_ name
  varchar_512_ description
  text systemPrompt
  uuid ownerId FK
  varchar_36_ credentialId FK
  varchar_16_ provider
  varchar_64_ model
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  json icon
  json files
  json suggestedPrompts
}
"public.oauth_clients" {
  varchar id
  varchar_255_ name
  json redirectUris
  json grantTypes
  varchar_255_ clientSecret
  bigint clientSecretExpiresAt
  varchar_255_ tokenEndpointAuthMethod
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.oauth_authorization_codes" {
  varchar_255_ code
  varchar clientId FK
  uuid userId FK
  varchar redirectUri
  varchar codeChallenge
  varchar_255_ codeChallengeMethod
  bigint expiresAt
  varchar state
  boolean used
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  varchar resource
  json scope
}
"public.oauth_access_tokens" {
  varchar token
  varchar clientId FK
  uuid userId FK
}
"public.oauth_refresh_tokens" {
  varchar_255_ token
  varchar clientId FK
  uuid userId FK
  bigint expiresAt
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  json scope
}
"public.oauth_user_consents" {
  integer id
  uuid userId FK
  varchar clientId FK
  bigint grantedAt
}
"public.workflow_dependency" {
  integer id
  varchar_36_ workflowId FK
  integer workflowVersionId
  varchar_32_ dependencyType
  varchar_255_ dependencyKey
  json dependencyInfo
  smallint indexVersionId
  timestamp_3__with_time_zone createdAt
  varchar_36_ publishedVersionId
}
"public.binary_data" {
  uuid fileId
  varchar_50_ sourceType
  varchar_255_ sourceId
  bytea data
  varchar_255_ mimeType
  varchar_255_ fileName
  integer fileSize
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.workflow_publish_history" {
  integer id
  varchar_36_ workflowId FK
  varchar_36_ versionId FK
  varchar_36_ event
  uuid userId FK
  timestamp_3__with_time_zone createdAt
}
"public.dynamic_credential_resolver" {
  varchar_16_ id
  varchar_128_ name
  varchar_128_ type
  text config
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.dynamic_credential_user_entry" {
  varchar_16_ credentialId FK
  uuid userId FK
  varchar_16_ resolverId FK
  text data
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.secrets_provider_connection" {
  integer id
  varchar_128_ providerKey
  varchar_36_ type
  text encryptedSettings
  boolean isEnabled
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.project_secrets_provider_access" {
  integer secretsProviderConnectionId FK
  varchar_36_ projectId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  varchar_128_ role
}
"public.workflow_published_version" {
  varchar_36_ workflowId FK
  varchar_36_ publishedVersionId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.dynamic_credential_entry" {
  varchar_16_ credential_id FK
  varchar_2048_ subject_id
  varchar_16_ resolver_id FK
  text data
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.chat_hub_tools" {
  uuid id
  varchar_255_ name
  varchar_255_ type
  double_precision typeVersion
  uuid ownerId FK
  json definition
  boolean enabled
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.chat_hub_session_tools" {
  uuid sessionId FK
  uuid toolId FK
}
"public.chat_hub_agent_tools" {
  uuid agentId FK
  uuid toolId FK
}
"public.workflow_builder_session" {
  uuid id
  varchar_36_ workflowId FK
  uuid userId FK
  json messages
  text previousSummary
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  varchar_255_ activeVersionCardId
  varchar_255_ resumeAfterRestoreMessageId
}
"public.role_mapping_rule" {
  varchar_16_ id
  text expression
  varchar_128_ role FK
  varchar_64_ type
  integer order
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.role_mapping_rule_project" {
  varchar_16_ roleMappingRuleId FK
  varchar_36_ projectId FK
}
"public.credential_dependency" {
  integer id
  varchar_36_ credentialId FK
  varchar_64_ dependencyType
  varchar_255_ dependencyId
  timestamp_3__with_time_zone createdAt
}
"public.instance_version_history" {
  integer id
  integer major
  integer minor
  integer patch
  timestamp_3__with_time_zone createdAt
}
"public.instance_ai_threads" {
  uuid id
  varchar_255_ resourceId
  text title
  json metadata
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  varchar_36_ projectId FK
}
"public.instance_ai_messages" {
  varchar_36_ id
  uuid threadId FK
  text content
  varchar_16_ role
  varchar_32_ type
  varchar_255_ resourceId
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_resources" {
  varchar_255_ id
  text workingMemory
  json metadata
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_observational_memory" {
  varchar_36_ id
  varchar_255_ lookupKey
  varchar_16_ scope
  uuid threadId FK
  varchar_255_ resourceId
  text activeObservations
  varchar_32_ originType
  text config
  integer generationCount
  timestamp_3__with_time_zone lastObservedAt
  integer pendingMessageTokens
  integer totalTokensObserved
  integer observationTokenCount
  boolean isObserving
  boolean isReflecting
  json observedMessageIds
  varchar observedTimezone
  text bufferedObservations
  integer bufferedObservationTokens
  json bufferedMessageIds
  text bufferedReflection
  integer bufferedReflectionTokens
  integer bufferedReflectionInputTokens
  integer reflectedObservationLineCount
  json bufferedObservationChunks
  boolean isBufferingObservation
  boolean isBufferingReflection
  integer lastBufferedAtTokens
  timestamp_3__with_time_zone lastBufferedAtTime
  json metadata
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_workflow_snapshots" {
  varchar_36_ runId
  varchar_255_ workflowName
  varchar_255_ resourceId
  varchar status
  text snapshot
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_run_snapshots" {
  uuid threadId FK
  varchar_36_ runId
  varchar_36_ messageGroupId
  json runIds
  text tree
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  varchar_36_ langsmithRunId
  varchar_36_ langsmithTraceId
  varchar_64_ traceId
  varchar_64_ spanId
}
"public.instance_ai_iteration_logs" {
  varchar_36_ id
  uuid threadId FK
  varchar taskKey
  text entry
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.token_exchange_jti" {
  varchar_255_ jti
  timestamp_3__with_time_zone expiresAt
  timestamp_3__with_time_zone createdAt
}
"public.trusted_key_source" {
  varchar_36_ id
  varchar_32_ type
  text config
  varchar_32_ status
  text lastError
  timestamp_3__with_time_zone lastRefreshedAt
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.trusted_key" {
  varchar_36_ sourceId FK
  varchar_255_ kid
  text data
  timestamp_3__with_time_zone createdAt
}
"public.user_favorites" {
  integer id
  uuid userId FK
  varchar_255_ resourceId
  varchar_64_ resourceType
}
"public.deployment_key" {
  varchar_36_ id
  varchar_64_ type
  text value
  varchar_20_ algorithm
  varchar_20_ status
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.ai_builder_temporary_workflow" {
  varchar_36_ workflowId FK
  uuid threadId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.evaluation_config" {
  varchar_36_ id
  varchar_36_ workflowId FK
  varchar_128_ name
  varchar_16_ status
  varchar_64_ invalidReason
  varchar_32_ datasetSource
  json datasetRef
  varchar_255_ startNodeName
  varchar_255_ endNodeName
  json metrics
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.evaluation_collection" {
  varchar_36_ id
  varchar_128_ name
  text description
  varchar_36_ workflowId FK
  varchar_36_ evaluationConfigId FK
  uuid createdById FK
  json insightsCache
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agents" {
  varchar_36_ id
  varchar_128_ name
  varchar_512_ description
  varchar_255_ projectId FK
  json integrations
  json schema
  json tools
  json skills
  varchar_36_ versionId
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  varchar_36_ activeVersionId FK
}
"public.agent_checkpoints" {
  varchar_255_ runId
  varchar_255_ agentId FK
  text state
  boolean expired
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agents_resources" {
  varchar_255_ id
  text metadata
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agents_threads" {
  varchar_128_ id
  varchar_255_ resourceId
  varchar_255_ title
  text metadata
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agents_messages" {
  varchar_36_ id
  varchar_255_ threadId FK
  varchar_255_ resourceId
  varchar_36_ role
  varchar_36_ type
  json content
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agent_execution_threads" {
  varchar_128_ id
  varchar_36_ agentId FK
  varchar_255_ agentName
  varchar_255_ projectId FK
  integer sessionNumber
  integer totalPromptTokens
  integer totalCompletionTokens
  double_precision totalCost
  integer totalDuration
  varchar_255_ title
  varchar_8_ emoji
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  varchar_32_ taskId
  varchar_36_ taskVersionId FK
  varchar_128_ parentThreadId
  varchar_36_ parentAgentId
}
"public.agent_execution" {
  varchar_36_ id
  varchar_128_ threadId FK
  varchar_16_ status
  timestamp_3__with_time_zone startedAt
  timestamp_3__with_time_zone stoppedAt
  integer duration
  text userMessage
  text assistantResponse
  varchar_255_ model
  integer promptTokens
  integer completionTokens
  integer totalTokens
  double_precision cost
  json toolCalls
  json timeline
  text error
  varchar_16_ hitlStatus
  varchar_32_ source
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_checkpoints" {
  varchar_255_ key
  varchar_255_ runId
  uuid threadId FK
  varchar_255_ resourceId
  json state
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  timestamp_3__with_time_zone expiredAt
}
"public.agents_observations" {
  varchar_36_ id
  varchar_36_ agentId FK
  varchar_255_ observationScopeId FK
  varchar_16_ marker
  text text
  varchar_36_ parentId FK
  integer tokenCount
  varchar_16_ status
  varchar_36_ supersededBy FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agents_observation_cursors" {
  varchar_36_ agentId FK
  varchar_255_ observationScopeId FK
  varchar_36_ lastObservedMessageId
  timestamp_3__with_time_zone lastObservedAt
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agents_observation_locks" {
  varchar_36_ agentId FK
  varchar_255_ observationScopeId FK
  varchar_20_ taskKind
  varchar_64_ holderId
  timestamp_3__with_time_zone heldUntil
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agents_memory_entries" {
  varchar_36_ id
  varchar_36_ agentId FK
  varchar_255_ resourceId FK
  text content
  varchar_64_ contentHash
  varchar_16_ status
  varchar_36_ supersededBy FK
  varchar_128_ embeddingModel
  json embedding
  json metadata
  timestamp_3__with_time_zone lastSeenAt
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agents_memory_entry_locks" {
  varchar_36_ agentId FK
  varchar_255_ resourceId FK
  varchar_64_ holderId
  timestamp_3__with_time_zone heldUntil
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agents_memory_entry_sources" {
  varchar_36_ id
  varchar_36_ agentId FK
  varchar_36_ memoryEntryId FK
  varchar_36_ observationId FK
  varchar_255_ threadId FK
  varchar_64_ evidenceHash
  text evidenceText
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agents_memory_entry_cursors" {
  varchar_36_ agentId FK
  varchar_255_ observationScopeId FK
  varchar_36_ lastIndexedObservationId
  timestamp_3__with_time_zone lastIndexedObservationCreatedAt
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agent_history" {
  varchar_36_ versionId
  varchar_36_ agentId FK
  json schema
  json tools
  json skills
  uuid publishedById FK
  varchar_255_ author
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_observations" {
  varchar_36_ id
  uuid observationScopeId FK
  varchar_16_ marker
  text text
  varchar_36_ parentId FK
  integer tokenCount
  varchar_16_ status
  varchar_36_ supersededBy FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_observation_cursors" {
  uuid observationScopeId FK
  varchar_36_ lastObservedMessageId
  timestamp_3__with_time_zone lastObservedAt
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_observation_locks" {
  uuid observationScopeId FK
  varchar_20_ taskKind
  varchar_64_ holderId
  timestamp_3__with_time_zone heldUntil
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_pending_confirmations" {
  varchar_36_ requestId
  uuid threadId FK
  uuid userId FK
  varchar_16_ kind
  varchar_36_ runId
  varchar_64_ toolCallId
  varchar_36_ messageGroupId
  varchar_255_ checkpointKey FK
  varchar_36_ checkpointTaskId
  timestamp_3__with_time_zone expiresAt
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.mcp_registry_server" {
  varchar_255_ slug
  varchar_50_ status
  varchar_50_ version
  timestamp_3__without_time_zone registryUpdatedAt
  json data
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agent_files" {
  varchar_16_ id
  varchar_36_ agentId FK
  text binaryDataId
  varchar_255_ fileName
  varchar_255_ mimeType
  integer fileSizeBytes
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agent_task_definition" {
  varchar_32_ id
  varchar_36_ agentId FK
  varchar_128_ name
  text objective
  varchar_128_ cronExpression
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agent_task_snapshot" {
  varchar_36_ versionId FK
  varchar_32_ taskId
  boolean enabled
  varchar_128_ name
  text objective
  varchar_128_ cronExpression
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agent_task_run_lock" {
  varchar_36_ agentId FK
  varchar_32_ taskId
  uuid holderId
  timestamp_3__with_time_zone heldUntil
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_mcp_registry_connections" {
  uuid id
  varchar_36_ credentialId FK
  varchar_255_ serverSlug FK
  json toolFilter
  uuid userId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.workflow_publication_outbox" {
  integer id
  varchar_36_ workflowId
  varchar_36_ publishedVersionId
  varchar_20_ status
  text errorMessage
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.agent_chat_subscriptions" {
  varchar_36_ agentId FK
  varchar_64_ integrationType
  varchar_255_ credentialId
  varchar_255_ threadId
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
