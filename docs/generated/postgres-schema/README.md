# n8n database schema (PostgreSQL)

## Description

Auto-generated from the PostgreSQL migrations in @n8n/db. Do not edit by hand.

## Tables

| Name | Columns | Comment | Type |
| ---- | ------- | ------- | ---- |
| [public.agent_chat_subscriptions](public.agent_chat_subscriptions.md) | 6 |  | BASE TABLE |
| [public.agent_checkpoints](public.agent_checkpoints.md) | 6 |  | BASE TABLE |
| [public.agent_execution](public.agent_execution.md) | 18 |  | BASE TABLE |
| [public.agent_execution_threads](public.agent_execution_threads.md) | 17 |  | BASE TABLE |
| [public.agent_files](public.agent_files.md) | 8 |  | BASE TABLE |
| [public.agent_history](public.agent_history.md) | 9 |  | BASE TABLE |
| [public.agent_task_definition](public.agent_task_definition.md) | 7 |  | BASE TABLE |
| [public.agent_task_run_lock](public.agent_task_run_lock.md) | 6 |  | BASE TABLE |
| [public.agent_task_snapshot](public.agent_task_snapshot.md) | 8 |  | BASE TABLE |
| [public.agents](public.agents.md) | 11 |  | BASE TABLE |
| [public.agents_memory_entries](public.agents_memory_entries.md) | 13 |  | BASE TABLE |
| [public.agents_memory_entry_cursors](public.agents_memory_entry_cursors.md) | 6 |  | BASE TABLE |
| [public.agents_memory_entry_locks](public.agents_memory_entry_locks.md) | 6 |  | BASE TABLE |
| [public.agents_memory_entry_sources](public.agents_memory_entry_sources.md) | 9 |  | BASE TABLE |
| [public.agents_messages](public.agents_messages.md) | 8 |  | BASE TABLE |
| [public.agents_observation_cursors](public.agents_observation_cursors.md) | 6 |  | BASE TABLE |
| [public.agents_observation_locks](public.agents_observation_locks.md) | 7 |  | BASE TABLE |
| [public.agents_observations](public.agents_observations.md) | 11 |  | BASE TABLE |
| [public.agents_resources](public.agents_resources.md) | 4 |  | BASE TABLE |
| [public.agents_threads](public.agents_threads.md) | 6 |  | BASE TABLE |
| [public.ai_builder_temporary_workflow](public.ai_builder_temporary_workflow.md) | 4 |  | BASE TABLE |
| [public.annotation_tag_entity](public.annotation_tag_entity.md) | 4 |  | BASE TABLE |
| [public.auth_identity](public.auth_identity.md) | 5 |  | BASE TABLE |
| [public.auth_provider_sync_history](public.auth_provider_sync_history.md) | 11 |  | BASE TABLE |
| [public.binary_data](public.binary_data.md) | 9 |  | BASE TABLE |
| [public.chat_hub_agent_tools](public.chat_hub_agent_tools.md) | 2 |  | BASE TABLE |
| [public.chat_hub_agents](public.chat_hub_agents.md) | 13 |  | BASE TABLE |
| [public.chat_hub_messages](public.chat_hub_messages.md) | 17 |  | BASE TABLE |
| [public.chat_hub_session_tools](public.chat_hub_session_tools.md) | 2 |  | BASE TABLE |
| [public.chat_hub_sessions](public.chat_hub_sessions.md) | 13 |  | BASE TABLE |
| [public.chat_hub_tools](public.chat_hub_tools.md) | 9 |  | BASE TABLE |
| [public.credential_dependency](public.credential_dependency.md) | 5 |  | BASE TABLE |
| [public.credentials_entity](public.credentials_entity.md) | 11 |  | BASE TABLE |
| [public.data_table](public.data_table.md) | 5 |  | BASE TABLE |
| [public.data_table_column](public.data_table_column.md) | 7 |  | BASE TABLE |
| [public.deployment_key](public.deployment_key.md) | 7 |  | BASE TABLE |
| [public.dynamic_credential_entry](public.dynamic_credential_entry.md) | 6 |  | BASE TABLE |
| [public.dynamic_credential_resolver](public.dynamic_credential_resolver.md) | 6 |  | BASE TABLE |
| [public.dynamic_credential_user_entry](public.dynamic_credential_user_entry.md) | 6 |  | BASE TABLE |
| [public.evaluation_collection](public.evaluation_collection.md) | 9 |  | BASE TABLE |
| [public.evaluation_config](public.evaluation_config.md) | 12 |  | BASE TABLE |
| [public.event_destinations](public.event_destinations.md) | 4 |  | BASE TABLE |
| [public.execution_annotation_tags](public.execution_annotation_tags.md) | 2 |  | BASE TABLE |
| [public.execution_annotations](public.execution_annotations.md) | 6 |  | BASE TABLE |
| [public.execution_data](public.execution_data.md) | 4 |  | BASE TABLE |
| [public.execution_entity](public.execution_entity.md) | 19 |  | BASE TABLE |
| [public.execution_metadata](public.execution_metadata.md) | 4 |  | BASE TABLE |
| [public.folder](public.folder.md) | 6 |  | BASE TABLE |
| [public.folder_tag](public.folder_tag.md) | 2 |  | BASE TABLE |
| [public.insights_by_period](public.insights_by_period.md) | 6 |  | BASE TABLE |
| [public.insights_metadata](public.insights_metadata.md) | 5 |  | BASE TABLE |
| [public.insights_raw](public.insights_raw.md) | 5 |  | BASE TABLE |
| [public.installed_nodes](public.installed_nodes.md) | 4 |  | BASE TABLE |
| [public.installed_packages](public.installed_packages.md) | 6 |  | BASE TABLE |
| [public.instance_ai_checkpoints](public.instance_ai_checkpoints.md) | 8 |  | BASE TABLE |
| [public.instance_ai_events](public.instance_ai_events.md) | 7 |  | BASE TABLE |
| [public.instance_ai_iteration_logs](public.instance_ai_iteration_logs.md) | 6 |  | BASE TABLE |
| [public.instance_ai_mcp_registry_connections](public.instance_ai_mcp_registry_connections.md) | 7 |  | BASE TABLE |
| [public.instance_ai_messages](public.instance_ai_messages.md) | 8 |  | BASE TABLE |
| [public.instance_ai_observation_cursors](public.instance_ai_observation_cursors.md) | 5 |  | BASE TABLE |
| [public.instance_ai_observation_locks](public.instance_ai_observation_locks.md) | 6 |  | BASE TABLE |
| [public.instance_ai_observational_memory](public.instance_ai_observational_memory.md) | 32 |  | BASE TABLE |
| [public.instance_ai_observations](public.instance_ai_observations.md) | 10 |  | BASE TABLE |
| [public.instance_ai_pending_confirmations](public.instance_ai_pending_confirmations.md) | 12 |  | BASE TABLE |
| [public.instance_ai_resources](public.instance_ai_resources.md) | 5 |  | BASE TABLE |
| [public.instance_ai_run_snapshots](public.instance_ai_run_snapshots.md) | 11 |  | BASE TABLE |
| [public.instance_ai_thread_grants](public.instance_ai_thread_grants.md) | 5 |  | BASE TABLE |
| [public.instance_ai_threads](public.instance_ai_threads.md) | 7 |  | BASE TABLE |
| [public.instance_ai_workflow_snapshots](public.instance_ai_workflow_snapshots.md) | 7 |  | BASE TABLE |
| [public.instance_version_history](public.instance_version_history.md) | 5 |  | BASE TABLE |
| [public.invalid_auth_token](public.invalid_auth_token.md) | 2 |  | BASE TABLE |
| [public.mcp_registry_server](public.mcp_registry_server.md) | 7 |  | BASE TABLE |
| [public.oauth_access_tokens](public.oauth_access_tokens.md) | 3 |  | BASE TABLE |
| [public.oauth_authorization_codes](public.oauth_authorization_codes.md) | 13 |  | BASE TABLE |
| [public.oauth_clients](public.oauth_clients.md) | 9 |  | BASE TABLE |
| [public.oauth_refresh_tokens](public.oauth_refresh_tokens.md) | 7 |  | BASE TABLE |
| [public.oauth_user_consents](public.oauth_user_consents.md) | 6 |  | BASE TABLE |
| [public.processed_data](public.processed_data.md) | 5 |  | BASE TABLE |
| [public.project](public.project.md) | 9 |  | BASE TABLE |
| [public.project_relation](public.project_relation.md) | 5 |  | BASE TABLE |
| [public.project_secrets_provider_access](public.project_secrets_provider_access.md) | 5 |  | BASE TABLE |
| [public.role](public.role.md) | 7 |  | BASE TABLE |
| [public.role_mapping_rule](public.role_mapping_rule.md) | 7 |  | BASE TABLE |
| [public.role_mapping_rule_project](public.role_mapping_rule_project.md) | 2 |  | BASE TABLE |
| [public.role_scope](public.role_scope.md) | 2 |  | BASE TABLE |
| [public.scheduled_job](public.scheduled_job.md) | 19 |  | BASE TABLE |
| [public.scheduled_task](public.scheduled_task.md) | 16 |  | BASE TABLE |
| [public.scope](public.scope.md) | 3 |  | BASE TABLE |
| [public.secrets_provider_connection](public.secrets_provider_connection.md) | 7 |  | BASE TABLE |
| [public.settings](public.settings.md) | 3 |  | BASE TABLE |
| [public.shared_credentials](public.shared_credentials.md) | 5 |  | BASE TABLE |
| [public.shared_workflow](public.shared_workflow.md) | 5 |  | BASE TABLE |
| [public.tag_entity](public.tag_entity.md) | 4 |  | BASE TABLE |
| [public.test_case_execution](public.test_case_execution.md) | 14 |  | BASE TABLE |
| [public.test_run](public.test_run.md) | 16 |  | BASE TABLE |
| [public.token_exchange_jti](public.token_exchange_jti.md) | 3 |  | BASE TABLE |
| [public.trusted_key](public.trusted_key.md) | 4 |  | BASE TABLE |
| [public.trusted_key_source](public.trusted_key_source.md) | 8 |  | BASE TABLE |
| [public.user](public.user.md) | 15 |  | BASE TABLE |
| [public.user_api_keys](public.user_api_keys.md) | 9 |  | BASE TABLE |
| [public.user_favorites](public.user_favorites.md) | 4 |  | BASE TABLE |
| [public.variables](public.variables.md) | 5 |  | BASE TABLE |
| [public.webhook_entity](public.webhook_entity.md) | 6 |  | BASE TABLE |
| [public.workflow_builder_session](public.workflow_builder_session.md) | 9 |  | BASE TABLE |
| [public.workflow_dependency](public.workflow_dependency.md) | 9 |  | BASE TABLE |
| [public.workflow_entity](public.workflow_entity.md) | 20 |  | BASE TABLE |
| [public.workflow_history](public.workflow_history.md) | 11 |  | BASE TABLE |
| [public.workflow_publication_outbox](public.workflow_publication_outbox.md) | 7 |  | BASE TABLE |
| [public.workflow_publication_trigger_status](public.workflow_publication_trigger_status.md) | 7 |  | BASE TABLE |
| [public.workflow_publish_history](public.workflow_publish_history.md) | 6 |  | BASE TABLE |
| [public.workflow_published_version](public.workflow_published_version.md) | 4 |  | BASE TABLE |
| [public.workflow_statistics](public.workflow_statistics.md) | 7 |  | BASE TABLE |
| [public.workflow_statistics_delta](public.workflow_statistics_delta.md) | 6 |  | BASE TABLE |
| [public.workflows_tags](public.workflows_tags.md) | 2 |  | BASE TABLE |

## Stored procedures and functions

| Name | ReturnType | Arguments | Type |
| ---- | ------- | ------- | ---- |
| public.increment_workflow_version | trigger |  | FUNCTION |
| public.uuid_generate_v1 | uuid |  | FUNCTION |
| public.uuid_generate_v1mc | uuid |  | FUNCTION |
| public.uuid_generate_v3 | uuid | namespace uuid, name text | FUNCTION |
| public.uuid_generate_v4 | uuid |  | FUNCTION |
| public.uuid_generate_v5 | uuid | namespace uuid, name text | FUNCTION |
| public.uuid_nil | uuid |  | FUNCTION |
| public.uuid_ns_dns | uuid |  | FUNCTION |
| public.uuid_ns_oid | uuid |  | FUNCTION |
| public.uuid_ns_url | uuid |  | FUNCTION |
| public.uuid_ns_x500 | uuid |  | FUNCTION |

## Relations

```mermaid
erDiagram

"public.agent_chat_subscriptions" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_checkpoints" }o--o| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_execution" }o--|| "public.agent_execution_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES agent_execution_threads(id) ON DELETE CASCADE"
"public.agent_execution_threads" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.agent_execution_threads" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_execution_threads" }o--o| "public.agent_history" : "FOREIGN KEY (#quot;taskVersionId#quot;) REFERENCES agent_history(#quot;versionId#quot;) ON DELETE SET NULL"
"public.agent_files" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_history" }o--o| "public.user" : "FOREIGN KEY (#quot;publishedById#quot;) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"
"public.agent_history" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_task_definition" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_task_run_lock" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_task_snapshot" }o--|| "public.agent_history" : "FOREIGN KEY (#quot;versionId#quot;) REFERENCES agent_history(#quot;versionId#quot;) ON DELETE CASCADE"
"public.agents" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.agents" }o--o| "public.agent_history" : "FOREIGN KEY (#quot;activeVersionId#quot;) REFERENCES agent_history(#quot;versionId#quot;) ON DELETE SET NULL"
"public.agents_memory_entries" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entries" }o--|| "public.agents_resources" : "FOREIGN KEY (#quot;resourceId#quot;) REFERENCES agents_resources(id) ON DELETE CASCADE"
"public.agents_memory_entries" }o--o| "public.agents_memory_entries" : "FOREIGN KEY (#quot;supersededBy#quot;) REFERENCES agents_memory_entries(id)"
"public.agents_memory_entry_cursors" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entry_cursors" }o--|| "public.agents_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES agents_threads(id) ON DELETE CASCADE"
"public.agents_memory_entry_locks" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entry_locks" }o--|| "public.agents_resources" : "FOREIGN KEY (#quot;resourceId#quot;) REFERENCES agents_resources(id) ON DELETE CASCADE"
"public.agents_memory_entry_sources" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entry_sources" }o--|| "public.agents_observations" : "FOREIGN KEY (#quot;observationId#quot;) REFERENCES agents_observations(id) ON DELETE CASCADE"
"public.agents_memory_entry_sources" }o--|| "public.agents_memory_entries" : "FOREIGN KEY (#quot;memoryEntryId#quot;) REFERENCES agents_memory_entries(id) ON DELETE CASCADE"
"public.agents_memory_entry_sources" }o--|| "public.agents_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES agents_threads(id) ON DELETE CASCADE"
"public.agents_messages" }o--|| "public.agents_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES agents_threads(id) ON DELETE CASCADE"
"public.agents_observation_cursors" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_observation_cursors" }o--|| "public.agents_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES agents_threads(id) ON DELETE CASCADE"
"public.agents_observation_locks" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_observation_locks" }o--|| "public.agents_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES agents_threads(id) ON DELETE CASCADE"
"public.agents_observations" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_observations" }o--o| "public.agents_observations" : "FOREIGN KEY (#quot;supersededBy#quot;) REFERENCES agents_observations(id)"
"public.agents_observations" }o--o| "public.agents_observations" : "FOREIGN KEY (#quot;parentId#quot;) REFERENCES agents_observations(id)"
"public.agents_observations" }o--|| "public.agents_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES agents_threads(id) ON DELETE CASCADE"
"public.ai_builder_temporary_workflow" |o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.ai_builder_temporary_workflow" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.auth_identity" }o--o| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id)"
"public.chat_hub_agent_tools" }o--|| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE CASCADE"
"public.chat_hub_agent_tools" }o--|| "public.chat_hub_tools" : "FOREIGN KEY (#quot;toolId#quot;) REFERENCES chat_hub_tools(id) ON DELETE CASCADE"
"public.chat_hub_agents" }o--|| "public.user" : "FOREIGN KEY (#quot;ownerId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.chat_hub_agents" }o--o| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE SET NULL"
"public.chat_hub_messages" }o--o| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE SET NULL"
"public.chat_hub_messages" }o--o| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE SET NULL"
"public.chat_hub_messages" }o--|| "public.chat_hub_sessions" : "FOREIGN KEY (#quot;sessionId#quot;) REFERENCES chat_hub_sessions(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--o| "public.chat_hub_messages" : "FOREIGN KEY (#quot;revisionOfMessageId#quot;) REFERENCES chat_hub_messages(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--o| "public.chat_hub_messages" : "FOREIGN KEY (#quot;retryOfMessageId#quot;) REFERENCES chat_hub_messages(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--o| "public.chat_hub_messages" : "FOREIGN KEY (#quot;previousMessageId#quot;) REFERENCES chat_hub_messages(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--o| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE SET NULL"
"public.chat_hub_session_tools" }o--|| "public.chat_hub_sessions" : "FOREIGN KEY (#quot;sessionId#quot;) REFERENCES chat_hub_sessions(id) ON DELETE CASCADE"
"public.chat_hub_session_tools" }o--|| "public.chat_hub_tools" : "FOREIGN KEY (#quot;toolId#quot;) REFERENCES chat_hub_tools(id) ON DELETE CASCADE"
"public.chat_hub_sessions" }o--|| "public.user" : "FOREIGN KEY (#quot;ownerId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.chat_hub_sessions" }o--o| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE SET NULL"
"public.chat_hub_sessions" }o--o| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE SET NULL"
"public.chat_hub_sessions" }o--o| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE SET NULL"
"public.chat_hub_tools" }o--|| "public.user" : "FOREIGN KEY (#quot;ownerId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.credential_dependency" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.credentials_entity" }o--o| "public.dynamic_credential_resolver" : "FOREIGN KEY (#quot;resolverId#quot;) REFERENCES dynamic_credential_resolver(id) ON DELETE SET NULL"
"public.data_table" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.data_table_column" }o--|| "public.data_table" : "FOREIGN KEY (#quot;dataTableId#quot;) REFERENCES data_table(id) ON DELETE CASCADE"
"public.dynamic_credential_entry" }o--|| "public.credentials_entity" : "FOREIGN KEY (credential_id) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.dynamic_credential_entry" }o--|| "public.dynamic_credential_resolver" : "FOREIGN KEY (resolver_id) REFERENCES dynamic_credential_resolver(id) ON DELETE CASCADE"
"public.dynamic_credential_user_entry" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.dynamic_credential_user_entry" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.dynamic_credential_user_entry" }o--|| "public.dynamic_credential_resolver" : "FOREIGN KEY (#quot;resolverId#quot;) REFERENCES dynamic_credential_resolver(id) ON DELETE CASCADE"
"public.evaluation_collection" }o--o| "public.user" : "FOREIGN KEY (#quot;createdById#quot;) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"
"public.evaluation_collection" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.evaluation_collection" }o--|| "public.evaluation_config" : "FOREIGN KEY (#quot;evaluationConfigId#quot;) REFERENCES evaluation_config(id) ON DELETE CASCADE"
"public.evaluation_config" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.execution_annotation_tags" }o--|| "public.execution_annotations" : "FOREIGN KEY (#quot;annotationId#quot;) REFERENCES execution_annotations(id) ON DELETE CASCADE"
"public.execution_annotation_tags" }o--|| "public.annotation_tag_entity" : "FOREIGN KEY (#quot;tagId#quot;) REFERENCES annotation_tag_entity(id) ON DELETE CASCADE"
"public.execution_annotations" }o--|| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE CASCADE"
"public.execution_data" |o--|| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE CASCADE"
"public.execution_entity" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.execution_metadata" }o--|| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE CASCADE"
"public.folder" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.folder" }o--o| "public.folder" : "FOREIGN KEY (#quot;parentFolderId#quot;) REFERENCES folder(id) ON DELETE CASCADE"
"public.folder_tag" }o--|| "public.tag_entity" : "FOREIGN KEY (#quot;tagId#quot;) REFERENCES tag_entity(id) ON DELETE CASCADE"
"public.folder_tag" }o--|| "public.folder" : "FOREIGN KEY (#quot;folderId#quot;) REFERENCES folder(id) ON DELETE CASCADE"
"public.insights_by_period" }o--|| "public.insights_metadata" : "FOREIGN KEY (#quot;metaId#quot;) REFERENCES insights_metadata(#quot;metaId#quot;) ON DELETE CASCADE"
"public.insights_metadata" }o--o| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE SET NULL"
"public.insights_metadata" }o--o| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE SET NULL"
"public.insights_raw" }o--|| "public.insights_metadata" : "FOREIGN KEY (#quot;metaId#quot;) REFERENCES insights_metadata(#quot;metaId#quot;) ON DELETE CASCADE"
"public.installed_nodes" }o--|| "public.installed_packages" : "FOREIGN KEY (package) REFERENCES installed_packages(#quot;packageName#quot;) ON UPDATE CASCADE ON DELETE CASCADE"
"public.instance_ai_checkpoints" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_events" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_iteration_logs" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_mcp_registry_connections" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.instance_ai_mcp_registry_connections" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.instance_ai_mcp_registry_connections" }o--|| "public.mcp_registry_server" : "FOREIGN KEY (#quot;serverSlug#quot;) REFERENCES mcp_registry_server(slug) ON DELETE CASCADE"
"public.instance_ai_messages" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_observation_cursors" |o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_observation_locks" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_observational_memory" }o--o| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE SET NULL"
"public.instance_ai_observations" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;observationScopeId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_observations" }o--o| "public.instance_ai_observations" : "FOREIGN KEY (#quot;supersededBy#quot;) REFERENCES instance_ai_observations(id)"
"public.instance_ai_observations" }o--o| "public.instance_ai_observations" : "FOREIGN KEY (#quot;parentId#quot;) REFERENCES instance_ai_observations(id)"
"public.instance_ai_pending_confirmations" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.instance_ai_pending_confirmations" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_pending_confirmations" }o--o| "public.instance_ai_checkpoints" : "FOREIGN KEY (#quot;checkpointKey#quot;) REFERENCES instance_ai_checkpoints(key) ON DELETE CASCADE"
"public.instance_ai_run_snapshots" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_thread_grants" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.instance_ai_thread_grants" }o--|| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE CASCADE"
"public.instance_ai_threads" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.oauth_access_tokens" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.oauth_access_tokens" }o--|| "public.oauth_clients" : "FOREIGN KEY (#quot;clientId#quot;) REFERENCES oauth_clients(id) ON DELETE CASCADE"
"public.oauth_authorization_codes" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.oauth_authorization_codes" }o--|| "public.oauth_clients" : "FOREIGN KEY (#quot;clientId#quot;) REFERENCES oauth_clients(id) ON DELETE CASCADE"
"public.oauth_refresh_tokens" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.oauth_refresh_tokens" }o--|| "public.oauth_clients" : "FOREIGN KEY (#quot;clientId#quot;) REFERENCES oauth_clients(id) ON DELETE CASCADE"
"public.oauth_user_consents" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.oauth_user_consents" }o--|| "public.oauth_clients" : "FOREIGN KEY (#quot;clientId#quot;) REFERENCES oauth_clients(id) ON DELETE CASCADE"
"public.processed_data" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.project" }o--o| "public.user" : "FOREIGN KEY (#quot;creatorId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"
"public.project_relation" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.project_relation" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.project_relation" }o--|| "public.role" : "FOREIGN KEY (role) REFERENCES role(slug)"
"public.project_secrets_provider_access" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.project_secrets_provider_access" }o--|| "public.secrets_provider_connection" : "FOREIGN KEY (#quot;secretsProviderConnectionId#quot;) REFERENCES secrets_provider_connection(id) ON DELETE CASCADE"
"public.role_mapping_rule" }o--|| "public.role" : "FOREIGN KEY (role) REFERENCES role(slug) ON UPDATE CASCADE ON DELETE CASCADE"
"public.role_mapping_rule_project" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.role_mapping_rule_project" }o--|| "public.role_mapping_rule" : "FOREIGN KEY (#quot;roleMappingRuleId#quot;) REFERENCES role_mapping_rule(id) ON DELETE CASCADE"
"public.role_scope" }o--|| "public.scope" : "FOREIGN KEY (#quot;scopeSlug#quot;) REFERENCES scope(slug) ON UPDATE CASCADE ON DELETE CASCADE"
"public.role_scope" }o--|| "public.role" : "FOREIGN KEY (#quot;roleSlug#quot;) REFERENCES role(slug) ON UPDATE CASCADE ON DELETE CASCADE"
"public.scheduled_job" }o--o| "public.workflow_published_version" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_published_version(#quot;workflowId#quot;) ON DELETE CASCADE"
"public.scheduled_task" }o--|| "public.scheduled_job" : "FOREIGN KEY (#quot;jobId#quot;) REFERENCES scheduled_job(id) ON DELETE CASCADE"
"public.shared_credentials" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialsId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.shared_credentials" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.shared_workflow" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.shared_workflow" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.test_case_execution" }o--o| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE SET NULL"
"public.test_case_execution" }o--|| "public.test_run" : "FOREIGN KEY (#quot;testRunId#quot;) REFERENCES test_run(id) ON DELETE CASCADE"
"public.test_run" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.test_run" }o--o| "public.evaluation_config" : "FOREIGN KEY (#quot;evaluationConfigId#quot;) REFERENCES evaluation_config(id) ON DELETE SET NULL"
"public.test_run" }o--o| "public.evaluation_collection" : "FOREIGN KEY (#quot;collectionId#quot;) REFERENCES evaluation_collection(id) ON DELETE SET NULL"
"public.trusted_key" }o--|| "public.trusted_key_source" : "FOREIGN KEY (#quot;sourceId#quot;) REFERENCES trusted_key_source(id) ON DELETE CASCADE"
"public.user" }o--|| "public.role" : "FOREIGN KEY (#quot;roleSlug#quot;) REFERENCES role(slug)"
"public.user_api_keys" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.user_favorites" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.variables" }o--o| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.webhook_entity" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.workflow_builder_session" }o--|| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.workflow_builder_session" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.workflow_dependency" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.workflow_entity" }o--o| "public.workflow_history" : "FOREIGN KEY (#quot;activeVersionId#quot;) REFERENCES workflow_history(#quot;versionId#quot;) ON DELETE RESTRICT"
"public.workflow_entity" }o--o| "public.folder" : "FOREIGN KEY (#quot;parentFolderId#quot;) REFERENCES folder(id) ON DELETE CASCADE"
"public.workflow_history" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.workflow_publication_trigger_status" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.workflow_publication_trigger_status" }o--|| "public.workflow_history" : "FOREIGN KEY (#quot;versionId#quot;) REFERENCES workflow_history(#quot;versionId#quot;) ON DELETE CASCADE"
"public.workflow_publish_history" }o--o| "public.user" : "FOREIGN KEY (#quot;userId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"
"public.workflow_publish_history" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.workflow_publish_history" }o--o| "public.workflow_history" : "FOREIGN KEY (#quot;versionId#quot;) REFERENCES workflow_history(#quot;versionId#quot;) ON DELETE SET NULL"
"public.workflow_published_version" |o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE RESTRICT"
"public.workflow_published_version" }o--|| "public.workflow_history" : "FOREIGN KEY (#quot;publishedVersionId#quot;) REFERENCES workflow_history(#quot;versionId#quot;) ON DELETE RESTRICT"
"public.workflows_tags" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.workflows_tags" }o--|| "public.tag_entity" : "FOREIGN KEY (#quot;tagId#quot;) REFERENCES tag_entity(id) ON DELETE CASCADE"

"public.agent_chat_subscriptions" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  varchar_255_ credentialId
  varchar_64_ integrationType
  varchar_255_ threadId
  timestamp_3__with_time_zone updatedAt
}
"public.agent_checkpoints" {
  varchar_255_ agentId FK
  timestamp_3__with_time_zone createdAt
  boolean expired
  varchar_255_ runId
  text state
  timestamp_3__with_time_zone updatedAt
}
"public.agent_execution" {
  integer completionTokens
  double_precision cost
  timestamp_3__with_time_zone createdAt
  integer duration
  text error
  varchar_16_ hitlStatus
  varchar_36_ id
  varchar_255_ model
  integer promptTokens
  varchar_32_ source
  timestamp_3__with_time_zone startedAt
  varchar_16_ status
  timestamp_3__with_time_zone stoppedAt
  varchar_128_ threadId FK
  json timeline
  integer totalTokens
  timestamp_3__with_time_zone updatedAt
  text userMessage
}
"public.agent_execution_threads" {
  varchar_36_ agentId FK
  varchar_255_ agentName
  timestamp_3__with_time_zone createdAt
  varchar_8_ emoji
  varchar_128_ id
  varchar_36_ parentAgentId
  varchar_128_ parentThreadId
  varchar_255_ projectId FK
  integer sessionNumber
  varchar_32_ taskId
  varchar_36_ taskVersionId FK
  varchar_255_ title
  integer totalCompletionTokens
  double_precision totalCost
  integer totalDuration
  integer totalPromptTokens
  timestamp_3__with_time_zone updatedAt
}
"public.agent_files" {
  varchar_36_ agentId FK
  text binaryDataId
  timestamp_3__with_time_zone createdAt
  varchar_255_ fileName
  integer fileSizeBytes
  varchar_16_ id
  varchar_255_ mimeType
  timestamp_3__with_time_zone updatedAt
}
"public.agent_history" {
  varchar_36_ agentId FK
  varchar_255_ author
  timestamp_3__with_time_zone createdAt
  uuid publishedById FK
  json schema
  json skills
  json tools
  timestamp_3__with_time_zone updatedAt
  varchar_36_ versionId
}
"public.agent_task_definition" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  varchar_128_ cronExpression
  varchar_32_ id
  varchar_128_ name
  text objective
  timestamp_3__with_time_zone updatedAt
}
"public.agent_task_run_lock" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone heldUntil
  uuid holderId
  varchar_32_ taskId
  timestamp_3__with_time_zone updatedAt
}
"public.agent_task_snapshot" {
  timestamp_3__with_time_zone createdAt
  varchar_128_ cronExpression
  boolean enabled
  varchar_128_ name
  text objective
  varchar_32_ taskId
  timestamp_3__with_time_zone updatedAt
  varchar_36_ versionId FK
}
"public.agents" {
  varchar_36_ activeVersionId FK
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  json integrations
  varchar_128_ name
  varchar_255_ projectId FK
  json schema
  json skills
  json tools
  timestamp_3__with_time_zone updatedAt
  varchar_36_ versionId
}
"public.agents_memory_entries" {
  varchar_36_ agentId FK
  text content
  varchar_64_ contentHash
  timestamp_3__with_time_zone createdAt
  json embedding
  varchar_128_ embeddingModel
  varchar_36_ id
  timestamp_3__with_time_zone lastSeenAt
  json metadata
  varchar_255_ resourceId FK
  varchar_16_ status
  varchar_36_ supersededBy FK
  timestamp_3__with_time_zone updatedAt
}
"public.agents_memory_entry_cursors" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone lastIndexedObservationCreatedAt
  varchar_36_ lastIndexedObservationId
  varchar_255_ observationScopeId FK
  timestamp_3__with_time_zone updatedAt
}
"public.agents_memory_entry_locks" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone heldUntil
  varchar_64_ holderId
  varchar_255_ resourceId FK
  timestamp_3__with_time_zone updatedAt
}
"public.agents_memory_entry_sources" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  varchar_64_ evidenceHash
  text evidenceText
  varchar_36_ id
  varchar_36_ memoryEntryId FK
  varchar_36_ observationId FK
  varchar_255_ threadId FK
  timestamp_3__with_time_zone updatedAt
}
"public.agents_messages" {
  json content
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  varchar_255_ resourceId
  varchar_36_ role
  varchar_255_ threadId FK
  varchar_36_ type
  timestamp_3__with_time_zone updatedAt
}
"public.agents_observation_cursors" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone lastObservedAt
  varchar_36_ lastObservedMessageId
  varchar_255_ observationScopeId FK
  timestamp_3__with_time_zone updatedAt
}
"public.agents_observation_locks" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone heldUntil
  varchar_64_ holderId
  varchar_255_ observationScopeId FK
  varchar_20_ taskKind
  timestamp_3__with_time_zone updatedAt
}
"public.agents_observations" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  varchar_16_ marker
  varchar_255_ observationScopeId FK
  varchar_36_ parentId FK
  varchar_16_ status
  varchar_36_ supersededBy FK
  text text
  integer tokenCount
  timestamp_3__with_time_zone updatedAt
}
"public.agents_resources" {
  timestamp_3__with_time_zone createdAt
  varchar_255_ id
  text metadata
  timestamp_3__with_time_zone updatedAt
}
"public.agents_threads" {
  timestamp_3__with_time_zone createdAt
  varchar_128_ id
  text metadata
  varchar_255_ resourceId
  varchar_255_ title
  timestamp_3__with_time_zone updatedAt
}
"public.ai_builder_temporary_workflow" {
  timestamp_3__with_time_zone createdAt
  uuid threadId FK
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
}
"public.annotation_tag_entity" {
  timestamp_3__with_time_zone createdAt
  varchar_16_ id
  varchar_24_ name
  timestamp_3__with_time_zone updatedAt
}
"public.auth_identity" {
  timestamp_3__with_time_zone createdAt
  varchar_255_ providerId
  varchar_32_ providerType
  timestamp_3__with_time_zone updatedAt
  uuid userId FK
}
"public.auth_provider_sync_history" {
  integer created
  integer disabled
  timestamp_3__with_time_zone endedAt
  text error
  integer id
  varchar_32_ providerType
  text runMode
  integer scanned
  timestamp_3__with_time_zone startedAt
  text status
  integer updated
}
"public.binary_data" {
  timestamp_3__with_time_zone createdAt
  bytea data
  uuid fileId
  varchar_255_ fileName
  integer fileSize
  varchar_255_ mimeType
  varchar_255_ sourceId
  varchar_50_ sourceType
  timestamp_3__with_time_zone updatedAt
}
"public.chat_hub_agent_tools" {
  uuid agentId FK
  uuid toolId FK
}
"public.chat_hub_agents" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ credentialId FK
  varchar_512_ description
  json files
  json icon
  uuid id
  varchar_64_ model
  varchar_256_ name
  uuid ownerId FK
  varchar_16_ provider
  json suggestedPrompts
  text systemPrompt
  timestamp_3__with_time_zone updatedAt
}
"public.chat_hub_messages" {
  uuid agentId FK
  json attachments
  text content
  timestamp_3__with_time_zone createdAt
  integer executionId FK
  uuid id
  varchar_256_ model
  varchar_128_ name
  uuid previousMessageId FK
  varchar_16_ provider
  uuid retryOfMessageId FK
  uuid revisionOfMessageId FK
  uuid sessionId FK
  varchar_16_ status
  varchar_16_ type
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
}
"public.chat_hub_session_tools" {
  uuid sessionId FK
  uuid toolId FK
}
"public.chat_hub_sessions" {
  uuid agentId FK
  varchar_128_ agentName
  timestamp_3__with_time_zone createdAt
  varchar_36_ credentialId FK
  uuid id
  timestamp_3__with_time_zone lastMessageAt
  varchar_256_ model
  uuid ownerId FK
  varchar_16_ provider
  varchar_256_ title
  varchar_16_ type
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
}
"public.chat_hub_tools" {
  timestamp_3__with_time_zone createdAt
  json definition
  boolean enabled
  uuid id
  varchar_255_ name
  uuid ownerId FK
  varchar_255_ type
  double_precision typeVersion
  timestamp_3__with_time_zone updatedAt
}
"public.credential_dependency" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ credentialId FK
  varchar_255_ dependencyId
  varchar_64_ dependencyType
  integer id
}
"public.credentials_entity" {
  timestamp_3__with_time_zone createdAt
  text data
  varchar_36_ id
  boolean isGlobal
  boolean isManaged
  boolean isResolvable
  varchar_128_ name
  boolean resolvableAllowFallback
  varchar_16_ resolverId FK
  varchar_128_ type
  timestamp_3__with_time_zone updatedAt
}
"public.data_table" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  varchar_128_ name
  varchar_36_ projectId FK
  timestamp_3__with_time_zone updatedAt
}
"public.data_table_column" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ dataTableId FK
  varchar_36_ id
  integer index
  varchar_128_ name
  varchar_32_ type
  timestamp_3__with_time_zone updatedAt
}
"public.deployment_key" {
  varchar_20_ algorithm
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  varchar_20_ status
  varchar_64_ type
  timestamp_3__with_time_zone updatedAt
  text value
}
"public.dynamic_credential_entry" {
  timestamp_3__with_time_zone createdAt
  varchar_16_ credential_id FK
  text data
  varchar_16_ resolver_id FK
  varchar_2048_ subject_id
  timestamp_3__with_time_zone updatedAt
}
"public.dynamic_credential_resolver" {
  text config
  timestamp_3__with_time_zone createdAt
  varchar_16_ id
  varchar_128_ name
  varchar_128_ type
  timestamp_3__with_time_zone updatedAt
}
"public.dynamic_credential_user_entry" {
  timestamp_3__with_time_zone createdAt
  varchar_16_ credentialId FK
  text data
  varchar_16_ resolverId FK
  timestamp_3__with_time_zone updatedAt
  uuid userId FK
}
"public.evaluation_collection" {
  timestamp_3__with_time_zone createdAt
  uuid createdById FK
  text description
  varchar_36_ evaluationConfigId FK
  varchar_36_ id
  json insightsCache
  varchar_128_ name
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
}
"public.evaluation_config" {
  timestamp_3__with_time_zone createdAt
  json datasetRef
  varchar_32_ datasetSource
  varchar_255_ endNodeName
  varchar_36_ id
  varchar_64_ invalidReason
  json metrics
  varchar_128_ name
  varchar_255_ startNodeName
  varchar_16_ status
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
}
"public.event_destinations" {
  timestamp_3__with_time_zone createdAt
  jsonb destination
  uuid id
  timestamp_3__with_time_zone updatedAt
}
"public.execution_annotation_tags" {
  integer annotationId FK
  varchar_24_ tagId FK
}
"public.execution_annotations" {
  timestamp_3__with_time_zone createdAt
  integer executionId FK
  integer id
  text note
  timestamp_3__with_time_zone updatedAt
  varchar_6_ vote
}
"public.execution_data" {
  text data
  integer executionId FK
  json workflowData
  varchar_36_ workflowVersionId
}
"public.execution_entity" {
  bigint binaryDataSizeBytes
  timestamp_3__with_time_zone createdAt
  varchar_255_ deduplicationKey
  timestamp_3__with_time_zone deletedAt
  boolean finished
  integer id
  bigint jsonSizeBytes
  varchar mode
  varchar retryOf
  varchar retrySuccessId
  timestamp_3__with_time_zone startedAt
  varchar status
  timestamp_3__with_time_zone stoppedAt
  varchar_2_ storedAt
  json tracingContext
  boolean usedPrivateCredentials
  timestamp_3__with_time_zone waitTill
  varchar_36_ workflowId FK
  varchar_36_ workflowVersionId
}
"public.execution_metadata" {
  integer executionId FK
  integer id
  varchar_255_ key
  text value
}
"public.folder" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  varchar_128_ name
  varchar_36_ parentFolderId FK
  varchar_36_ projectId FK
  timestamp_3__with_time_zone updatedAt
}
"public.folder_tag" {
  varchar_36_ folderId FK
  varchar_36_ tagId FK
}
"public.insights_by_period" {
  integer id
  integer metaId FK
  timestamp_0__with_time_zone periodStart
  integer periodUnit
  integer type
  bigint value
}
"public.insights_metadata" {
  integer metaId
  varchar_36_ projectId FK
  varchar_255_ projectName
  varchar_36_ workflowId FK
  varchar_128_ workflowName
}
"public.insights_raw" {
  integer id
  integer metaId FK
  timestamp_0__with_time_zone timestamp
  integer type
  bigint value
}
"public.installed_nodes" {
  integer latestVersion
  varchar_200_ name
  varchar_241_ package FK
  varchar_200_ type
}
"public.installed_packages" {
  varchar_70_ authorEmail
  varchar_70_ authorName
  timestamp_3__with_time_zone createdAt
  varchar_50_ installedVersion
  varchar_214_ packageName
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_checkpoints" {
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone expiredAt
  varchar_255_ key
  varchar_255_ resourceId
  varchar_255_ runId
  json state
  uuid threadId FK
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_events" {
  timestamp_3__with_time_zone createdAt
  text payload
  varchar_64_ runId
  integer seq
  uuid threadId FK
  varchar_64_ type
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_iteration_logs" {
  timestamp_3__with_time_zone createdAt
  text entry
  varchar_36_ id
  varchar taskKey
  uuid threadId FK
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_mcp_registry_connections" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ credentialId FK
  uuid id
  varchar_255_ serverSlug FK
  json toolFilter
  timestamp_3__with_time_zone updatedAt
  uuid userId FK
}
"public.instance_ai_messages" {
  text content
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  varchar_255_ resourceId
  varchar_16_ role
  uuid threadId FK
  varchar_32_ type
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_observation_cursors" {
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone lastObservedAt
  varchar_36_ lastObservedMessageId
  uuid observationScopeId FK
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_observation_locks" {
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone heldUntil
  varchar_64_ holderId
  uuid observationScopeId FK
  varchar_20_ taskKind
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_observational_memory" {
  text activeObservations
  json bufferedMessageIds
  json bufferedObservationChunks
  integer bufferedObservationTokens
  text bufferedObservations
  text bufferedReflection
  integer bufferedReflectionInputTokens
  integer bufferedReflectionTokens
  text config
  timestamp_3__with_time_zone createdAt
  integer generationCount
  varchar_36_ id
  boolean isBufferingObservation
  boolean isBufferingReflection
  boolean isObserving
  boolean isReflecting
  timestamp_3__with_time_zone lastBufferedAtTime
  integer lastBufferedAtTokens
  timestamp_3__with_time_zone lastObservedAt
  varchar_255_ lookupKey
  json metadata
  integer observationTokenCount
  json observedMessageIds
  varchar observedTimezone
  varchar_32_ originType
  integer pendingMessageTokens
  integer reflectedObservationLineCount
  varchar_255_ resourceId
  varchar_16_ scope
  uuid threadId FK
  integer totalTokensObserved
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_observations" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  varchar_16_ marker
  uuid observationScopeId FK
  varchar_36_ parentId FK
  varchar_16_ status
  varchar_36_ supersededBy FK
  text text
  integer tokenCount
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_pending_confirmations" {
  varchar_255_ checkpointKey FK
  varchar_36_ checkpointTaskId
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone expiresAt
  varchar_16_ kind
  varchar_36_ messageGroupId
  varchar_36_ requestId
  varchar_36_ runId
  uuid threadId FK
  varchar_64_ toolCallId
  timestamp_3__with_time_zone updatedAt
  uuid userId FK
}
"public.instance_ai_resources" {
  timestamp_3__with_time_zone createdAt
  varchar_255_ id
  json metadata
  timestamp_3__with_time_zone updatedAt
  text workingMemory
}
"public.instance_ai_run_snapshots" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ langsmithRunId
  varchar_36_ langsmithTraceId
  varchar_36_ messageGroupId
  varchar_36_ runId
  json runIds
  varchar_64_ spanId
  uuid threadId FK
  varchar_64_ traceId
  text tree
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_thread_grants" {
  timestamp_3__with_time_zone createdAt
  varchar_512_ grantKey
  uuid threadId FK
  timestamp_3__with_time_zone updatedAt
  uuid userId FK
}
"public.instance_ai_threads" {
  timestamp_3__with_time_zone createdAt
  uuid id
  json metadata
  varchar_36_ projectId FK
  varchar_255_ resourceId
  text title
  timestamp_3__with_time_zone updatedAt
}
"public.instance_ai_workflow_snapshots" {
  timestamp_3__with_time_zone createdAt
  varchar_255_ resourceId
  varchar_36_ runId
  text snapshot
  varchar status
  timestamp_3__with_time_zone updatedAt
  varchar_255_ workflowName
}
"public.instance_version_history" {
  timestamp_3__with_time_zone createdAt
  integer id
  integer major
  integer minor
  integer patch
}
"public.invalid_auth_token" {
  timestamp_3__with_time_zone expiresAt
  varchar_512_ token
}
"public.mcp_registry_server" {
  timestamp_3__with_time_zone createdAt
  json data
  timestamp_3__without_time_zone registryUpdatedAt
  varchar_255_ slug
  varchar_50_ status
  timestamp_3__with_time_zone updatedAt
  varchar_50_ version
}
"public.oauth_access_tokens" {
  varchar clientId FK
  varchar token
  uuid userId FK
}
"public.oauth_authorization_codes" {
  varchar clientId FK
  varchar_255_ code
  varchar codeChallenge
  varchar_255_ codeChallengeMethod
  timestamp_3__with_time_zone createdAt
  bigint expiresAt
  varchar redirectUri
  varchar resource
  json scope
  varchar state
  timestamp_3__with_time_zone updatedAt
  boolean used
  uuid userId FK
}
"public.oauth_clients" {
  varchar_255_ clientSecret
  bigint clientSecretExpiresAt
  timestamp_3__with_time_zone createdAt
  json grantTypes
  varchar id
  varchar_255_ name
  json redirectUris
  varchar_255_ tokenEndpointAuthMethod
  timestamp_3__with_time_zone updatedAt
}
"public.oauth_refresh_tokens" {
  varchar clientId FK
  timestamp_3__with_time_zone createdAt
  bigint expiresAt
  json scope
  varchar_255_ token
  timestamp_3__with_time_zone updatedAt
  uuid userId FK
}
"public.oauth_user_consents" {
  varchar clientId FK
  bigint grantedAt
  integer id
  bigint lastActiveAt
  json scope
  uuid userId FK
}
"public.processed_data" {
  varchar_255_ context
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  text value
  varchar_36_ workflowId FK
}
"public.project" {
  timestamp_3__with_time_zone createdAt
  uuid creatorId FK
  json customTelemetryTags
  varchar_512_ description
  json icon
  varchar_36_ id
  varchar_255_ name
  varchar_36_ type
  timestamp_3__with_time_zone updatedAt
}
"public.project_relation" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ projectId FK
  varchar role FK
  timestamp_3__with_time_zone updatedAt
  uuid userId FK
}
"public.project_secrets_provider_access" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ projectId FK
  varchar_128_ role
  integer secretsProviderConnectionId FK
  timestamp_3__with_time_zone updatedAt
}
"public.role" {
  timestamp_3__with_time_zone createdAt
  text description
  text displayName
  text roleType
  varchar_128_ slug
  boolean systemRole
  timestamp_3__with_time_zone updatedAt
}
"public.role_mapping_rule" {
  timestamp_3__with_time_zone createdAt
  text expression
  varchar_16_ id
  integer order
  varchar_128_ role FK
  varchar_64_ type
  timestamp_3__with_time_zone updatedAt
}
"public.role_mapping_rule_project" {
  varchar_36_ projectId FK
  varchar_16_ roleMappingRuleId FK
}
"public.role_scope" {
  varchar_128_ roleSlug FK
  varchar_128_ scopeSlug FK
}
"public.scheduled_job" {
  timestamp_3__with_time_zone createdAt
  varchar_255_ cronExpression
  boolean enabled
  timestamp_3__with_time_zone fireAt
  integer id
  integer intervalSeconds
  varchar_16_ kind
  timestamp_3__with_time_zone lastFiredAt
  integer maxAttempts
  varchar_255_ name
  timestamp_3__with_time_zone nextRunAt
  varchar_36_ nodeId
  json payload
  integer recurrenceSize
  varchar_16_ recurrenceUnit
  varchar_128_ taskType
  varchar_64_ timezone
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
}
"public.scheduled_task" {
  integer attempts
  varchar_255_ claimedBy
  timestamp_3__with_time_zone createdAt
  text errorMessage
  timestamp_3__with_time_zone finishedAt
  bigint id
  integer jobId FK
  integer leaseEpoch
  timestamp_3__with_time_zone leaseExpiresAt
  integer maxAttempts
  json payload
  timestamp_3__with_time_zone runAt
  timestamp_3__with_time_zone scheduledFor
  timestamp_3__with_time_zone startedAt
  varchar_16_ status
  varchar_128_ taskType
}
"public.scope" {
  text description
  text displayName
  varchar_128_ slug
}
"public.secrets_provider_connection" {
  timestamp_3__with_time_zone createdAt
  text encryptedSettings
  integer id
  boolean isEnabled
  varchar_128_ providerKey
  varchar_36_ type
  timestamp_3__with_time_zone updatedAt
}
"public.settings" {
  varchar_255_ key
  boolean loadOnStartup
  text value
}
"public.shared_credentials" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ credentialsId FK
  varchar_36_ projectId FK
  text role
  timestamp_3__with_time_zone updatedAt
}
"public.shared_workflow" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ projectId FK
  text role
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
}
"public.tag_entity" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  varchar_24_ name
  timestamp_3__with_time_zone updatedAt
}
"public.test_case_execution" {
  timestamp_3__with_time_zone completedAt
  timestamp_3__with_time_zone createdAt
  varchar errorCode
  json errorDetails
  integer executionId FK
  varchar_36_ id
  json inputs
  json metrics
  json outputs
  timestamp_3__with_time_zone runAt
  integer runIndex
  varchar status
  varchar_36_ testRunId FK
  timestamp_3__with_time_zone updatedAt
}
"public.test_run" {
  boolean cancelRequested
  varchar_36_ collectionId FK
  timestamp_3__with_time_zone completedAt
  timestamp_3__with_time_zone createdAt
  varchar errorCode
  json errorDetails
  varchar_36_ evaluationConfigId FK
  jsonb evaluationConfigSnapshot
  varchar_36_ id
  json metrics
  timestamp_3__with_time_zone runAt
  varchar_255_ runningInstanceId
  varchar status
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
  varchar_36_ workflowVersionId
}
"public.token_exchange_jti" {
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone expiresAt
  varchar_255_ jti
}
"public.trusted_key" {
  timestamp_3__with_time_zone createdAt
  text data
  varchar_255_ kid
  varchar_36_ sourceId FK
}
"public.trusted_key_source" {
  text config
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  text lastError
  timestamp_3__with_time_zone lastRefreshedAt
  varchar_32_ status
  varchar_32_ type
  timestamp_3__with_time_zone updatedAt
}
"public.user" {
  timestamp_3__with_time_zone createdAt
  boolean disabled
  varchar_255_ email
  varchar_32_ firstName
  uuid id
  date lastActiveAt
  varchar_32_ lastName
  boolean mfaEnabled
  text mfaRecoveryCodes
  text mfaSecret
  varchar_255_ password
  json personalizationAnswers
  varchar_128_ roleSlug FK
  json settings
  timestamp_3__with_time_zone updatedAt
}
"public.user_api_keys" {
  varchar apiKey
  varchar audience
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  varchar_100_ label
  timestamp_3__with_time_zone lastUsedAt
  json scopes
  timestamp_3__with_time_zone updatedAt
  uuid userId FK
}
"public.user_favorites" {
  integer id
  varchar_255_ resourceId
  varchar_64_ resourceType
  uuid userId FK
}
"public.variables" {
  varchar_36_ id
  varchar_50_ key
  varchar_36_ projectId FK
  varchar_50_ type
  text value
}
"public.webhook_entity" {
  varchar method
  varchar node
  integer pathLength
  varchar webhookId
  varchar webhookPath
  varchar_36_ workflowId FK
}
"public.workflow_builder_session" {
  varchar_255_ activeVersionCardId
  timestamp_3__with_time_zone createdAt
  uuid id
  json messages
  text previousSummary
  varchar_255_ resumeAfterRestoreMessageId
  timestamp_3__with_time_zone updatedAt
  uuid userId FK
  varchar_36_ workflowId FK
}
"public.workflow_dependency" {
  timestamp_3__with_time_zone createdAt
  json dependencyInfo
  varchar_255_ dependencyKey
  varchar_32_ dependencyType
  integer id
  smallint indexVersionId
  varchar_36_ publishedVersionId
  varchar_36_ workflowId FK
  integer workflowVersionId
}
"public.workflow_entity" {
  boolean active
  varchar_36_ activeVersionId FK
  json connections
  timestamp_3__with_time_zone createdAt
  text description
  varchar_36_ id
  boolean isArchived
  json meta
  varchar_128_ name
  json nodeGroups
  json nodes
  varchar_36_ parentFolderId FK
  json pinData
  json settings
  varchar sourceWorkflowId
  json staticData
  integer triggerCount
  timestamp_3__with_time_zone updatedAt
  integer versionCounter
  character_36_ versionId
}
"public.workflow_history" {
  varchar_255_ authors
  boolean autosaved
  json connections
  timestamp_3__with_time_zone createdAt
  text description
  varchar_128_ name
  json nodeGroups
  json nodes
  timestamp_3__with_time_zone updatedAt
  varchar_36_ versionId
  varchar_36_ workflowId FK
}
"public.workflow_publication_outbox" {
  timestamp_3__with_time_zone createdAt
  text errorMessage
  integer id
  varchar_36_ publishedVersionId
  varchar_20_ status
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId
}
"public.workflow_publication_trigger_status" {
  timestamp_3__with_time_zone createdAt
  text errorMessage
  varchar_36_ nodeId
  varchar_20_ status
  timestamp_3__with_time_zone updatedAt
  varchar_36_ versionId FK
  varchar_36_ workflowId FK
}
"public.workflow_publish_history" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ event
  integer id
  uuid userId FK
  varchar_36_ versionId FK
  varchar_36_ workflowId FK
}
"public.workflow_published_version" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ publishedVersionId FK
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
}
"public.workflow_statistics" {
  bigint count
  integer id
  timestamp_3__with_time_zone latestEvent
  varchar_128_ name
  bigint rootCount
  varchar_36_ workflowId
  varchar_128_ workflowName
}
"public.workflow_statistics_delta" {
  timestamp_3__with_time_zone createdAt
  bigint id
  varchar_128_ name
  smallint rootCountDelta
  varchar_36_ workflowId
  varchar_128_ workflowName
}
"public.workflows_tags" {
  varchar_36_ tagId FK
  varchar_36_ workflowId FK
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
