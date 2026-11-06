---
title: Persistence
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: ivov
---

# Persistence

On [Start here](README.md), your executions were read from a SQLite file. This page explains where n8n keeps its data, and the rules for your code when you add a table or persist data.

## Database

n8n supports SQLite and PostgreSQL. SQLite is the default, and all small n8n Cloud instances run on it. Queue mode and large self-hosted setups use PostgreSQL.

[Write a database migration](how-to/write-a-database-migration.md) shows how to change the schema. The [schema docs](../generated/postgres-schema/README.md) list every table.

## Repositories

Business logic must not import TypeORM. A service must call a repository method with a name that says what the method does, e.g. `markFirstAuthenticated`. For several writes in one transaction, the service uses `TransactionRunner`. The [root AGENTS.md](../../AGENTS.md#persistence-layer--the-typeorm-boundary) gives the rules and an example.

## Execution data

n8n stores each execution in two tables:

- `execution_entity` holds the metadata that the editor filters on, e.g. the status and the times.
- `execution_data` holds the output of every node. The output is often much larger than the metadata.

n8n can store the output of new executions on the file system, S3, or Azure instead of `execution_data`.

**Pruning** deletes old executions in two steps. A system task first marks the executions as deleted, and a later pass removes their rows and output.

## Binary data

Files in items (e.g. a PDF that a node downloads) are **binary data**. An item holds only an ID, and the file goes to the file system, the database, S3, or Azure. In queue mode, the default is the database, because a worker and a main do not share a disk.

## Data tables

Users can create small tables in a project, called **data tables**. n8n creates each data table at runtime as a real table in the n8n database, outside the migrations. Only data table nodes can reach these tables.

## Quiz

1. A service needs a query with `In` and `IsNull`. Where does the query go?
   - A. Into the service, with an import from TypeORM.
   - B. Into the controller.
   - C. Into a migration.
   - D. Into a named repository method.
2. Where does binary data go by default in queue mode?
   - A. The file system of the main.
   - B. S3.
   - C. The database.
   - D. The job in Redis.

<details>
<summary>Answers</summary>

1. D. Business logic must not import TypeORM. A service must call a named repository method.
2. C. A worker and a main do not share a disk.

</details>
