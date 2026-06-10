# instance_ai_observational_memory

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "instance_ai_observational_memory" ("id" varchar(36) PRIMARY KEY NOT NULL, "lookupKey" varchar(255) NOT NULL, "scope" varchar(16) NOT NULL, "threadId" varchar, "resourceId" varchar(255) NOT NULL, "activeObservations" text NOT NULL DEFAULT (''), "originType" varchar(32) NOT NULL, "config" text NOT NULL, "generationCount" integer NOT NULL DEFAULT (0), "lastObservedAt" datetime(3), "pendingMessageTokens" integer NOT NULL DEFAULT (0), "totalTokensObserved" integer NOT NULL DEFAULT (0), "observationTokenCount" integer NOT NULL DEFAULT (0), "isObserving" boolean NOT NULL DEFAULT (false), "isReflecting" boolean NOT NULL DEFAULT (false), "observedMessageIds" text, "observedTimezone" varchar, "bufferedObservations" text, "bufferedObservationTokens" integer, "bufferedMessageIds" text, "bufferedReflection" text, "bufferedReflectionTokens" integer, "bufferedReflectionInputTokens" integer, "reflectedObservationLineCount" integer, "bufferedObservationChunks" text, "isBufferingObservation" boolean NOT NULL DEFAULT (false), "isBufferingReflection" boolean NOT NULL DEFAULT (false), "lastBufferedAtTokens" integer NOT NULL DEFAULT (0), "lastBufferedAtTime" datetime(3), "metadata" text, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "FK_34018c303885cd37093458e6409" FOREIGN KEY ("threadId") REFERENCES "instance_ai_threads" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | varchar(36) |  | false |  |  |  |
| lookupKey | varchar(255) |  | false |  |  |  |
| scope | varchar(16) |  | false |  |  |  |
| threadId | varchar |  | true |  | [instance_ai_threads](instance_ai_threads.md) |  |
| resourceId | varchar(255) |  | false |  |  |  |
| activeObservations | TEXT | '' | false |  |  |  |
| originType | varchar(32) |  | false |  |  |  |
| config | TEXT |  | false |  |  |  |
| generationCount | INTEGER | 0 | false |  |  |  |
| lastObservedAt | datetime(3) |  | true |  |  |  |
| pendingMessageTokens | INTEGER | 0 | false |  |  |  |
| totalTokensObserved | INTEGER | 0 | false |  |  |  |
| observationTokenCount | INTEGER | 0 | false |  |  |  |
| isObserving | boolean | false | false |  |  |  |
| isReflecting | boolean | false | false |  |  |  |
| observedMessageIds | TEXT |  | true |  |  |  |
| observedTimezone | varchar |  | true |  |  |  |
| bufferedObservations | TEXT |  | true |  |  |  |
| bufferedObservationTokens | INTEGER |  | true |  |  |  |
| bufferedMessageIds | TEXT |  | true |  |  |  |
| bufferedReflection | TEXT |  | true |  |  |  |
| bufferedReflectionTokens | INTEGER |  | true |  |  |  |
| bufferedReflectionInputTokens | INTEGER |  | true |  |  |  |
| reflectedObservationLineCount | INTEGER |  | true |  |  |  |
| bufferedObservationChunks | TEXT |  | true |  |  |  |
| isBufferingObservation | boolean | false | false |  |  |  |
| isBufferingReflection | boolean | false | false |  |  |  |
| lastBufferedAtTokens | INTEGER | 0 | false |  |  |  |
| lastBufferedAtTime | datetime(3) |  | true |  |  |  |
| metadata | TEXT |  | true |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| sqlite_autoindex_instance_ai_observational_memory_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_a680ac96aae02dc887bbaac512 | CREATE UNIQUE INDEX "IDX_a680ac96aae02dc887bbaac512" ON "instance_ai_observational_memory" ("scope", "threadId", "resourceId")  |
| IDX_92f13cb6bc694227e069447f7b | CREATE INDEX "IDX_92f13cb6bc694227e069447f7b" ON "instance_ai_observational_memory" ("lookupKey")  |
| sqlite_autoindex_instance_ai_observational_memory_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"instance_ai_observational_memory" }o--o| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"

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
"instance_ai_threads" {
  varchar id PK
  varchar_255_ resourceId
  varchar_36_ projectId FK
  TEXT title
  TEXT metadata
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
