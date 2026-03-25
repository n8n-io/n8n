export function union(types) {
  return [...new Set(types)].join(' | ')
}

export function unionValues(values) {
  return union(values.map(forValue))
}

export function forKeys(value) {
  return union(Object.keys(value).map((key) => `'${key}'`))
}

export function forValue(value) {
  if (Array.isArray(value)) {
    return `(${unionValues(value)})[]`
  }

  if (typeof value === 'object') {
    return `Record<${forKeys(value)}, ${unionValues(Object.values(value))}>`
  }

  if (typeof value === 'string') {
    return `string`
  }

  return `any`
}
