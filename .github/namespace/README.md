# Run the Namespace CI trial

**Owner:** Developer Platform.

Use a Namespace workspace connected to this repository. Run these commands from the repository root.

1. Authenticate with `nsc login`.
2. Create the runner profiles:

   ```bash
   for role in build tests e2e tools; do
     nsc github profile create --spec_file ".github/namespace/ci-$role.json" -o json
   done
   ```

3. Push the trial branch.
4. Run the CI workflow:

   ```bash
   gh workflow run ci-pull-requests.yml --ref ci/namespace-ci-poc -f runner_provider=namespace
   ```

Manual trials run the full build, unit tests, lint, typecheck, packaging checks, DB tests, frontend checks, and E2E suites.
They do not apply PR change scoping. Compare job timings with that difference in mind.
Use `runner_provider=blacksmith` for a matched full-suite control run.
The Namespace E2E profile uses 2 vCPU and 16 GB RAM as an OOM workaround.
The cause of the excess worker memory is still under investigation.
Record this memory difference when comparing with Blacksmith's 2-vCPU runners.

Verify the Node and pnpm checks, test counts, Docker image restores, and final job results.
Run a fresh dispatch on the same commit to measure warm caches. GitHub retries can select only failed E2E specs.

The profiles use standard Namespace images with toolchain and action caching.
`setup-nodejs` mounts `node_modules` on the cache volume and keeps the pnpm store inside that mount for hardlinks.
Each job clears installed dependencies before installation. Nested setup retains the installed tools.
Native Turbo caching shares build outputs across jobs.

The profiles separate the full build, checks, E2E, and partial tooling installs into different cache volumes.
E2E profiles also cache container image pulls. CI image tarballs use GitHub's keyed cache for transfer between jobs.

To use preloaded tools, attach the optional Dockerfile to each profile after custom-image optimization is available:

```bash
nsc github profile update --profile_id "$PROFILE_ID" --dockerfile .github/namespace/Dockerfile -o json
```

Wait for the custom image to become ready before starting CI. The setup action detects preloaded tools and verifies their versions.
