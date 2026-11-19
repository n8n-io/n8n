# knowledge_vector_store

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "knowledge_vector_store" ("id" varchar(16) PRIMARY KEY NOT NULL, "knowledgeCollectionId" varchar(16) NOT NULL, "name" varchar(64) NOT NULL, "description" varchar(512) NOT NULL, "provider" varchar(16) NOT NULL, "credentialId" varchar(36), "embeddingCredentialId" varchar(36), "embeddingModel" varchar(255) NOT NULL, "config" text NOT NULL, "createdById" varchar, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "FK_03f85fb38aac511330edcaaaec4" FOREIGN KEY ("knowledgeCollectionId") REFERENCES "knowledge_collection" ("id") ON DELETE CASCADE, CONSTRAINT "FK_caa9fe147a78ec1c820891937c2" FOREIGN KEY ("credentialId") REFERENCES "credentials_entity" ("id") ON DELETE SET NULL, CONSTRAINT "FK_6ad2a7c060c7cebf550e45a3d71" FOREIGN KEY ("embeddingCredentialId") REFERENCES "credentials_entity" ("id") ON DELETE SET NULL, CONSTRAINT "FK_44cd963b5d5ded5431244b62762" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| config | TEXT |  | false |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| createdById | varchar |  | true |  | [user](user.md) |  |
| credentialId | varchar(36) |  | true |  | [credentials_entity](credentials_entity.md) |  |
| description | varchar(512) |  | false |  |  |  |
| embeddingCredentialId | varchar(36) |  | true |  | [credentials_entity](credentials_entity.md) |  |
| embeddingModel | varchar(255) |  | false |  |  |  |
| id | varchar(16) |  | false |  |  |  |
| knowledgeCollectionId | varchar(16) |  | false |  | [knowledge_collection](knowledge_collection.md) |  |
| name | varchar(64) |  | false |  |  |  |
| provider | varchar(16) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (embeddingCredentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 3) | FOREIGN KEY | FOREIGN KEY (knowledgeCollectionId) REFERENCES knowledge_collection (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_knowledge_vector_store_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_29c253bcd6bb55be022ddffebf | CREATE UNIQUE INDEX "IDX_29c253bcd6bb55be022ddffebf" ON "knowledge_vector_store" ("knowledgeCollectionId", "name")  |
| IDX_6ad2a7c060c7cebf550e45a3d7 | CREATE INDEX "IDX_6ad2a7c060c7cebf550e45a3d7" ON "knowledge_vector_store" ("embeddingCredentialId")  |
| IDX_caa9fe147a78ec1c820891937c | CREATE INDEX "IDX_caa9fe147a78ec1c820891937c" ON "knowledge_vector_store" ("credentialId")  |
| sqlite_autoindex_knowledge_vector_store_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"knowledge_vector_store" }o--o| "user" : "FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"knowledge_vector_store" }o--o| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"knowledge_vector_store" }o--o| "credentials_entity" : "FOREIGN KEY (embeddingCredentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"knowledge_vector_store" }o--|| "knowledge_collection" : "FOREIGN KEY (knowledgeCollectionId) REFERENCES knowledge_collection (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"knowledge_vector_store" {
  TEXT config
  datetime_3_ createdAt
  varchar createdById FK
  varchar_36_ credentialId FK
  varchar_512_ description
  varchar_36_ embeddingCredentialId FK
  varchar_255_ embeddingModel
  varchar_16_ id PK
  varchar_16_ knowledgeCollectionId FK
  varchar_64_ name
  varchar_16_ provider
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
"credentials_entity" {
  datetime_3_ createdAt
  TEXT data
  TEXT description
  varchar_36_ id PK
  boolean isGlobal
  boolean isManaged
  boolean isResolvable
  varchar_128_ name
  DATETIME pendingAuthorizationExpiresAt
  boolean resolvableAllowFallback
  varchar_16_ resolverId FK
  varchar_32_ type
  datetime_3_ updatedAt
  VARCHAR_16_ usageScope
}
"knowledge_collection" {
  varchar_36_ agentId FK
  datetime_3_ createdAt
  varchar createdById FK
  varchar_512_ description
  varchar_16_ id PK
  boolean isGlobal
  varchar_16_ kind
  varchar_128_ name
  varchar_36_ projectId FK
  varchar_24_ slug
  datetime_3_ updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
