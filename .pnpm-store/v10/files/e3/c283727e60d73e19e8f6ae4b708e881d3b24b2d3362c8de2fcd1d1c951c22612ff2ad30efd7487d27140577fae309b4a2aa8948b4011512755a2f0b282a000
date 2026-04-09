---
title: Versioning
description: Understand how the AI SDK approaches versioning.
---

# Versioning

Each version number follows the format: `MAJOR.MINOR.PATCH`

- **Major**: Breaking API updates that require code changes.
- **Minor**: Blog post that aggregates new features and improvements into a public release that highlights benefits.
- **Patch**: New features and bug fixes.

## API Stability

We communicate the stability of our APIs as follows:

### Stable APIs

All APIs without special prefixes are considered stable and ready for production use. We maintain backward compatibility for stable features and only introduce breaking changes in major releases.

### Experimental APIs

APIs prefixed with `experimental_` or `Experimental_` (e.g. `experimental_generateImage()`) are in development and can change in any releases. To use experimental APIs safely:

1. Test them first in development, not production
2. Review release notes before upgrading
3. Prepare for potential code updates

<Note type="warning">
  If you use experimental APIs, make sure to pin your AI SDK version number
  exactly (avoid using ^ or ~ version ranges) to prevent unexpected breaking
  changes.
</Note>

### Deprecated APIs

APIs marked as `deprecated` will be removed in future major releases. You can wait until the major release to update your code. To handle deprecations:

1. Switch to the recommended alternative API
2. Follow the migration guide (released alongside major releases)

<Note>
  For major releases, we provide automated codemods where possible to help
  migrate your code to the new version.
</Note>
