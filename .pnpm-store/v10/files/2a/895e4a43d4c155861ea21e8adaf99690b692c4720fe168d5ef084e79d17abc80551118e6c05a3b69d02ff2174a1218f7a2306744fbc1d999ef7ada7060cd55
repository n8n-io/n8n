module.exports = async (array, groupFn) => {
  const result = new Map()

  for (const item of array) {
    const group = await Promise.resolve(groupFn(item))
    result.set(group, result.has(group) ? [...result.get(group), item] : [item])
  }

  return result
}
