# Credential filename must match the credential class name (`@n8n/community-nodes/cred-filename-against-convention`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule enforces that the basename of a `*.credentials.ts` file (without the
`.credentials.ts` extension) matches the name of the credential class it
contains. The class name is the source of truth.

Keeping filenames in sync with class names makes credentials predictable to
locate and matches the convention used throughout n8n's built-in credentials.

## Examples

### Incorrect

```typescript
// File: GithubApi.credentials.ts
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class GitlabApi implements ICredentialType {
	name = 'gitlabApi';
	displayName = 'GitLab API';
	properties: INodeProperties[] = [];
}
```

### Correct

```typescript
// File: GithubApi.credentials.ts
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class GithubApi implements ICredentialType {
	name = 'githubApi';
	displayName = 'GitHub API';
	properties: INodeProperties[] = [];
}
```
