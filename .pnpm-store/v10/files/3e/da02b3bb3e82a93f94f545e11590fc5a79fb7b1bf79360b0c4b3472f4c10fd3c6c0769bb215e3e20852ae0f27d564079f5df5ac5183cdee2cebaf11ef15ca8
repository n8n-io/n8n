export function pick<T, K extends keyof T>(object: T, keys: K[]): Pick<T, K> {
  return Object.assign(
    {},
    // eslint-disable-next-line array-callback-return
    ...keys.map((key) => {
      if (object && Object.prototype.hasOwnProperty.call(object, key))
        return { [key]: object[key] }
    }),
  )
}

export function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  keys.forEach(key => delete obj[key])
  return obj
}
