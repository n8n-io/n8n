# Release Process for n8n

This document outlines the steps and best practices for preparing and performing a release of the n8n project.

## Release Preparation

- Ensure all features and bug fixes for the release are merged into the main branch.
- Verify that all tests pass successfully.
- Update the CHANGELOG.md with relevant changes, fixes, and improvements.
- Bump the version number in package.json according to semantic versioning.

## Building the Release

- Run the build process to generate production-ready artifacts:

```bash
pnpm run build
```

- Verify the build output for correctness.

## Creating a Release

- Tag the release in Git with the version number:

```bash
git tag -a vX.Y.Z -m "Release version X.Y.Z"
git push origin vX.Y.Z
```

- Publish the release on GitHub with release notes.

## Post-Release

- Monitor for any issues or bugs reported.
- Prepare hotfixes or patches as needed.
- Communicate the release to the community and stakeholders.

## Best Practices

- Follow semantic versioning strictly.
- Keep release notes clear and informative.
- Automate as much of the release process as possible.

## Resources

- [Semantic Versioning](https://semver.org/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)

---

This document helps maintain a consistent and reliable release process for the n8n project.
