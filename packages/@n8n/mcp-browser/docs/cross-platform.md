# Cross-Platform Guide

This package supports macOS, Linux, and Windows. This document covers
OS-specific implementation details for browser discovery, profile paths,
process management, and filesystem handling.

## Browser discovery paths

### macOS

| Browser | Executable path |
|---------|----------------|
| Chrome | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` |
| Brave | `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser` |
| Edge | `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge` |
| Chromium | `/Applications/Chromium.app/Contents/MacOS/Chromium` |
| Firefox | `/Applications/Firefox.app/Contents/MacOS/firefox` |
| Safari | `/Applications/Safari.app/Contents/MacOS/Safari` |
| safaridriver | `/usr/bin/safaridriver` |
| geckodriver | `which geckodriver` (typically via Homebrew) |

Also check `~/Applications/` for user-scoped installs.

For non-standard installs, `mdfind "kMDItemCFBundleIdentifier == 'com.google.Chrome'"` can locate Chrome regardless of where it's installed.

### Linux

| Browser | Commands checked via `which` |
|---------|-----------------------------|
| Chrome | `google-chrome`, `google-chrome-stable` |
| Brave | `brave-browser`, `brave-browser-stable`, `brave` |
| Edge | `microsoft-edge`, `microsoft-edge-stable` |
| Chromium | `chromium`, `chromium-browser` |
| Firefox | `firefox` |
| geckodriver | `geckodriver` |

**Snap/Flatpak paths:**

| Package manager | Example path |
|----------------|-------------|
| Snap | `/snap/bin/chromium`, `/snap/bin/firefox` |
| Flatpak | `flatpak run org.mozilla.firefox` (not a direct path) |

For Flatpak browsers, detection uses `flatpak list --app` and the browser
is launched via `flatpak run <app-id>`. This requires special handling in
the adapter since the executable path is not a direct binary.

### Windows

| Browser | Paths checked |
|---------|--------------|
| Chrome | `%ProgramFiles%\Google\Chrome\Application\chrome.exe` |
| | `%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe` |
| | `%LocalAppData%\Google\Chrome\Application\chrome.exe` |
| Brave | `%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe` |
| | `%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe` |
| Edge | `%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe` |
| | `%ProgramFiles%\Microsoft\Edge\Application\msedge.exe` |
| Chromium | `%LocalAppData%\Chromium\Application\chrome.exe` |
| Firefox | `%ProgramFiles%\Mozilla Firefox\firefox.exe` |
| | `%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe` |
| geckodriver | `where geckodriver` |
| safaridriver | N/A (macOS only) |

Environment variables are resolved via `process.env.ProgramFiles`,
`process.env['ProgramFiles(x86)']`, `process.env.LOCALAPPDATA`.

## User profile paths

### Chrome / Chromium-based

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Google/Chrome/Default` |
| Linux | `~/.config/google-chrome/Default` |
| Windows | `%LocalAppData%\Google\Chrome\User Data\Default` |

Brave, Edge, Chromium follow the same pattern with their respective
directory names:

| Browser | macOS dir | Linux dir | Windows dir |
|---------|-----------|-----------|-------------|
| Brave | `BraveSoftware/Brave-Browser` | `BraveSoftware/Brave-Browser` | `BraveSoftware\Brave-Browser\User Data` |
| Edge | `Microsoft Edge` | `microsoft-edge` | `Microsoft\Edge\User Data` |
| Chromium | `Chromium` | `chromium` | `Chromium\User Data` |

### Firefox

| OS | Profiles directory |
|----|--------------------|
| macOS | `~/Library/Application Support/Firefox/Profiles/` |
| Linux | `~/.mozilla/firefox/` |
| Windows | `%AppData%\Mozilla\Firefox\Profiles\` |

Firefox uses a `profiles.ini` file in the parent directory to map profile
names to directories. To find the default profile:

```typescript
// Parse profiles.ini
const profilesIni = path.join(firefoxDir, 'profiles.ini');
// Look for [Profile*] sections where Default=1
// Or [Install*] sections with Default= pointing to the profile dir
```

Multiple profiles may exist. The discovery module finds the one marked as
default. Users can override via programmatic config to use a specific profile.

### Safari

Safari profile handling is automatic — safaridriver uses the active Safari
profile. No profile path is needed.

## Path handling

### Rules

1. **Always use `path.join()`** for constructing paths — never concatenate
   with `/` or `\`
2. **Always use `os.homedir()`** for home directory — never hardcode `~`
3. **Expand `~` manually** in user-provided paths:
   ```typescript
   function expandHome(p: string): string {
     if (p.startsWith('~')) {
       return path.join(os.homedir(), p.slice(1));
     }
     return p;
   }
   ```
4. **Handle spaces in paths** — always pass paths as array elements in
   `child_process.spawn()`, never as part of a concatenated string
5. **Use `path.resolve()`** to normalize paths before comparison
6. **Temp directories**: Use `os.tmpdir()` for ephemeral data

### Persistent profiles directory

Default: `path.join(os.homedir(), '.n8n-browser', 'profiles')`

This works on all platforms:
- macOS: `/Users/<user>/.n8n-browser/profiles/`
- Linux: `/home/<user>/.n8n-browser/profiles/`
- Windows: `C:\Users\<user>\.n8n-browser\profiles\`

## Process management

### Spawning browser processes

Playwright handles browser process spawning internally. For geckodriver and
safaridriver:

```typescript
import { spawn } from 'child_process';

// Works cross-platform
const driver = spawn(driverPath, args, {
  stdio: 'pipe',
  // Don't use shell: true — it causes issues with path escaping on Windows
});
```

### Signal handling

```typescript
// Works on macOS and Linux
process.on('SIGTERM', () => shutdown());
process.on('SIGINT', () => shutdown());

// Windows doesn't reliably send SIGTERM/SIGINT
// Use 'exit' as a fallback (but note: async work won't complete)
process.on('exit', () => {
  // Synchronous cleanup only
  killAllBrowserProcesses();
});

// For Windows graceful shutdown in a service context:
process.on('message', (msg) => {
  if (msg === 'shutdown') shutdown();
});
```

### Killing browser processes

```typescript
function killProcess(pid: number): void {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // Process may already be dead — that's fine
  }
}
```

`process.kill()` works on all platforms in Node.js. On Windows, it
terminates the process (there's no signal delivery — it's equivalent to
`taskkill`).

For force-kill as a fallback:

```typescript
function forceKillProcess(pid: number): void {
  try {
    process.kill(pid, 'SIGKILL');  // Works on macOS/Linux
  } catch {
    // On Windows, the initial kill() is already forceful
  }
}
```

## Driver binaries

### geckodriver (Firefox local)

| OS | Installation |
|----|-------------|
| macOS | `brew install geckodriver` |
| Linux (Debian/Ubuntu) | `sudo apt install firefox-geckodriver` |
| Linux (Fedora) | `sudo dnf install geckodriver` |
| Windows | `choco install geckodriver` or manual download from GitHub releases |

The binary must be on PATH or its path provided via programmatic config.

### safaridriver (Safari local)

macOS only. Comes pre-installed with Xcode Command Line Tools. Requires
one-time setup:

```bash
safaridriver --enable
```

And enabling "Allow Remote Automation" in Safari → Develop menu.

### Playwright browsers

Playwright manages its own browser downloads. Installed via:

```bash
npx playwright install chromium firefox webkit
```

Stored in:
- macOS/Linux: `~/.cache/ms-playwright/`
- Windows: `%LocalAppData%\ms-playwright\`

Can be overridden via `PLAYWRIGHT_BROWSERS_PATH` environment variable.

## Display / headful mode

| OS | Headful support |
|----|----------------|
| macOS | Native — works out of the box |
| Linux (desktop) | Works with X11 or Wayland |
| Linux (server/Docker) | Requires Xvfb or similar virtual display |
| Windows | Native — works out of the box |
| WSL2 | Requires WSLg (Windows 11) or an X server |

Default is `headless: false`. The standalone server starts headful.
Headless mode is opt-in via `--headless` or per session via `browser_open`.

For Linux CI/Docker environments:

```bash
# Install Xvfb
apt-get install -y xvfb

# Run with virtual display
xvfb-run node server.js
```

## Testing strategy

### CI matrix

Tests should run on all three platforms:

```yaml
strategy:
  matrix:
    os: [macos-latest, ubuntu-latest, windows-latest]
```

### What to test per platform

| Test category | Scope |
|--------------|-------|
| Browser discovery | Mock filesystem paths per OS, verify correct detection |
| Profile path resolution | Verify correct paths on each OS |
| Path handling | Test `~` expansion, spaces in paths, separators |
| Process lifecycle | Test spawn, signal handling, cleanup |
| Playwright adapters | Use bundled browsers — cross-platform by default |
| WebDriver adapters | Require geckodriver/safaridriver installed in CI |

### Mocking OS-specific paths

```typescript
// Test browser discovery with mocked filesystem
jest.mock('fs', () => ({
  existsSync: (p: string) => mockedPaths.includes(p),
}));
jest.mock('child_process', () => ({
  execSync: (cmd: string) => {
    if (cmd === 'which google-chrome') return '/usr/bin/google-chrome\n';
    throw new Error('not found');
  },
}));
```

### Platform-conditional tests

```typescript
const isWindows = process.platform === 'win32';
const isMacOS = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

describe.skipIf(!isMacOS)('Safari support', () => {
  // Safari tests only run on macOS
});
```
