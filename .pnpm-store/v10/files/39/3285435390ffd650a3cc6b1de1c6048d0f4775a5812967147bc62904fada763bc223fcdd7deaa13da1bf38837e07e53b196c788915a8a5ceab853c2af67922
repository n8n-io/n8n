export function cloneDeep(value) {
  if (Array.isArray(value)) {
    return value.map((child) => cloneDeep(child))
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cloneDeep(v)]))
  }

  return value
}
