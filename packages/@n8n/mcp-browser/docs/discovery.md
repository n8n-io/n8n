# Browser Discovery & Configuration

## Overview

`@n8n/mcp-browser` auto-detects installed browsers on initialization and
accepts programmatic configuration via `createBrowserTools()`.

**There is no config file.** All configuration is passed programmatically.
The wrapping application owns its own config file and passes relevant
settings through.

### Standalone server configuration

When running the standalone server, configuration can be set via environment
variables (`N8N_MCP_BROWSER_*` prefix) or CLI flags. CLI flags take precedence
over environment variables.

| Config key | Env var | CLI flag | Default |
|-----------|---------|----------|---------|
| `defaultBrowser` | `N8N_MCP_BROWSER_DEFAULT_BROWSER` | `--browser` | `chromium` |
| `defaultMode` | `N8N_MCP_BROWSER_DEFAULT_MODE` | `--mode` | `ephemeral` |
| `headless` | `N8N_MCP_BROWSER_HEADLESS` | `--headless` | `false` |
| `viewport` | `N8N_MCP_BROWSER_VIEWPORT` | `--viewport` | `1280x720` |
| `sessionTtlMs` | `N8N_MCP_BROWSER_SESSION_TTL_MS` | `--session-ttl-ms` | `1800000` |
| `maxConcurrentSessions` | `N8N_MCP_BROWSER_MAX_SESSIONS` | `--max-sessions` | `5` |
| `profilesDir` | `N8N_MCP_BROWSER_PROFILES_DIR` | `--profiles-dir` | `~/.n8n-browser/profiles` |
| (transport) | `N8N_MCP_BROWSER_TRANSPORT` | `--transport` | `stdio` |
| (port) | `N8N_MCP_BROWSER_PORT` | `--port` | `3100` |

## Programmatic configuration

```typescript
const { tools, sessionManager } = createBrowserTools({
  // All fields optional — defaults shown
  defaultBrowser: 'chromium',
  defaultMode: 'ephemeral',
  headless: false,
  viewport: { width: 1280, height: 720 },
  sessionTtlMs: 1800000,           // 30 minutes
  maxConcurrentSessions: 5,
  profilesDir: '~/.n8n-browser/profiles',

  // Override auto-detected browser executable paths
  browsers: {
    chrome: { executablePath: '/usr/bin/google-chrome' },
    firefox: {
      executablePath: '/usr/bin/firefox',
      profilePath: '~/.mozilla/firefox/abc123.work',
    },
  },
});
```

### Config schema

```typescript
const configSchema = z.object({
  defaultBrowser: z.enum([
    'chromium', 'chrome', 'brave', 'edge',
    'firefox', 'safari', 'webkit',
  ]).optional(),
  defaultMode: z.enum(['ephemeral', 'persistent', 'local']).optional(),
  headless: z.boolean().optional(),
  viewport: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),

  sessionTtlMs: z.number().positive().optional(),
  maxConcurrentSessions: z.number().positive().optional(),

  profilesDir: z.string().optional(),

  browsers: z.record(z.object({
    executablePath: z.string().optional(),
    profilePath: z.string().optional(),
  })).optional(),
});
```

### Field reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultBrowser` | string | `"chromium"` | Browser when `browser_open` doesn't specify |
| `defaultMode` | string | `"ephemeral"` | Mode when `browser_open` doesn't specify |
| `headless` | boolean | `false` | Default headless/headful. Overridable per session |
| `viewport` | object | `{ width: 1280, height: 720 }` | Default viewport size |
| `sessionTtlMs` | number | `1800000` (30min) | Default idle TTL for sessions |
| `maxConcurrentSessions` | number | `5` | Maximum simultaneous sessions |
| `profilesDir` | string | `~/.n8n-browser/profiles` | Where persistent profiles are stored |
| `browsers.<name>.executablePath` | string | auto-detected | Override browser executable |
| `browsers.<name>.profilePath` | string | auto-detected | Override user profile path for local mode |

Programmatic config values take precedence over auto-discovery.

## Auto-discovery

On initialization, `BrowserDiscovery` scans for installed browsers and
returns a map of browser name → executable path + profile path.

### Discovered data

```typescript
interface DiscoveredBrowsers {
  chrome?: BrowserInfo;
  brave?: BrowserInfo;
  edge?: BrowserInfo;
  chromium?: BrowserInfo;
  firefox?: BrowserInfo;
  safari?: BrowserInfo;      // macOS only
  geckodriver?: string;      // path to geckodriver binary
  safaridriver?: string;     // path to safaridriver binary (macOS only)
}

interface BrowserInfo {
  executablePath: string;
  profilePath?: string;      // default user profile path
}
```

### Detection per OS

See [cross-platform.md](cross-platform.md) for the full list of paths
checked per OS.

Summary:

| OS | Chrome | Brave | Edge | Firefox | Safari |
|----|--------|-------|------|---------|--------|
| macOS | `/Applications/` | `/Applications/` | `/Applications/` | `/Applications/` | `/Applications/` + safaridriver |
| Linux | `which google-chrome` | `which brave-browser` | `which microsoft-edge` | `which firefox` | N/A |
| Windows | `%ProgramFiles%` | `%ProgramFiles%` | `%ProgramFiles(x86)%` | `%ProgramFiles%` | N/A |

### User profile paths

For `local` mode, discovery also resolves default user profile paths:

| Browser | macOS | Linux | Windows |
|---------|-------|-------|---------|
| Chrome | `~/Library/Application Support/Google/Chrome/Default` | `~/.config/google-chrome/Default` | `%LocalAppData%\Google\Chrome\User Data\Default` |
| Brave | `~/Library/Application Support/BraveSoftware/Brave-Browser/Default` | `~/.config/BraveSoftware/Brave-Browser/Default` | `%LocalAppData%\BraveSoftware\Brave-Browser\User Data\Default` |
| Edge | `~/Library/Application Support/Microsoft Edge/Default` | `~/.config/microsoft-edge/Default` | `%LocalAppData%\Microsoft\Edge\User Data\Default` |
| Firefox | `~/Library/Application Support/Firefox/Profiles/*.default-release` | `~/.mozilla/firefox/*.default-release` | `%AppData%\Mozilla\Firefox\Profiles\*.default-release` |
| Safari | N/A (safaridriver uses active profile) | N/A | N/A |

Firefox profile resolution uses `profiles.ini` to find the default profile
when multiple profiles exist.

### Discovery caching

Discovery results are cached for the lifetime of the process. If a browser
is installed after initialization, it won't be detected until the process
restarts. This is intentional — browser installation is rare and caching
avoids repeated filesystem scans.

## Resolved configuration

Auto-discovery and programmatic config are merged into a `ResolvedConfig`:

```typescript
interface ResolvedConfig {
  defaultBrowser: BrowserName;
  defaultMode: SessionMode;
  headless: boolean;
  viewport: { width: number; height: number };
  sessionTtlMs: number;
  maxConcurrentSessions: number;
  profilesDir: string;

  browsers: Map<BrowserName, {
    executablePath: string;
    profilePath?: string;
    available: boolean;
  }>;

  geckodriverPath?: string;
  safaridriverPath?: string;
}
```

If a browser is configured programmatically but not installed, `available`
is `false` and attempting to use it returns a clear error.

## Persistent profiles directory

Managed profiles for `persistent` mode are stored in:

```
<profilesDir>/
├── default/          # default profile
├── work/             # named profile
├── testing/          # named profile
└── ...
```

The directory is created automatically on first use. Each subdirectory is a
complete Playwright persistent context. Profiles survive across sessions and
server restarts.

The default `profilesDir` is `~/.n8n-browser/profiles`, expandable via
`os.homedir()` on all platforms.
