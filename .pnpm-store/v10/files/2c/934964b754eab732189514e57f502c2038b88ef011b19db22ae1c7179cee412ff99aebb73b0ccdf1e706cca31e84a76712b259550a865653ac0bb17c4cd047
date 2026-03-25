# playwright-cli

Playwright CLI with SKILLS

### Playwright CLI vs Playwright MCP

This package provides CLI interface into Playwright. If you are using **coding agents**, that is the best fit.

- **CLI**: Modern **coding agents** increasingly favor CLI–based workflows exposed as SKILLs over MCP because CLI invocations are more token-efficient: they avoid loading large tool schemas and verbose accessibility trees into the model context, allowing agents to act through concise, purpose-built commands. This makes CLI + SKILLs better suited for high-throughput coding agents that must balance browser automation with large codebases, tests, and reasoning within limited context windows.

- **MCP**: MCP remains relevant for specialized agentic loops that benefit from persistent state, rich introspection, and iterative reasoning over page structure, such as exploratory automation, self-healing tests, or long-running autonomous workflows where maintaining continuous browser context outweighs token cost concerns. Learn more about [Playwright MCP](https://github.com/microsoft/playwright-mcp).

### Key Features

- **Token-efficient**. Does not force page data into LLM.

### Requirements
- Node.js 18 or newer
- Claude Code, GitHub Copilot, or any other coding agent.

## Getting Started

## Installation

```bash
npm install -g @playwright/cli@latest
playwright-cli --help
```

### Installing skills

Claude Code, GitHub Copilot and others will use the locally installed skills.

```bash
playwright-cli install --skills
```

### Skills-less operation

Point your agent at the CLI and let it cook. It'll read the skill off `playwright-cli --help` on its own:

```
Test the "add todo" flow on https://demo.playwright.dev/todomvc using playwright-cli.
Check playwright-cli --help for available commands.
```

## Demo

```
> Use playwright skills to test https://demo.playwright.dev/todomvc/.
  Take screenshots for all successful and failing scenarios. 
```

Your agent will be running commands, but it does not mean you can't play with it manually:

```
playwright-cli open https://demo.playwright.dev/todomvc/ --headed
playwright-cli type "Buy groceries"
playwright-cli press Enter
playwright-cli type "Water flowers"
playwright-cli press Enter
playwright-cli check e21
playwright-cli check e35
playwright-cli screenshot
```

## Headed operation

Playwright CLI is headless by default. If you'd like to see the browser, pass `--headed` to `open`:

```bash
playwright-cli open https://playwright.dev --headed
```

## Sessions

Playwright CLI will use a dedicated persistent profile by default. It means that
your cookies and other storage state will be preserved between the calls. You can use different
instances of the browser for different projects with sessions.

Following will result in two browsers with separate profiles being available. Pass `-s=` to
the invocation to talk to a specific browser.

```bash
playwright-cli open https://playwright.dev
playwright-cli -s=example open https://example.com
playwright-cli list
```

You can run your coding agent with the `PLAYWRIGHT_CLI_SESSION` environment variable:

```bash
PLAYWRIGHT_CLI_SESSION=todo-app claude .
```

Or instruct it to prepend `-s=` to the calls.

Manage your sessions as follows:

```bash
playwright-cli list                     # list all sessions
playwright-cli close-all                # close all browsers
playwright-cli kill-all                 # forcefully kill all browser processes
```

<!-- BEGIN GENERATED CLI HELP -->

## Commands

### Core

```bash
playwright-cli open [url]               # open browser, optionally navigate to url
playwright-cli goto <url>               # navigate to a url
playwright-cli close                    # close the page
playwright-cli type <text>              # type text into editable element
playwright-cli click <ref> [button]     # perform click on a web page
playwright-cli dblclick <ref> [button]  # perform double click on a web page
playwright-cli fill <ref> <text>        # fill text into editable element
playwright-cli drag <startRef> <endRef> # perform drag and drop between two elements
playwright-cli hover <ref>              # hover over element on page
playwright-cli select <ref> <val>       # select an option in a dropdown
playwright-cli upload <file>            # upload one or multiple files
playwright-cli check <ref>              # check a checkbox or radio button
playwright-cli uncheck <ref>            # uncheck a checkbox or radio button
playwright-cli snapshot                 # capture page snapshot to obtain element ref
playwright-cli snapshot --filename=f    # save snapshot to specific file
playwright-cli eval <func> [ref]        # evaluate javascript expression on page or element
playwright-cli dialog-accept [prompt]   # accept a dialog
playwright-cli dialog-dismiss           # dismiss a dialog
playwright-cli resize <w> <h>           # resize the browser window
```

### Navigation

```bash
playwright-cli go-back                  # go back to the previous page
playwright-cli go-forward               # go forward to the next page
playwright-cli reload                   # reload the current page
```

### Keyboard

```bash
playwright-cli press <key>              # press a key on the keyboard, `a`, `arrowleft`
playwright-cli keydown <key>            # press a key down on the keyboard
playwright-cli keyup <key>              # press a key up on the keyboard
```

### Mouse

```bash
playwright-cli mousemove <x> <y>        # move mouse to a given position
playwright-cli mousedown [button]       # press mouse down
playwright-cli mouseup [button]         # press mouse up
playwright-cli mousewheel <dx> <dy>     # scroll mouse wheel
```

### Save as

```bash
playwright-cli screenshot [ref]         # screenshot of the current page or element
playwright-cli screenshot --filename=f  # save screenshot with specific filename
playwright-cli pdf                      # save page as pdf
playwright-cli pdf --filename=page.pdf  # save pdf with specific filename
```

### Tabs

```bash
playwright-cli tab-list                 # list all tabs
playwright-cli tab-new [url]            # create a new tab
playwright-cli tab-close [index]        # close a browser tab
playwright-cli tab-select <index>       # select a browser tab
```

### Storage

```bash
playwright-cli state-save [filename]    # save storage state
playwright-cli state-load <filename>    # load storage state

# Cookies
playwright-cli cookie-list [--domain]   # list cookies
playwright-cli cookie-get <name>        # get a cookie
playwright-cli cookie-set <name> <val>  # set a cookie
playwright-cli cookie-delete <name>     # delete a cookie
playwright-cli cookie-clear             # clear all cookies

# LocalStorage
playwright-cli localstorage-list        # list localStorage entries
playwright-cli localstorage-get <key>   # get localStorage value
playwright-cli localstorage-set <k> <v> # set localStorage value
playwright-cli localstorage-delete <k>  # delete localStorage entry
playwright-cli localstorage-clear       # clear all localStorage

# SessionStorage
playwright-cli sessionstorage-list      # list sessionStorage entries
playwright-cli sessionstorage-get <k>   # get sessionStorage value
playwright-cli sessionstorage-set <k> <v> # set sessionStorage value
playwright-cli sessionstorage-delete <k>  # delete sessionStorage entry
playwright-cli sessionstorage-clear     # clear all sessionStorage
```

### Network

```bash
playwright-cli route <pattern> [opts]   # mock network requests
playwright-cli route-list               # list active routes
playwright-cli unroute [pattern]        # remove route(s)
```

### DevTools

```bash
playwright-cli console [min-level]      # list console messages
playwright-cli network                  # list all network requests since loading the page
playwright-cli run-code <code>          # run playwright code snippet
playwright-cli tracing-start            # start trace recording
playwright-cli tracing-stop             # stop trace recording
playwright-cli video-start              # start video recording
playwright-cli video-stop [filename]    # stop video recording
```

### Install

```bash
playwright-cli install --skills         # install skills
playwright-cli install-browser          # install browser
```

### Configuration

```bash
playwright-cli config [options]         # configure session settings
playwright-cli open --browser=chrome    # use specific browser
playwright-cli open --extension         # connect via browser extension
playwright-cli open --persistent        # use persistent profile
playwright-cli open --profile=<path>    # use custom profile directory
playwright-cli open --config=file.json  # use config file
playwright-cli close                    # close the browser
playwright-cli delete-data              # delete user data for default session
```

### Sessions

```bash
playwright-cli -s=name <cmd>            # run command in named session
playwright-cli -s=name close            # stop a named browser
playwright-cli -s=name delete-data      # delete user data for named browser
playwright-cli list                     # list all sessions
playwright-cli close-all                # close all browsers
playwright-cli kill-all                 # forcefully kill all browser processes
```
<!-- END GENERATED CLI HELP -->

## Configuration file

The Playwright CLI can be configured using a JSON configuration file. You can specify the configuration file using the `--config` command line option:

```bash
playwright-cli --config path/to/config.json open example.com
```

Playwright CLI will load config from `playwright-cli.json` by default so that you did not need to specify it every time.

<details>
<summary>Configuration file schema</summary>

```typescript
{
  /**
   * The browser to use.
   */
  browser?: {
    /**
     * The type of browser to use.
     */
    browserName?: 'chromium' | 'firefox' | 'webkit';

    /**
     * Keep the browser profile in memory, do not save it to disk.
     */
    isolated?: boolean;

    /**
     * Path to a user data directory for browser profile persistence.
     * Temporary directory is created by default.
     */
    userDataDir?: string;

    /**
     * Launch options passed to
     * @see https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context
     *
     * This is useful for settings options like `channel`, `headless`, `executablePath`, etc.
     */
    launchOptions?: playwright.LaunchOptions;

    /**
     * Context options for the browser context.
     *
     * This is useful for settings options like `viewport`.
     */
    contextOptions?: playwright.BrowserContextOptions;

    /**
     * Chrome DevTools Protocol endpoint to connect to an existing browser instance in case of Chromium family browsers.
     */
    cdpEndpoint?: string;

    /**
     * CDP headers to send with the connect request.
     */
    cdpHeaders?: Record<string, string>;

    /**
     * Timeout in milliseconds for connecting to CDP endpoint. Defaults to 30000 (30 seconds). Pass 0 to disable timeout.
     */
    cdpTimeout?: number;

    /**
     * Remote endpoint to connect to an existing Playwright server.
     */
    remoteEndpoint?: string;

    /**
     * Paths to TypeScript files to add as initialization scripts for Playwright page.
     */
    initPage?: string[];

    /**
     * Paths to JavaScript files to add as initialization scripts.
     * The scripts will be evaluated in every page before any of the page's scripts.
     */
    initScript?: string[];
  },

  /**
   * If specified, saves the Playwright video of the session into the output directory.
   */
  saveVideo?: {
    width: number;
    height: number;
  };

  /**
   * The directory to save output files.
   */
  outputDir?: string;

  /**
   * Whether to save snapshots, console messages, network logs and other session logs to a file or to the standard output. Defaults to "stdout".
   */
  outputMode?: 'file' | 'stdout';

  console?: {
    /**
     * The level of console messages to return. Each level includes the messages of more severe levels. Defaults to "info".
     */
    level?: 'error' | 'warning' | 'info' | 'debug';
  },

  network?: {
    /**
     * List of origins to allow the browser to request. Default is to allow all. Origins matching both `allowedOrigins` and `blockedOrigins` will be blocked.
     */
    allowedOrigins?: string[];

    /**
     * List of origins to block the browser to request. Origins matching both `allowedOrigins` and `blockedOrigins` will be blocked.
     */
    blockedOrigins?: string[];
  };

  /**
   * Specify the attribute to use for test ids, defaults to "data-testid".
   */
  testIdAttribute?: string;

  timeouts?: {
    /*
     * Configures default action timeout: https://playwright.dev/docs/api/class-page#page-set-default-timeout. Defaults to 5000ms.
     */
    action?: number;

    /*
     * Configures default navigation timeout: https://playwright.dev/docs/api/class-page#page-set-default-navigation-timeout. Defaults to 60000ms.
     */
    navigation?: number;
  };

  /**
   * Whether to allow file uploads from anywhere on the file system.
   * By default (false), file uploads are restricted to paths within the MCP roots only.
   */
  allowUnrestrictedFileAccess?: boolean;

  /**
   * Specify the language to use for code generation.
   */
  codegen?: 'typescript' | 'none';
}
```

</details>

<details>
<summary>Configuration via env</summary>

| Environment |
|-------------|
| `PLAYWRIGHT_MCP_ALLOWED_HOSTS` comma-separated list of hosts this server is allowed to serve from. Defaults to the host the server is bound to. Pass '*' to disable the host check. |
| `PLAYWRIGHT_MCP_ALLOWED_ORIGINS` semicolon-separated list of TRUSTED origins to allow the browser to request. Default is to allow all. Important: *does not* serve as a security boundary and *does not* affect redirects. |
| `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS` allow access to files outside of the workspace roots. Also allows unrestricted access to file:// URLs. By default access to file system is restricted to workspace root directories (or cwd if no roots are configured) only, and navigation to file:// URLs is blocked. |
| `PLAYWRIGHT_MCP_BLOCKED_ORIGINS` semicolon-separated list of origins to block the browser from requesting. Blocklist is evaluated before allowlist. If used without the allowlist, requests not matching the blocklist are still allowed. Important: *does not* serve as a security boundary and *does not* affect redirects. |
| `PLAYWRIGHT_MCP_BLOCK_SERVICE_WORKERS` block service workers |
| `PLAYWRIGHT_MCP_BROWSER` browser or chrome channel to use, possible values: chrome, firefox, webkit, msedge. |
| `PLAYWRIGHT_MCP_CAPS` comma-separated list of additional capabilities to enable, possible values: vision, pdf. |
| `PLAYWRIGHT_MCP_CDP_ENDPOINT` CDP endpoint to connect to. |
| `PLAYWRIGHT_MCP_CDP_HEADER` CDP headers to send with the connect request, multiple can be specified. |
| `PLAYWRIGHT_MCP_CODEGEN` specify the language to use for code generation, possible values: "typescript", "none". Default is "typescript". |
| `PLAYWRIGHT_MCP_CONFIG` path to the configuration file. |
| `PLAYWRIGHT_MCP_CONSOLE_LEVEL` level of console messages to return: "error", "warning", "info", "debug". Each level includes the messages of more severe levels. |
| `PLAYWRIGHT_MCP_DEVICE` device to emulate, for example: "iPhone 15" |
| `PLAYWRIGHT_MCP_EXECUTABLE_PATH` path to the browser executable. |
| `PLAYWRIGHT_MCP_EXTENSION` Connect to a running browser instance (Edge/Chrome only). Requires the "Playwright MCP Bridge" browser extension to be installed. |
| `PLAYWRIGHT_MCP_GRANT_PERMISSIONS` List of permissions to grant to the browser context, for example "geolocation", "clipboard-read", "clipboard-write". |
| `PLAYWRIGHT_MCP_HEADLESS` run browser in headless mode, headed by default |
| `PLAYWRIGHT_MCP_HOST` host to bind server to. Default is localhost. Use 0.0.0.0 to bind to all interfaces. |
| `PLAYWRIGHT_MCP_IGNORE_HTTPS_ERRORS` ignore https errors |
| `PLAYWRIGHT_MCP_INIT_PAGE` path to TypeScript file to evaluate on Playwright page object |
| `PLAYWRIGHT_MCP_INIT_SCRIPT` path to JavaScript file to add as an initialization script. The script will be evaluated in every page before any of the page's scripts. Can be specified multiple times. |
| `PLAYWRIGHT_MCP_ISOLATED` keep the browser profile in memory, do not save it to disk. |
| `PLAYWRIGHT_MCP_IMAGE_RESPONSES` whether to send image responses to the client. Can be "allow" or "omit", Defaults to "allow". |
| `PLAYWRIGHT_MCP_NO_SANDBOX` disable the sandbox for all process types that are normally sandboxed. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` path to the directory for output files. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` whether to save snapshots, console messages, network logs to a file or to the standard output. Can be "file" or "stdout". Default is "stdout". |
| `PLAYWRIGHT_MCP_PORT` port to listen on for SSE transport. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` comma-separated domains to bypass proxy, for example ".com,chromium.org,.domain.com" |
| `PLAYWRIGHT_MCP_PROXY_SERVER` specify proxy server, for example "http://myproxy:3128" or "socks5://myproxy:8080" |
| `PLAYWRIGHT_MCP_SAVE_SESSION` Whether to save the Playwright MCP session into the output directory. |
| `PLAYWRIGHT_MCP_SAVE_TRACE` Whether to save the Playwright Trace of the session into the output directory. |
| `PLAYWRIGHT_MCP_SAVE_VIDEO` Whether to save the video of the session into the output directory. For example "--save-video=800x600" |
| `PLAYWRIGHT_MCP_SECRETS` path to a file containing secrets in the dotenv format |
| `PLAYWRIGHT_MCP_SHARED_BROWSER_CONTEXT` reuse the same browser context between all connected HTTP clients. |
| `PLAYWRIGHT_MCP_SNAPSHOT_MODE` when taking snapshots for responses, specifies the mode to use. Can be "incremental", "full", or "none". Default is incremental. |
| `PLAYWRIGHT_MCP_STORAGE_STATE` path to the storage state file for isolated sessions. |
| `PLAYWRIGHT_MCP_TEST_ID_ATTRIBUTE` specify the attribute to use for test ids, defaults to "data-testid" |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` specify action timeout in milliseconds, defaults to 5000ms |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` specify navigation timeout in milliseconds, defaults to 60000ms |
| `PLAYWRIGHT_MCP_USER_AGENT` specify user agent string |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` path to the user data directory. If not specified, a temporary directory will be created. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` specify browser viewport size in pixels, for example "1280x720" |
</details>

## Specific tasks

The installed skill includes detailed reference guides for common tasks:

* **Request mocking** — intercept and mock network requests
* **Running Playwright code** — execute arbitrary Playwright scripts
* **Browser session management** — manage multiple browser sessions
* **Storage state (cookies, localStorage)** — persist and restore browser state
* **Test generation** — generate Playwright tests from interactions
* **Tracing** — record and inspect execution traces
* **Video recording** — capture browser session videos
