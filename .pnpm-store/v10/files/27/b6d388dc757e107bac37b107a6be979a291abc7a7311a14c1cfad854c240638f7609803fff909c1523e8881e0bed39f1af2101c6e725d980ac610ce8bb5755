type Fetch = typeof fetch

export const resolveFetch = (customFetch?: Fetch): Fetch => {
  let _fetch: Fetch
  if (customFetch) {
    _fetch = customFetch
  } else if (typeof fetch === 'undefined') {
    _fetch = (...args) =>
      import('@supabase/node-fetch' as any).then(({ default: fetch }) => fetch(...args))
  } else {
    _fetch = fetch
  }
  return (...args) => _fetch(...args)
}

export const resolveResponse = async (): Promise<typeof Response> => {
  if (typeof Response === 'undefined') {
    // @ts-ignore
    return (await import('@supabase/node-fetch' as any)).Response
  }

  return Response
}

export const recursiveToCamel = (item: Record<string, any>): unknown => {
  if (Array.isArray(item)) {
    return item.map((el) => recursiveToCamel(el))
  } else if (typeof item === 'function' || item !== Object(item)) {
    return item
  }

  const result: Record<string, any> = {}
  Object.entries(item).forEach(([key, value]) => {
    const newKey = key.replace(/([-_][a-z])/gi, (c) => c.toUpperCase().replace(/[-_]/g, ''))
    result[newKey] = recursiveToCamel(value)
  })

  return result
}
