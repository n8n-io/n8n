# Docker Patterns

## Multi-stage Dockerfile (Node.js)

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

## Multi-stage Dockerfile (Python)

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install --no-cache-dir poetry
COPY pyproject.toml poetry.lock ./
RUN poetry export -f requirements.txt --output requirements.txt
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app
RUN useradd -m -u 1001 appuser
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/*
COPY --chown=appuser:appuser . .
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Docker Compose (Development)

```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      target: builder  # Use dev stage
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:<db-password>@db:5432/app
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: <db-password>
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d app"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

## Security Best Practices

| Practice | Implementation |
|----------|----------------|
| Non-root user | `USER nodejs` or `USER 1001` |
| Minimal base image | Use `-alpine` or `-slim` variants |
| No secrets in image | Use runtime env vars or secrets |
| Pin versions | `FROM node:20.10.0-alpine` not `latest` |
| Scan images | `docker scout`, `trivy`, `snyk` |
| Health checks | `HEALTHCHECK` instruction |
| .dockerignore | Exclude `node_modules`, `.git`, `.env` |

## .dockerignore Template

```
node_modules
.git
.env*
*.md
Dockerfile*
docker-compose*
.dockerignore
coverage
.nyc_output
```
