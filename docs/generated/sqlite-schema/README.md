# n8n database schema (SQLite)

## Description

Auto-generated from the SQLite migrations in @n8n/db. Do not edit by hand.

## Tables

| Name | Columns | Comment | Type |
| ---- | ------- | ------- | ---- |
| [settings](settings.md) | 3 |  | table |
| [installed_packages](installed_packages.md) | 6 |  | table |
| [installed_nodes](installed_nodes.md) | 4 |  | table |
| [event_destinations](event_destinations.md) | 4 |  | table |
| [auth_identity](auth_identity.md) | 5 |  | table |
| [auth_provider_sync_history](auth_provider_sync_history.md) | 11 |  | table |
| [tag_entity](tag_entity.md) | 4 |  | table |
| [workflows_tags](workflows_tags.md) | 2 |  | table |
| [webhook_entity](webhook_entity.md) | 6 |  | table |
| [execution_data](execution_data.md) | 4 |  | table |
| [shared_credentials](shared_credentials.md) | 5 |  | table |
| [shared_workflow](shared_workflow.md) | 5 |  | table |
| [execution_metadata](execution_metadata.md) | 4 |  | table |
| [invalid_auth_token](invalid_auth_token.md) | 2 |  | table |
| [execution_annotations](execution_annotations.md) | 6 |  | table |
| [annotation_tag_entity](annotation_tag_entity.md) | 4 |  | table |
| [execution_annotation_tags](execution_annotation_tags.md) | 2 |  | table |
| [processed_data](processed_data.md) | 5 |  | table |
| [folder](folder.md) | 6 |  | table |
| [folder_tag](folder_tag.md) | 2 |  | table |
| [insights_metadata](insights_metadata.md) | 5 |  | table |
| [scope](scope.md) | 3 |  | table |
| [role_scope](role_scope.md) | 2 |  | table |
| [user](user.md) | 15 |  | table |
| [test_case_execution](test_case_execution.md) | 16 |  | table |
| [project_relation](project_relation.md) | 5 |  | table |
| [data_table](data_table.md) | 5 |  | table |
| [data_table_column](data_table_column.md) | 7 |  | table |
| [role](role.md) | 7 |  | table |
| [variables](variables.md) | 5 |  | table |
| [insights_raw](insights_raw.md) | 5 |  | table |
| [insights_by_period](insights_by_period.md) | 6 |  | table |
| [oauth_clients](oauth_clients.md) | 9 |  | table |
| [oauth_access_tokens](oauth_access_tokens.md) | 3 |  | table |
| [oauth_user_consents](oauth_user_consents.md) | 4 |  | table |
| [dynamic_credential_resolver](dynamic_credential_resolver.md) | 6 |  | table |
| [credentials_entity](credentials_entity.md) | 11 |  | table |
| [chat_hub_messages](chat_hub_messages.md) | 17 |  | table |
| [workflow_statistics](workflow_statistics.md) | 7 |  | table |
| [dynamic_credential_user_entry](dynamic_credential_user_entry.md) | 6 |  | table |
| [workflow_dependency](workflow_dependency.md) | 9 |  | table |
| [secrets_provider_connection](secrets_provider_connection.md) | 7 |  | table |
| [dynamic_credential_entry](dynamic_credential_entry.md) | 6 |  | table |
| [chat_hub_tools](chat_hub_tools.md) | 9 |  | table |
| [chat_hub_session_tools](chat_hub_session_tools.md) | 2 |  | table |
| [chat_hub_agent_tools](chat_hub_agent_tools.md) | 2 |  | table |
| [chat_hub_agents](chat_hub_agents.md) | 13 |  | table |
| [project_secrets_provider_access](project_secrets_provider_access.md) | 5 |  | table |
| [workflow_published_version](workflow_published_version.md) | 4 |  | table |
| [chat_hub_sessions](chat_hub_sessions.md) | 13 |  | table |
| [role_mapping_rule](role_mapping_rule.md) | 7 |  | table |
| [role_mapping_rule_project](role_mapping_rule_project.md) | 2 |  | table |
| [credential_dependency](credential_dependency.md) | 5 |  | table |
| [workflow_builder_session](workflow_builder_session.md) | 9 |  | table |
| [instance_version_history](instance_version_history.md) | 5 |  | table |
| [instance_ai_messages](instance_ai_messages.md) | 8 |  | table |
| [instance_ai_resources](instance_ai_resources.md) | 5 |  | table |
| [instance_ai_observational_memory](instance_ai_observational_memory.md) | 32 |  | table |
| [instance_ai_workflow_snapshots](instance_ai_workflow_snapshots.md) | 7 |  | table |
| [instance_ai_iteration_logs](instance_ai_iteration_logs.md) | 6 |  | table |
| [token_exchange_jti](token_exchange_jti.md) | 3 |  | table |
| [workflow_publish_history](workflow_publish_history.md) | 6 |  | table |
| [trusted_key_source](trusted_key_source.md) | 8 |  | table |
| [trusted_key](trusted_key.md) | 4 |  | table |
| [user_favorites](user_favorites.md) | 4 |  | table |
| [deployment_key](deployment_key.md) | 7 |  | table |
| [ai_builder_temporary_workflow](ai_builder_temporary_workflow.md) | 4 |  | table |
| [execution_entity](execution_entity.md) | 17 |  | table |
| [evaluation_config](evaluation_config.md) | 12 |  | table |
| [evaluation_collection](evaluation_collection.md) | 9 |  | table |
| [test_run](test_run.md) | 16 |  | table |
| [agent_checkpoints](agent_checkpoints.md) | 6 |  | table |
| [agents_resources](agents_resources.md) | 4 |  | table |
| [agents_threads](agents_threads.md) | 6 |  | table |
| [agents_messages](agents_messages.md) | 8 |  | table |
| [agent_execution](agent_execution.md) | 20 |  | table |
| [workflow_history](workflow_history.md) | 11 |  | table |
| [instance_ai_run_snapshots](instance_ai_run_snapshots.md) | 11 |  | table |
| [agents_observations](agents_observations.md) | 11 |  | table |
| [agents_observation_cursors](agents_observation_cursors.md) | 6 |  | table |
| [agents_observation_locks](agents_observation_locks.md) | 7 |  | table |
| [agents_memory_entries](agents_memory_entries.md) | 13 |  | table |
| [agents_memory_entry_locks](agents_memory_entry_locks.md) | 6 |  | table |
| [agents_memory_entry_sources](agents_memory_entry_sources.md) | 9 |  | table |
| [agents_memory_entry_cursors](agents_memory_entry_cursors.md) | 6 |  | table |
| [agent_history](agent_history.md) | 9 |  | table |
| [agents](agents.md) | 12 |  | table |
| [instance_ai_observations](instance_ai_observations.md) | 10 |  | table |
| [instance_ai_observation_cursors](instance_ai_observation_cursors.md) | 5 |  | table |
| [instance_ai_observation_locks](instance_ai_observation_locks.md) | 6 |  | table |
| [instance_ai_checkpoints](instance_ai_checkpoints.md) | 8 |  | table |
| [instance_ai_pending_confirmations](instance_ai_pending_confirmations.md) | 12 |  | table |
| [workflow_entity](workflow_entity.md) | 20 |  | table |
| [mcp_registry_server](mcp_registry_server.md) | 7 |  | table |
| [user_api_keys](user_api_keys.md) | 9 |  | table |
| [agent_files](agent_files.md) | 8 |  | table |
| [binary_data](binary_data.md) | 9 |  | table |
| [project](project.md) | 9 |  | table |
| [agent_task_definition](agent_task_definition.md) | 7 |  | table |
| [agent_task_snapshot](agent_task_snapshot.md) | 8 |  | table |
| [agent_task_run_lock](agent_task_run_lock.md) | 6 |  | table |
| [agent_execution_threads](agent_execution_threads.md) | 17 |  | table |
| [instance_ai_mcp_registry_connections](instance_ai_mcp_registry_connections.md) | 7 |  | table |
| [oauth_authorization_codes](oauth_authorization_codes.md) | 13 |  | table |
| [oauth_refresh_tokens](oauth_refresh_tokens.md) | 7 |  | table |
| [workflow_publication_outbox](workflow_publication_outbox.md) | 7 |  | table |
| [instance_ai_threads](instance_ai_threads.md) | 7 |  | table |
| [agent_chat_subscriptions](agent_chat_subscriptions.md) | 6 |  | table |

## Relations

```mermaid
erDiagram

"installed_nodes" }o--|| "installed_packages" : "FOREIGN KEY (package) REFERENCES installed_packages (packageName) ON UPDATE CASCADE ON DELETE CASCADE MATCH NONE"
"auth_identity" }o--o| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"workflows_tags" |o--|| "tag_entity" : "FOREIGN KEY (tagId) REFERENCES tag_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflows_tags" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_data" |o--|| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"shared_credentials" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"shared_credentials" |o--|| "credentials_entity" : "FOREIGN KEY (credentialsId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"shared_workflow" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"shared_workflow" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_metadata" }o--|| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_annotations" }o--|| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_annotation_tags" |o--|| "annotation_tag_entity" : "FOREIGN KEY (tagId) REFERENCES annotation_tag_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_annotation_tags" |o--|| "execution_annotations" : "FOREIGN KEY (annotationId) REFERENCES execution_annotations (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"processed_data" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"folder" }o--o| "folder" : "FOREIGN KEY (parentFolderId) REFERENCES folder (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"folder" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"folder_tag" |o--|| "tag_entity" : "FOREIGN KEY (tagId) REFERENCES tag_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"folder_tag" |o--|| "folder" : "FOREIGN KEY (folderId) REFERENCES folder (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"insights_metadata" }o--o| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"insights_metadata" }o--o| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"role_scope" |o--|| "scope" : "FOREIGN KEY (scopeSlug) REFERENCES scope (slug) ON UPDATE CASCADE ON DELETE CASCADE MATCH NONE"
"role_scope" |o--|| "role" : "FOREIGN KEY (roleSlug) REFERENCES role (slug) ON UPDATE CASCADE ON DELETE CASCADE MATCH NONE"
"user" }o--|| "role" : "FOREIGN KEY (roleSlug) REFERENCES role (slug) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"test_case_execution" }o--|| "test_run" : "FOREIGN KEY (testRunId) REFERENCES test_run (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"test_case_execution" }o--o| "execution_entity" : "FOREIGN KEY (pastExecutionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"test_case_execution" }o--o| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"test_case_execution" }o--o| "execution_entity" : "FOREIGN KEY (evaluationExecutionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"project_relation" }o--|| "role" : "FOREIGN KEY (role) REFERENCES role (slug) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"project_relation" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"project_relation" |o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"data_table" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"data_table_column" }o--|| "data_table" : "FOREIGN KEY (dataTableId) REFERENCES data_table (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"variables" }o--o| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"insights_raw" }o--|| "insights_metadata" : "FOREIGN KEY (metaId) REFERENCES insights_metadata (metaId) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"insights_by_period" }o--|| "insights_metadata" : "FOREIGN KEY (metaId) REFERENCES insights_metadata (metaId) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_access_tokens" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_access_tokens" }o--|| "oauth_clients" : "FOREIGN KEY (clientId) REFERENCES oauth_clients (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_user_consents" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_user_consents" }o--|| "oauth_clients" : "FOREIGN KEY (clientId) REFERENCES oauth_clients (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"credentials_entity" }o--o| "dynamic_credential_resolver" : "FOREIGN KEY (resolverId) REFERENCES dynamic_credential_resolver (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_messages" }o--o| "chat_hub_agents" : "FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_messages" }o--o| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_messages" }o--o| "chat_hub_messages" : "FOREIGN KEY (revisionOfMessageId) REFERENCES chat_hub_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_messages" }o--o| "chat_hub_messages" : "FOREIGN KEY (retryOfMessageId) REFERENCES chat_hub_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_messages" }o--o| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_messages" }o--o| "chat_hub_messages" : "FOREIGN KEY (previousMessageId) REFERENCES chat_hub_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_messages" }o--|| "chat_hub_sessions" : "FOREIGN KEY (sessionId) REFERENCES chat_hub_sessions (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_user_entry" |o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_user_entry" |o--|| "dynamic_credential_resolver" : "FOREIGN KEY (resolverId) REFERENCES dynamic_credential_resolver (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_user_entry" |o--|| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_dependency" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_entry" |o--|| "dynamic_credential_resolver" : "FOREIGN KEY (resolver_id) REFERENCES dynamic_credential_resolver (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_entry" |o--|| "credentials_entity" : "FOREIGN KEY (credential_id) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_tools" }o--|| "user" : "FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_session_tools" |o--|| "chat_hub_tools" : "FOREIGN KEY (toolId) REFERENCES chat_hub_tools (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_session_tools" |o--|| "chat_hub_sessions" : "FOREIGN KEY (sessionId) REFERENCES chat_hub_sessions (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_agent_tools" |o--|| "chat_hub_tools" : "FOREIGN KEY (toolId) REFERENCES chat_hub_tools (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_agent_tools" |o--|| "chat_hub_agents" : "FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_agents" }o--|| "user" : "FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_agents" }o--o| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"project_secrets_provider_access" |o--|| "secrets_provider_connection" : "FOREIGN KEY (secretsProviderConnectionId) REFERENCES secrets_provider_connection (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"project_secrets_provider_access" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_published_version" }o--|| "workflow_history" : "FOREIGN KEY (publishedVersionId) REFERENCES workflow_history (versionId) ON UPDATE NO ACTION ON DELETE RESTRICT MATCH NONE"
"workflow_published_version" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE RESTRICT MATCH NONE"
"workflow_published_version" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_published_version" }o--|| "workflow_history" : "FOREIGN KEY (publishedVersionId) REFERENCES workflow_history (versionId) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_sessions" }o--|| "user" : "FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_sessions" }o--o| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_sessions" }o--o| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_sessions" }o--o| "chat_hub_agents" : "FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"role_mapping_rule" }o--|| "role" : "FOREIGN KEY (role) REFERENCES role (slug) ON UPDATE CASCADE ON DELETE CASCADE MATCH NONE"
"role_mapping_rule_project" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"role_mapping_rule_project" |o--|| "role_mapping_rule" : "FOREIGN KEY (roleMappingRuleId) REFERENCES role_mapping_rule (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"credential_dependency" }o--|| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_builder_session" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_builder_session" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_messages" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_observational_memory" }o--o| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"instance_ai_iteration_logs" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_publish_history" }o--o| "workflow_history" : "FOREIGN KEY (versionId) REFERENCES workflow_history (versionId) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"workflow_publish_history" }o--o| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"workflow_publish_history" }o--o| "workflow_history" : "FOREIGN KEY (versionId) REFERENCES workflow_history (versionId) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_publish_history" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"trusted_key" |o--|| "trusted_key_source" : "FOREIGN KEY (sourceId) REFERENCES trusted_key_source (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"user_favorites" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"ai_builder_temporary_workflow" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"ai_builder_temporary_workflow" |o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_entity" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"evaluation_config" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"evaluation_collection" }o--o| "user" : "FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"evaluation_collection" }o--|| "evaluation_config" : "FOREIGN KEY (evaluationConfigId) REFERENCES evaluation_config (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"evaluation_collection" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"test_run" }o--o| "evaluation_collection" : "FOREIGN KEY (collectionId) REFERENCES evaluation_collection (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"test_run" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"test_run" }o--o| "evaluation_config" : "FOREIGN KEY (evaluationConfigId) REFERENCES evaluation_config (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agent_checkpoints" }o--o| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_messages" }o--|| "agents_threads" : "FOREIGN KEY (threadId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_execution" }o--|| "agent_execution_threads" : "FOREIGN KEY (threadId) REFERENCES agent_execution_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_history" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_run_snapshots" |o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observations" }o--o| "agents_observations" : "FOREIGN KEY (supersededBy) REFERENCES agents_observations (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"agents_observations" }o--o| "agents_observations" : "FOREIGN KEY (parentId) REFERENCES agents_observations (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"agents_observations" }o--|| "agents_threads" : "FOREIGN KEY (observationScopeId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observations" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observation_cursors" |o--|| "agents_threads" : "FOREIGN KEY (observationScopeId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observation_cursors" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observation_locks" |o--|| "agents_threads" : "FOREIGN KEY (observationScopeId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observation_locks" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entries" }o--o| "agents_memory_entries" : "FOREIGN KEY (supersededBy) REFERENCES agents_memory_entries (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"agents_memory_entries" }o--|| "agents_resources" : "FOREIGN KEY (resourceId) REFERENCES agents_resources (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entries" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_locks" |o--|| "agents_resources" : "FOREIGN KEY (resourceId) REFERENCES agents_resources (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_locks" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_sources" }o--|| "agents_threads" : "FOREIGN KEY (threadId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_sources" }o--|| "agents_observations" : "FOREIGN KEY (observationId) REFERENCES agents_observations (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_sources" }o--|| "agents_memory_entries" : "FOREIGN KEY (memoryEntryId) REFERENCES agents_memory_entries (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_sources" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_cursors" |o--|| "agents_threads" : "FOREIGN KEY (observationScopeId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_cursors" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_history" }o--o| "user" : "FOREIGN KEY (publishedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agent_history" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents" }o--o| "agent_history" : "FOREIGN KEY (activeVersionId) REFERENCES agent_history (versionId) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agents" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_observations" }o--o| "instance_ai_observations" : "FOREIGN KEY (supersededBy) REFERENCES instance_ai_observations (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"instance_ai_observations" }o--o| "instance_ai_observations" : "FOREIGN KEY (parentId) REFERENCES instance_ai_observations (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"instance_ai_observations" }o--|| "instance_ai_threads" : "FOREIGN KEY (observationScopeId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_observation_cursors" |o--|| "instance_ai_threads" : "FOREIGN KEY (observationScopeId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_observation_locks" |o--|| "instance_ai_threads" : "FOREIGN KEY (observationScopeId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_checkpoints" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_pending_confirmations" }o--o| "instance_ai_checkpoints" : "FOREIGN KEY (checkpointKey) REFERENCES instance_ai_checkpoints (key) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_pending_confirmations" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_pending_confirmations" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_entity" }o--o| "workflow_history" : "FOREIGN KEY (activeVersionId) REFERENCES workflow_history (versionId) ON UPDATE NO ACTION ON DELETE RESTRICT MATCH NONE"
"workflow_entity" }o--o| "folder" : "FOREIGN KEY (parentFolderId) REFERENCES folder (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"user_api_keys" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_files" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"project" }o--o| "user" : "FOREIGN KEY (creatorId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agent_task_definition" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_task_snapshot" |o--|| "agent_history" : "FOREIGN KEY (versionId) REFERENCES agent_history (versionId) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_task_run_lock" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_execution_threads" }o--o| "agent_history" : "FOREIGN KEY (taskVersionId) REFERENCES agent_history (versionId) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agent_execution_threads" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_execution_threads" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_mcp_registry_connections" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_mcp_registry_connections" }o--|| "mcp_registry_server" : "FOREIGN KEY (serverSlug) REFERENCES mcp_registry_server (slug) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_mcp_registry_connections" }o--|| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_authorization_codes" }o--|| "oauth_clients" : "FOREIGN KEY (clientId) REFERENCES oauth_clients (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_authorization_codes" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_refresh_tokens" }o--|| "oauth_clients" : "FOREIGN KEY (clientId) REFERENCES oauth_clients (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_refresh_tokens" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_threads" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_chat_subscriptions" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"settings" {
  TEXT key PK
  TEXT value
  boolean loadOnStartup
}
"installed_packages" {
  char_214_ packageName PK
  char_50_ installedVersion
  char_70_ authorName
  char_70_ authorEmail
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"installed_nodes" {
  char_200_ name PK
  char_200_ type
  INTEGER latestVersion
  char_214_ package FK
}
"event_destinations" {
  varchar_36_ id PK
  TEXT destination
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"auth_identity" {
  VARCHAR_36_ userId FK
  VARCHAR_64_ providerId PK
  VARCHAR_32_ providerType PK
  timestamp createdAt
  timestamp updatedAt
}
"auth_provider_sync_history" {
  INTEGER id
  VARCHAR_32_ providerType
  TEXT runMode
  TEXT status
  DATETIME startedAt
  DATETIME endedAt
  INTEGER scanned
  INTEGER created
  INTEGER updated
  INTEGER disabled
  TEXT error
}
"tag_entity" {
  varchar_36_ id PK
  varchar_24_ name
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"workflows_tags" {
  varchar_36_ workflowId PK
  INTEGER tagId PK
}
"webhook_entity" {
  varchar_36_ workflowId
  varchar webhookPath PK
  varchar method PK
  varchar node
  varchar webhookId
  INTEGER pathLength
}
"execution_data" {
  INT executionId PK
  TEXT workflowData
  TEXT data
  VARCHAR_36_ workflowVersionId
}
"shared_credentials" {
  varchar_36_ credentialsId PK
  varchar_36_ projectId PK
  TEXT role
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"shared_workflow" {
  varchar_36_ workflowId PK
  varchar_36_ projectId PK
  TEXT role
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"execution_metadata" {
  INTEGER id
  INTEGER executionId FK
  varchar_255_ key
  TEXT value
}
"invalid_auth_token" {
  varchar_512_ token PK
  datetime_3_ expiresAt
}
"execution_annotations" {
  INTEGER id
  INTEGER executionId FK
  varchar_6_ vote
  TEXT note
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"annotation_tag_entity" {
  varchar_16_ id PK
  varchar_24_ name
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"execution_annotation_tags" {
  INTEGER annotationId PK
  varchar_24_ tagId PK
}
"processed_data" {
  varchar_36_ workflowId PK
  varchar_255_ context PK
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT value
}
"folder" {
  varchar_36_ id PK
  varchar_128_ name
  varchar_36_ parentFolderId FK
  varchar_36_ projectId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"folder_tag" {
  varchar_36_ folderId PK
  varchar_36_ tagId PK
}
"insights_metadata" {
  INTEGER metaId
  varchar_16_ workflowId FK
  varchar_36_ projectId FK
  varchar_128_ workflowName
  varchar_255_ projectName
}
"scope" {
  varchar_128_ slug PK
  TEXT displayName
  TEXT description
}
"role_scope" {
  VARCHAR_128_ roleSlug PK
  VARCHAR_128_ scopeSlug PK
}
"user" {
  varchar id PK
  varchar_255_ email
  varchar_32_ firstName
  varchar_32_ lastName
  varchar password
  TEXT personalizationAnswers
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT settings
  boolean disabled
  boolean mfaEnabled
  TEXT mfaSecret
  TEXT mfaRecoveryCodes
  date lastActiveAt
  varchar_128_ roleSlug FK
}
"test_case_execution" {
  varchar_36_ id PK
  varchar_36_ testRunId FK
  INTEGER pastExecutionId FK
  INTEGER executionId FK
  INTEGER evaluationExecutionId FK
  varchar status
  datetime_3_ runAt
  datetime_3_ completedAt
  varchar errorCode
  TEXT errorDetails
  TEXT metrics
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT inputs
  TEXT outputs
  INTEGER runIndex
}
"project_relation" {
  varchar_36_ projectId PK
  varchar userId PK
  varchar role FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"data_table" {
  varchar_36_ id PK
  varchar_128_ name
  varchar_36_ projectId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"data_table_column" {
  varchar_36_ id PK
  varchar_128_ name
  varchar_32_ type
  INTEGER index
  varchar_36_ dataTableId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"role" {
  varchar_128_ slug PK
  TEXT displayName
  TEXT description
  TEXT roleType
  boolean systemRole
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"variables" {
  varchar_36_ id PK
  TEXT key
  TEXT type
  TEXT value
  varchar_36_ projectId FK
}
"insights_raw" {
  INTEGER id
  INTEGER metaId FK
  INTEGER type
  bigint value
  datetime_0_ timestamp
}
"insights_by_period" {
  INTEGER id
  INTEGER metaId FK
  INTEGER type
  bigint value
  INTEGER periodUnit
  datetime_0_ periodStart
}
"oauth_clients" {
  varchar id PK
  varchar_255_ name
  TEXT redirectUris
  TEXT grantTypes
  varchar_255_ clientSecret
  bigint clientSecretExpiresAt
  varchar_255_ tokenEndpointAuthMethod
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"oauth_access_tokens" {
  varchar token PK
  varchar clientId FK
  varchar userId FK
}
"oauth_user_consents" {
  INTEGER id
  varchar userId FK
  varchar clientId FK
  bigint grantedAt
}
"dynamic_credential_resolver" {
  varchar_16_ id PK
  varchar_128_ name
  varchar_128_ type
  TEXT config
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"credentials_entity" {
  varchar_36_ id PK
  varchar_128_ name
  TEXT data
  varchar_32_ type
  datetime_3_ createdAt
  datetime_3_ updatedAt
  boolean isManaged
  boolean isGlobal
  boolean isResolvable
  boolean resolvableAllowFallback
  varchar_16_ resolverId FK
}
"chat_hub_messages" {
  varchar id PK
  varchar sessionId FK
  varchar previousMessageId FK
  varchar revisionOfMessageId FK
  varchar retryOfMessageId FK
  varchar_16_ type
  varchar_128_ name
  TEXT content
  varchar_16_ provider
  varchar_36_ workflowId FK
  INTEGER executionId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_36_ agentId FK
  varchar_16_ status
  TEXT attachments
  VARCHAR_256_ model
}
"workflow_statistics" {
  INTEGER id
  INTEGER count
  DATETIME latestEvent
  VARCHAR_128_ name
  VARCHAR_36_ workflowId
  VARCHAR_128_ workflowName
  INTEGER rootCount
}
"dynamic_credential_user_entry" {
  varchar_16_ credentialId PK
  varchar userId PK
  varchar_16_ resolverId PK
  TEXT data
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"workflow_dependency" {
  INTEGER id
  varchar_36_ workflowId FK
  INTEGER workflowVersionId
  varchar_32_ dependencyType
  varchar_255_ dependencyKey
  smallint indexVersionId
  datetime_3_ createdAt
  TEXT dependencyInfo
  varchar_36_ publishedVersionId
}
"secrets_provider_connection" {
  INTEGER id
  varchar_128_ providerKey
  varchar_36_ type
  TEXT encryptedSettings
  boolean isEnabled
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"dynamic_credential_entry" {
  varchar_16_ credential_id PK
  varchar_2048_ subject_id PK
  varchar_16_ resolver_id PK
  TEXT data
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"chat_hub_tools" {
  varchar id PK
  varchar_255_ name
  varchar_255_ type
  REAL typeVersion
  varchar ownerId FK
  TEXT definition
  boolean enabled
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"chat_hub_session_tools" {
  varchar sessionId PK
  varchar toolId PK
}
"chat_hub_agent_tools" {
  varchar agentId PK
  varchar toolId PK
}
"chat_hub_agents" {
  varchar id PK
  varchar_256_ name
  varchar_512_ description
  TEXT systemPrompt
  varchar ownerId FK
  varchar_36_ credentialId FK
  varchar_16_ provider
  varchar_64_ model
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT icon
  TEXT files
  TEXT suggestedPrompts
}
"project_secrets_provider_access" {
  INTEGER secretsProviderConnectionId PK
  varchar_36_ projectId PK
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_128_ role
}
"workflow_published_version" {
  varchar_36_ workflowId PK
  varchar_36_ publishedVersionId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"chat_hub_sessions" {
  varchar id PK
  varchar_256_ title
  varchar ownerId FK
  datetime_3_ lastMessageAt
  varchar_36_ credentialId FK
  varchar_16_ provider
  varchar_64_ model
  varchar_36_ workflowId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_36_ agentId FK
  varchar_128_ agentName
  varchar_16_ type
}
"role_mapping_rule" {
  varchar_16_ id PK
  TEXT expression
  varchar_128_ role FK
  varchar_64_ type
  INTEGER order
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"role_mapping_rule_project" {
  varchar_16_ roleMappingRuleId PK
  varchar_36_ projectId PK
}
"credential_dependency" {
  INTEGER id
  varchar_36_ credentialId FK
  varchar_64_ dependencyType
  varchar_255_ dependencyId
  datetime_3_ createdAt
}
"workflow_builder_session" {
  varchar id PK
  varchar_36_ workflowId FK
  varchar userId FK
  TEXT messages
  TEXT previousSummary
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_255_ activeVersionCardId
  varchar_255_ resumeAfterRestoreMessageId
}
"instance_version_history" {
  INTEGER id
  INTEGER major
  INTEGER minor
  INTEGER patch
  datetime_3_ createdAt
}
"instance_ai_messages" {
  varchar_36_ id PK
  varchar threadId FK
  TEXT content
  varchar_16_ role
  varchar_32_ type
  varchar_255_ resourceId
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_resources" {
  varchar_255_ id PK
  TEXT workingMemory
  TEXT metadata
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_observational_memory" {
  varchar_36_ id PK
  varchar_255_ lookupKey
  varchar_16_ scope
  varchar threadId FK
  varchar_255_ resourceId
  TEXT activeObservations
  varchar_32_ originType
  TEXT config
  INTEGER generationCount
  datetime_3_ lastObservedAt
  INTEGER pendingMessageTokens
  INTEGER totalTokensObserved
  INTEGER observationTokenCount
  boolean isObserving
  boolean isReflecting
  TEXT observedMessageIds
  varchar observedTimezone
  TEXT bufferedObservations
  INTEGER bufferedObservationTokens
  TEXT bufferedMessageIds
  TEXT bufferedReflection
  INTEGER bufferedReflectionTokens
  INTEGER bufferedReflectionInputTokens
  INTEGER reflectedObservationLineCount
  TEXT bufferedObservationChunks
  boolean isBufferingObservation
  boolean isBufferingReflection
  INTEGER lastBufferedAtTokens
  datetime_3_ lastBufferedAtTime
  TEXT metadata
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_workflow_snapshots" {
  varchar_36_ runId PK
  varchar_255_ workflowName PK
  varchar_255_ resourceId
  varchar status
  TEXT snapshot
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_iteration_logs" {
  varchar_36_ id PK
  varchar threadId FK
  varchar taskKey
  TEXT entry
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"token_exchange_jti" {
  varchar_255_ jti PK
  datetime_3_ expiresAt
  datetime_3_ createdAt
}
"workflow_publish_history" {
  INTEGER id
  varchar_36_ workflowId FK
  varchar_36_ versionId FK
  varchar_36_ event
  varchar userId FK
  datetime_3_ createdAt
}
"trusted_key_source" {
  varchar_36_ id PK
  varchar_32_ type
  TEXT config
  varchar_32_ status
  TEXT lastError
  datetime_3_ lastRefreshedAt
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"trusted_key" {
  varchar_36_ sourceId PK
  varchar_255_ kid PK
  TEXT data
  datetime_3_ createdAt
}
"user_favorites" {
  INTEGER id
  varchar userId FK
  varchar_255_ resourceId
  varchar_64_ resourceType
}
"deployment_key" {
  varchar_36_ id PK
  varchar_64_ type
  TEXT value
  varchar_20_ algorithm
  varchar_20_ status
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"ai_builder_temporary_workflow" {
  varchar_36_ workflowId PK
  varchar threadId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"execution_entity" {
  INTEGER id
  varchar_36_ workflowId FK
  boolean finished
  varchar mode
  varchar retryOf
  varchar retrySuccessId
  datetime startedAt
  datetime stoppedAt
  datetime waitTill
  varchar status
  datetime_3_ deletedAt
  datetime_3_ createdAt
  varchar_2_ storedAt
  TEXT tracingContext
  varchar_255_ deduplicationKey
  BIGINT jsonSizeBytes
  VARCHAR_36_ workflowVersionId
}
"evaluation_config" {
  varchar_36_ id PK
  varchar_36_ workflowId FK
  varchar_128_ name
  varchar_16_ status
  varchar_64_ invalidReason
  varchar_32_ datasetSource
  TEXT datasetRef
  varchar_255_ startNodeName
  varchar_255_ endNodeName
  TEXT metrics
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"evaluation_collection" {
  varchar_36_ id PK
  varchar_128_ name
  TEXT description
  varchar_36_ workflowId FK
  varchar_36_ evaluationConfigId FK
  varchar createdById FK
  TEXT insightsCache
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"test_run" {
  varchar_36_ id PK
  varchar_36_ workflowId FK
  varchar status
  varchar errorCode
  TEXT errorDetails
  datetime_3_ runAt
  datetime_3_ completedAt
  TEXT metrics
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_255_ runningInstanceId
  boolean cancelRequested
  varchar_36_ workflowVersionId
  varchar_36_ evaluationConfigId FK
  TEXT evaluationConfigSnapshot
  varchar_36_ collectionId FK
}
"agent_checkpoints" {
  varchar_255_ runId PK
  varchar_255_ agentId FK
  TEXT state
  boolean expired
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents_resources" {
  varchar_255_ id PK
  TEXT metadata
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents_threads" {
  varchar_128_ id PK
  varchar_255_ resourceId
  varchar_255_ title
  TEXT metadata
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents_messages" {
  varchar_36_ id PK
  varchar_255_ threadId FK
  varchar_255_ resourceId
  varchar_36_ role
  varchar_36_ type
  TEXT content
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agent_execution" {
  varchar_36_ id PK
  varchar_128_ threadId FK
  varchar_16_ status
  datetime_3_ startedAt
  datetime_3_ stoppedAt
  INTEGER duration
  TEXT userMessage
  TEXT assistantResponse
  varchar_255_ model
  INTEGER promptTokens
  INTEGER completionTokens
  INTEGER totalTokens
  REAL cost
  TEXT toolCalls
  TEXT timeline
  TEXT error
  varchar_16_ hitlStatus
  varchar_32_ source
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"workflow_history" {
  varchar_36_ versionId PK
  varchar_36_ workflowId FK
  varchar_255_ authors
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT nodes
  TEXT connections
  varchar_128_ name
  boolean autosaved
  TEXT description
  TEXT nodeGroups
}
"instance_ai_run_snapshots" {
  varchar threadId PK
  varchar_36_ runId PK
  varchar_36_ messageGroupId
  TEXT runIds
  TEXT tree
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_36_ langsmithRunId
  varchar_36_ langsmithTraceId
  varchar_64_ traceId
  varchar_64_ spanId
}
"agents_observations" {
  varchar_36_ id PK
  varchar_36_ agentId FK
  varchar_255_ observationScopeId FK
  varchar_16_ marker
  TEXT text
  varchar_36_ parentId FK
  INTEGER tokenCount
  varchar_16_ status
  varchar_36_ supersededBy FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents_observation_cursors" {
  varchar_36_ agentId PK
  varchar_255_ observationScopeId PK
  varchar_36_ lastObservedMessageId
  datetime_3_ lastObservedAt
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents_observation_locks" {
  varchar_36_ agentId PK
  varchar_255_ observationScopeId PK
  varchar_20_ taskKind PK
  varchar_64_ holderId
  datetime_3_ heldUntil
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents_memory_entries" {
  varchar_36_ id PK
  varchar_36_ agentId FK
  varchar_255_ resourceId FK
  TEXT content
  varchar_64_ contentHash
  varchar_16_ status
  varchar_36_ supersededBy FK
  varchar_128_ embeddingModel
  TEXT embedding
  TEXT metadata
  datetime_3_ lastSeenAt
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents_memory_entry_locks" {
  varchar_36_ agentId PK
  varchar_255_ resourceId PK
  varchar_64_ holderId
  datetime_3_ heldUntil
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents_memory_entry_sources" {
  varchar_36_ id PK
  varchar_36_ agentId FK
  varchar_36_ memoryEntryId FK
  varchar_36_ observationId FK
  varchar_255_ threadId FK
  varchar_64_ evidenceHash
  TEXT evidenceText
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents_memory_entry_cursors" {
  varchar_36_ agentId PK
  varchar_255_ observationScopeId PK
  varchar_36_ lastIndexedObservationId
  datetime_3_ lastIndexedObservationCreatedAt
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agent_history" {
  varchar_36_ versionId PK
  varchar_36_ agentId FK
  TEXT schema
  TEXT tools
  TEXT skills
  varchar publishedById FK
  varchar_255_ author
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents" {
  varchar_36_ id PK
  varchar_128_ name
  varchar_512_ description
  varchar_255_ projectId FK
  TEXT integrations
  TEXT schema
  TEXT tools
  TEXT skills
  varchar_36_ versionId
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_36_ activeVersionId FK
}
"instance_ai_observations" {
  varchar_36_ id PK
  varchar observationScopeId FK
  varchar_16_ marker
  TEXT text
  varchar_36_ parentId FK
  INTEGER tokenCount
  varchar_16_ status
  varchar_36_ supersededBy FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_observation_cursors" {
  varchar observationScopeId PK
  varchar_36_ lastObservedMessageId
  datetime_3_ lastObservedAt
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_observation_locks" {
  varchar observationScopeId PK
  varchar_20_ taskKind PK
  varchar_64_ holderId
  datetime_3_ heldUntil
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_checkpoints" {
  varchar_255_ key PK
  varchar_255_ runId
  varchar threadId FK
  varchar_255_ resourceId
  TEXT state
  datetime_3_ createdAt
  datetime_3_ updatedAt
  datetime_3_ expiredAt
}
"instance_ai_pending_confirmations" {
  varchar_36_ requestId PK
  varchar threadId FK
  varchar userId FK
  varchar_16_ kind
  varchar_36_ runId
  varchar_64_ toolCallId
  varchar_36_ messageGroupId
  varchar_255_ checkpointKey FK
  varchar_36_ checkpointTaskId
  datetime_3_ expiresAt
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"workflow_entity" {
  varchar_36_ id PK
  varchar_128_ name
  boolean active
  TEXT nodes
  TEXT connections
  TEXT settings
  TEXT staticData
  TEXT pinData
  varchar_36_ versionId
  INTEGER triggerCount
  TEXT meta
  varchar_36_ parentFolderId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
  boolean isArchived
  INTEGER versionCounter
  TEXT description
  varchar_36_ activeVersionId FK
  TEXT nodeGroups
  varchar sourceWorkflowId
}
"mcp_registry_server" {
  varchar_255_ slug PK
  varchar_50_ status
  varchar_50_ version
  datetime_3_ registryUpdatedAt
  TEXT data
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"user_api_keys" {
  varchar_36_ id PK
  varchar userId FK
  varchar_100_ label
  varchar apiKey
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT scopes
  varchar audience
  datetime_3_ lastUsedAt
}
"agent_files" {
  varchar_16_ id PK
  varchar_36_ agentId FK
  TEXT binaryDataId
  varchar_255_ fileName
  varchar_255_ mimeType
  INTEGER fileSizeBytes
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"binary_data" {
  varchar fileId PK
  varchar_50_ sourceType
  varchar_255_ sourceId
  BLOB data
  varchar_255_ mimeType
  varchar_255_ fileName
  INTEGER fileSize
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"project" {
  varchar_36_ id PK
  varchar_255_ name
  varchar_36_ type
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT icon
  varchar_512_ description
  varchar creatorId FK
  TEXT customTelemetryTags
}
"agent_task_definition" {
  varchar_32_ id PK
  varchar_36_ agentId FK
  varchar_128_ name
  TEXT objective
  varchar_128_ cronExpression
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agent_task_snapshot" {
  varchar_36_ versionId PK
  varchar_32_ taskId PK
  boolean enabled
  varchar_128_ name
  TEXT objective
  varchar_128_ cronExpression
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agent_task_run_lock" {
  varchar_36_ agentId PK
  varchar_32_ taskId PK
  varchar holderId
  datetime_3_ heldUntil
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agent_execution_threads" {
  varchar_128_ id PK
  varchar_36_ agentId FK
  varchar_255_ agentName
  varchar_255_ projectId FK
  INTEGER sessionNumber
  INTEGER totalPromptTokens
  INTEGER totalCompletionTokens
  REAL totalCost
  INTEGER totalDuration
  varchar_255_ title
  varchar_8_ emoji
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_32_ taskId
  varchar_36_ taskVersionId FK
  varchar_128_ parentThreadId
  varchar_36_ parentAgentId
}
"instance_ai_mcp_registry_connections" {
  varchar id PK
  varchar_36_ credentialId FK
  varchar_255_ serverSlug FK
  TEXT toolFilter
  varchar userId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"oauth_authorization_codes" {
  varchar_255_ code PK
  varchar clientId FK
  varchar userId FK
  varchar redirectUri
  varchar codeChallenge
  varchar_255_ codeChallengeMethod
  bigint expiresAt
  varchar state
  boolean used
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar resource
  TEXT scope
}
"oauth_refresh_tokens" {
  varchar_255_ token PK
  varchar clientId FK
  varchar userId FK
  bigint expiresAt
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT scope
}
"workflow_publication_outbox" {
  INTEGER id
  varchar_36_ workflowId
  varchar_36_ publishedVersionId
  varchar_20_ status
  TEXT errorMessage
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_threads" {
  varchar id PK
  varchar_255_ resourceId
  varchar_36_ projectId FK
  TEXT title
  TEXT metadata
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agent_chat_subscriptions" {
  varchar_36_ agentId PK
  varchar_64_ integrationType PK
  varchar_255_ credentialId PK
  varchar_255_ threadId PK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
