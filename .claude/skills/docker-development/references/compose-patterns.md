# Docker Compose Patterns Reference

## Production-Ready Patterns

### Web App + Database + Cache

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    restart: unless-stopped
    networks:
      - frontend
      - backend
    mem_limit: 512m
    cpus: 1.0

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    env_file:
      - .env.db
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - backend
    mem_limit: 256m

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 64mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    restart: unless-stopped
    networks:
      - backend
    mem_limit: 128m

volumes:
  pgdata:

networks:
  frontend:
  backend:
    internal: true
```

### Key Patterns
- **Healthchecks on every service** — enables depends_on with condition
- **Named volumes** — data persists across container recreation
- **Explicit networks** — backend is internal (no external access)
- **env_file** — secrets not in compose file
- **Resource limits** — prevent runaway containers

---

## Development Override Pattern

### docker-compose.yml (base — production-like)
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
```

### docker-compose.override.yml (dev — auto-loaded)
```yaml
services:
  app:
    build:
      target: development
    volumes:
      - .:/app          # Bind mount for hot reload
      - /app/node_modules  # Preserve container node_modules
    environment:
      - NODE_ENV=development
      - DEBUG=true
    ports:
      - "9229:9229"     # Debug port
    restart: "no"
```

### Usage
```bash
# Development (auto-loads override)
docker compose up

# Production (skip override)
docker compose -f docker-compose.yml up -d

# Explicit profiles
docker compose --profile dev up
docker compose --profile prod up -d
```

---

## Network Isolation Pattern

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    networks:
      - frontend

  app:
    build: .
    networks:
      - frontend
      - backend

  db:
    image: postgres:16-alpine
    networks:
      - backend

  redis:
    image: redis:7-alpine
    networks:
      - backend

networks:
  frontend:
    # External traffic reaches nginx and app
  backend:
    internal: true
    # DB and Redis only reachable by app
```

### Why This Matters
- Database and cache are **not accessible from outside**
- Only nginx and app handle external traffic
- Lateral movement limited if one container is compromised

---

## Worker + Queue Pattern

```yaml
services:
  api:
    build:
      context: .
      target: runtime
    command: uvicorn main:app --host 0.0.0.0 --port 8000
    ports:
      - "8000:8000"
    depends_on:
      rabbitmq:
        condition: service_healthy

  worker:
    build:
      context: .
      target: runtime
    command: celery -A tasks worker --loglevel=info
    depends_on:
      rabbitmq:
        condition: service_healthy

  scheduler:
    build:
      context: .
      target: runtime
    command: celery -A tasks beat --loglevel=info
    depends_on:
      rabbitmq:
        condition: service_healthy

  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    ports:
      - "15672:15672"  # Management UI (dev only)
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 10s
      timeout: 5s
      retries: 5
```

---

## Logging Configuration

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        tag: "{{.Name}}/{{.ID}}"
```

### Why
- **max-size** prevents disk exhaustion
- **max-file** rotates logs automatically
- Default Docker logging has NO size limit — production servers can run out of disk

---

## Environment Variable Patterns

### .env.example (committed to repo)
```env
# Database
DATABASE_URL=postgres://user:password@db:5432/appname
POSTGRES_USER=user
POSTGRES_PASSWORD=changeme
POSTGRES_DB=appname

# Redis
REDIS_URL=redis://redis:6379/0

# Application
SECRET_KEY=changeme-generate-a-real-secret
NODE_ENV=production
LOG_LEVEL=info

# External Services (BYOK)
# SMTP_HOST=
# SMTP_PORT=587
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
```

### Variable Substitution in Compose
```yaml
services:
  app:
    image: myapp:${APP_VERSION:-latest}
    environment:
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - PORT=${PORT:-3000}
```

---

## Troubleshooting Checklist

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Container exits immediately | CMD/ENTRYPOINT crashes, missing env vars | Check logs: `docker compose logs service` |
| Port already in use | Another service or host process on same port | Change host port: `"3001:3000"` |
| Volume permissions denied | Container user doesn't own mounted path | Match UID/GID or use named volumes |
| Build cache not working | COPY . . invalidates cache early | Reorder: copy deps first, then source |
| depends_on doesn't wait | No healthcheck condition | Add `condition: service_healthy` |
| Container OOM killed | No memory limit or limit too low | Set appropriate `mem_limit` |
| Network connectivity issues | Wrong network or service name | Services communicate by service name within shared network |
