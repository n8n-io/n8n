'use strict'

/**
 * Executes functions sequentially.
 *
 * @param {function[]} arguments - Functions to execute.
 * @returns {void}
 */
function flow () {
  if (arguments.length === 0) {
    return
  }

  const head = arguments[0]
  const rest = [].slice.call(arguments, 1)

  head()
  setTimeout(() => {
    flow.apply(null, rest)
  }, 33)
}

const text = String(process.argv[2])
flow(
  () => {
    process.stdout.write(text)
  },
  () => {
    process.stdout.write(`${text}\n`)
  },
  () => {
    process.stdout.write(`${text}\n${text}`)
  },
  () => {
    process.stdout.write(`${text}\n${text}\n`)
  },
  () => {
    process.stdout.write(`${text}\n${text}\n${text}\n${text}\n`)
  },
  () => {
    process.stdout.write(`\n${text}\n${text}`)
  },
  () => {
    process.stdout.write(`${text}\n\n\n`)
  },
  () => {
    process.stdout.write(`\n${text}`)
  }
)
