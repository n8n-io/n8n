---
title: Credentials
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: afitzek
---

# Credentials

To call an external service, a node usually needs a secret, which n8n stores as a **credential**. A credential is an encrypted secret that a project owns, e.g. an API key for an external service. n8n decrypts it only when a node or an agent needs it, and does not store the decrypted value.

This page explains how users share and use credentials, and how n8n encrypts them. It also covers Gateway credits and external secrets.

## Sharing and use

A share or a transfer of a workflow does not include its credentials. During a transfer, the user can also share the credentials with the new project.

A user can use their personal credential in any team project they are a member of, without sharing it. For example, Alice adds her personal Slack credential to a workflow in a team project. Bob, another member in the team project, sees that the workflow uses a Slack credential of Alice, but cannot use it. Bob also sees that the executions ran, but not their data. Owners and admins also see only that the executions ran.

## End-user credentials

**End-user credentials** allow a workflow to run with the account of the person who triggers it, instead of one fixed account. For example, a workflow that summarizes a Gmail inbox reads the inbox of the user who runs it. An admin creates the credential once, and each user connects their own Gmail account to it. The `dynamic-credentials` module implements end-user credentials.

## Instance credentials

**Instance credentials** hold secrets for n8n features, not for workflows. For example, an admin assigns instance credentials for the model, sandbox, and web search of the n8n Assistant. A workflow cannot use an instance credential.

## Encryption

n8n encrypts credentials with an **encryption key**. An operator sets this key, or n8n generates one at first startup. Both the main and workers need the same key.

n8n can also rotate keys. After a rotation, n8n encrypts new values with the new key, and keeps the old keys in the database to read old values. Each encrypted value names the key that encrypted it.

To encrypt or decrypt, new code calls `encryptV2` and `decryptV2`. These methods pick the correct key.

## Gateway credits

**Gateway credits** allow a node or an agent to call a model provider without a credential from the user. Instead, the node holds a marker. When the node runs, n8n creates a credential in memory that sends the call to the n8n AI Gateway, a service outside the instance. The gateway calls the provider with its own key and bills the call.

## External secrets

**External secrets** come from a store outside n8n, e.g. AWS Secrets Manager or HashiCorp Vault. Only a credential can read them, through `$secrets`. A node parameter cannot.

Each process fetches the secrets from the store itself, so every worker must reach the store over the network.

## Quiz

1. A user transfers a workflow to another project. What happens to its credentials?
   - A. They move with the workflow.
   - B. n8n copies them into the target project.
   - C. They stay in their project.
   - D. n8n deletes them from the old project.
2. In queue mode, where does n8n decrypt the credential of a node?
   - A. On the main.
   - B. On the worker.
   - C. In the database.
   - D. Nowhere.
3. With Gateway credits, how does a node call a model when the user has no key?
   - A. n8n reads the key from the environment of the worker.
   - B. n8n creates a credential that sends the call to the gateway.
   - C. The node calls the model without authentication.
   - D. The user must create a credential first.

<details>
<summary>Answers</summary>

1. C. A share or a transfer of a workflow does not include its credentials.
2. B. n8n decrypts a credential when a node needs it during an execution, and in queue mode workers run the executions.
3. B. When the node runs, n8n creates a credential in memory that sends the call to the gateway.

</details>
