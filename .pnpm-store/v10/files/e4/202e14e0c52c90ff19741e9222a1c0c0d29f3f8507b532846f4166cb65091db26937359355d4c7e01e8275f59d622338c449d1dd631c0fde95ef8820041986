import { isPlainObject, isObject } from './index'

export const clone = <T>(obj: T): T => {
  if (isPlainObject(obj)) {
    return cloneObject(obj)
  } else if (Array.isArray(obj)) {
    return cloneArray(obj)
  } else {
    return obj
  }
}

const cloneObject = <T extends Record<string, unknown>>(obj: T): T => {
  const clone = {} as T
  for (const i in obj) {
    const value = obj[i]
    if (isObject(value)) {
      clone[i] = cloneObject(value)
    } else if (Array.isArray(value)) {
      clone[i] = cloneArray(value)
    } else {
      clone[i] = value
    }
  }
  return clone
}

const cloneArray = <T extends Array<unknown>>(obj: T): T => {
  const clone = [] as unknown as T
  for (const i in obj) {
    const value = obj[i]
    if (isObject(value)) {
      clone.push(cloneObject(value))
    } else if (Array.isArray(value)) {
      clone.push(cloneArray(value))
    } else {
      clone.push(value)
    }
  }
  return clone
}
