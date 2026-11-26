# Limit run-time secrets to allowed domains with credential fields

Date: 2026-11-18

Status: Active

Decision Owner: Core Application

## Context

A caller sends a secret with a request. A builder chooses the node and the URL. The secret then
goes wherever the builder points the node. An instance admin wants to limit the hosts that a
secret can reach.

n8n credentials already have the fields `allowedHttpRequestDomains` and `allowedDomains`. The
HTTP Request node, the GraphQL node, declarative nodes, and some AI nodes check them. Other nodes
use their own API helper and check nothing.

## Decision

A rule has an optional field `allowedDomains`. It is a comma separated list of hosts. An entry
`*.example.com` matches subdomains only. The syntax is the syntax of the credential field.

- A rule without the field has no restriction.
- Only an instance admin sets the field. The rule API needs `securitySettings:manage`.
- The field belongs to the rule. Every use of the stub credential gets the same list.
- When a node asks for the stub, n8n sets `allowedHttpRequestDomains` to `domains` and
  `allowedDomains` to the list. n8n sets them after it merges the request value. A request value
  or a transform cannot replace them.
- n8n does not add a new check. A node that checks the credential fields enforces the list. A
  node that does not check them ignores the list. The documentation names both groups.

## Alternatives Considered

We rejected a new check in the credentials helper. The helper does not know the URL of a request.
It would need to run inside every node, which is the work that the credential fields already do.

We rejected a list for each stub credential, edited by a project admin. The rules are an admin
setting. A second place to edit the list would let a project weaken the limit.

We rejected a global list for all rules. Each secret goes to a different service, so one list
would be too wide for every rule.

We rejected a promise that the list covers every node. A node with its own API helper, such as
the Gmail node, would send the secret to its fixed host and ignore the list. A promise that the
code cannot keep is worse than a documented gap.

## Consequences

The list limits the hosts for the nodes that check the credential fields. It does not limit a
node that skips the check. An admin who needs a hard limit must also restrict which nodes
builders can use.

A declarative node adds its own host to the list when the node defines the host. A list for such
a node limits only a base URL that the user sets.

A node that checks the URL of the node itself, such as an AI node with a fixed endpoint, fails
when the list does not name that host. The admin must list it.

A rule without the field stays unrestricted. An admin adds the field to a rule to limit it.

## Links

RFC: -

Documentation: [Runtime credentials](../../../../docs/backend/runtime-credentials.md)

Related ADRs: ADR-20261118-overlay-the-request-value-when-n8n-resolves-a-stub-credential, ADR-20261118-store-rules-in-the-environment-and-the-database
