# React Server Components

## Server Components (Default)

```tsx
// app/page.tsx - Server Component by default
import { db } from '@/lib/db'

export default async function Page() {
  // Data fetching in Server Component
  const users = await db.user.findMany()

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

## Benefits of Server Components

- **Zero bundle size** - Server Components don't add JavaScript to client bundle
- **Direct backend access** - Query databases, read files, use secrets
- **Automatic code splitting** - Only Client Components add to bundle
- **Streaming** - Send UI progressively as data loads
- **No client-side waterfalls** - Fetch all data in parallel on server

## Client Components

```tsx
// components/counter.tsx
'use client' // Required directive

import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}
```

## When to Use Client Components

Use `'use client'` when you need:
- **Interactivity** - onClick, onChange, event handlers
- **State** - useState, useReducer
- **Effects** - useEffect, useLayoutEffect
- **Browser APIs** - localStorage, window, document
- **Custom hooks** - Any hook using client-only features
- **Class components** - Component lifecycle methods

## Composition Pattern

```tsx
// app/page.tsx - Server Component
import { ClientWrapper } from './client-wrapper'
import { db } from '@/lib/db'

export default async function Page() {
  const data = await db.query()

  return (
    <div>
      {/* Server Component content */}
      <h1>Server Content</h1>

      {/* Pass data to Client Component */}
      <ClientWrapper initialData={data}>
        {/* Server Component as children */}
        <ServerSidebar />
      </ClientWrapper>
    </div>
  )
}

// components/client-wrapper.tsx
'use client'

export function ClientWrapper({
  children,
  initialData,
}: {
  children: React.ReactNode
  initialData: Data
}) {
  const [data, setData] = useState(initialData)

  return (
    <div>
      {/* Client Component UI */}
      <button onClick={() => refresh()}>Refresh</button>
      {/* Server Component children */}
      {children}
    </div>
  )
}
```

## Streaming with Suspense

```tsx
// app/page.tsx
import { Suspense } from 'react'
import { SlowComponent } from './slow-component'
import { FastComponent } from './fast-component'

export default function Page() {
  return (
    <div>
      {/* Renders immediately */}
      <FastComponent />

      {/* Shows fallback while loading */}
      <Suspense fallback={<div>Loading...</div>}>
        <SlowComponent />
      </Suspense>
    </div>
  )
}

// components/slow-component.tsx
async function getData() {
  await new Promise(resolve => setTimeout(resolve, 3000))
  return { data: 'Loaded!' }
}

export async function SlowComponent() {
  const data = await getData()
  return <div>{data.data}</div>
}
```

## Parallel Data Fetching

```tsx
// app/dashboard/page.tsx
async function getUser() {
  return fetch('https://api.example.com/user')
}

async function getPosts() {
  return fetch('https://api.example.com/posts')
}

export default async function Dashboard() {
  // Fetch in parallel
  const [user, posts] = await Promise.all([
    getUser(),
    getPosts(),
  ])

  return (
    <div>
      <UserProfile user={user} />
      <PostsList posts={posts} />
    </div>
  )
}
```

## Sequential Data Fetching

```tsx
// app/artist/[id]/page.tsx
async function getArtist(id: string) {
  return fetch(`https://api.example.com/artists/${id}`)
}

async function getAlbums(artistId: string) {
  return fetch(`https://api.example.com/artists/${artistId}/albums`)
}

export default async function ArtistPage({ params }: { params: { id: string } }) {
  // Sequential: albums depends on artist
  const artist = await getArtist(params.id)
  const albums = await getAlbums(artist.id)

  return (
    <div>
      <h1>{artist.name}</h1>
      <Albums albums={albums} />
    </div>
  )
}
```

## Preloading Data

```tsx
// lib/data.ts
import { cache } from 'react'

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } })
})

// components/user-profile.tsx
export async function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId)
  return <div>{user.name}</div>
}

// app/page.tsx
import { getUser } from '@/lib/data'
import { UserProfile } from '@/components/user-profile'

export default async function Page() {
  // Preload
  getUser('123')

  return (
    <div>
      {/* This will use cached result */}
      <UserProfile userId="123" />
    </div>
  )
}
```

## Server Component Patterns

### Pattern: Layout with Data Fetching

```tsx
// app/dashboard/layout.tsx
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const user = await db.user.findUnique({ where: { id: session.userId } })

  return (
    <div>
      <Sidebar user={user} />
      <main>{children}</main>
    </div>
  )
}
```

### Pattern: Conditional Client Components

```tsx
// app/page.tsx
import { ClientComponent } from './client-component'

export default async function Page() {
  const data = await fetchData()

  // Only render Client Component when needed
  if (data.requiresInteractivity) {
    return <ClientComponent data={data} />
  }

  return <div>{data.content}</div>
}
```

### Pattern: Server Component with Client Island

```tsx
// app/blog/[slug]/page.tsx
import { LikeButton } from './like-button'

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)

  return (
    <article>
      {/* Server-rendered content */}
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />

      {/* Client island for interactivity */}
      <LikeButton postId={post.id} initialLikes={post.likes} />
    </article>
  )
}
```

## Context in Server/Client Components

```tsx
// app/providers.tsx
'use client'

import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

## Third-Party Components

```tsx
// components/carousel-wrapper.tsx
'use client'

import { Carousel } from 'third-party-carousel'

export function CarouselWrapper({ items }: { items: Item[] }) {
  return <Carousel items={items} />
}

// app/page.tsx
import { CarouselWrapper } from '@/components/carousel-wrapper'

export default async function Page() {
  const items = await fetchItems()
  return <CarouselWrapper items={items} />
}
```

## Edge Runtime

```tsx
// app/api/route.ts
export const runtime = 'edge'

export async function GET() {
  return new Response('Hello from Edge!')
}

// app/page.tsx
export const runtime = 'edge'

export default async function Page() {
  return <div>Edge-rendered page</div>
}
```

## Quick Reference

| Capability | Server Component | Client Component |
|------------|------------------|------------------|
| Data fetching | ✅ Yes | ⚠️ Use SWR/React Query |
| Backend access | ✅ Yes (DB, files) | ❌ No |
| Event handlers | ❌ No | ✅ Yes |
| State/Effects | ❌ No | ✅ Yes |
| Browser APIs | ❌ No | ✅ Yes |
| Bundle size | 0 KB | Adds to bundle |
| Streaming | ✅ Yes | ❌ No |

## Best Practices

1. **Default to Server Components** - Only use 'use client' when needed
2. **Move Client Components down** - Push them to leaves of component tree
3. **Pass data down** - Fetch in Server Components, pass to Client Components
4. **Use composition** - Nest Server Components inside Client Components via children
5. **Cache expensive operations** - Use React cache() for deduplication
