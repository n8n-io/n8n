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

   To change a profile later, pass its ID and current version from `nsc github profile list -o json`:

   ```bash
   nsc github profile update --profile_id "$PROFILE_ID" --version "$VERSION" --spec_file .github/namespace/ci-e2e.json
   ```

   A spec file replaces the whole profile. Settings made only in the web UI, such as protected branches, may be lost.

3. Push the trial branch.
4. Run the CI workflow:

   ```bash
   gh workflow run ci-pull-requests.yml --ref ci/namespace-ci-poc -f runner_provider=namespace
   ```

Manual trials run the full build, unit tests, lint, typecheck, packaging checks, DB tests, frontend checks, and E2E suites.
They do not apply PR change scoping. Compare job timings with that difference in mind.
Use `runner_provider=blacksmith` for a matched full-suite control run.
The Namespace E2E profile uses 4 vCPU and 8 GB RAM. It costs the same as 2 vCPU and 8 GB (4 units per minute).
It also has 4 GB of swap, so short memory spikes slow the shard instead of ending it.
Namespace bills `max(vCPU, GB of RAM / 2)` units, so every profile uses the most vCPU its memory pays for: build 16x32, tests 8x16, tools 4x8.
It needs the MockServer wait fix (DEVP-1269). Without it, the worker keeps all MockServer logs in memory.
Record the CPU difference when comparing with Blacksmith's 2-vCPU runners.

Verify the Node and pnpm checks, test counts, Docker image restores, and final job results.
Run a fresh dispatch on the same commit to measure warm caches. GitHub retries can select only failed E2E specs.

The profiles use standard Namespace images with toolchain and action caching.
`setup-nodejs` mounts `node_modules` on the cache volume and keeps the pnpm store inside that mount for hardlinks.
Each job clears installed dependencies before installation. Nested setup retains the installed tools.
Native Turbo caching shares build outputs across jobs.

The profiles separate the full build, checks, E2E, and partial tooling installs into different cache volumes.
E2E profiles also cache container image pulls.
On Namespace, the prep job pushes the CI images to the workspace registry (`n8n-ci/n8n` and `n8n-ci/runners`). E2E shards pull them.
Each image tag is `ci-<variant>-<sha>`. A re-run of the same commit reuses the pushed images.
Set a short expiry on those repositories once per workspace:

```bash
for repo in n8n-ci/n8n n8n-ci/runners; do
  nsc registry policy set --repository "$repo" --default_expiration 72h
done
```

Other providers keep the tarball in GitHub's keyed cache.

To use preloaded tools, attach the optional Dockerfile to each profile after custom-image optimization is available:

```bash
nsc github profile update --profile_id "$PROFILE_ID" --dockerfile .github/namespace/Dockerfile -o json
```

Wait for the custom image to become ready before starting CI. The setup action detects preloaded tools and verifies their versions.
