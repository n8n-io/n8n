---
name: n8n:env-var-docs
description: >-
  Writes and reviews the JSDoc on `@Env(...)` config properties. The docs team
  extracts these comments from source into the public environment variable
  reference, so they are user documentation, not code comments. Use when adding
  or changing an `@Env` property, a config class, or reviewing a PR that touches
  one.
---

# Environment variable docs

The JSDoc above every `@Env('...')` property is exported almost verbatim into
the [environment variables reference](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables)
on docs.n8n.io. The generated table has four columns: variable name,
description, data type, default. Your JSDoc is the description column. The
reader is a self-hosting operator, not an n8n developer.

Follow the [n8n docs style guide](https://docs.n8n.io/contribute/contribution-guide-for-n8n-docs/style-guide-for-n8n-docs)
for these comments. It overrides the ASD-STE100 rule in `AGENTS.md` for this
one case. The rules below are the parts of that guide that matter for a
one-paragraph description.

## Rules

- **Every `@Env` property has a JSDoc.** No exceptions. A missing comment
  ships as an empty description cell.
- **Write for the operator.** Say what the setting does, when to change it,
  and what happens when it's unset or wrong. Don't explain why the code is
  written the way it is.
- **No code references.** No file names, class names, function names,
  constants, license keys, or other internals the reader can't open. Values
  the operator types into the variable are fine and often needed, for example
  a credential type ID like `googleOAuth2Api` or a mode like `postgresdb`.
  The test: would the operator paste this into a config file, or would they
  need the source to know what it means? Details for developers go in a
  regular `//` comment on the implementation, not in the JSDoc.
- **No attack scenarios.** Say what the setting protects, not how an
  attacker would exploit it. This is a public page.
- **Don't repeat the default.** The default renders in its own column. Don't
  write "Defaults to true" or "Default: 1 hour". Do say what the unset state
  means when it's not obvious, for example "When unset, n8n uses the Redis
  host".
- **State units and formats.** Say "in milliseconds", "in bytes", "a
  comma-separated list", "a JSON object". The data type column only says
  `Number` or `String`.
- **Use allowed values when the set is small.** "One of `sqlite`,
  `postgresdb`." For a list, show one inline example in the sentence.
- **No JSDoc tags.** No `@example`, `@default`, `@see`, `@deprecated`. The
  exporter copies the tag name into the docs. Put the example or the
  deprecation notice in a sentence instead.
- **Product names:** "Gateway credits", not "n8n Connect" or "AI Gateway".
  "Publish a workflow", not "activate". `n8n` is always lowercase.
- **Style:** present tense, active voice, second person. Use contractions.
  No em dashes, use a comma or a new sentence. No "e.g." or "i.e.", write
  "for example" and "that is". Spell out zero to nine, numerals from 10.
  Values the operator types stay numerals, for example "Set to 0".
  Sentence case. One idea per sentence. End every sentence with a period.
- **Plain words:** "use" not "utilize", "lets you" not "allows you to", cut
  "powerful", "seamless", "simply", "it's important to note".
- **Length:** one to three sentences. If the setting needs more, the extra
  belongs in a docs page the comment can't link to yet; keep the comment to
  what fits a table cell.

## Examples

Bad, as found in the generated docs:

```ts
/**
 * Instance-level enablement for n8n Connect (AI Gateway). Licensed instances
 * are enabled by default; false opts out. Budget / free allowance still comes
 * from the license (`quota:aiGatewayBudget`).
 */
```

Wrong product name, a restated default, and an internal license key. Good:

```ts
/**
 * Whether Gateway credits are available on this instance. Set to false to
 * turn them off on a licensed instance. The credit allowance comes from your
 * license.
 */
```

Bad:

```ts
/**
 * Time to live in milliseconds for Redis cache entries. Set to 0 to disable
 * expiry. Default: 1 hour.
 */
```

The default is already in the table. Good:

```ts
/**
 * Time to live in milliseconds for Redis cache entries. Set to 0 to keep
 * entries until Redis evicts them.
 */
```

Bad:

```ts
/**
 * Comma-separated list of credential types for which overwrites are skipped
 * when the credential has been customized.
 * @example `N8N_SKIP_CREDENTIAL_OVERWRITE=zohoOAuth2Api,salesforceOAuth2Api`
 */
```

The `@example` tag lands in the description as literal text. Good:

```ts
/**
 * Comma-separated list of credential types to skip when applying credential
 * overwrites, for example `zohoOAuth2Api,salesforceOAuth2Api`. n8n skips an
 * overwrite only when a user has already changed one of its fields.
 */
```

Bad:

```ts
/**
 * Bind OAuth credential callbacks to the browser that initiated the flow.
 * When enabled, a session-scoped `n8n-oauth-binding` cookie is set on flow
 * initiation and verified on callback. Defeats phishing attacks where an
 * attacker injects an OAuth authorize URL into a victim's browser to land
 * tokens on the attacker's credential.
 */
```

Attack narrative and an internal cookie name on a public page. Good:

```ts
/**
 * Whether an OAuth credential connection must finish in the same browser
 * that started it. When enabled, n8n rejects the callback if it arrives
 * from a different browser.
 */
```

## Review checklist

When you review a PR that adds or changes an `@Env` property, check each
comment against this list and quote the fix in the review:

1. JSDoc present.
2. No code identifiers, file names, or internal keys.
3. No default restated.
4. Units, format, or allowed values stated.
5. No JSDoc tags.
6. No em dashes, Latin abbreviations, or filler words.
7. Reads correctly as a sentence in a table cell with no surrounding context.
