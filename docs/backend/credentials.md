---
title: Credentials
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: guillaumejacquart
---

# Credentials

[Permissions](permissions.md) explained that a project owns its credentials. A node that calls a service needs a secret, such as an API key. A workflow can also read values that an admin sets once for many workflows. This page explains where n8n keeps these values, which process decrypts them, who can read them, and how a model call can work without a key.

## Credentials

A **credential** is an encrypted secret that a project owns, such as an API key for a service. n8n decrypts it only when a node needs it during a run, and it does not store the decrypted value.

A credential has its own sharings, as a workflow does. When a user moves a workflow to another project, its credentials stay in their project. The user can share them into the target project during the move.

A credential can also give each user a different secret. Manual runs skip the per-user step unless the user context is present.

**Instance credentials** are for n8n itself, not for workflows. Admins manage them, and the n8n Assistant uses them for its model.

## Gateway credits

**Gateway credits** let a node or an agent call a model provider without a key from the user. The n8n AI Gateway, a service outside the instance, holds the provider keys and bills each call. The instance needs `feat:aiGateway`, and `quota:aiGatewayBudget` sets its budget.

When the gateway can serve a node, n8n attaches a managed credential to the node, so the node needs no key. n8n never attaches it automatically to an HTTP Request node, because that node calls a URL that the user controls. The gateway bills a call to a user: the owner of a personal project, or else the instance owner.

## Encryption

Workers decrypt the credentials for the nodes that they run, so every process holds the encryption key. New code encrypts and decrypts only through `encryptV2` and `decryptV2`. The ciphertext names the key that encrypted it, so keys can rotate. n8n never deletes a key, because the data that it encrypted would become unreadable.

## External secrets

**External secrets** come from a store outside n8n, such as AWS Secrets Manager or Vault, and need `feat:externalSecrets`. Only a credential can read them, through `$secrets`. A node parameter cannot.

Every process fetches the secrets itself every 5m, workers too. A worker must therefore reach the secrets store over the network. When an admin changes the store settings, a pubsub command tells every process to reload.

## Variables

**Variables** are values that workflows read as `$vars`. They are not secret. A variable belongs to the instance or to a project, and a project variable wins over an instance variable with the same key. They need `feat:variables`, and `quota:maxVariables` limits their number.

n8n reads variables through `CacheService`, which uses Redis in queue mode, so a worker does not query the table for each execution.

## Quiz

1. In queue mode, where does n8n decrypt the credential of a node?
   - A. On the main.
   - B. On the worker.
   - C. In the database.
   - D. Nowhere.
2. A user moves a workflow to another project. What happens to its credentials?
   - A. They move with the workflow.
   - B. n8n copies them into the target project.
   - C. They stay in their project.
   - D. n8n deletes them from the old project.
3. With Gateway credits, does n8n attach the managed credential to an HTTP Request node automatically?
   - A. Yes, as for every node.
   - B. No.
   - C. Only in a personal project.
   - D. Only for the instance owner.

<details>
<summary>Answers</summary>

1. B. Every process holds the encryption key, and n8n decrypts a credential only when a node needs it.
2. C. A move replaces the sharings of the workflow only. Credentials have their own sharings.
3. B. n8n never attaches the managed credential automatically to a node that calls a URL that the user controls.

</details>
