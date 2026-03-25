const { entries } = Object

module.exports = (obj, mapper) =>
  entries(obj).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: mapper(value, key),
    }),
    {}
  )
