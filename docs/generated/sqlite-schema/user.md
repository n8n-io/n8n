# user

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "user" ("id" varchar PRIMARY KEY, "email" varchar(255), "firstName" varchar(32), "lastName" varchar(32), "password" varchar, "personalizationAnswers" text, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "settings" text, "disabled" boolean NOT NULL DEFAULT (FALSE), "mfaEnabled" boolean NOT NULL DEFAULT (FALSE), "mfaSecret" text, "mfaRecoveryCodes" text, "lastActiveAt" date, "roleSlug" varchar(128) NOT NULL DEFAULT ('global:member'), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "FK_eaea92ee7bfb9c1b6cd01505d56" FOREIGN KEY ("roleSlug") REFERENCES "role" ("slug"))
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| disabled | boolean | FALSE | false |  |  |  |
| email | varchar(255) |  | true |  |  |  |
| firstName | varchar(32) |  | true |  |  |  |
| id | varchar |  | true | [agent_eval_dataset](agent_eval_dataset.md) [agent_eval_rating](agent_eval_rating.md) [agent_eval_run](agent_eval_run.md) [agent_history](agent_history.md) [auth_identity](auth_identity.md) [chat_hub_agents](chat_hub_agents.md) [chat_hub_sessions](chat_hub_sessions.md) [chat_hub_tools](chat_hub_tools.md) [dynamic_credential_user_entry](dynamic_credential_user_entry.md) [evaluation_collection](evaluation_collection.md) [instance_ai_mcp_registry_connections](instance_ai_mcp_registry_connections.md) [instance_ai_pending_confirmations](instance_ai_pending_confirmations.md) [instance_ai_thread_grants](instance_ai_thread_grants.md) [oauth_access_tokens](oauth_access_tokens.md) [oauth_authorization_codes](oauth_authorization_codes.md) [oauth_refresh_tokens](oauth_refresh_tokens.md) [oauth_user_consents](oauth_user_consents.md) [project](project.md) [project_relation](project_relation.md) [user_api_keys](user_api_keys.md) [user_favorites](user_favorites.md) [workflow_builder_session](workflow_builder_session.md) [workflow_publish_history](workflow_publish_history.md) [workflow_review_request](workflow_review_request.md) [workflow_review_request_authors](workflow_review_request_authors.md) [workflow_review_request_reviewers](workflow_review_request_reviewers.md) |  |  |
| lastActiveAt | date |  | true |  |  |  |
| lastName | varchar(32) |  | true |  |  |  |
| mfaEnabled | boolean | FALSE | false |  |  |  |
| mfaRecoveryCodes | TEXT |  | true |  |  |  |
| mfaSecret | TEXT |  | true |  |  |  |
| password | varchar |  | true |  |  |  |
| personalizationAnswers | TEXT |  | true |  |  |  |
| roleSlug | varchar(128) | 'global:member' | false |  | [role](role.md) |  |
| settings | TEXT |  | true |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (roleSlug) REFERENCES role (slug) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_user_1 | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_user_2 | UNIQUE | UNIQUE (email) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| sqlite_autoindex_user_1 | PRIMARY KEY (id) |
| sqlite_autoindex_user_2 | UNIQUE (email) |
| user_role_idx | CREATE INDEX "user_role_idx" ON "user" ("roleSlug")  |

## Relations

```mermaid
erDiagram

"agent_eval_dataset" }o--o| "user" : "FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agent_eval_rating" }o--o| "user" : "FOREIGN KEY (ratedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agent_eval_run" }o--o| "user" : "FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agent_history" }o--o| "user" : "FOREIGN KEY (publishedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"auth_identity" }o--o| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"chat_hub_agents" }o--|| "user" : "FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_sessions" }o--|| "user" : "FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_tools" }o--|| "user" : "FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"dynamic_credential_user_entry" |o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"evaluation_collection" }o--o| "user" : "FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"instance_ai_mcp_registry_connections" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_pending_confirmations" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_thread_grants" |o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_access_tokens" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_authorization_codes" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_refresh_tokens" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"oauth_user_consents" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"project" }o--o| "user" : "FOREIGN KEY (creatorId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"project_relation" |o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"user_api_keys" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"user_favorites" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_builder_session" }o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_publish_history" }o--o| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"workflow_review_request" }o--o| "user" : "FOREIGN KEY (closedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"workflow_review_request" }o--o| "user" : "FOREIGN KEY (updatedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"workflow_review_request" }o--o| "user" : "FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"workflow_review_request_authors" |o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_review_request_reviewers" |o--|| "user" : "FOREIGN KEY (userId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"user" }o--|| "role" : "FOREIGN KEY (roleSlug) REFERENCES role (slug) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"

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
"agent_eval_dataset" {
  varchar_36_ agentId FK
  TEXT columnMapping
  datetime_3_ createdAt
  varchar createdById FK
  TEXT datasetRef
  varchar_32_ datasetSource
  TEXT description
  varchar_36_ id PK
  varchar_128_ name
  datetime_3_ updatedAt
}
"agent_eval_rating" {
  TEXT comment
  TEXT correction
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar ratedById FK
  varchar_36_ resultId FK
  datetime_3_ updatedAt
  varchar_8_ vote
}
"agent_eval_run" {
  varchar_36_ agentVersionId
  boolean cancelRequested
  datetime_3_ completedAt
  datetime_3_ createdAt
  varchar createdById FK
  varchar_36_ datasetId FK
  varchar_255_ errorCode
  TEXT errorDetails
  varchar_36_ id PK
  TEXT metrics
  datetime_3_ runAt
  varchar_255_ runningInstanceId
  varchar status
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
"auth_identity" {
  timestamp createdAt
  VARCHAR_64_ providerId PK
  VARCHAR_32_ providerType PK
  timestamp updatedAt
  VARCHAR_36_ userId FK
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
"instance_ai_mcp_registry_connections" {
  datetime_3_ createdAt
  varchar_36_ credentialId FK
  varchar id PK
  varchar_255_ serverSlug FK
  TEXT toolFilter
  datetime_3_ updatedAt
  varchar userId FK
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
"instance_ai_thread_grants" {
  datetime_3_ createdAt
  varchar_512_ grantKey PK
  varchar threadId PK
  datetime_3_ updatedAt
  varchar userId PK
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
  TEXT scope
  varchar userId FK
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
"workflow_publish_history" {
  datetime_3_ createdAt
  varchar_36_ event
  INTEGER id
  varchar userId FK
  varchar_36_ versionId FK
  varchar_36_ workflowId FK
}
"workflow_review_request" {
  datetime_3_ approvedAt
  varchar closedById FK
  datetime_3_ createdAt
  varchar createdById FK
  varchar_50_ decision
  TEXT description
  varchar_36_ id PK
  varchar_36_ projectId FK
  varchar_16_ state
  varchar_255_ title
  datetime_3_ updatedAt
  varchar updatedById FK
}
"workflow_review_request_authors" {
  varchar userId PK
  varchar_36_ workflowReviewRequestId PK
}
"workflow_review_request_reviewers" {
  varchar userId PK
  varchar_36_ workflowReviewRequestId PK
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
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
