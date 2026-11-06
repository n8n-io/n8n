---
title: Persistence
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: ivov
---

# Persistence

On [Start here](README.md), you read your executions from a SQLite file. This page explains where n8n keeps its data, and the rules that apply when you add a table or store more of it.

## Database

n8n supports SQLite and PostgreSQL. SQLite is the default, and n8n Cloud runs many instances on it. Large self-hosted setups and queue mode use PostgreSQL. Every migration must work on both.

The entity classes do not create tables. The migrations define the schema, and an entity change does nothing until a migration makes the same change. `@n8n/db` holds the shared entities and repositories, and the migrations of every table, also the tables of modules. A module keeps its own entities and repositories. `docs/generated/` shows every table, generated from the migrations.

Every process runs the pending migrations at startup. [Write a database migration](how-to/write-a-database-migration.md#how-n8n-runs-migrations) explains how.

n8n uses its own fork of TypeORM, and it keeps TypeORM inside the repositories. A service calls a repository method with a name that says what it does, such as `markFirstAuthenticated` in `TrustedSourceRepository`. It does not build a TypeORM query itself. For several writes in one transaction, a service uses `TransactionRunner`. The root `AGENTS.md` has the rules and an example.

## Execution data

On [Start here](README.md), the execution had a row in `execution_entity` and its data in `execution_data`. The row holds what the editor filters on, such as the status and the times. The data is the **run data**: the output of every node, each time it ran. It is often much larger than the row. A waiting execution keeps its run data there, and the engine continues from it when the execution resumes.

A setting can send the data of new executions to blob storage instead of the database. Each row records where its data is, so a change of the setting does not lose old executions.

Old executions go away in two steps. A system task first marks them as deleted. A later run removes the rows and their data after a delay.

## Binary data

Files in items, such as a PDF that a node downloads, are **binary data**. An item holds only an id for the file. The file itself goes to the file system, the database, S3, or Azure. In queue mode the default is the database, because a worker and a main do not share a disk. S3 and Azure need a license.

## Data tables

A user can create small tables in a project, called **data tables**, and nodes read and write them. Each data table is a real SQL table. Nodes reach data tables through a proxy that only the data table nodes can use. A Code node therefore cannot use it to reach other tables.

## Quiz

1. You add a column to an entity class, but you write no migration. What happens?
   - A. TypeORM adds the column at startup.
   - B. CI writes the migration for you.
   - C. The column exists only on SQLite.
   - D. Nothing. The migrations define the schema.
2. Where does binary data go by default in queue mode?
   - A. The file system of the main.
   - B. S3.
   - C. The database, because a worker and a main do not share a disk.
   - D. The job in Redis.
3. A service needs a query with `In` and `IsNull`. Where does the query go?
   - A. Into the service, with an import from TypeORM.
   - B. Into the controller.
   - C. Into a migration.
   - D. Into a repository method with a name that says what it does.

<details>
<summary>Answers</summary>

1. D. The entity classes do not create tables. An entity change does nothing until a migration makes the same change.
2. C. S3 and Azure need a license, and the file system is not shared between processes.
3. D. n8n keeps TypeORM inside the repositories. A service calls a method with a name that says what it does.

</details>
