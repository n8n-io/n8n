'use strict'

module.exports.disposer = disposer

function disposer (creatorFn, disposerFn, fn) {
  const runDisposer = (resource, result, shouldThrow = false) => {
    return disposerFn(resource)
      .then(
        // disposer resolved, do something with original fn's promise
        () => {
          if (shouldThrow)
            throw result

          return result
        },
        // Disposer fn failed, crash process
        (err) => {
          throw err
          // Or process.exit?
        })
  }

  return creatorFn
    .then((resource) => {
      // fn(resource) can throw, so wrap in a promise here
      return Promise.resolve().then(() => fn(resource))
        .then((result) => runDisposer(resource, result))
        .catch((err) => runDisposer(resource, err, true))
    })
}
