# Deployment & Production

## Vercel Deployment (Recommended)

### Quick Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### vercel.json Configuration

```json
{
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXT_PUBLIC_API_URL": "https://api.example.com"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE" }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/old-blog/:slug",
      "destination": "/blog/:slug",
      "permanent": true
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.example.com/:path*"
    }
  ]
}
```

### Environment Variables

```bash
# .env.local (not committed)
DATABASE_URL="postgresql://<db-user>:<db-password>@localhost:5432/db"
NEXTAUTH_SECRET="<nextauth-secret>"

# .env.production (committed, public vars only)
NEXT_PUBLIC_API_URL="https://api.example.com"
```

```tsx
// Access in Server Components
const dbUrl = process.env.DATABASE_URL

// Access in Client Components (must be prefixed with NEXT_PUBLIC_)
const apiUrl = process.env.NEXT_PUBLIC_API_URL
```

## Self-Hosting

### Standalone Output

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

module.exports = nextConfig
```

```bash
# Build
npm run build

# The standalone folder contains everything needed
# Copy these to your server:
# - .next/standalone/
# - .next/static/
# - public/

# Run on server
node .next/standalone/server.js
```

### Node.js Server

```bash
# Build
npm run build

# Start production server
npm start

# With PM2 for process management
pm2 start npm --name "nextjs" -- start
pm2 startup
pm2 save
```

## Docker Deployment

### Dockerfile (Multi-stage)

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  nextjs:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:<db-password>@db:5432/myapp
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=<nextauth-secret>
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=<db-password>
      - POSTGRES_DB=myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f nextjs

# Rebuild
docker-compose up -d --build
```

## Production Optimization

### next.config.js

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone for self-hosting
  output: 'standalone',

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        pathname: '/images/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression
  compress: true,

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ]
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['@mui/material', 'lodash'],
  },

  // Bundle analyzer
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
        })
      )
    }
    return config
  },
}

module.exports = nextConfig
```

### Bundle Analysis

```bash
# Install analyzer
npm install -D @next/bundle-analyzer

# Analyze
ANALYZE=true npm run build

# Or use built-in
npm run build -- --experimental-build-mode=compile
```

### Performance Monitoring

```tsx
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
```

## CDN & Edge

### Static Asset CDN

```js
// next.config.js
const nextConfig = {
  assetPrefix: process.env.NODE_ENV === 'production'
    ? 'https://cdn.example.com'
    : '',
}
```

### Edge Runtime

```tsx
// app/api/edge/route.ts
export const runtime = 'edge'

export async function GET(request: Request) {
  return new Response('Hello from Edge!', {
    status: 200,
    headers: {
      'content-type': 'text/plain',
    },
  })
}

// app/page.tsx
export const runtime = 'edge'

export default async function Page() {
  return <div>Edge-rendered page</div>
}
```

## Caching Strategy

### ISR (Incremental Static Regeneration)

```tsx
// app/blog/[slug]/page.tsx
export const revalidate = 3600 // Revalidate every hour

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await fetchPost(params.slug)
  return <article>{post.content}</article>
}
```

### On-Demand Revalidation

```tsx
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')

  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ message: 'Invalid secret' }, { status: 401 })
  }

  const path = request.nextUrl.searchParams.get('path') || '/'

  revalidatePath(path)

  return Response.json({ revalidated: true, now: Date.now() })
}
```

## Database Connection Pooling

```ts
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

## Health Check Endpoint

```tsx
// app/api/health/route.ts
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        message: 'Database connection failed',
      },
      { status: 503 }
    )
  }
}
```

## CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Monitoring & Logging

```tsx
// app/error.tsx
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return <div>Something went wrong!</div>
}
```

## Quick Reference

| Platform | Best For | Effort |
|----------|----------|--------|
| **Vercel** | Zero-config, optimal performance | Low |
| **Netlify** | Alternative to Vercel | Low |
| **Railway** | Simple hosting with databases | Medium |
| **AWS/GCP** | Enterprise, custom needs | High |
| **Docker** | Self-hosting, full control | High |

## Production Checklist

- [ ] Enable TypeScript strict mode
- [ ] Configure CSP headers
- [ ] Setup error monitoring (Sentry)
- [ ] Configure analytics (Vercel/GA)
- [ ] Optimize images (next/image)
- [ ] Enable compression
- [ ] Setup CDN for static assets
- [ ] Configure database connection pooling
- [ ] Add health check endpoint
- [ ] Setup CI/CD pipeline
- [ ] Configure environment variables
- [ ] Enable ISR/SSG where possible
- [ ] Test Core Web Vitals
- [ ] Setup logging (Datadog/LogRocket)
- [ ] Configure backup strategy
