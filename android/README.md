# n8n mobile — Android shell

A native Android app that runs a full self-hosted n8n on the device. Node 22 (`libnode.so`) is bundled as a shared library and spawned as a child process; the n8n bundle is shipped as a tar.gz inside `assets/` and extracted to `filesDir/` on first launch. A WebView in the **Workflows** tab points at `http://127.0.0.1:8765` to render the standard n8n editor; native Compose screens host the trigger-config UIs.

Status: spike, branch `mobile/spike`. Two trigger types working end-to-end on real devices and emulators:

- **Geofence** (enter/exit a circular region around lat/lng)
- **Notification** (any other app posts a notification matching package + title/text regex)

Both route to standard n8n Webhook trigger nodes — no n8n core changes.

---

## Prerequisites

- macOS or Linux host
- Docker Desktop (for the sqlite3 cross-compile step)
- Android Studio with NDK r26d + cmdline-tools (SDK Manager → SDK Tools)
- pnpm (n8n monorepo)
- JDK 11+ (or use Android Studio's bundled JBR at `/Applications/Android Studio.app/Contents/jbr/Contents/Home`)
- An emulator (Pixel 9 Pro XL, API 35, **arm64-v8a**) OR a physical arm64 phone with ~3 GB free
- About 1.5 GB free RAM during build, ~10 GB free disk

---

## Build from a clean clone

Five steps. Two of them are non-obvious gotchas.

```bash
# From repo root
git checkout mobile/spike && git pull

# 1. Build the n8n bundle (~5 min cold, ~30 s with SKIP_BUILD=1)
pnpm install --frozen-lockfile
pnpm build:deploy                                # → compiled/  (1.5 GB)

# 2. Cross-compile sqlite3 for android-arm64 + Node 22 ABI
#    First run downloads NDK in Docker (~1 GB). Subsequent runs ~1 min.
scripts/build-android-sqlite3-docker.sh          # → /tmp/node_sqlite3.android-arm64.node

# 3. Bundle (swaps sqlite, strips orphan host .node files, tars compiled/)
ANDROID_SQLITE3_NODE=/tmp/node_sqlite3.android-arm64.node \
  SKIP_BUILD=1 scripts/bundle-for-android.sh     # → dist/nodejs-project.tar.gz  (~256 MB)

# 4. ★ Gotcha #1: rename + drop into Android assets
#    NodeService.kt reads assets.open("nodejs-project.bundle") — the .bundle
#    extension pairs with `noCompress.add("bundle")` in build.gradle.kts so aapt
#    doesn't re-compress an already-gzipped file.
mkdir -p android/app/src/main/assets
cp dist/nodejs-project.tar.gz android/app/src/main/assets/nodejs-project.bundle

# 5. ★ Gotcha #2: unpack the native libs
#    libnode.so is 228 MB which exceeds GitHub's 100 MB per-file limit, so it
#    ships as android/app/src/main/jniLibs/arm64-v8a.tar.gz. No Gradle task
#    extracts it automatically (yet).
cd android/app/src/main/jniLibs
tar xzf arm64-v8a.tar.gz
for f in arm64-v8a/*.so.gz; do gunzip -k "$f"; done
rm arm64-v8a/*.so.gz
cd ../../../..

# 6. Build the APK
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  GRADLE_USER_HOME="${GRADLE_USER_HOME:-$HOME/.gradle}" \
  ANDROID_HOME="$HOME/Library/Android/sdk" \
  ./gradlew assembleDebug                        # → app/build/outputs/apk/debug/app-debug.apk
cd ..
```

The APK is ~300 MB. First-launch extraction takes ~5 min, then ~2.4 GB on device.

---

## Install + first-launch

```bash
# Emulator must be running with ≥ 16 GB userdata partition (default 6 GB is too small).
# Edit ~/.android/avd/<avd>.avd/config.ini → disk.dataPartition.size=16G, then
# start with -wipe-data once.

ADB=~/Library/Android/sdk/platform-tools/adb

$ADB install -r android/app/build/outputs/apk/debug/app-debug.apk
$ADB shell monkey -p com.example.n8n_mobile -c android.intent.category.LAUNCHER 1
$ADB forward tcp:8765 tcp:8765         # so you can hit n8n from Mac browser too

# Watch first-boot extraction
$ADB logcat -s NodeServer:D | head     # progress messages every 5k entries
```

When you see `Editor is now accessible via: http://127.0.0.1:8765` in logcat, n8n is up. The WebView in the **Workflows** tab will display the editor.

---

## Try a workflow + trigger end-to-end

### Manual UI flow

1. Open `http://localhost:8765` in your Mac browser (or use the Workflows tab in the app)
2. Sign in / register as owner on the device's n8n
3. Build a Webhook → Set workflow, save, activate, copy the production webhook URL
4. In the app, tap **Triggers** or **Notifications**, add a trigger pointed at that URL
5. Trigger an event (geofence transition, notification, etc.) → workflow runs

### Scripted via the public API

Get an API key from Settings → n8n API in the editor.

```bash
API_KEY='ey...'
BASE='http://127.0.0.1:8765/api/v1'

# Discovery — see all available endpoints + scopes
curl -sS -H "X-N8N-API-KEY: $API_KEY" "$BASE/discover" | python3 -m json.tool

# Create + activate a webhook workflow (see scripts/demo-webhook-wf.json in MOBILE_SPIKE.md)
curl -sS -X POST -H "X-N8N-API-KEY: $API_KEY" -H "Content-Type: application/json" \
  -d @/tmp/wf.json "$BASE/workflows"
curl -sS -X POST -H "X-N8N-API-KEY: $API_KEY" "$BASE/workflows/$WF_ID/activate"
```

### Emulator-only: drive the triggers from your Mac

```bash
# Synthesise a notification (com.android.shell is what `cmd notification` posts as)
$ADB shell cmd notification post -t "Test" demo "Hello from adb"

# Grant notification access non-interactively (needed only once per install)
$ADB shell cmd notification allow_listener \
  com.example.n8n_mobile/com.example.n8n_mobile.triggers.NotificationListener

# Drive a fake GPS fix for geofence triggers
$ADB emu geo fix 13.4050 52.5200    # lng lat — Berlin
```

Verify the workflow executed:

```bash
curl -sS -H "X-N8N-API-KEY: $API_KEY" "$BASE/executions?limit=3" | python3 -m json.tool
```

---

## Architecture

```
┌─ android/                               (this directory)
│
│ app/src/main/
│   ├─ assets/nodejs-project.bundle       (gitignored — built from Track A)
│   │
│   ├─ jniLibs/arm64-v8a.tar.gz           (committed — Luca's nodejs-mobile build)
│   ├─ jniLibs/arm64-v8a/*.so             (gitignored — extracted at build time)
│   │     libnode.so libssl3.so libcrypto3.so libcares.so libz1.so libcxxshared.so
│   │
│   └─ java/com/example/n8n_mobile/
│       ├─ MainActivity.kt                 host + bottom nav (Workflows | Triggers | Notifications)
│       ├─ NodeService.kt                  foreground service: extract bundle, spawn libnode.so,
│       │                                  wait for :8765, sticky notification with progress
│       ├─ NodeRunner.kt                   ProcessBuilder wrapper around libnode.so
│       ├─ TestScreen.kt                   the Workflows tab — WebView pointing at :8765
│       │                                  plus the "n8n is starting up. Please wait" splash
│       ├─ ServerClient.kt                 (dead) POSTs foreground state to /state on Node
│       │
│       └─ triggers/
│           ├─ GeofenceTrigger.kt          data model
│           ├─ GeofenceManager.kt          wraps GeofencingClient from Play Services
│           ├─ GeofenceReceiver.kt         BroadcastReceiver — POSTs to webhook on transition
│           ├─ TriggerStore.kt             SharedPreferences-backed list of geofence triggers
│           ├─ TriggersScreen.kt           Compose form for adding/listing geofence triggers
│           │
│           ├─ NotificationTrigger.kt      data model
│           ├─ NotificationTriggerStore.kt SharedPreferences-backed list of notif triggers
│           ├─ NotificationListener.kt     extends NotificationListenerService — fires
│           │                              onNotificationPosted for every system notification,
│           │                              filters by package + regex, POSTs to webhook
│           └─ NotificationsScreen.kt      Compose form for notification triggers
│
└─ ../scripts/                              Track A (n8n bundle pipeline)
    ├─ build-android-sqlite3-docker.sh     cross-compile sqlite3 in a Linux container
    ├─ Dockerfile.android-sqlite3          NDK r26d + Node 22 + Linux base
    ├─ build-android-sqlite3.sh            (failed Darwin attempt, kept as reference)
    ├─ bundle-for-android.sh               wraps pnpm build:deploy + sqlite swap + tar
    └─ run-on-emulator.sh                  push + extract on emulator (debug helper)
```

### Boundary contract

Anything OS-level (sensors, notification listener, geofences, camera) lives in Kotlin and POSTs to a localhost webhook. n8n is unmodified — it just sees standard Webhook trigger nodes firing. To add a new trigger source, follow the [Adding a new trigger type](#adding-a-new-trigger-type) recipe — no n8n changes required.

---

## Adding a new trigger type

The shape is identical for every kind of platform event. Files to add for a hypothetical `BatteryLowTrigger`:

```
triggers/
├─ BatteryLowTrigger.kt          data class {id, name, threshold, url, enabled}
├─ BatteryLowTriggerStore.kt     SharedPrefs-backed StateFlow<List<...>>
├─ BatteryLowReceiver.kt         BroadcastReceiver for ACTION_BATTERY_LOW; POSTs to webhook
└─ BatteryLowScreen.kt           Compose form: name, threshold, webhook URL, list of active
```

Wire-up:

1. `AndroidManifest.xml` — register the receiver (or service if it's a continuous listener)
2. `MainActivity.kt` — add `Battery` to the `Tab` enum, a `NavigationBarItem` for it, and a conditional render block
3. Done

This is the same pattern used for Geofence and Notification triggers. Each adds ~250 LOC. Both predecessor implementations are in this directory for reference.

To go canvas-native (configure inline in the n8n editor instead of a separate tab) see the section in `MOBILE_SPIKE.md` — the Android side becomes a polling reconciler against `GET /api/v1/workflows`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ENOSPC: No space left on device` during extraction | AVD's 6 GB default partition too small | Resize to 16 GB: `~/.android/avd/<name>.avd/config.ini → disk.dataPartition.size=16G`, then start with `-wipe-data` once |
| `Could not create parent directory for lock file /Users/.../.gradle/...` | `~/.gradle` owned by root from a prior sudo build | `sudo chown -R $(whoami):staff ~/.gradle` or use `GRADLE_USER_HOME=/tmp/gradle-home` |
| `Duplicate resources` for `*.so` and `*.so.gz` | Both committed and extracted copies present in jniLibs/ | `rm android/app/src/main/jniLibs/arm64-v8a/*.so.gz` after extraction |
| Notification trigger doesn't fire even with access granted | Toggling the Settings UI sometimes doesn't actually bind the service on emulator | `adb shell cmd notification allow_listener com.example.n8n_mobile/com.example.n8n_mobile.triggers.NotificationListener` |
| `POST <webhook url> -> 404` from `NotifListener:` log | Workflow isn't active, or webhook path is wrong | Activate workflow in editor; copy the production URL fresh |
| First boot takes forever, then n8n editor never appears | Extraction stalled or libnode.so failed to load | `adb logcat -s NodeServer:D NodeServer:E` and look for an exception |
| Editor in WebView shows blank | Port forward dropped after emulator restart | `adb forward tcp:8765 tcp:8765` |
| Workflow runs but executions are empty | `responseMode` on the webhook is sending too early | Set Webhook node's Response Mode to "Using 'Respond to Webhook' node" or "When Last Node Finishes" |

---

## Pointers to deeper docs

- **`MOBILE_SPIKE.md`** (repo root) — chronicle of how this was built, the tar `-h` bug story, the Darwin→Android cross-compile dead-ends, the 3-week productionisation plan
- **PR #30423** — Luca's original Android shell + geofence trigger PR description
