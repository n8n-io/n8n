# public.instance_ai_observational_memory

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | varchar(36) |  | false |  |  |  |
| lookupKey | varchar(255) |  | false |  |  |  |
| scope | varchar(16) |  | false |  |  |  |
| threadId | uuid |  | true |  | [public.instance_ai_threads](public.instance_ai_threads.md) |  |
| resourceId | varchar(255) |  | false |  |  |  |
| activeObservations | text | ''::text | false |  |  |  |
| originType | varchar(32) |  | false |  |  |  |
| config | text |  | false |  |  |  |
| generationCount | integer | 0 | false |  |  |  |
| lastObservedAt | timestamp(3) with time zone |  | true |  |  |  |
| pendingMessageTokens | integer | 0 | false |  |  |  |
| totalTokensObserved | integer | 0 | false |  |  |  |
| observationTokenCount | integer | 0 | false |  |  |  |
| isObserving | boolean | false | false |  |  |  |
| isReflecting | boolean | false | false |  |  |  |
| observedMessageIds | json |  | true |  |  |  |
| observedTimezone | varchar |  | true |  |  |  |
| bufferedObservations | text |  | true |  |  |  |
| bufferedObservationTokens | integer |  | true |  |  |  |
| bufferedMessageIds | json |  | true |  |  |  |
| bufferedReflection | text |  | true |  |  |  |
| bufferedReflectionTokens | integer |  | true |  |  |  |
| bufferedReflectionInputTokens | integer |  | true |  |  |  |
| reflectedObservationLineCount | integer |  | true |  |  |  |
| bufferedObservationChunks | json |  | true |  |  |  |
| isBufferingObservation | boolean | false | false |  |  |  |
| isBufferingReflection | boolean | false | false |  |  |  |
| lastBufferedAtTokens | integer | 0 | false |  |  |  |
| lastBufferedAtTime | timestamp(3) with time zone |  | true |  |  |  |
| metadata | json |  | true |  |  |  |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| instance_ai_observational_memor_isBufferingObservation_not_null | n | NOT NULL "isBufferingObservation" |
| instance_ai_observational_memory_activeObservations_not_null | n | NOT NULL "activeObservations" |
| instance_ai_observational_memory_config_not_null | n | NOT NULL config |
| instance_ai_observational_memory_createdAt_not_null | n | NOT NULL "createdAt" |
| instance_ai_observational_memory_generationCount_not_null | n | NOT NULL "generationCount" |
| instance_ai_observational_memory_id_not_null | n | NOT NULL id |
| instance_ai_observational_memory_isBufferingReflection_not_null | n | NOT NULL "isBufferingReflection" |
| instance_ai_observational_memory_isObserving_not_null | n | NOT NULL "isObserving" |
| instance_ai_observational_memory_isReflecting_not_null | n | NOT NULL "isReflecting" |
| instance_ai_observational_memory_lastBufferedAtTokens_not_null | n | NOT NULL "lastBufferedAtTokens" |
| instance_ai_observational_memory_lookupKey_not_null | n | NOT NULL "lookupKey" |
| instance_ai_observational_memory_observationTokenCount_not_null | n | NOT NULL "observationTokenCount" |
| instance_ai_observational_memory_originType_not_null | n | NOT NULL "originType" |
| instance_ai_observational_memory_pendingMessageTokens_not_null | n | NOT NULL "pendingMessageTokens" |
| instance_ai_observational_memory_resourceId_not_null | n | NOT NULL "resourceId" |
| instance_ai_observational_memory_scope_not_null | n | NOT NULL scope |
| instance_ai_observational_memory_totalTokensObserved_not_null | n | NOT NULL "totalTokensObserved" |
| instance_ai_observational_memory_updatedAt_not_null | n | NOT NULL "updatedAt" |
| FK_34018c303885cd37093458e6409 | FOREIGN KEY | FOREIGN KEY ("threadId") REFERENCES instance_ai_threads(id) ON DELETE SET NULL |
| PK_7192dd00cddba039bf1d3e6a098 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| PK_7192dd00cddba039bf1d3e6a098 | CREATE UNIQUE INDEX "PK_7192dd00cddba039bf1d3e6a098" ON public.instance_ai_observational_memory USING btree (id) |
| IDX_92f13cb6bc694227e069447f7b | CREATE INDEX "IDX_92f13cb6bc694227e069447f7b" ON public.instance_ai_observational_memory USING btree ("lookupKey") |
| IDX_a680ac96aae02dc887bbaac512 | CREATE UNIQUE INDEX "IDX_a680ac96aae02dc887bbaac512" ON public.instance_ai_observational_memory USING btree (scope, "threadId", "resourceId") |

## Relations

```mermaid
erDiagram

"public.instance_ai_observational_memory" }o--o| "public.instance_ai_threads" : "FOREIGN KEY (#quot;threadId#quot;) REFERENCES instance_ai_threads(id) ON DELETE SET NULL"

"public.instance_ai_observational_memory" {
  varchar_36_ id
  varchar_255_ lookupKey
  varchar_16_ scope
  uuid threadId FK
  varchar_255_ resourceId
  text activeObservations
  varchar_32_ originType
  text config
  integer generationCount
  timestamp_3__with_time_zone lastObservedAt
  integer pendingMessageTokens
  integer totalTokensObserved
  integer observationTokenCount
  boolean isObserving
  boolean isReflecting
  json observedMessageIds
  varchar observedTimezone
  text bufferedObservations
  integer bufferedObservationTokens
  json bufferedMessageIds
  text bufferedReflection
  integer bufferedReflectionTokens
  integer bufferedReflectionInputTokens
  integer reflectedObservationLineCount
  json bufferedObservationChunks
  boolean isBufferingObservation
  boolean isBufferingReflection
  integer lastBufferedAtTokens
  timestamp_3__with_time_zone lastBufferedAtTime
  json metadata
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
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
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
