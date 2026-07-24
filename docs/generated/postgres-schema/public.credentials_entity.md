# public.credentials_entity

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| data | text |  | false |  |  |  |
| id | varchar(36) |  | false | [public.chat_hub_agents](public.chat_hub_agents.md) [public.chat_hub_sessions](public.chat_hub_sessions.md) [public.credential_dependency](public.credential_dependency.md) [public.dynamic_credential_entry](public.dynamic_credential_entry.md) [public.dynamic_credential_user_entry](public.dynamic_credential_user_entry.md) [public.instance_ai_mcp_registry_connections](public.instance_ai_mcp_registry_connections.md) [public.shared_credentials](public.shared_credentials.md) |  |  |
| isGlobal | boolean | false | false |  |  |  |
| isManaged | boolean | false | false |  |  |  |
| isResolvable | boolean | false | false |  |  |  |
| name | varchar(128) |  | false |  |  |  |
| resolvableAllowFallback | boolean | false | false |  |  |  |
| resolverId | varchar(16) |  | true |  | [public.dynamic_credential_resolver](public.dynamic_credential_resolver.md) |  |
| type | varchar(128) |  | false |  |  |  |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |

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
| credentials_entity_pkey | PRIMARY KEY | PRIMARY KEY (id) |
| credentials_entity_resolvableAllowFallback_not_null | n | NOT NULL "resolvableAllowFallback" |
| credentials_entity_resolverId_foreign | FOREIGN KEY | FOREIGN KEY ("resolverId") REFERENCES dynamic_credential_resolver(id) ON DELETE SET NULL |
| credentials_entity_type_not_null | n | NOT NULL type |
| credentials_entity_updatedAt_not_null | n | NOT NULL "updatedAt" |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_credentials_entity_is_global | CREATE INDEX "IDX_credentials_entity_is_global" ON public.credentials_entity USING btree (id) WHERE ("isGlobal" = true) |
| credentials_entity_pkey | CREATE UNIQUE INDEX credentials_entity_pkey ON public.credentials_entity USING btree (id) |
| idx_07fde106c0b471d8cc80a64fc8 | CREATE INDEX idx_07fde106c0b471d8cc80a64fc8 ON public.credentials_entity USING btree (type) |
| pk_credentials_entity_id | CREATE UNIQUE INDEX pk_credentials_entity_id ON public.credentials_entity USING btree (id) |

## Relations

```mermaid
erDiagram

"public.chat_hub_agents" }o--o| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE SET NULL"
"public.chat_hub_sessions" }o--o| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE SET NULL"
"public.credential_dependency" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.dynamic_credential_entry" }o--|| "public.credentials_entity" : "FOREIGN KEY (credential_id) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.dynamic_credential_user_entry" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.instance_ai_mcp_registry_connections" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.shared_credentials" }o--|| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialsId#quot;) REFERENCES credentials_entity(id) ON DELETE CASCADE"
"public.credentials_entity" }o--o| "public.dynamic_credential_resolver" : "FOREIGN KEY (#quot;resolverId#quot;) REFERENCES dynamic_credential_resolver(id) ON DELETE SET NULL"

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
"public.credential_dependency" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ credentialId FK
  varchar_255_ dependencyId
  varchar_64_ dependencyType
  integer id
}
"public.dynamic_credential_entry" {
  timestamp_3__with_time_zone createdAt
  varchar_16_ credential_id FK
  text data
  varchar_16_ resolver_id FK
  varchar_2048_ subject_id
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
"public.instance_ai_mcp_registry_connections" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ credentialId FK
  uuid id
  varchar_255_ serverSlug FK
  json toolFilter
  timestamp_3__with_time_zone updatedAt
  uuid userId FK
}
"public.shared_credentials" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ credentialsId FK
  varchar_36_ projectId FK
  text role
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
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
