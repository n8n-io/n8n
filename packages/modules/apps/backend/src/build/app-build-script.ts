// Keep all shared-directory writes in one command under the sandbox lock.
export const APP_BUILD_SCRIPT = `#!/usr/bin/env bash
set -euo pipefail
root="$1"
stage="$2"
key="$3"
deadline="$4"
max_log_bytes="$5"
staging_retention_ms="$6"
cd "$root"
printf sandbox > "$stage/stage"
node_version=$(node --version)
npm_version=$(npm --version)
node -e '
const fs = require("node:fs");
const [deadline, npmVersion, retentionMs] = process.argv.slice(1);
if (Date.now() >= Number(deadline)) process.exit(124);
if (Number(process.versions.node.split(".")[0]) < 22 || Number(npmVersion.split(".")[0]) < 10) {
  console.error("App builds need Node.js 22 or later and npm 10 or later.");
  process.exit(1);
}
fs.mkdirSync("app", { recursive: true });
for (const name of fs.readdirSync("app")) {
  if (name !== "node_modules") fs.rmSync("app/" + name, { recursive: true, force: true });
}
// Expired staging files cannot belong to a live build.
for (const name of fs.readdirSync("attempts")) {
  const path = "attempts/" + name;
  if (fs.statSync(path).mtimeMs < Date.now() - Number(retentionMs)) fs.rmSync(path, { recursive: true, force: true });
}' "$deadline" "$npm_version" "$staging_retention_ms"
printf 'Node %s, npm %s\\n' "$node_version" "$npm_version"
tar -xzf "$stage/source.tgz" -C app
cd app
printf install > "$stage/stage"
cache_key="$key:$node_version:$npm_version"
if [ ! -d node_modules ] || [ ! -f "$root/dependencies" ] || [ "$(cat "$root/dependencies")" != "$cache_key" ]; then
  rm -f "$root/dependencies"
  npm ci --include=dev --no-audit --no-fund 2>&1 | tail -c "$max_log_bytes"
  printf '%s' "$cache_key" > "$root/dependencies"
fi
printf build > "$stage/stage"
ulimit -c 0
npm run build -- --base=/ 2>&1 | tail -c "$max_log_bytes"
tar -czf "$stage/bundle.tgz" -C dist .
`;
