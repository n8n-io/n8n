# credentials_entity

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "credentials_entity" ("id" varchar(36) PRIMARY KEY NOT NULL, "name" varchar(128) NOT NULL, "data" text NOT NULL, "type" varchar(32) NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "isManaged" boolean NOT NULL DEFAULT (0), "isGlobal" boolean NOT NULL DEFAULT (0), "isResolvable" boolean NOT NULL DEFAULT (false), "resolvableAllowFallback" boolean NOT NULL DEFAULT (false), "resolverId" varchar(16), CONSTRAINT "credentials_entity_resolverId_foreign" FOREIGN KEY ("resolverId") REFERENCES "dynamic_credential_resolver" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| data | TEXT |  | false |  |  |  |
| id | varchar(36) |  | false | [chat_hub_agents](chat_hub_agents.md) [chat_hub_sessions](chat_hub_sessions.md) [credential_dependency](credential_dependency.md) [dynamic_credential_entry](dynamic_credential_entry.md) [dynamic_credential_user_entry](dynamic_credential_user_entry.md) [instance_ai_mcp_registry_connections](instance_ai_mcp_registry_connections.md) [shared_credentials](shared_credentials.md) |  |  |
| isGlobal | boolean | 0 | false |  |  |  |
| isManaged | boolean | 0 | false |  |  |  |
| isResolvable | boolean | false | false |  |  |  |
| name | varchar(128) |  | false |  |  |  |
| resolvableAllowFallback | boolean | false | false |  |  |  |
| resolverId | varchar(16) |  | true |  | [dynamic_credential_resolver](dynamic_credential_resolver.md) |  |
| type | varchar(32) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (resolverId) REFERENCES dynamic_credential_resolver (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_credentials_entity_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_credentials_entity_is_global | CREATE INDEX "IDX_credentials_entity_is_global" ON "credentials_entity" ("id") WHERE "isGlobal" = true |
| idx_credentials_entity_type | CREATE INDEX "idx_credentials_entity_type" ON "credentials_entity" ("type")  |
| sqlite_autoindex_credentials_entity_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"chat_hub_agents" }o--o| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_sessions" }o--o| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"credential_dependency" }o--|| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_entry" |o--|| "credentials_entity" : "FOREIGN KEY (credential_id) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_user_entry" |o--|| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_mcp_registry_connections" }o--|| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"shared_credentials" |o--|| "credentials_entity" : "FOREIGN KEY (credentialsId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"credentials_entity" }o--o| "dynamic_credential_resolver" : "FOREIGN KEY (resolverId) REFERENCES dynamic_credential_resolver (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"

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
"credential_dependency" {
  datetime_3_ createdAt
  varchar_36_ credentialId FK
  varchar_255_ dependencyId
  varchar_64_ dependencyType
  INTEGER id
}
"dynamic_credential_entry" {
  datetime_3_ createdAt
  varchar_16_ credential_id PK
  TEXT data
  varchar_16_ resolver_id PK
  varchar_2048_ subject_id PK
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
"instance_ai_mcp_registry_connections" {
  datetime_3_ createdAt
  varchar_36_ credentialId FK
  varchar id PK
  varchar_255_ serverSlug FK
  TEXT toolFilter
  datetime_3_ updatedAt
  varchar userId FK
}
"shared_credentials" {
  datetime_3_ createdAt
  varchar_36_ credentialsId PK
  varchar_36_ projectId PK
  TEXT role
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
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
