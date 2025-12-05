# Browser Use API

MCP server for LLM-driven browser automation. Runs in an isolated Docker container with headless Chromium and Puppeteer.

## Architecture

```mermaid
graph TB
    subgraph Client["Client (n8n / LLM)"]
        LLM[LLM Agent]
    end

    subgraph Docker["Docker Container"]
        subgraph API["Node.js API Server"]
            Hono[Hono HTTP Server]
            MCP[MCP Server]
            subgraph Tools["Tools"]
                BT[BrowserTool]
            end
        end

        subgraph Browser["Headless Browser"]
            Chromium[Chromium]
            Puppeteer[Puppeteer Core]
        end
    end

    LLM -->|MCP over HTTP :8766| Hono
    Hono --> MCP
    MCP --> Tools

    BT -->|control| Puppeteer
    Puppeteer --> Chromium
```

### Request Flow

```mermaid
sequenceDiagram
    participant LLM as LLM Agent
    participant API as Hono Server
    participant MCP as MCP Server
    participant Tool as BrowserTool
    participant Browser as Chromium

    LLM->>API: POST /mcp (tool call)
    API->>MCP: Create server + transport
    MCP->>Tool: execute(action)

    alt screenshot
        Tool->>Browser: page.screenshot()
        Browser-->>Tool: PNG image
        Tool-->>MCP: base64 image
    else goto
        Tool->>Browser: page.goto(url)
        Browser-->>Tool: response
        Tool-->>MCP: navigation result
    else click/type
        Tool->>Browser: page.click/type()
        Browser-->>Tool: success
        Tool-->>MCP: action result
    else evaluate
        Tool->>Browser: page.evaluate(script)
        Browser-->>Tool: result
        Tool-->>MCP: JSON result
    end

    MCP-->>API: MCP response
    API-->>LLM: HTTP response
```

## Quick Start

```bash
cd packages/@n8n/browser-use
docker build -t browser-use-api:latest .
docker run -p 8766:8766 -it browser-use-api:latest
```

Or use Docker Compose:

```bash
docker-compose up -d
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/mcp` | ALL | MCP Streamable HTTP endpoint |

## Tools

### browser

Browser automation tool with Puppeteer. Supports the following actions:

#### Navigation
- **goto** - Navigate to a URL
- **goBack** - Go back in history
- **goForward** - Go forward in history
- **reload** - Reload current page

#### Interaction
- **click** - Click an element by selector
- **type** - Type text into an element
- **hover** - Hover over an element
- **select** - Select option(s) from a dropdown
- **scroll** - Scroll the page (up/down/left/right)
- **press** - Press a keyboard key

#### Extraction
- **screenshot** - Capture screenshot (viewport, full page, or element)
- **content** - Get page HTML content
- **text** - Get text content of page or element
- **attribute** - Get attribute value of an element
- **evaluate** - Execute JavaScript in page context

#### Wait
- **waitForSelector** - Wait for element to appear
- **waitForNavigation** - Wait for navigation to complete
- **waitForTimeout** - Wait for specified milliseconds

#### Script
- **script** - Execute custom Puppeteer script with access to page and browser objects

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8766 | API server port |
| `HOST` | 0.0.0.0 | Server host binding |
| `PUPPETEER_EXECUTABLE_PATH` | /usr/bin/chromium | Path to Chromium executable |
