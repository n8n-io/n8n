# public.credentials_entity

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| name | varchar(128) |  | false |  |  |  |
| data | text |  | false |  |  |  |
| type | varchar(128) |  | false |  |  |  |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| id | varchar(36) |  | false | [public.shared_credentials](public.shared_credentials.md) [public.chat_hub_sessions](public.chat_hub_sessions.md) [public.chat_hub_agents](public.chat_hub_agents.md) [public.dynamic_credential_user_entry](public.dynamic_credential_user_entry.md) [public.dynamic_credential_entry](public.dynamic_credential_entry.md) [public.credential_dependency](public.credential_dependency.md) [public.instance_ai_mcp_registry_connections](public.instance_ai_mcp_registry_connections.md) |  |  |
| isManaged | boolean | false | false |  |  |  |
| isGlobal | boolean | false | false |  |  |  |
| isResolvable | boolean | false | false |  |  |  |
| resolvableAllowFallback | boolean | false | false |  |  |  |
| resolverId | varchar(16) |  | true |  | [public.dynamic_credential_resolver](public.dynamic_credential_resolver.md) |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| credentials_entity_createdAt_not_null | n | NOT NULL "createdAt" |
| credentials_entity_data_not_null | n | NOT NULL data |
| credentials_entity_id_not_null1 | n | NOT NULL id |
| credentials_entity_isGlobal_not_null | n | NOT NULL "isGlobal" |
| credentials_entity_isManaged_not_null | n | NOT NULL "isManaged" |
| credentials_entity_isResolvable_not_null | n | NOT NULL "isResolvable" |
| credentials_entity_name_not_null | n | NOT NULL name |
| credentials_entity_resolvableAllowFallback_not_null | n | NOT NULL "resolvableAllowFallback" |
| credentials_entity_type_not_null | n | NOT NULL type |
| credentials_entity_updatedAt_not_null | n | NOT NULL "updatedAt" |
| credentials_entity_pkey | PRIMARY KEY | PRIMARY KEY (id) |
| credentials_entity_resolverId_foreign | FOREIGN KEY | FOREIGN KEY ("resolverId") REFERENCES dynamic_credential_resolver(id) ON DELETE SET NULL |

## Indexes

| Name | Definition |
| ---- | ---------- |
| idx_07fde106c0b471d8cc80a64fc8 | CREATE INDEX idx_07fde106c0b471d8cc80a64fc8 ON public.credentials_entity USING btree (type) |
| pk_credentials_entity_id | CREATE UNIQUE INDEX pk_credentials_entity_id ON public.credentials_entity USING btree (id) |
| credentials_entity_pkey | CREATE UNIQUE INDEX credentials_entity_pkey ON public.credentials_entity USING btree (id) |

## Relations

```mermaid
erDiagram

"public.shared_credentials" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialsId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.chat_hub_sessions" }o--o| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE SET NULL"
"public.chat_hub_agents" }o--o| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE SET NULL"
"public.dynamic_credential_user_entry" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.dynamic_credential_entry" }o--|| "public.credentials_entity" : "FOREIGN KEY (credential_id) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.credential_dependency" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.instance_ai_mcp_registry_connections" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.credentials_entity" }o--o| "public.dynamic_credential_resolver" : "FOREIGN KEY (#quot;resolverId#quot;) REFERENCES dynamic_credential_resolver(id) ON DELETE SET NULL"

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
"public.shared_credentials" {
  varchar_36_ credentialsId FK
  varchar_36_ projectId FK
  text role
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
"public.dynamic_credential_user_entry" {
  varchar_16_ credentialId FK
  uuid userId FK
  varchar_16_ resolverId FK
  text data
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
"public.credential_dependency" {
  integer id
  varchar_36_ credentialId FK
  varchar_64_ dependencyType
  varchar_255_ dependencyId
  timestamp_3__with_time_zone createdAt
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
"public.dynamic_credential_resolver" {
  varchar_16_ id
  varchar_128_ name
  varchar_128_ type
  text config
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
