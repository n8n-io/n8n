# mcp_server

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "mcp_server" ("id" varchar(36) PRIMARY KEY NOT NULL, "slug" varchar(64) NOT NULL, "name" varchar(128) NOT NULL, "description" text NOT NULL, "instructions" text NOT NULL, "active" boolean NOT NULL DEFAULT (true), "accessMode" varchar(16) NOT NULL DEFAULT ('apiKey'), "rateLimitPerMinute" integer NOT NULL DEFAULT (60), "shareVisibility" varchar(16) NOT NULL DEFAULT ('instance'), "confirmDestructive" boolean NOT NULL DEFAULT (true), "confirmWrite" boolean NOT NULL DEFAULT (false), "revokedUserIds" text, "ownerId" varchar NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "captureIntent" BOOLEAN NOT NULL DEFAULT TRUE, "missingCapabilityTool" BOOLEAN NOT NULL DEFAULT TRUE, CONSTRAINT "FK_mcp_server_ownerId" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE CASCADE)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| accessMode | varchar(16) | 'apiKey' | false |  |  |  |
| active | boolean | true | false |  |  |  |
| captureIntent | BOOLEAN | TRUE | false |  |  |  |
| confirmDestructive | boolean | true | false |  |  |  |
| confirmWrite | boolean | false | false |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| description | TEXT |  | false |  |  |  |
| id | varchar(36) |  | false | [mcp_server_api_key](mcp_server_api_key.md) [mcp_server_call](mcp_server_call.md) [mcp_server_resource](mcp_server_resource.md) [mcp_server_tool](mcp_server_tool.md) |  |  |
| instructions | TEXT |  | false |  |  |  |
| missingCapabilityTool | BOOLEAN | TRUE | false |  |  |  |
| name | varchar(128) |  | false |  |  |  |
| ownerId | varchar |  | false |  | [user](user.md) |  |
| rateLimitPerMinute | INTEGER | 60 | false |  |  |  |
| revokedUserIds | TEXT |  | true |  |  |  |
| shareVisibility | varchar(16) | 'instance' | false |  |  |  |
| slug | varchar(64) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_mcp_server_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_c70bcc8686212f76f1d03a9bba | CREATE UNIQUE INDEX "IDX_c70bcc8686212f76f1d03a9bba" ON "mcp_server" ("slug")  |
| sqlite_autoindex_mcp_server_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"mcp_server_api_key" }o--|| "mcp_server" : "FOREIGN KEY (serverId) REFERENCES mcp_server (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"mcp_server_call" }o--|| "mcp_server" : "FOREIGN KEY (serverId) REFERENCES mcp_server (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"mcp_server_resource" }o--|| "mcp_server" : "FOREIGN KEY (serverId) REFERENCES mcp_server (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"mcp_server_tool" }o--|| "mcp_server" : "FOREIGN KEY (serverId) REFERENCES mcp_server (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"mcp_server" }o--|| "user" : "FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"mcp_server" {
  varchar_16_ accessMode
  boolean active
  BOOLEAN captureIntent
  boolean confirmDestructive
  boolean confirmWrite
  datetime_3_ createdAt
  TEXT description
  varchar_36_ id PK
  TEXT instructions
  BOOLEAN missingCapabilityTool
  varchar_128_ name
  varchar ownerId FK
  INTEGER rateLimitPerMinute
  TEXT revokedUserIds
  varchar_16_ shareVisibility
  varchar_64_ slug
  datetime_3_ updatedAt
}
"mcp_server_api_key" {
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_128_ keyHash
  varchar_16_ keyHint
  varchar_128_ label
  datetime_3_ lastUsedAt
  varchar_36_ serverId FK
  datetime_3_ updatedAt
}
"mcp_server_call" {
  varchar_36_ apiKeyId
  varchar_320_ caller
  varchar_16_ callerType
  varchar callerUserId
  varchar_128_ clientName
  datetime_3_ createdAt
  INTEGER durationMs
  TEXT error
  varchar_36_ executionId
  varchar_36_ id PK
  TEXT input
  TEXT intent
  varchar_16_ kind
  varchar_256_ name
  TEXT output
  varchar_36_ serverId FK
  VARCHAR_36_ sessionId
  varchar_16_ status
  datetime_3_ updatedAt
  varchar_36_ workflowId
}
"mcp_server_resource" {
  TEXT content
  datetime_3_ createdAt
  TEXT description
  varchar_36_ id PK
  varchar_16_ kind
  varchar_128_ mimeType
  varchar_256_ name
  varchar_36_ serverId FK
  varchar_36_ targetId
  datetime_3_ updatedAt
}
"mcp_server_tool" {
  varchar_16_ behavior
  datetime_3_ createdAt
  TEXT description
  boolean enabled
  varchar_36_ id PK
  TEXT inputs
  varchar_16_ kind
  varchar_64_ name
  INTEGER position
  varchar_36_ serverId FK
  varchar_36_ targetId
  datetime_3_ updatedAt
}
"user" {
  datetime_3_ createdAt
  boolean disabled
  varchar_255_ email
  varchar_32_ firstName
  varchar id PK
  VARCHAR_16_ kind
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
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
