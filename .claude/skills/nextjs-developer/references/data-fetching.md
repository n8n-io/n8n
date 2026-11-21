# Data Fetching & Caching

## Extended fetch API

Next.js extends the native fetch with caching and revalidation options:

```tsx
// app/page.tsx
async function getData() {
  const res = await fetch('https://api.example.com/posts', {
    cache: 'force-cache', // Default: cache forever (SSG)
  })

  if (!res.ok) {
    throw new Error('Failed to fetch data')
  }

  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <div>{/* render data */}</div>
}
```

## Cache Options

```tsx
// 1. Force cache (Static Site Generation)
fetch('https://api.example.com/data', {
  cache: 'force-cache' // Default behavior
})

// 2. No cache (Server-Side Rendering)
fetch('https://api.example.com/data', {
  cache: 'no-store' // Always fetch fresh data
})

// 3. Revalidate (Incremental Static Regeneration)
fetch('https://api.example.com/data', {
  next: { revalidate: 3600 } // Revalidate every hour
})

// 4. Revalidate with tags
fetch('https://api.example.com/data', {
  next: { tags: ['posts'] }
})
```

## Revalidation Methods

### Time-based Revalidation (ISR)

```tsx
// Revalidate every 60 seconds
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 }
  })
  return res.json()
}

// Route segment config
export const revalidate = 60 // seconds

export default async function Page() {
  const posts = await getPosts()
  return <div>{/* render */}</div>
}
```

### On-Demand Revalidation

```tsx
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path')

  if (path) {
    revalidatePath(path)
    return Response.json({ revalidated: true, now: Date.now() })
  }

  return Response.json({ revalidated: false })
}

// Usage in Server Action
'use server'

import { revalidatePath } from 'next/cache'

export async function createPost(data: FormData) {
  await db.post.create({ data })

  // Revalidate specific path
  revalidatePath('/posts')

  // Revalidate entire layout
  revalidatePath('/posts', 'layout')
}
```

### Tag-based Revalidation

```tsx
// Fetch with tags
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] }
  })
  return res.json()
}

async function getAuthors() {
  const res = await fetch('https://api.example.com/authors', {
    next: { tags: ['authors'] }
  })
  return res.json()
}

// Revalidate by tag
import { revalidateTag } from 'next/cache'

export async function createPost() {
  // Revalidate all fetches tagged with 'posts'
  revalidateTag('posts')
}
```

## Route Segment Config

```tsx
// app/posts/page.tsx

// Force dynamic rendering
export const dynamic = 'force-dynamic' // 'auto' | 'force-dynamic' | 'error' | 'force-static'

// Revalidation interval
export const revalidate = 3600 // false | 0 | number (seconds)

// Fetch cache
export const fetchCache = 'auto' // 'auto' | 'default-cache' | 'only-cache' | 'force-cache' | 'force-no-store' | 'default-no-store' | 'only-no-store'

// Runtime
export const runtime = 'nodejs' // 'nodejs' | 'edge'

// Preferred region
export const preferredRegion = 'auto' // 'auto' | 'home' | 'edge' | string | string[]

export default async function Page() {
  return <div>Posts</div>
}
```

## Parallel Data Fetching

```tsx
async function getUser() {
  return fetch('https://api.example.com/user')
}

async function getPosts() {
  return fetch('https://api.example.com/posts')
}

async function getComments() {
  return fetch('https://api.example.com/comments')
}

export default async function Page() {
  // Fetch in parallel with Promise.all
  const [user, posts, comments] = await Promise.all([
    getUser(),
    getPosts(),
    getComments(),
  ])

  return (
    <div>
      <UserInfo user={user} />
      <Posts posts={posts} />
      <Comments comments={comments} />
    </div>
  )
}
```

## Sequential Data Fetching

```tsx
// When one fetch depends on another
export default async function Page({ params }: { params: { id: string } }) {
  // First fetch
  const user = await fetch(`https://api.example.com/users/${params.id}`)
    .then(res => res.json())

  // Second fetch depends on first
  const posts = await fetch(`https://api.example.com/users/${user.id}/posts`)
    .then(res => res.json())

  return (
    <div>
      <h1>{user.name}</h1>
      <Posts posts={posts} />
    </div>
  )
}
```

## Streaming with Suspense

```tsx
// app/page.tsx
import { Suspense } from 'react'

async function Posts() {
  const posts = await fetch('https://api.example.com/posts', {
    cache: 'no-store'
  }).then(res => res.json())

  return (
    <ul>
      {posts.map((post: Post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}

export default function Page() {
  return (
    <div>
      <h1>Posts</h1>
      <Suspense fallback={<div>Loading posts...</div>}>
        <Posts />
      </Suspense>
    </div>
  )
}
```

## React cache for Deduplication

```tsx
// lib/data.ts
import { cache } from 'react'

export const getUser = cache(async (id: string) => {
  const res = await fetch(`https://api.example.com/users/${id}`)
  return res.json()
})

// components/user-profile.tsx
export async function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId) // Cached
  return <div>{user.name}</div>
}

// components/user-posts.tsx
export async function UserPosts({ userId }: { userId: string }) {
  const user = await getUser(userId) // Uses cached result
  return <div>{user.posts.length} posts</div>
}

// app/page.tsx
export default function Page() {
  return (
    <>
      <UserProfile userId="123" />
      <UserPosts userId="123" /> {/* Same fetch, deduplicated */}
    </>
  )
}
```

## Database Queries

```tsx
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// app/posts/page.tsx
import { db } from '@/lib/db'

export const revalidate = 60 // Revalidate every 60 seconds

export default async function PostsPage() {
  const posts = await db.post.findMany({
    include: { author: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>By {post.author.name}</p>
        </article>
      ))}
    </div>
  )
}
```

## Error Handling

```tsx
async function getData() {
  const res = await fetch('https://api.example.com/data')

  if (!res.ok) {
    // This will activate the closest error.tsx
    throw new Error('Failed to fetch data')
  }

  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <div>{data.title}</div>
}

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

## Loading States

```tsx
// app/posts/loading.tsx
export default function Loading() {
  return <div>Loading posts...</div>
}

// app/posts/page.tsx
export default async function PostsPage() {
  const posts = await fetch('https://api.example.com/posts')
    .then(res => res.json())

  return <div>{/* render posts */}</div>
}
```

## Client-Side Data Fetching

```tsx
// When you need client-side fetching
'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function Posts() {
  const { data, error, isLoading } = useSWR('/api/posts', fetcher, {
    refreshInterval: 3000, // Refresh every 3 seconds
  })

  if (error) return <div>Failed to load</div>
  if (isLoading) return <div>Loading...</div>

  return (
    <ul>
      {data.map((post: Post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

## Preloading Data

```tsx
// lib/data.ts
import { cache } from 'react'

export const preload = (id: string) => {
  void getUser(id) // Trigger fetch without awaiting
}

export const getUser = cache(async (id: string) => {
  return fetch(`https://api.example.com/users/${id}`)
    .then(res => res.json())
})

// components/user.tsx
import { getUser, preload } from '@/lib/data'

export async function User({ id }: { id: string }) {
  const user = await getUser(id)
  return <div>{user.name}</div>
}

// app/page.tsx
import { User } from '@/components/user'
import { preload } from '@/lib/data'

export default async function Page() {
  preload('123') // Start loading immediately
  return <User id="123" />
}
```

## Static Generation with Dynamic Routes

```tsx
// app/posts/[slug]/page.tsx
type Post = {
  slug: string
  title: string
  content: string
}

export async function generateStaticParams() {
  const posts = await fetch('https://api.example.com/posts')
    .then(res => res.json())

  return posts.map((post: Post) => ({
    slug: post.slug,
  }))
}

export default async function Post({ params }: { params: { slug: string } }) {
  const post = await fetch(`https://api.example.com/posts/${params.slug}`)
    .then(res => res.json())

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  )
}
```

## Quick Reference

| Strategy | Config | Use Case |
|----------|--------|----------|
| **SSG** | `cache: 'force-cache'` | Static content |
| **SSR** | `cache: 'no-store'` | Always fresh data |
| **ISR** | `next: { revalidate: 60 }` | Periodic updates |
| **Tag-based** | `next: { tags: ['posts'] }` | On-demand revalidation |
| **Dynamic** | `export const dynamic = 'force-dynamic'` | Per-request data |

## Best Practices

1. **Default to caching** - Use force-cache for static content
2. **Use ISR** - Revalidate periodically for semi-dynamic content
3. **Parallel fetching** - Use Promise.all for independent requests
4. **Deduplicate** - Use React cache() for repeated calls
5. **Stream with Suspense** - Show content progressively
6. **Tag your fetches** - Enable granular revalidation
7. **Handle errors** - Use error.tsx for graceful degradation
