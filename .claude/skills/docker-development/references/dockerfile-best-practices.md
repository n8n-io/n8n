# Dockerfile Best Practices Reference

## Layer Optimization

### The Golden Rule
Every `RUN`, `COPY`, and `ADD` instruction creates a new layer. Fewer layers = smaller image.

### Combine Related Commands
```dockerfile
# Bad — 3 layers
RUN apt-get update
RUN apt-get install -y curl git
RUN rm -rf /var/lib/apt/lists/*

# Good — 1 layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git && \
    rm -rf /var/lib/apt/lists/*
```

### Order Layers by Change Frequency
```dockerfile
# Least-changing layers first
COPY package.json package-lock.json ./    # Changes rarely
RUN npm ci                                 # Changes when deps change
COPY . .                                   # Changes every build
RUN npm run build                          # Changes every build
```

### Use .dockerignore
```
.git
node_modules
__pycache__
*.pyc
.env
.env.*
dist
build
*.log
.DS_Store
.vscode
.idea
coverage
.pytest_cache
```

---

## Base Image Selection

### Size Comparison (approximate)

| Base | Size | Use Case |
|------|------|----------|
| `scratch` | 0MB | Static binaries (Go, Rust) |
| `distroless/static` | 2MB | Static binaries with CA certs |
| `alpine` | 7MB | Minimal Linux, shell access |
| `distroless/base` | 20MB | Dynamic binaries (C/C++) |
| `debian-slim` | 80MB | When you need glibc + apt |
| `ubuntu` | 78MB | Full Ubuntu ecosystem |
| `python:3.12-slim` | 130MB | Python apps (production) |
| `node:20-alpine` | 130MB | Node.js apps |
| `golang:1.22` | 800MB | Go build stage only |
| `python:3.12` | 900MB | Never use in production |
| `node:20` | 1000MB | Never use in production |

### When to Use Alpine
- Small image size matters
- No dependency on glibc (musl works)
- Willing to handle occasional musl-related issues
- Not running Python with C extensions that need glibc

### When to Use Slim
- Need glibc compatibility
- Python with compiled C extensions (numpy, pandas)
- Fewer musl compatibility issues
- Still much smaller than full images

### When to Use Distroless
- Maximum security (no shell, no package manager)
- Compiled/static binaries
- Don't need debugging access inside container
- Production-only (not development)

---

## Multi-Stage Builds

### Why Multi-Stage
- Build tools and source code stay out of production image
- Final image contains only runtime artifacts
- Dramatically reduces image size and attack surface

### Naming Stages
```dockerfile
FROM golang:1.22 AS builder     # Named stage
FROM alpine:3.19 AS runtime     # Named stage
COPY --from=builder /app /app   # Reference by name
```

### Selective Copy
```dockerfile
# Only copy the built artifact — nothing else
COPY --from=builder /app/server /server
COPY --from=builder /app/config.yaml /config.yaml
# Don't COPY --from=builder /app/ /app/ (copies source code too)
```

---

## Security Hardening

### Run as Non-Root
```dockerfile
# Create user
RUN groupadd -r appgroup && useradd -r -g appgroup -s /sbin/nologin appuser

# Set ownership
COPY --chown=appuser:appgroup . .

# Switch user (after all root-requiring operations)
USER appuser
```

### Secret Management
```dockerfile
# Bad — secret baked into layer
ENV API_KEY=sk-12345

# Good — BuildKit secret mount (never in layer)
RUN --mount=type=secret,id=api_key \
    export API_KEY=$(cat /run/secrets/api_key) && \
    ./configure --api-key=$API_KEY
```

Build with:
```bash
docker build --secret id=api_key,src=./api_key.txt .
```

### Read-Only Filesystem
```yaml
# docker-compose.yml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
```

### Drop Capabilities
```yaml
services:
  app:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Only if binding to ports < 1024
```

---

## Build Performance

### BuildKit Cache Mounts
```dockerfile
# Cache pip downloads across builds
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Cache apt downloads
RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && apt-get install -y curl
```

### Parallel Builds
```dockerfile
# These stages build in parallel when using BuildKit
FROM node:20-alpine AS frontend
COPY frontend/ .
RUN npm ci && npm run build

FROM golang:1.22 AS backend
COPY backend/ .
RUN go build -o server

FROM alpine:3.19
COPY --from=frontend /dist /static
COPY --from=backend /server /server
```

### Enable BuildKit
```bash
export DOCKER_BUILDKIT=1
docker build .

# Or in daemon.json
{ "features": { "buildkit": true } }
```

---

## Health Checks

### HTTP Service
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
```

### Without curl (using wget)
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1
```

### TCP Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD nc -z localhost 8000 || exit 1
```

### PostgreSQL
```dockerfile
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U postgres || exit 1
```

### Redis
```dockerfile
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD redis-cli ping | grep PONG || exit 1
```
