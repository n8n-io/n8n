# App Router Architecture

## File-Based Routing

```
app/
├── layout.tsx              # Root layout (required)
├── page.tsx               # Home page (/)
├── loading.tsx            # Loading UI
├── error.tsx              # Error boundary
├── not-found.tsx          # 404 page
├── template.tsx           # Re-mounted layout
│
├── (marketing)/           # Route group (no URL segment)
│   ├── layout.tsx
│   ├── about/
│   │   └── page.tsx      # /about
│   └── contact/
│       └── page.tsx      # /contact
│
├── dashboard/
│   ├── layout.tsx        # Shared dashboard layout
│   ├── page.tsx          # /dashboard
│   ├── settings/
│   │   └── page.tsx      # /dashboard/settings
│   └── @analytics/       # Parallel route (slot)
│       └── page.tsx
│
├── blog/
│   ├── [slug]/
│   │   └── page.tsx      # /blog/my-post (dynamic)
│   └── [...slug]/
│       └── page.tsx      # /blog/a/b/c (catch-all)
│
└── api/
    └── users/
        └── route.ts      # API route handler
```

## Root Layout (Required)

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'My App',
    template: '%s | My App'
  },
  description: 'Next.js 14 application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
```

## Nested Layouts

```tsx
// app/dashboard/layout.tsx
import { Sidebar } from '@/components/sidebar'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

## Templates (Re-mount on Navigation)

```tsx
// app/template.tsx
'use client'

import { useEffect } from 'react'

export default function Template({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Runs on every navigation
    console.log('Template mounted')
  }, [])

  return <div>{children}</div>
}
```

## Loading States

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2" />
    </div>
  )
}
```

## Error Boundaries

```tsx
// app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

## Route Groups

```tsx
// (marketing) and (shop) share the same URL level
app/
├── (marketing)/
│   ├── layout.tsx      # Marketing layout
│   └── about/
│       └── page.tsx    # /about
└── (shop)/
    ├── layout.tsx      # Shop layout
    └── products/
        └── page.tsx    # /products
```

## Parallel Routes

```tsx
// app/dashboard/layout.tsx
export default function Layout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  team: React.ReactNode
}) {
  return (
    <>
      {children}
      {analytics}
      {team}
    </>
  )
}

// app/dashboard/@analytics/page.tsx
export default function Analytics() {
  return <div>Analytics Dashboard</div>
}
```

## Intercepting Routes

```tsx
// Show modal when navigating from same app
// but show full page on direct navigation

// app/photos/[id]/page.tsx (full page)
export default function PhotoPage({ params }: { params: { id: string } }) {
  return <div>Photo {params.id} - Full Page</div>
}

// app/@modal/(.)photos/[id]/page.tsx (modal)
export default function PhotoModal({ params }: { params: { id: string } }) {
  return <div>Photo {params.id} - Modal</div>
}
```

## Dynamic Routes

```tsx
// app/blog/[slug]/page.tsx
export default function BlogPost({ params }: { params: { slug: string } }) {
  return <h1>Post: {params.slug}</h1>
}

// Generate static params at build time
export async function generateStaticParams() {
  const posts = await fetch('https://api.example.com/posts').then(res => res.json())

  return posts.map((post: { slug: string }) => ({
    slug: post.slug,
  }))
}

// Opt out of static generation
export const dynamic = 'force-dynamic'

// Revalidate every 60 seconds
export const revalidate = 60
```

## Catch-All Routes

```tsx
// app/docs/[...slug]/page.tsx
// Matches: /docs/a, /docs/a/b, /docs/a/b/c
export default function Docs({ params }: { params: { slug: string[] } }) {
  return <div>Docs: {params.slug.join('/')}</div>
}

// Optional catch-all: [[...slug]]
// Also matches: /docs
```

## Route Handlers (API Routes)

```tsx
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const users = await db.user.findMany()
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const user = await db.user.create({ data: body })
  return NextResponse.json(user, { status: 201 })
}

// Dynamic routes: app/api/users/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await db.user.findUnique({ where: { id: params.id } })
  return NextResponse.json(user)
}
```

## Metadata API

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const post = await fetchPost(params.slug)

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.coverImage }],
    },
  }
}
```

## Quick Reference

| File | Purpose | Use Case |
|------|---------|----------|
| `layout.tsx` | Persistent UI across routes | Shared navigation, auth wrapper |
| `page.tsx` | Route UI | Actual page content |
| `loading.tsx` | Loading fallback | Automatic Suspense boundary |
| `error.tsx` | Error boundary | Handle errors gracefully |
| `template.tsx` | Re-mounted layout | Analytics, animations |
| `not-found.tsx` | 404 page | Custom not found UI |
| `route.ts` | API handler | Backend API endpoints |
