const fetchNode = require('./node-ponyfill')

if (!global.fetch) {
  const fetch = fetchNode.fetch.bind({})

  global.fetch = fetch
  global.fetch.polyfill = true
  global.Response = fetchNode.Response
  global.Headers = fetchNode.Headers
  global.Request = fetchNode.Request
}
