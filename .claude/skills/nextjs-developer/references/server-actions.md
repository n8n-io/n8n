# Server Actions

## Basic Server Action

```tsx
// app/actions.ts
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  await db.post.create({
    data: { title, content }
  })

  revalidatePath('/posts')
}
```

## Form with Server Action

```tsx
// app/posts/new/page.tsx
import { createPost } from '@/app/actions'

export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">Create Post</button>
    </form>
  )
}
```

## Server Action with Validation

```tsx
// app/actions.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const CreatePostSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(10),
})

export async function createPost(formData: FormData) {
  const validatedFields = CreatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { title, content } = validatedFields.data

  await db.post.create({
    data: { title, content }
  })

  revalidatePath('/posts')
  return { success: true }
}
```

## Client Component with Server Action

```tsx
// components/create-post-form.tsx
'use client'

import { createPost } from '@/app/actions'
import { useFormState, useFormStatus } from 'react-dom'

const initialState = {
  errors: {},
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Post'}
    </button>
  )
}

export function CreatePostForm() {
  const [state, formAction] = useFormState(createPost, initialState)

  return (
    <form action={formAction}>
      <div>
        <input name="title" />
        {state.errors?.title && <p>{state.errors.title[0]}</p>}
      </div>

      <div>
        <textarea name="content" />
        {state.errors?.content && <p>{state.errors.content[0]}</p>}
      </div>

      <SubmitButton />
    </form>
  )
}
```

## Server Action with Redirect

```tsx
// app/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const post = await db.post.create({
    data: {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    }
  })

  revalidatePath('/posts')
  redirect(`/posts/${post.id}`)
}
```

## Optimistic Updates

```tsx
// components/todo-list.tsx
'use client'

import { experimental_useOptimistic as useOptimistic } from 'react'
import { toggleTodo } from '@/app/actions'

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, newTodo]
  )

  async function handleSubmit(formData: FormData) {
    const title = formData.get('title') as string
    const newTodo = { id: crypto.randomUUID(), title, completed: false }

    // Optimistically update UI
    addOptimisticTodo(newTodo)

    // Send to server
    await createTodo(formData)
  }

  return (
    <div>
      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>

      <form action={handleSubmit}>
        <input name="title" />
        <button type="submit">Add</button>
      </form>
    </div>
  )
}
```

## Server Action with Authentication

```tsx
// app/actions.ts
'use server'

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  await db.post.create({
    data: {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      authorId: session.user.id,
    }
  })

  revalidatePath('/posts')
}
```

## Inline Server Action

```tsx
// app/posts/page.tsx
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export default async function Posts() {
  const posts = await db.post.findMany()

  async function deletePost(formData: FormData) {
    'use server'

    const id = formData.get('id') as string
    await db.post.delete({ where: { id } })
    revalidatePath('/posts')
  }

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>
          {post.title}
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <button type="submit">Delete</button>
          </form>
        </li>
      ))}
    </ul>
  )
}
```

## Programmatic Server Action Call

```tsx
// components/delete-button.tsx
'use client'

import { deletePost } from '@/app/actions'

export function DeleteButton({ postId }: { postId: string }) {
  async function handleDelete() {
    if (confirm('Are you sure?')) {
      await deletePost(postId)
    }
  }

  return (
    <button onClick={handleDelete}>
      Delete
    </button>
  )
}

// app/actions.ts
'use server'

export async function deletePost(postId: string) {
  await db.post.delete({ where: { id: postId } })
  revalidatePath('/posts')
}
```

## Revalidation Strategies

```tsx
// app/actions.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'

export async function updatePost(id: string, data: UpdatePostData) {
  await db.post.update({ where: { id }, data })

  // Revalidate specific path
  revalidatePath('/posts')
  revalidatePath(`/posts/${id}`)

  // Revalidate all paths in a layout
  revalidatePath('/posts', 'layout')

  // Revalidate by cache tag
  revalidateTag('posts')
}
```

## Server Action with File Upload

```tsx
// app/actions.ts
'use server'

import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function uploadAvatar(formData: FormData) {
  const file = formData.get('avatar') as File

  if (!file) {
    return { error: 'No file uploaded' }
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const path = join(process.cwd(), 'public', 'uploads', file.name)
  await writeFile(path, buffer)

  return { success: true, path: `/uploads/${file.name}` }
}

// components/upload-form.tsx
'use client'

import { uploadAvatar } from '@/app/actions'

export function UploadForm() {
  async function handleSubmit(formData: FormData) {
    const result = await uploadAvatar(formData)
    if (result.success) {
      console.log('Uploaded to:', result.path)
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="file" name="avatar" accept="image/*" />
      <button type="submit">Upload</button>
    </form>
  )
}
```

## Error Handling

```tsx
// app/actions.ts
'use server'

export async function createPost(formData: FormData) {
  try {
    await db.post.create({
      data: {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
      }
    })

    revalidatePath('/posts')
    return { success: true }
  } catch (error) {
    console.error('Failed to create post:', error)
    return { error: 'Failed to create post' }
  }
}

// components/form.tsx
'use client'

export function CreatePostForm() {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const result = await createPost(formData)

    if (result.error) {
      setError(result.error)
    } else {
      // Success
      router.push('/posts')
    }
  }

  return (
    <form action={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* form fields */}
    </form>
  )
}
```

## Server Action with Cookies

```tsx
// app/actions.ts
'use server'

import { cookies } from 'next/headers'

export async function setTheme(theme: 'light' | 'dark') {
  cookies().set('theme', theme, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  })
}

export async function getTheme() {
  return cookies().get('theme')?.value ?? 'light'
}
```

## Rate Limiting

```tsx
// app/actions.ts
'use server'

import { ratelimit } from '@/lib/redis'

export async function createPost(formData: FormData) {
  const session = await auth()
  const { success } = await ratelimit.limit(session.user.id)

  if (!success) {
    return { error: 'Rate limit exceeded' }
  }

  // Create post...
}
```

## Quick Reference

| Capability | Usage |
|------------|-------|
| **Define** | Add 'use server' at top of file or function |
| **Form** | Pass action to `<form action={serverAction}>` |
| **Programmatic** | Call directly: `await serverAction(data)` |
| **Validation** | Use Zod/TypeBox before mutations |
| **Revalidate** | `revalidatePath()` or `revalidateTag()` |
| **Redirect** | `redirect()` after mutation |
| **Errors** | Return error objects, handle in client |
| **Files** | Access via `formData.get()` as File |

## Best Practices

1. **Always validate** - Use Zod/TypeBox for type-safe validation
2. **Revalidate** - Call revalidatePath() after mutations
3. **Handle errors** - Return error objects instead of throwing
4. **Auth checks** - Verify session before mutations
5. **Rate limiting** - Protect against abuse
6. **Type safety** - Define input/output types
7. **Optimistic updates** - Use useOptimistic for better UX
