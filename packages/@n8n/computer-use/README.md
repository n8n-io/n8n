# Computer Use API

MCP server for LLM-driven computer control. Runs in an isolated Docker container with X11 virtual display and Chromium browser.

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
                CT[ComputerTool]
                BT[BashTool]
                ET[EditTool]
            end
        end

        subgraph Display["X11 Display Stack"]
            Xvfb[Xvfb Virtual Display]
            OB[Openbox WM]
            T2[Tint2 Panel]
        end

        subgraph Apps["Applications"]
            Chrome[Chromium]
            Term[XTerm]
            FM[PCManFM]
        end

        subgraph Remote["Remote Access"]
            VNC[x11vnc :5900]
        end
    end

    LLM -->|MCP over HTTP :8765| Hono
    Hono --> MCP
    MCP --> Tools

    CT -->|xdotool| Xvfb
    CT -->|scrot| Xvfb
    BT -->|spawn| Apps
    ET -->|fs| Docker

    Xvfb --> OB
    Xvfb --> T2
    Xvfb --> Apps
    Xvfb --> VNC

    VNC -.->|View Desktop| Client
```

### Request Flow

```mermaid
sequenceDiagram
    participant LLM as LLM Agent
    participant API as Hono Server
    participant MCP as MCP Server
    participant Tool as ComputerTool
    participant X11 as Xvfb Display

    LLM->>API: POST /mcp (tool call)
    API->>MCP: Create server + transport
    MCP->>Tool: execute(action)

    alt screenshot
        Tool->>X11: scrot (capture)
        X11-->>Tool: PNG image
        Tool-->>MCP: base64 image
    else click/type
        Tool->>X11: xdotool command
        X11-->>Tool: success
        Tool->>X11: scrot (capture result)
        X11-->>Tool: PNG image
        Tool-->>MCP: base64 image
    else bash
        Tool->>Tool: spawn command
        Tool-->>MCP: stdout/stderr
    end

    MCP-->>API: MCP response
    API-->>LLM: HTTP response
```

## Quick Start

```bash
cd packages/@n8n/computer-use
docker build -t computer-use-api:latest .
docker run -p 8765:8765 -p 5900:5900 -it computer-use-api:latest
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

- **computer** - Screen, keyboard, mouse control
- **bash** - Command execution with persistent sessions
- **str_replace_editor** - File viewing and editing

## View Display

Connect with VNC viewer to see what's happening:

```bash
vncviewer localhost:5900
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8765 | API server port |
| `WIDTH` | 1280 | Screen width |
| `HEIGHT` | 800 | Screen height |
