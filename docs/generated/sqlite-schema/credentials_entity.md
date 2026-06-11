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
| id | varchar(36) |  | false | [shared_credentials](shared_credentials.md) [dynamic_credential_user_entry](dynamic_credential_user_entry.md) [dynamic_credential_entry](dynamic_credential_entry.md) [chat_hub_agents](chat_hub_agents.md) [chat_hub_sessions](chat_hub_sessions.md) [credential_dependency](credential_dependency.md) [instance_ai_mcp_registry_connections](instance_ai_mcp_registry_connections.md) |  |  |
| name | varchar(128) |  | false |  |  |  |
| data | TEXT |  | false |  |  |  |
| type | varchar(32) |  | false |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| isManaged | boolean | 0 | false |  |  |  |
| isGlobal | boolean | 0 | false |  |  |  |
| isResolvable | boolean | false | false |  |  |  |
| resolvableAllowFallback | boolean | false | false |  |  |  |
| resolverId | varchar(16) |  | true |  | [dynamic_credential_resolver](dynamic_credential_resolver.md) |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (resolverId) REFERENCES dynamic_credential_resolver (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| sqlite_autoindex_credentials_entity_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| idx_credentials_entity_type | CREATE INDEX "idx_credentials_entity_type" ON "credentials_entity" ("type")  |
| sqlite_autoindex_credentials_entity_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"shared_credentials" |o--|| "credentials_entity" : "FOREIGN KEY (credentialsId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_user_entry" |o--|| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_entry" |o--|| "credentials_entity" : "FOREIGN KEY (credential_id) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_agents" }o--o| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_sessions" }o--o| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"credential_dependency" }o--|| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_mcp_registry_connections" }o--|| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"credentials_entity" }o--o| "dynamic_credential_resolver" : "FOREIGN KEY (resolverId) REFERENCES dynamic_credential_resolver (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"

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
"shared_credentials" {
  varchar_36_ credentialsId PK
  varchar_36_ projectId PK
  TEXT role
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"dynamic_credential_user_entry" {
  varchar_16_ credentialId PK
  varchar userId PK
  varchar_16_ resolverId PK
  TEXT data
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
"credential_dependency" {
  INTEGER id
  varchar_36_ credentialId FK
  varchar_64_ dependencyType
  varchar_255_ dependencyId
  datetime_3_ createdAt
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
"dynamic_credential_resolver" {
  varchar_16_ id PK
  varchar_128_ name
  varchar_128_ type
  TEXT config
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
