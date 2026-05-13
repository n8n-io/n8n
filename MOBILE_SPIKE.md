# Mobile Spike — Status & Resume Plan

Hackathon: n8n native Android APK (Route 2 — ship Node binary + bundled n8n).
Partner: Luca Mattiazzi.
Branch: `mobile/spike` off master.

## TL;DR (2026-05-13)

**Track A is done.** `dist/nodejs-project.tar.gz` (256 MB compressed, 1.5 GB extracted) is ready to hand off. Inside: pruned n8n + Android arm64 `node_sqlite3.node` cross-compiled against Node 22.22.1 ABI.

Validated on a Pixel 9 Pro XL emulator (API 35 arm64):
- The bundle extracts cleanly and boots on the host (`/healthz` 200, Editor 200).
- The cross-compiled `node_sqlite3.node` loads in Android Node (tested via Termux's Node 24 — N-API stable ABI guarantees it also loads in Luca's Node 22.22.1) and creates a real SQLite DB on disk.

**Outstanding: Luca-side integration.** Drop `nodejs-project/` into `app/src/main/assets/`, swap the WebView URL from his mock to `http://localhost:5678`, pin n8n's port to 5678. His APK already proves the Android shell + embedded Node runtime work end-to-end.

## How to rebuild from scratch

```bash
# 1. Build pruned compiled/ tree (~3-5 min)
pnpm install --ignore-scripts && pnpm build:deploy

# 2. Cross-compile sqlite3 for android-arm64 + Node 22 ABI (~1 min after first image build)
scripts/build-android-sqlite3-docker.sh
# → /tmp/node_sqlite3.android-arm64.node

# 3. Bundle (~30s with SKIP_BUILD=1)
ANDROID_SQLITE3_NODE=/tmp/node_sqlite3.android-arm64.node \
  SKIP_BUILD=1 scripts/bundle-for-android.sh
# → dist/nodejs-project.tar.gz
```

## Cross-compile route: Docker, not Darwin

`scripts/build-android-sqlite3.sh` is the **failed** Darwin-host attempt (kept as reference). Stock `node-gyp` on Darwin injects Mac-only flags (`-arch X`, `-mmacosx-version-min=X`) into the makefile and uses Mac `libtool` for static archives, both of which fail when targeting Android. We worked around the flag injection with a wrapper, then hit the libtool wall, then pivoted.

`scripts/build-android-sqlite3-docker.sh` + `scripts/Dockerfile.android-sqlite3` is the **working** path. Linux→Android is `node-gyp`'s documented cross-compile route; from a Linux container there are no Darwin-specific gypi defaults to fight. The Dockerfile pins NDK r26d.

## Where we are (Track A — n8n bundle)

Done:
- Branch created
- `pnpm install --ignore-scripts` clean
- n8n boots locally with **default config, no env hacks needed**
  - All default modules load fine on host
  - `source-control` and `community-packages` were *not* needed to disable — modules only load their externals when used
  - Confirmed Editor reachable, healthz returns ok
- `scripts/bundle-for-android.sh` written and validated end-to-end
  - Produces `dist/nodejs-project.tar.gz` (**256 MB compressed, 1.5 GB extracted**)
  - Swaps sqlite3 binding into `compiled/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3/build/Release/node_sqlite3.node`
  - Strips orphan host `.node` files for `isolated-vm` + `@parcel`
  - `SKIP_BUILD=1` flag to iterate without rerunning `pnpm build:deploy`
- End-to-end smoke test on host: extracted tarball boots on `:5680`, healthz HTTP 200, Editor HTTP 200, license activates, JS task runner registers.
- Android Studio + SDK installed, Pixel 9 Pro XL AVD created (API 35, Android 15, **arm64-v8a**). `adb devices` sees `emulator-5554`.
- `adb` on PATH (`~/Library/Android/sdk/platform-tools` in `~/.zshrc`)

Pending (blocked on Luca):
- Android arm64 `node_sqlite3.node` (from his Termux build)
- Android arm64 `libnode.so` (Node binary for the APK)

## Key findings (don't relearn)

- `isolated-vm` is **only** used in `packages/cli/src/modules/agents/` and is not in the default-enabled module list (`packages/@n8n/backend-common/src/modules/module-registry.ts`). Default boot never loads it.
- The JS task-runner uses Node's built-in `node:vm`, **not** isolated-vm (`packages/@n8n/task-runner/src/js-task-runner/js-task-runner.ts:23`). Code node likely works on Android without sandbox surgery.
- `@parcel/watcher` is lazy-imported in `packages/cli/src/load-nodes-and-credentials.ts:647` — only triggered by community-packages dev watch.
- `community-packages` module *cannot* be disabled via `N8N_DISABLED_MODULES` because `base-command.ts:210` calls `initCommunityPackages` unconditionally. Leave it enabled.
- `pnpm build:deploy` (in root `package.json`) is the existing pipeline that produces `./compiled/` — pruned, self-contained, ready to ship. This is what `bundle-for-android.sh` wraps.
- **DO NOT use `tar -h` (dereference symlinks) when packaging `compiled/`.** Twin disaster: (1) ~5× size bloat (1.5 GB → 7.7 GB unpacked) because pnpm's `.pnpm/` store gets duplicated everywhere a symlink points to it, (2) breaks Node module resolution — `semver@7` (hoisted to flat top-level after dereferencing) does `require('lru-cache')` and resolves to top-level `lru-cache@9.1.2` (whose API has `{ LRUCache }`, not a default export) instead of its co-located `lru-cache@6` under `.pnpm/semver@7.6.0/node_modules/lru-cache`. Boot fails with `TypeError: LRU is not a constructor`. Use `tar -s ',^compiled,nodejs-project,'` (BSD) / `--transform 's,^compiled,nodejs-project,'` (GNU) to rename inside the archive without dereferencing.

## Hand-off to Luca

He provides two files from his Termux on Android emulator setup:

| File | Goes into |
|---|---|
| `node_sqlite3.node` (android-arm64, matches his Node version) | passed as `ANDROID_SQLITE3_NODE=...` env to bundle.sh |
| `libnode.so` (Node binary, arm64-v8a Android) | his Android Studio project: `app/src/main/jniLibs/arm64-v8a/libnode.so` |

Track B Android shell architecture (Luca's side):
- Kotlin foreground service spawns `ProcessBuilder(applicationInfo.nativeLibraryDir + "/libnode.so", filesDir + "/nodejs-project/bin/n8n", "start")`
- On first boot, copy `assets/nodejs-project/` → `filesDir/nodejs-project/`
- MainActivity WebView → `http://localhost:5678`

## To produce the bundle when his sqlite file arrives

```bash
ANDROID_SQLITE3_NODE=/path/to/android-arm64-node_sqlite3.node \
  scripts/bundle-for-android.sh
# → dist/nodejs-project.tar.gz
```

`SKIP_BUILD=1` if `compiled/` is already fresh.

## Current blocker — Luca's Android binaries

Waiting on:
- `libnode.so` (Node binary for arm64-v8a Android, from his Termux build)
- `node_sqlite3.node` (sqlite3 binding for arm64-v8a Android, matching his Node version)

## Resume checklist

1. ✅ Android Studio installed, SDK populated, AVD created (Pixel 9 Pro XL, API 35, arm64-v8a)
2. ✅ adb on PATH
3. ✅ Bundle smoke test on host — booted from extracted tarball, healthz 200, Editor 200
4. ✅ `tar -h` bug fixed in `bundle-for-android.sh` — bundle now 256 MB compressed (was 1.2 GB), 1.5 GB extracted (was 7.7 GB)
5. ⏳ Slack Luca for ETA on `libnode.so` + `node_sqlite3.node`
6. ⏳ When his files arrive:
   ```bash
   ANDROID_SQLITE3_NODE=/path/to/android-arm64-node_sqlite3.node \
     SKIP_BUILD=1 \
     scripts/bundle-for-android.sh
   ```
7. ⏳ Hand `dist/nodejs-project.tar.gz` to Track B for APK assembly

## Can the current bundle run on the emulator?

**No, not without Luca's binaries.** The current 256 MB tarball contains the **darwin-arm64** sqlite3 native binding. Android arm64 ≠ macOS arm64 at the dynamic-linker level (ELF/bionic vs Mach-O/dyld), so `require('sqlite3')` will fail at load on the emulator. And there's no Android `node` binary in the tarball either — the host smoke test used the system `node` on the Mac. To run on Android we need both of Luca's files.

**Workaround if you want to demo without Luca:** install Termux *inside* the emulator from F-Droid, `pkg install nodejs` and `pkg install sqlite`, copy the bundle into Termux's home, replace `node_sqlite3.node` with Termux's native one, run `./bin/n8n start` from inside Termux, then point the emulator's Chrome at `http://localhost:5678`. That's essentially manually performing Luca's Track B. Useful as a sanity check that the bundle works on Android arm64 *at all*, but not the demo we agreed on.

## Files touched on `mobile/spike`

- `scripts/bundle-for-android.sh` (new) — uncommitted
- `MOBILE_SPIKE.md` (this file) — uncommitted

Commit before/after reboot? Optional. Branch is local. If wanting to share with Luca: `git push -u origin mobile/spike`.

## Demo workflow (agreed scope)

GPS geofence (leaves home) → Webhook trigger in n8n → HTTP Request → Slack/Telegram. Pure-JS path, no Code node needed.

## Things explicitly cut for v1

- Code node — works in `node:vm` mode but skip from demo
- Source Control — no git binary on Android (the module loads, just won't function when used)
- Community packages install — no `@parcel/watcher` invocation, no npm install on device
- Python task runner — warns on boot, harmless
- Image/PDF nodes (graphicsmagick, fonts) — skipped from APK
