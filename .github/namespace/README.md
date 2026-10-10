# Configure the Namespace Docker trial

Use a Namespace workspace connected to this repository. Run these commands from the repository root.

1. Authenticate with `nsc login` or set `NSC_TOKEN_FILE` to your token file.
2. Create the runner profile:

   ```bash
   PROFILE_ID=$(nsc github profile create --spec_file .github/namespace/profile.json -o json | jq -r .profile_id)
   ```

   For an existing profile, get its ID with `nsc github profile list -o json`.

3. Attach the custom image:

   ```bash
   nsc github profile update --profile_id "$PROFILE_ID" --dockerfile .github/namespace/Dockerfile -o json
   ```

4. Wait for the image to become ready in the [Namespace profile dashboard](https://cloud.namespace.so/workspace/actions/profiles).
5. Push your trial branch.
6. Start an AMD64 build:

   ```bash
   gh workflow run docker-build-push.yml --ref "$(git branch --show-current)" \
     -f namespace_poc=true -f push_enabled=true -f include_arm64=false
   ```

Verify that the job uses `namespace-profile-n8n-docker-poc` and passes the Node, pnpm, and SafeChain checks.
Check that the pnpm cache mounts and Turbo uses the Namespace endpoint.
Check that the dependency storage probe can hardlink from the store into `node_modules`.
The package store lives at `node_modules/.pnpm-store`, inside the same cache mount as installed dependencies.
The experiment clears the other entries in `node_modules` before each install to measure package-store reuse without retaining installed dependencies.
Run the same commit again to measure warm caches.
Check that publishing uses the separate `n8n-io-n8n-docker-publish-poc` cache tag.
This prevents a publish runner from replacing the application cache with an older snapshot.

When tool versions change, update the Dockerfile versions and checksums together.
Match Node to `docker-build-push.yml`, pnpm to `package.json`, and SafeChain to `setup-nodejs/action.yml`.
Repeat step 3 to rebuild the image.
