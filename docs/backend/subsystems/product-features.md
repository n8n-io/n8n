---
title: Product features
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: kgrhartlage
---

# Product features

The earlier pages covered the core: workflows, agents, processes, and data. Many product features sit on top of that core, and you will meet them in reviews and in incidents before you work on them. Each one is a module with its own code and its own README. This page tells you what each one does and the one fact that most often matters.

| Feature | What it does | What to know |
|---|---|---|
| Environments v1, the `source-control` module | Connects the whole instance to one git branch | A push or a pull locks the whole instance. A read-only branch makes the instance read-only |
| Environments v2, the `promotions` module | Moves team projects between instances, such as from staging to production | New connections get v2. Instances that already use v1 stay on v1 |
| n8n packages | A file format, `.n8np`, to export and import projects and workflows | The public API uses it first. A new option must go through the module, the DTO, the public controller, and `@n8n/cli` |
| Community packages | Installs npm packages of nodes from other authors | An install on one main reaches the other mains through pubsub |
| Workflow reviews | Adds an approval step before a publication | A workflow with an open review does not publish |
| Variables | Values that workflows read as `$vars` | They belong to the instance or to a project |
| Insights | Counts executions and time saved for the dashboard | It counts by the rules in `counting-rules.ts` |
| Breaking changes | Lists what the next major version changes in each workflow of an instance | Each check is a class with `@BreakingChangeRule` |
| `export:entities` and `import:entities` | Copy whole tables out of an instance and back in | Cloud uses them, so their flags and output are a contract |

## Quiz

1. A user pulls from git in Environments v1. What happens to the instance during the pull?
   - A. Only the changed workflows are locked.
   - B. The whole instance is locked.
   - C. Nothing. Pulls run in the background.
   - D. The instance restarts.
2. A workflow has an open review. Can a user publish it?
   - A. No.
   - B. Yes, and the review closes.
   - C. Yes, but only an admin.
   - D. Yes, as a draft.
3. An admin installs a community package on one main. How do the other mains get it?
   - A. At their next restart only.
   - B. From a shared disk.
   - C. They do not get it.
   - D. Through a pubsub command.
4. You add a flag to `n8n export:entities`. Why must you be careful?
   - A. The command runs in every migration.
   - B. The flag changes the public API.
   - C. Cloud uses the command, so its flags and output are a contract.
   - D. The command is the only backup.

<details>
<summary>Answers</summary>

1. B. A push or a pull locks the whole instance.
2. A. Workflow reviews add an approval step before a publication.
3. D. An install on one main reaches the other mains through pubsub.
4. C. Cloud copies whole tables out of an instance and back in with these commands.

</details>
