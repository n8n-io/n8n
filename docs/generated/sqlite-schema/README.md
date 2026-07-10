# n8n database schema (SQLite)

## Description

Auto-generated from the SQLite migrations in @n8n/db. Do not edit by hand.

## Tables

| Name | Columns | Comment | Type |
| ---- | ------- | ------- | ---- |
| [agent_chat_subscriptions](agent_chat_subscriptions.md) | 6 |  | table |
| [agent_checkpoints](agent_checkpoints.md) | 6 |  | table |
| [agent_execution](agent_execution.md) | 18 |  | table |
| [agent_execution_threads](agent_execution_threads.md) | 17 |  | table |
| [agent_files](agent_files.md) | 8 |  | table |
| [agent_history](agent_history.md) | 9 |  | table |
| [agent_task_definition](agent_task_definition.md) | 7 |  | table |
| [agent_task_run_lock](agent_task_run_lock.md) | 6 |  | table |
| [agent_task_snapshot](agent_task_snapshot.md) | 8 |  | table |
| [agents](agents.md) | 11 |  | table |
| [agents_memory_entries](agents_memory_entries.md) | 13 |  | table |
| [agents_memory_entry_cursors](agents_memory_entry_cursors.md) | 6 |  | table |
| [agents_memory_entry_locks](agents_memory_entry_locks.md) | 6 |  | table |
| [agents_memory_entry_sources](agents_memory_entry_sources.md) | 9 |  | table |
| [agents_messages](agents_messages.md) | 8 |  | table |
| [agents_observation_cursors](agents_observation_cursors.md) | 6 |  | table |
| [agents_observation_locks](agents_observation_locks.md) | 7 |  | table |
| [agents_observations](agents_observations.md) | 11 |  | table |
| [agents_resources](agents_resources.md) | 4 |  | table |
| [agents_threads](agents_threads.md) | 6 |  | table |
| [ai_builder_temporary_workflow](ai_builder_temporary_workflow.md) | 4 |  | table |
| [annotation_tag_entity](annotation_tag_entity.md) | 4 |  | table |
| [auth_identity](auth_identity.md) | 5 |  | table |
| [auth_provider_sync_history](auth_provider_sync_history.md) | 11 |  | table |
| [binary_data](binary_data.md) | 9 |  | table |
| [chat_hub_agent_tools](chat_hub_agent_tools.md) | 2 |  | table |
| [chat_hub_agents](chat_hub_agents.md) | 13 |  | table |
| [chat_hub_messages](chat_hub_messages.md) | 17 |  | table |
| [chat_hub_session_tools](chat_hub_session_tools.md) | 2 |  | table |
| [chat_hub_sessions](chat_hub_sessions.md) | 13 |  | table |
| [chat_hub_tools](chat_hub_tools.md) | 9 |  | table |
| [credential_dependency](credential_dependency.md) | 5 |  | table |
| [credentials_entity](credentials_entity.md) | 11 |  | table |
| [data_table](data_table.md) | 5 |  | table |
| [data_table_column](data_table_column.md) | 7 |  | table |
| [deployment_key](deployment_key.md) | 7 |  | table |
| [dynamic_credential_entry](dynamic_credential_entry.md) | 6 |  | table |
| [dynamic_credential_resolver](dynamic_credential_resolver.md) | 6 |  | table |
| [dynamic_credential_user_entry](dynamic_credential_user_entry.md) | 6 |  | table |
| [evaluation_collection](evaluation_collection.md) | 9 |  | table |
| [evaluation_config](evaluation_config.md) | 12 |  | table |
| [event_destinations](event_destinations.md) | 4 |  | table |
| [execution_annotation_tags](execution_annotation_tags.md) | 2 |  | table |
| [execution_annotations](execution_annotations.md) | 6 |  | table |
| [execution_data](execution_data.md) | 4 |  | table |
| [execution_entity](execution_entity.md) | 19 |  | table |
| [execution_metadata](execution_metadata.md) | 4 |  | table |
| [folder](folder.md) | 6 |  | table |
| [folder_tag](folder_tag.md) | 2 |  | table |
| [insights_by_period](insights_by_period.md) | 6 |  | table |
| [insights_metadata](insights_metadata.md) | 5 |  | table |
| [insights_raw](insights_raw.md) | 5 |  | table |
| [installed_nodes](installed_nodes.md) | 4 |  | table |
| [installed_packages](installed_packages.md) | 6 |  | table |
| [instance_ai_checkpoints](instance_ai_checkpoints.md) | 8 |  | table |
| [instance_ai_iteration_logs](instance_ai_iteration_logs.md) | 6 |  | table |
| [instance_ai_mcp_registry_connections](instance_ai_mcp_registry_connections.md) | 7 |  | table |
| [instance_ai_messages](instance_ai_messages.md) | 8 |  | table |
| [instance_ai_observation_cursors](instance_ai_observation_cursors.md) | 5 |  | table |
| [instance_ai_observation_locks](instance_ai_observation_locks.md) | 6 |  | table |
| [instance_ai_observational_memory](instance_ai_observational_memory.md) | 32 |  | table |
| [instance_ai_observations](instance_ai_observations.md) | 10 |  | table |
| [instance_ai_pending_confirmations](instance_ai_pending_confirmations.md) | 12 |  | table |
| [instance_ai_resources](instance_ai_resources.md) | 5 |  | table |
| [instance_ai_run_snapshots](instance_ai_run_snapshots.md) | 11 |  | table |
| [instance_ai_thread_grants](instance_ai_thread_grants.md) | 5 |  | table |
| [instance_ai_threads](instance_ai_threads.md) | 7 |  | table |
| [instance_ai_workflow_snapshots](instance_ai_workflow_snapshots.md) | 7 |  | table |
| [instance_version_history](instance_version_history.md) | 5 |  | table |
| [invalid_auth_token](invalid_auth_token.md) | 2 |  | table |
| [mcp_registry_server](mcp_registry_server.md) | 7 |  | table |
| [oauth_access_tokens](oauth_access_tokens.md) | 3 |  | table |
| [oauth_authorization_codes](oauth_authorization_codes.md) | 13 |  | table |
| [oauth_clients](oauth_clients.md) | 9 |  | table |
| [oauth_refresh_tokens](oauth_refresh_tokens.md) | 7 |  | table |
| [oauth_user_consents](oauth_user_consents.md) | 6 |  | table |
| [processed_data](processed_data.md) | 5 |  | table |
| [project](project.md) | 9 |  | table |
| [project_relation](project_relation.md) | 5 |  | table |
| [project_secrets_provider_access](project_secrets_provider_access.md) | 5 |  | table |
| [role](role.md) | 7 |  | table |
| [role_mapping_rule](role_mapping_rule.md) | 7 |  | table |
| [role_mapping_rule_project](role_mapping_rule_project.md) | 2 |  | table |
| [role_scope](role_scope.md) | 2 |  | table |
| [scheduled_job](scheduled_job.md) | 19 |  | table |
| [scheduled_task](scheduled_task.md) | 16 |  | table |
| [scope](scope.md) | 3 |  | table |
| [secrets_provider_connection](secrets_provider_connection.md) | 7 |  | table |
| [settings](settings.md) | 3 |  | table |
| [shared_credentials](shared_credentials.md) | 5 |  | table |
| [shared_workflow](shared_workflow.md) | 5 |  | table |
| [tag_entity](tag_entity.md) | 4 |  | table |
| [test_case_execution](test_case_execution.md) | 16 |  | table |
| [test_run](test_run.md) | 16 |  | table |
| [token_exchange_jti](token_exchange_jti.md) | 3 |  | table |
| [trusted_key](trusted_key.md) | 4 |  | table |
| [trusted_key_source](trusted_key_source.md) | 8 |  | table |
| [user](user.md) | 15 |  | table |
| [user_api_keys](user_api_keys.md) | 9 |  | table |
| [user_favorites](user_favorites.md) | 4 |  | table |
| [variables](variables.md) | 5 |  | table |
| [webhook_entity](webhook_entity.md) | 6 |  | table |
| [workflow_builder_session](workflow_builder_session.md) | 9 |  | table |
| [workflow_dependency](workflow_dependency.md) | 9 |  | table |
| [workflow_entity](workflow_entity.md) | 20 |  | table |
| [workflow_history](workflow_history.md) | 11 |  | table |
| [workflow_publication_outbox](workflow_publication_outbox.md) | 7 |  | table |
| [workflow_publication_trigger_status](workflow_publication_trigger_status.md) | 7 |  | table |
| [workflow_publish_history](workflow_publish_history.md) | 6 |  | table |
| [workflow_published_version](workflow_published_version.md) | 4 |  | table |
| [workflow_statistics](workflow_statistics.md) | 7 |  | table |
| [workflows_tags](workflows_tags.md) | 2 |  | table |

## Relations

```mermaid
erDiagram

"agent_chat_subscriptions" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_checkpoints" }o--o| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_execution" }o--|| "agent_execution_threads" : "FOREIGN KEY (threadId) REFERENCES agent_execution_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_execution_threads" }o--o| "agent_history" : "FOREIGN KEY (taskVersionId) REFERENCES agent_history (versionId) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agent_execution_threads" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_execution_threads" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_files" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_history" }o--o| "user" : "FOREIGN KEY (publishedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agent_history" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_task_definition" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_task_run_lock" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_task_snapshot" |o--|| "agent_history" : "FOREIGN KEY (versionId) REFERENCES agent_history (versionId) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents" }o--o| "agent_history" : "FOREIGN KEY (activeVersionId) REFERENCES agent_history (versionId) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agents_memory_entries" }o--o| "agents_memory_entries" : "FOREIGN KEY (supersededBy) REFERENCES agents_memory_entries (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"agents_memory_entries" }o--|| "agents_resources" : "FOREIGN KEY (resourceId) REFERENCES agents_resources (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entries" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_cursors" |o--|| "agents_threads" : "FOREIGN KEY (observationScopeId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_cursors" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_locks" |o--|| "agents_resources" : "FOREIGN KEY (resourceId) REFERENCES agents_resources (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_locks" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_sources" }o--|| "agents_threads" : "FOREIGN KEY (threadId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_sources" }o--|| "agents_observations" : "FOREIGN KEY (observationId) REFERENCES agents_observations (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_sources" }o--|| "agents_memory_entries" : "FOREIGN KEY (memoryEntryId) REFERENCES agents_memory_entries (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_sources" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_messages" }o--|| "agents_threads" : "FOREIGN KEY (threadId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observation_cursors" |o--|| "agents_threads" : "FOREIGN KEY (observationScopeId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observation_cursors" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observation_locks" |o--|| "agents_threads" : "FOREIGN KEY (observationScopeId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observation_locks" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observations" }o--o| "agents_observations" : "FOREIGN KEY (supersededBy) REFERENCES agents_observations (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"agents_observations" }o--o| "agents_observations" : "FOREIGN KEY (parentId) REFERENCES agents_observations (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"agents_observations" }o--|| "agents_threads" : "FOREIGN KEY (observationScopeId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observations" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"ai_builder_temporary_workflow" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"ai_builder_temporary_workflow" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"auth_identity" }o--o| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"chat_hub_agent_tools" |o--|| "chat_hub_tools" : "FOREIGN KEY (toolId) REFERENCES chat_hub_tools (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_agent_tools" |o--|| "chat_hub_agents" : "FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_agents" }o--|| "user" : "FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_agents" }o--o| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_messages" }o--o| "chat_hub_agents" : "FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_messages" }o--o| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_messages" }o--o| "chat_hub_messages" : "FOREIGN KEY (revisionOfMessageId) REFERENCES chat_hub_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_messages" }o--o| "chat_hub_messages" : "FOREIGN KEY (retryOfMessageId) REFERENCES chat_hub_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_messages" }o--o| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_messages" }o--o| "chat_hub_messages" : "FOREIGN KEY (previousMessageId) REFERENCES chat_hub_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_messages" }o--|| "chat_hub_sessions" : "FOREIGN KEY (sessionId) REFERENCES chat_hub_sessions (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_session_tools" |o--|| "chat_hub_tools" : "FOREIGN KEY (toolId) REFERENCES chat_hub_tools (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_session_tools" |o--|| "chat_hub_sessions" : "FOREIGN KEY (sessionId) REFERENCES chat_hub_sessions (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_sessions" }o--|| "user" : "FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_sessions" }o--o| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_sessions" }o--o| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_sessions" }o--o| "chat_hub_agents" : "FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_tools" }o--|| "user" : "FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"credential_dependency" }o--|| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"credentials_entity" }o--o| "dynamic_credential_resolver" : "FOREIGN KEY (resolverId) REFERENCES dynamic_credential_resolver (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"data_table" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"data_table_column" }o--|| "data_table" : "FOREIGN KEY (dataTableId) REFERENCES data_table (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_entry" |o--|| "dynamic_credential_resolver" : "FOREIGN KEY (resolver_id) REFERENCES dynamic_credential_resolver (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_entry" |o--|| "credentials_entity" : "FOREIGN KEY (credential_id) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_user_entry" |o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_user_entry" |o--|| "dynamic_credential_resolver" : "FOREIGN KEY (resolverId) REFERENCES dynamic_credential_resolver (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_user_entry" |o--|| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"evaluation_collection" }o--o| "user" : "FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"evaluation_collection" }o--|| "evaluation_config" : "FOREIGN KEY (evaluationConfigId) REFERENCES evaluation_config (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"evaluation_collection" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"evaluation_config" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_annotation_tags" |o--|| "annotation_tag_entity" : "FOREIGN KEY (tagId) REFERENCES annotation_tag_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_annotation_tags" |o--|| "execution_annotations" : "FOREIGN KEY (annotationId) REFERENCES execution_annotations (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_annotations" }o--|| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_data" |o--|| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_entity" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_metadata" }o--|| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"folder" }o--o| "folder" : "FOREIGN KEY (parentFolderId) REFERENCES folder (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"folder" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"folder_tag" |o--|| "tag_entity" : "FOREIGN KEY (tagId) REFERENCES tag_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"folder_tag" |o--|| "folder" : "FOREIGN KEY (folderId) REFERENCES folder (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"insights_by_period" }o--|| "insights_metadata" : "FOREIGN KEY (metaId) REFERENCES insights_metadata (metaId) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"insights_metadata" }o--o| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"insights_metadata" }o--o| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"insights_raw" }o--|| "insights_metadata" : "FOREIGN KEY (metaId) REFERENCES insights_metadata (metaId) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"installed_nodes" }o--|| "installed_packages" : "FOREIGN KEY (package) REFERENCES installed_packages (packageName) ON UPDATE CASCADE ON DELETE CASCADE MATCH NONE"
"instance_ai_checkpoints" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_iteration_logs" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_mcp_registry_connections" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_mcp_registry_connections" }o--|| "mcp_registry_server" : "FOREIGN KEY (serverSlug) REFERENCES mcp_registry_server (slug) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_mcp_registry_connections" }o--|| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_messages" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_observation_cursors" |o--|| "instance_ai_threads" : "FOREIGN KEY (observationScopeId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_observation_locks" |o--|| "instance_ai_threads" : "FOREIGN KEY (observationScopeId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_observational_memory" }o--o| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"instance_ai_observations" }o--o| "instance_ai_observations" : "FOREIGN KEY (supersededBy) REFERENCES instance_ai_observations (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"instance_ai_observations" }o--o| "instance_ai_observations" : "FOREIGN KEY (parentId) REFERENCES instance_ai_observations (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"instance_ai_observations" }o--|| "instance_ai_threads" : "FOREIGN KEY (observationScopeId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_pending_confirmations" }o--o| "instance_ai_checkpoints" : "FOREIGN KEY (checkpointKey) REFERENCES instance_ai_checkpoints (key) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_pending_confirmations" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_pending_confirmations" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_run_snapshots" |o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_thread_grants" |o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_thread_grants" |o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_threads" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_access_tokens" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_access_tokens" }o--|| "oauth_clients" : "FOREIGN KEY (clientId) REFERENCES oauth_clients (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_authorization_codes" }o--|| "oauth_clients" : "FOREIGN KEY (clientId) REFERENCES oauth_clients (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_authorization_codes" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_refresh_tokens" }o--|| "oauth_clients" : "FOREIGN KEY (clientId) REFERENCES oauth_clients (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_refresh_tokens" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_user_consents" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_user_consents" }o--|| "oauth_clients" : "FOREIGN KEY (clientId) REFERENCES oauth_clients (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"processed_data" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"project" }o--o| "user" : "FOREIGN KEY (creatorId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"project_relation" }o--|| "role" : "FOREIGN KEY (role) REFERENCES role (slug) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"project_relation" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"project_relation" |o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"project_secrets_provider_access" |o--|| "secrets_provider_connection" : "FOREIGN KEY (secretsProviderConnectionId) REFERENCES secrets_provider_connection (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"project_secrets_provider_access" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"role_mapping_rule" }o--|| "role" : "FOREIGN KEY (role) REFERENCES role (slug) ON UPDATE CASCADE ON DELETE CASCADE MATCH NONE"
"role_mapping_rule_project" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"role_mapping_rule_project" |o--|| "role_mapping_rule" : "FOREIGN KEY (roleMappingRuleId) REFERENCES role_mapping_rule (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"role_scope" |o--|| "scope" : "FOREIGN KEY (scopeSlug) REFERENCES scope (slug) ON UPDATE CASCADE ON DELETE CASCADE MATCH NONE"
"role_scope" |o--|| "role" : "FOREIGN KEY (roleSlug) REFERENCES role (slug) ON UPDATE CASCADE ON DELETE CASCADE MATCH NONE"
"scheduled_job" }o--o| "workflow_published_version" : "FOREIGN KEY (workflowId) REFERENCES workflow_published_version (workflowId) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"scheduled_task" }o--|| "scheduled_job" : "FOREIGN KEY (jobId) REFERENCES scheduled_job (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"shared_credentials" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"shared_credentials" |o--|| "credentials_entity" : "FOREIGN KEY (credentialsId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"shared_workflow" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"shared_workflow" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"test_case_execution" }o--|| "test_run" : "FOREIGN KEY (testRunId) REFERENCES test_run (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"test_case_execution" }o--o| "execution_entity" : "FOREIGN KEY (pastExecutionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"test_case_execution" }o--o| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"test_case_execution" }o--o| "execution_entity" : "FOREIGN KEY (evaluationExecutionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"test_run" }o--o| "evaluation_collection" : "FOREIGN KEY (collectionId) REFERENCES evaluation_collection (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"test_run" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"test_run" }o--o| "evaluation_config" : "FOREIGN KEY (evaluationConfigId) REFERENCES evaluation_config (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"trusted_key" |o--|| "trusted_key_source" : "FOREIGN KEY (sourceId) REFERENCES trusted_key_source (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"user" }o--|| "role" : "FOREIGN KEY (roleSlug) REFERENCES role (slug) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"user_api_keys" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"user_favorites" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"variables" }o--o| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_builder_session" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_builder_session" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_dependency" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_entity" }o--o| "workflow_history" : "FOREIGN KEY (activeVersionId) REFERENCES workflow_history (versionId) ON UPDATE NO ACTION ON DELETE RESTRICT MATCH NONE"
"workflow_entity" }o--o| "folder" : "FOREIGN KEY (parentFolderId) REFERENCES folder (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_history" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_publication_trigger_status" }o--|| "workflow_history" : "FOREIGN KEY (versionId) REFERENCES workflow_history (versionId) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_publication_trigger_status" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_publish_history" }o--o| "workflow_history" : "FOREIGN KEY (versionId) REFERENCES workflow_history (versionId) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"workflow_publish_history" }o--o| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"workflow_publish_history" }o--o| "workflow_history" : "FOREIGN KEY (versionId) REFERENCES workflow_history (versionId) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_publish_history" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_published_version" }o--|| "workflow_history" : "FOREIGN KEY (publishedVersionId) REFERENCES workflow_history (versionId) ON UPDATE NO ACTION ON DELETE RESTRICT MATCH NONE"
"workflow_published_version" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE RESTRICT MATCH NONE"
"workflow_published_version" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_published_version" }o--|| "workflow_history" : "FOREIGN KEY (publishedVersionId) REFERENCES workflow_history (versionId) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflows_tags" |o--|| "tag_entity" : "FOREIGN KEY (tagId) REFERENCES tag_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflows_tags" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"agent_chat_subscriptions" {
  varchar_36_ agentId PK
  datetime_3_ createdAt
  varchar_255_ credentialId PK
  varchar_64_ integrationType PK
  varchar_255_ threadId PK
  datetime_3_ updatedAt
}
"agent_checkpoints" {
  varchar_255_ agentId FK
  datetime_3_ createdAt
  boolean expired
  varchar_255_ runId PK
  TEXT state
  datetime_3_ updatedAt
}
"agent_execution" {
  INTEGER completionTokens
  REAL cost
  datetime_3_ createdAt
  INTEGER duration
  TEXT error
  varchar_16_ hitlStatus
  varchar_36_ id PK
  varchar_255_ model
  INTEGER promptTokens
  varchar_32_ source
  datetime_3_ startedAt
  varchar_16_ status
  datetime_3_ stoppedAt
  varchar_128_ threadId FK
  TEXT timeline
  INTEGER totalTokens
  datetime_3_ updatedAt
  TEXT userMessage
}
"agent_execution_threads" {
  varchar_36_ agentId FK
  varchar_255_ agentName
  datetime_3_ createdAt
  varchar_8_ emoji
  varchar_128_ id PK
  varchar_36_ parentAgentId
  varchar_128_ parentThreadId
  varchar_255_ projectId FK
  INTEGER sessionNumber
  varchar_32_ taskId
  varchar_36_ taskVersionId FK
  varchar_255_ title
  INTEGER totalCompletionTokens
  REAL totalCost
  INTEGER totalDuration
  INTEGER totalPromptTokens
  datetime_3_ updatedAt
}
"agent_files" {
  varchar_36_ agentId FK
  TEXT binaryDataId
  datetime_3_ createdAt
  varchar_255_ fileName
  INTEGER fileSizeBytes
  varchar_16_ id PK
  varchar_255_ mimeType
  datetime_3_ updatedAt
}
"agent_history" {
  varchar_36_ agentId FK
  varchar_255_ author
  datetime_3_ createdAt
  varchar publishedById FK
  TEXT schema
  TEXT skills
  TEXT tools
  datetime_3_ updatedAt
  varchar_36_ versionId PK
}
"agent_task_definition" {
  varchar_36_ agentId FK
  datetime_3_ createdAt
  varchar_128_ cronExpression
  varchar_32_ id PK
  varchar_128_ name
  TEXT objective
  datetime_3_ updatedAt
}
"agent_task_run_lock" {
  varchar_36_ agentId PK
  datetime_3_ createdAt
  datetime_3_ heldUntil
  varchar holderId
  varchar_32_ taskId PK
  datetime_3_ updatedAt
}
"agent_task_snapshot" {
  datetime_3_ createdAt
  varchar_128_ cronExpression
  boolean enabled
  varchar_128_ name
  TEXT objective
  varchar_32_ taskId PK
  datetime_3_ updatedAt
  varchar_36_ versionId PK
}
"agents" {
  varchar_36_ activeVersionId FK
  datetime_3_ createdAt
  varchar_36_ id PK
  TEXT integrations
  varchar_128_ name
  varchar_255_ projectId FK
  TEXT schema
  TEXT skills
  TEXT tools
  datetime_3_ updatedAt
  varchar_36_ versionId
}
"agents_memory_entries" {
  varchar_36_ agentId FK
  TEXT content
  varchar_64_ contentHash
  datetime_3_ createdAt
  TEXT embedding
  varchar_128_ embeddingModel
  varchar_36_ id PK
  datetime_3_ lastSeenAt
  TEXT metadata
  varchar_255_ resourceId FK
  varchar_16_ status
  varchar_36_ supersededBy FK
  datetime_3_ updatedAt
}
"agents_memory_entry_cursors" {
  varchar_36_ agentId PK
  datetime_3_ createdAt
  datetime_3_ lastIndexedObservationCreatedAt
  varchar_36_ lastIndexedObservationId
  varchar_255_ observationScopeId PK
  datetime_3_ updatedAt
}
"agents_memory_entry_locks" {
  varchar_36_ agentId PK
  datetime_3_ createdAt
  datetime_3_ heldUntil
  varchar_64_ holderId
  varchar_255_ resourceId PK
  datetime_3_ updatedAt
}
"agents_memory_entry_sources" {
  varchar_36_ agentId FK
  datetime_3_ createdAt
  varchar_64_ evidenceHash
  TEXT evidenceText
  varchar_36_ id PK
  varchar_36_ memoryEntryId FK
  varchar_36_ observationId FK
  varchar_255_ threadId FK
  datetime_3_ updatedAt
}
"agents_messages" {
  TEXT content
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_255_ resourceId
  varchar_36_ role
  varchar_255_ threadId FK
  varchar_36_ type
  datetime_3_ updatedAt
}
"agents_observation_cursors" {
  varchar_36_ agentId PK
  datetime_3_ createdAt
  datetime_3_ lastObservedAt
  varchar_36_ lastObservedMessageId
  varchar_255_ observationScopeId PK
  datetime_3_ updatedAt
}
"agents_observation_locks" {
  varchar_36_ agentId PK
  datetime_3_ createdAt
  datetime_3_ heldUntil
  varchar_64_ holderId
  varchar_255_ observationScopeId PK
  varchar_20_ taskKind PK
  datetime_3_ updatedAt
}
"agents_observations" {
  varchar_36_ agentId FK
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_16_ marker
  varchar_255_ observationScopeId FK
  varchar_36_ parentId FK
  varchar_16_ status
  varchar_36_ supersededBy FK
  TEXT text
  INTEGER tokenCount
  datetime_3_ updatedAt
}
"agents_resources" {
  datetime_3_ createdAt
  varchar_255_ id PK
  TEXT metadata
  datetime_3_ updatedAt
}
"agents_threads" {
  datetime_3_ createdAt
  varchar_128_ id PK
  TEXT metadata
  varchar_255_ resourceId
  varchar_255_ title
  datetime_3_ updatedAt
}
"ai_builder_temporary_workflow" {
  datetime_3_ createdAt
  varchar threadId FK
  datetime_3_ updatedAt
  varchar_36_ workflowId PK
}
"annotation_tag_entity" {
  datetime_3_ createdAt
  varchar_16_ id PK
  varchar_24_ name
  datetime_3_ updatedAt
}
"auth_identity" {
  timestamp createdAt
  VARCHAR_64_ providerId PK
  VARCHAR_32_ providerType PK
  timestamp updatedAt
  VARCHAR_36_ userId FK
}
"auth_provider_sync_history" {
  INTEGER created
  INTEGER disabled
  DATETIME endedAt
  TEXT error
  INTEGER id
  VARCHAR_32_ providerType
  TEXT runMode
  INTEGER scanned
  DATETIME startedAt
  TEXT status
  INTEGER updated
}
"binary_data" {
  datetime_3_ createdAt
  BLOB data
  varchar fileId PK
  varchar_255_ fileName
  INTEGER fileSize
  varchar_255_ mimeType
  varchar_255_ sourceId
  varchar_50_ sourceType
  datetime_3_ updatedAt
}
"chat_hub_agent_tools" {
  varchar agentId PK
  varchar toolId PK
}
"chat_hub_agents" {
  datetime_3_ createdAt
  varchar_36_ credentialId FK
  varchar_512_ description
  TEXT files
  TEXT icon
  varchar id PK
  varchar_64_ model
  varchar_256_ name
  varchar ownerId FK
  varchar_16_ provider
  TEXT suggestedPrompts
  TEXT systemPrompt
  datetime_3_ updatedAt
}
"chat_hub_messages" {
  varchar_36_ agentId FK
  TEXT attachments
  TEXT content
  datetime_3_ createdAt
  INTEGER executionId FK
  varchar id PK
  VARCHAR_256_ model
  varchar_128_ name
  varchar previousMessageId FK
  varchar_16_ provider
  varchar retryOfMessageId FK
  varchar revisionOfMessageId FK
  varchar sessionId FK
  varchar_16_ status
  varchar_16_ type
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
}
"chat_hub_session_tools" {
  varchar sessionId PK
  varchar toolId PK
}
"chat_hub_sessions" {
  varchar_36_ agentId FK
  varchar_128_ agentName
  datetime_3_ createdAt
  varchar_36_ credentialId FK
  varchar id PK
  datetime_3_ lastMessageAt
  varchar_64_ model
  varchar ownerId FK
  varchar_16_ provider
  varchar_256_ title
  varchar_16_ type
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
}
"chat_hub_tools" {
  datetime_3_ createdAt
  TEXT definition
  boolean enabled
  varchar id PK
  varchar_255_ name
  varchar ownerId FK
  varchar_255_ type
  REAL typeVersion
  datetime_3_ updatedAt
}
"credential_dependency" {
  datetime_3_ createdAt
  varchar_36_ credentialId FK
  varchar_255_ dependencyId
  varchar_64_ dependencyType
  INTEGER id
}
"credentials_entity" {
  datetime_3_ createdAt
  TEXT data
  varchar_36_ id PK
  boolean isGlobal
  boolean isManaged
  boolean isResolvable
  varchar_128_ name
  boolean resolvableAllowFallback
  varchar_16_ resolverId FK
  varchar_32_ type
  datetime_3_ updatedAt
}
"data_table" {
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_128_ name
  varchar_36_ projectId FK
  datetime_3_ updatedAt
}
"data_table_column" {
  datetime_3_ createdAt
  varchar_36_ dataTableId FK
  varchar_36_ id PK
  INTEGER index
  varchar_128_ name
  varchar_32_ type
  datetime_3_ updatedAt
}
"deployment_key" {
  varchar_20_ algorithm
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_20_ status
  varchar_64_ type
  datetime_3_ updatedAt
  TEXT value
}
"dynamic_credential_entry" {
  datetime_3_ createdAt
  varchar_16_ credential_id PK
  TEXT data
  varchar_16_ resolver_id PK
  varchar_2048_ subject_id PK
  datetime_3_ updatedAt
}
"dynamic_credential_resolver" {
  TEXT config
  datetime_3_ createdAt
  varchar_16_ id PK
  varchar_128_ name
  varchar_128_ type
  datetime_3_ updatedAt
}
"dynamic_credential_user_entry" {
  datetime_3_ createdAt
  varchar_16_ credentialId PK
  TEXT data
  varchar_16_ resolverId PK
  datetime_3_ updatedAt
  varchar userId PK
}
"evaluation_collection" {
  datetime_3_ createdAt
  varchar createdById FK
  TEXT description
  varchar_36_ evaluationConfigId FK
  varchar_36_ id PK
  TEXT insightsCache
  varchar_128_ name
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
}
"evaluation_config" {
  datetime_3_ createdAt
  TEXT datasetRef
  varchar_32_ datasetSource
  varchar_255_ endNodeName
  varchar_36_ id PK
  varchar_64_ invalidReason
  TEXT metrics
  varchar_128_ name
  varchar_255_ startNodeName
  varchar_16_ status
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
}
"event_destinations" {
  datetime_3_ createdAt
  TEXT destination
  varchar_36_ id PK
  datetime_3_ updatedAt
}
"execution_annotation_tags" {
  INTEGER annotationId PK
  varchar_24_ tagId PK
}
"execution_annotations" {
  datetime_3_ createdAt
  INTEGER executionId FK
  INTEGER id
  TEXT note
  datetime_3_ updatedAt
  varchar_6_ vote
}
"execution_data" {
  TEXT data
  INT executionId PK
  TEXT workflowData
  VARCHAR_36_ workflowVersionId
}
"execution_entity" {
  bigint binaryDataSizeBytes
  datetime_3_ createdAt
  varchar_255_ deduplicationKey
  datetime_3_ deletedAt
  boolean finished
  INTEGER id
  bigint jsonSizeBytes
  varchar mode
  varchar retryOf
  varchar retrySuccessId
  datetime startedAt
  varchar status
  datetime stoppedAt
  varchar_2_ storedAt
  TEXT tracingContext
  BOOLEAN usedPrivateCredentials
  datetime waitTill
  varchar_36_ workflowId FK
  varchar_36_ workflowVersionId
}
"execution_metadata" {
  INTEGER executionId FK
  INTEGER id
  varchar_255_ key
  TEXT value
}
"folder" {
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_128_ name
  varchar_36_ parentFolderId FK
  varchar_36_ projectId FK
  datetime_3_ updatedAt
}
"folder_tag" {
  varchar_36_ folderId PK
  varchar_36_ tagId PK
}
"insights_by_period" {
  INTEGER id
  INTEGER metaId FK
  datetime_0_ periodStart
  INTEGER periodUnit
  INTEGER type
  bigint value
}
"insights_metadata" {
  INTEGER metaId
  varchar_36_ projectId FK
  varchar_255_ projectName
  varchar_16_ workflowId FK
  varchar_128_ workflowName
}
"insights_raw" {
  INTEGER id
  INTEGER metaId FK
  datetime_0_ timestamp
  INTEGER type
  bigint value
}
"installed_nodes" {
  INTEGER latestVersion
  char_200_ name PK
  char_214_ package FK
  char_200_ type
}
"installed_packages" {
  char_70_ authorEmail
  char_70_ authorName
  datetime_3_ createdAt
  char_50_ installedVersion
  char_214_ packageName PK
  datetime_3_ updatedAt
}
"instance_ai_checkpoints" {
  datetime_3_ createdAt
  datetime_3_ expiredAt
  varchar_255_ key PK
  varchar_255_ resourceId
  varchar_255_ runId
  TEXT state
  varchar threadId FK
  datetime_3_ updatedAt
}
"instance_ai_iteration_logs" {
  datetime_3_ createdAt
  TEXT entry
  varchar_36_ id PK
  varchar taskKey
  varchar threadId FK
  datetime_3_ updatedAt
}
"instance_ai_mcp_registry_connections" {
  datetime_3_ createdAt
  varchar_36_ credentialId FK
  varchar id PK
  varchar_255_ serverSlug FK
  TEXT toolFilter
  datetime_3_ updatedAt
  varchar userId FK
}
"instance_ai_messages" {
  TEXT content
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_255_ resourceId
  varchar_16_ role
  varchar threadId FK
  varchar_32_ type
  datetime_3_ updatedAt
}
"instance_ai_observation_cursors" {
  datetime_3_ createdAt
  datetime_3_ lastObservedAt
  varchar_36_ lastObservedMessageId
  varchar observationScopeId PK
  datetime_3_ updatedAt
}
"instance_ai_observation_locks" {
  datetime_3_ createdAt
  datetime_3_ heldUntil
  varchar_64_ holderId
  varchar observationScopeId PK
  varchar_20_ taskKind PK
  datetime_3_ updatedAt
}
"instance_ai_observational_memory" {
  TEXT activeObservations
  TEXT bufferedMessageIds
  TEXT bufferedObservationChunks
  INTEGER bufferedObservationTokens
  TEXT bufferedObservations
  TEXT bufferedReflection
  INTEGER bufferedReflectionInputTokens
  INTEGER bufferedReflectionTokens
  TEXT config
  datetime_3_ createdAt
  INTEGER generationCount
  varchar_36_ id PK
  boolean isBufferingObservation
  boolean isBufferingReflection
  boolean isObserving
  boolean isReflecting
  datetime_3_ lastBufferedAtTime
  INTEGER lastBufferedAtTokens
  datetime_3_ lastObservedAt
  varchar_255_ lookupKey
  TEXT metadata
  INTEGER observationTokenCount
  TEXT observedMessageIds
  varchar observedTimezone
  varchar_32_ originType
  INTEGER pendingMessageTokens
  INTEGER reflectedObservationLineCount
  varchar_255_ resourceId
  varchar_16_ scope
  varchar threadId FK
  INTEGER totalTokensObserved
  datetime_3_ updatedAt
}
"instance_ai_observations" {
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_16_ marker
  varchar observationScopeId FK
  varchar_36_ parentId FK
  varchar_16_ status
  varchar_36_ supersededBy FK
  TEXT text
  INTEGER tokenCount
  datetime_3_ updatedAt
}
"instance_ai_pending_confirmations" {
  varchar_255_ checkpointKey FK
  varchar_36_ checkpointTaskId
  datetime_3_ createdAt
  datetime_3_ expiresAt
  varchar_16_ kind
  varchar_36_ messageGroupId
  varchar_36_ requestId PK
  varchar_36_ runId
  varchar threadId FK
  varchar_64_ toolCallId
  datetime_3_ updatedAt
  varchar userId FK
}
"instance_ai_resources" {
  datetime_3_ createdAt
  varchar_255_ id PK
  TEXT metadata
  datetime_3_ updatedAt
  TEXT workingMemory
}
"instance_ai_run_snapshots" {
  datetime_3_ createdAt
  varchar_36_ langsmithRunId
  varchar_36_ langsmithTraceId
  varchar_36_ messageGroupId
  varchar_36_ runId PK
  TEXT runIds
  varchar_64_ spanId
  varchar threadId PK
  varchar_64_ traceId
  TEXT tree
  datetime_3_ updatedAt
}
"instance_ai_thread_grants" {
  datetime_3_ createdAt
  varchar_512_ grantKey PK
  varchar threadId PK
  datetime_3_ updatedAt
  varchar userId PK
}
"instance_ai_threads" {
  datetime_3_ createdAt
  varchar id PK
  TEXT metadata
  varchar_36_ projectId FK
  varchar_255_ resourceId
  TEXT title
  datetime_3_ updatedAt
}
"instance_ai_workflow_snapshots" {
  datetime_3_ createdAt
  varchar_255_ resourceId
  varchar_36_ runId PK
  TEXT snapshot
  varchar status
  datetime_3_ updatedAt
  varchar_255_ workflowName PK
}
"instance_version_history" {
  datetime_3_ createdAt
  INTEGER id
  INTEGER major
  INTEGER minor
  INTEGER patch
}
"invalid_auth_token" {
  datetime_3_ expiresAt
  varchar_512_ token PK
}
"mcp_registry_server" {
  datetime_3_ createdAt
  TEXT data
  datetime_3_ registryUpdatedAt
  varchar_255_ slug PK
  varchar_50_ status
  datetime_3_ updatedAt
  varchar_50_ version
}
"oauth_access_tokens" {
  varchar clientId FK
  varchar token PK
  varchar userId FK
}
"oauth_authorization_codes" {
  varchar clientId FK
  varchar_255_ code PK
  varchar codeChallenge
  varchar_255_ codeChallengeMethod
  datetime_3_ createdAt
  bigint expiresAt
  varchar redirectUri
  varchar resource
  TEXT scope
  varchar state
  datetime_3_ updatedAt
  boolean used
  varchar userId FK
}
"oauth_clients" {
  varchar_255_ clientSecret
  bigint clientSecretExpiresAt
  datetime_3_ createdAt
  TEXT grantTypes
  varchar id PK
  varchar_255_ name
  TEXT redirectUris
  varchar_255_ tokenEndpointAuthMethod
  datetime_3_ updatedAt
}
"oauth_refresh_tokens" {
  varchar clientId FK
  datetime_3_ createdAt
  bigint expiresAt
  TEXT scope
  varchar_255_ token PK
  datetime_3_ updatedAt
  varchar userId FK
}
"oauth_user_consents" {
  varchar clientId FK
  bigint grantedAt
  INTEGER id
  bigint lastActiveAt
  TEXT scope
  varchar userId FK
}
"processed_data" {
  varchar_255_ context PK
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT value
  varchar_36_ workflowId PK
}
"project" {
  datetime_3_ createdAt
  varchar creatorId FK
  TEXT customTelemetryTags
  varchar_512_ description
  TEXT icon
  varchar_36_ id PK
  varchar_255_ name
  varchar_36_ type
  datetime_3_ updatedAt
}
"project_relation" {
  datetime_3_ createdAt
  varchar_36_ projectId PK
  varchar role FK
  datetime_3_ updatedAt
  varchar userId PK
}
"project_secrets_provider_access" {
  datetime_3_ createdAt
  varchar_36_ projectId PK
  varchar_128_ role
  INTEGER secretsProviderConnectionId PK
  datetime_3_ updatedAt
}
"role" {
  datetime_3_ createdAt
  TEXT description
  TEXT displayName
  TEXT roleType
  varchar_128_ slug PK
  boolean systemRole
  datetime_3_ updatedAt
}
"role_mapping_rule" {
  datetime_3_ createdAt
  TEXT expression
  varchar_16_ id PK
  INTEGER order
  varchar_128_ role FK
  varchar_64_ type
  datetime_3_ updatedAt
}
"role_mapping_rule_project" {
  varchar_36_ projectId PK
  varchar_16_ roleMappingRuleId PK
}
"role_scope" {
  VARCHAR_128_ roleSlug PK
  VARCHAR_128_ scopeSlug PK
}
"scheduled_job" {
  datetime_3_ createdAt
  varchar_255_ cronExpression
  boolean enabled
  datetime_3_ fireAt
  INTEGER id
  INTEGER intervalSeconds
  varchar_16_ kind
  datetime_3_ lastFiredAt
  INTEGER maxAttempts
  varchar_255_ name
  datetime_3_ nextRunAt
  varchar_36_ nodeId
  TEXT payload
  INT recurrenceSize
  varchar_16_ recurrenceUnit
  varchar_128_ taskType
  varchar_64_ timezone
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
}
"scheduled_task" {
  INTEGER attempts
  varchar_255_ claimedBy
  datetime_3_ createdAt
  TEXT errorMessage
  datetime_3_ finishedAt
  INTEGER id
  INTEGER jobId FK
  INTEGER leaseEpoch
  datetime_3_ leaseExpiresAt
  INTEGER maxAttempts
  TEXT payload
  datetime_3_ runAt
  datetime_3_ scheduledFor
  datetime_3_ startedAt
  varchar_16_ status
  varchar_128_ taskType
}
"scope" {
  TEXT description
  TEXT displayName
  varchar_128_ slug PK
}
"secrets_provider_connection" {
  datetime_3_ createdAt
  TEXT encryptedSettings
  INTEGER id
  boolean isEnabled
  varchar_128_ providerKey
  varchar_36_ type
  datetime_3_ updatedAt
}
"settings" {
  TEXT key PK
  boolean loadOnStartup
  TEXT value
}
"shared_credentials" {
  datetime_3_ createdAt
  varchar_36_ credentialsId PK
  varchar_36_ projectId PK
  TEXT role
  datetime_3_ updatedAt
}
"shared_workflow" {
  datetime_3_ createdAt
  varchar_36_ projectId PK
  TEXT role
  datetime_3_ updatedAt
  varchar_36_ workflowId PK
}
"tag_entity" {
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_24_ name
  datetime_3_ updatedAt
}
"test_case_execution" {
  datetime_3_ completedAt
  datetime_3_ createdAt
  varchar errorCode
  TEXT errorDetails
  INTEGER evaluationExecutionId FK
  INTEGER executionId FK
  varchar_36_ id PK
  TEXT inputs
  TEXT metrics
  TEXT outputs
  INTEGER pastExecutionId FK
  datetime_3_ runAt
  INTEGER runIndex
  varchar status
  varchar_36_ testRunId FK
  datetime_3_ updatedAt
}
"test_run" {
  boolean cancelRequested
  varchar_36_ collectionId FK
  datetime_3_ completedAt
  datetime_3_ createdAt
  varchar errorCode
  TEXT errorDetails
  varchar_36_ evaluationConfigId FK
  TEXT evaluationConfigSnapshot
  varchar_36_ id PK
  TEXT metrics
  datetime_3_ runAt
  varchar_255_ runningInstanceId
  varchar status
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
  varchar_36_ workflowVersionId
}
"token_exchange_jti" {
  datetime_3_ createdAt
  datetime_3_ expiresAt
  varchar_255_ jti PK
}
"trusted_key" {
  datetime_3_ createdAt
  TEXT data
  varchar_255_ kid PK
  varchar_36_ sourceId PK
}
"trusted_key_source" {
  TEXT config
  datetime_3_ createdAt
  varchar_36_ id PK
  TEXT lastError
  datetime_3_ lastRefreshedAt
  varchar_32_ status
  varchar_32_ type
  datetime_3_ updatedAt
}
"user" {
  datetime_3_ createdAt
  boolean disabled
  varchar_255_ email
  varchar_32_ firstName
  varchar id PK
  date lastActiveAt
  varchar_32_ lastName
  boolean mfaEnabled
  TEXT mfaRecoveryCodes
  TEXT mfaSecret
  varchar password
  TEXT personalizationAnswers
  varchar_128_ roleSlug FK
  TEXT settings
  datetime_3_ updatedAt
}
"user_api_keys" {
  varchar apiKey
  varchar audience
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_100_ label
  datetime_3_ lastUsedAt
  TEXT scopes
  datetime_3_ updatedAt
  varchar userId FK
}
"user_favorites" {
  INTEGER id
  varchar_255_ resourceId
  varchar_64_ resourceType
  varchar userId FK
}
"variables" {
  varchar_36_ id PK
  TEXT key
  varchar_36_ projectId FK
  TEXT type
  TEXT value
}
"webhook_entity" {
  varchar method PK
  varchar node
  INTEGER pathLength
  varchar webhookId
  varchar webhookPath PK
  varchar_36_ workflowId
}
"workflow_builder_session" {
  varchar_255_ activeVersionCardId
  datetime_3_ createdAt
  varchar id PK
  TEXT messages
  TEXT previousSummary
  varchar_255_ resumeAfterRestoreMessageId
  datetime_3_ updatedAt
  varchar userId FK
  varchar_36_ workflowId FK
}
"workflow_dependency" {
  datetime_3_ createdAt
  TEXT dependencyInfo
  varchar_255_ dependencyKey
  varchar_32_ dependencyType
  INTEGER id
  smallint indexVersionId
  varchar_36_ publishedVersionId
  varchar_36_ workflowId FK
  INTEGER workflowVersionId
}
"workflow_entity" {
  boolean active
  varchar_36_ activeVersionId FK
  TEXT connections
  datetime_3_ createdAt
  TEXT description
  varchar_36_ id PK
  boolean isArchived
  TEXT meta
  varchar_128_ name
  TEXT nodeGroups
  TEXT nodes
  varchar_36_ parentFolderId FK
  TEXT pinData
  TEXT settings
  varchar sourceWorkflowId
  TEXT staticData
  INTEGER triggerCount
  datetime_3_ updatedAt
  INTEGER versionCounter
  varchar_36_ versionId
}
"workflow_history" {
  varchar_255_ authors
  boolean autosaved
  TEXT connections
  datetime_3_ createdAt
  TEXT description
  varchar_128_ name
  TEXT nodeGroups
  TEXT nodes
  datetime_3_ updatedAt
  varchar_36_ versionId PK
  varchar_36_ workflowId FK
}
"workflow_publication_outbox" {
  datetime_3_ createdAt
  TEXT errorMessage
  INTEGER id
  varchar_36_ publishedVersionId
  varchar_20_ status
  datetime_3_ updatedAt
  varchar_36_ workflowId
}
"workflow_publication_trigger_status" {
  datetime_3_ createdAt
  TEXT errorMessage
  varchar_36_ nodeId PK
  varchar_20_ status
  datetime_3_ updatedAt
  varchar_36_ versionId FK
  varchar_36_ workflowId PK
}
"workflow_publish_history" {
  datetime_3_ createdAt
  varchar_36_ event
  INTEGER id
  varchar userId FK
  varchar_36_ versionId FK
  varchar_36_ workflowId FK
}
"workflow_published_version" {
  datetime_3_ createdAt
  varchar_36_ publishedVersionId FK
  datetime_3_ updatedAt
  varchar_36_ workflowId PK
}
"workflow_statistics" {
  INTEGER count
  INTEGER id
  DATETIME latestEvent
  VARCHAR_128_ name
  INTEGER rootCount
  VARCHAR_36_ workflowId
  VARCHAR_128_ workflowName
}
"workflows_tags" {
  INTEGER tagId PK
  varchar_36_ workflowId PK
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
