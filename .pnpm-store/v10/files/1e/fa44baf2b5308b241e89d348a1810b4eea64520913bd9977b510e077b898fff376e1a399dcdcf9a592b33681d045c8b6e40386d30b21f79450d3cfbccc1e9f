'use strict'

module.exports = (status, body, context) => {
  if (status === 200) {
    context.user = JSON.parse(body)
  } // on error, you may abort the benchmark
}
