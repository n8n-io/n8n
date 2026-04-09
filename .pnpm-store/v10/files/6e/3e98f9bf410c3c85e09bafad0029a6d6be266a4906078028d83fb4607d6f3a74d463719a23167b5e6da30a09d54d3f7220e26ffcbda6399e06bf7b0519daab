import * as promiseLimit from '../'

const limit = promiseLimit<string>(2)
var jobs = ['a', 'b', 'c', 'd', 'e']

Promise.all(jobs.map((name) => {
  return limit(() => job(name))
})).then(results => {
  console.log('\nresults:', results)
})

function job (name): Promise<string> {
  var text = `job ${name}`
  console.log('started', text)

  return new Promise(function (resolve) {
    setTimeout(() => {
      console.log('       ', text, 'finished')
      resolve(text)
    }, 100)
  })
}
