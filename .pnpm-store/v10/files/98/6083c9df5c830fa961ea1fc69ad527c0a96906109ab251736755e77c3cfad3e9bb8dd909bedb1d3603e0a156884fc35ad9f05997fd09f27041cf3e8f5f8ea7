export function flatten<U, T extends { children: any[] }>(items: T[]): U[] {
  return items.reduce((acc: any[], item: T) => {
    acc.push(item)

    if (item.children)
      acc.push(...flatten(item.children))

    return acc
  }, [])
}

// TODO: expose more utility function to handle flattened item
