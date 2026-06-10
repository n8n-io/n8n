# public.project

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | varchar(36) |  | false | [public.variables](public.variables.md) [public.project_relation](public.project_relation.md) [public.shared_credentials](public.shared_credentials.md) [public.shared_workflow](public.shared_workflow.md) [public.folder](public.folder.md) [public.insights_metadata](public.insights_metadata.md) [public.data_table](public.data_table.md) [public.project_secrets_provider_access](public.project_secrets_provider_access.md) [public.role_mapping_rule_project](public.role_mapping_rule_project.md) [public.instance_ai_threads](public.instance_ai_threads.md) [public.agents](public.agents.md) [public.agent_execution_threads](public.agent_execution_threads.md) |  |  |
| name | varchar(255) |  | false |  |  |  |
| type | varchar(36) |  | false |  |  |  |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| icon | json |  | true |  |  |  |
| description | varchar(512) |  | true |  |  |  |
| creatorId | uuid |  | true |  | [public.user](public.user.md) | ID of the user who created the project |
| customTelemetryTags | json | '[]'::json | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| project_createdAt_not_null | n | NOT NULL "createdAt" |
| project_customTelemetryTags_not_null | n | NOT NULL "customTelemetryTags" |
| project_id_not_null | n | NOT NULL id |
| project_name_not_null | n | NOT NULL name |
| project_type_not_null | n | NOT NULL type |
| project_updatedAt_not_null | n | NOT NULL "updatedAt" |
| projects_creatorId_foreign | FOREIGN KEY | FOREIGN KEY ("creatorId") REFERENCES "user"(id) ON DELETE SET NULL |
| PK_4d68b1358bb5b766d3e78f32f57 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| PK_4d68b1358bb5b766d3e78f32f57 | CREATE UNIQUE INDEX "PK_4d68b1358bb5b766d3e78f32f57" ON public.project USING btree (id) |

## Relations

```mermaid
erDiagram

"public.variables" }o--o| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.project_relation" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.shared_credentials" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.shared_workflow" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.folder" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.insights_metadata" }o--o| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE SET NULL"
"public.data_table" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.project_secrets_provider_access" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.role_mapping_rule_project" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.instance_ai_threads" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.agents" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.agent_execution_threads" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.project" }o--o| "public.user" : "FOREIGN KEY (#quot;creatorId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"

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
"public.variables" {
  varchar_50_ key
  varchar_50_ type
  text value
  varchar_36_ id
  varchar_36_ projectId FK
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
"public.folder" {
  varchar_36_ id
  varchar_128_ name
  varchar_36_ parentFolderId FK
  varchar_36_ projectId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.insights_metadata" {
  integer metaId
  varchar_36_ workflowId FK
  varchar_36_ projectId FK
  varchar_128_ workflowName
  varchar_255_ projectName
}
"public.data_table" {
  varchar_36_ id
  varchar_128_ name
  varchar_36_ projectId FK
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
"public.role_mapping_rule_project" {
  varchar_16_ roleMappingRuleId FK
  varchar_36_ projectId FK
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
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
