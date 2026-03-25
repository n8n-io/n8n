// 1) Import mappersmith
const forge = require('mappersmith').default
// import forge from 'mappersmith'
const fs = require('fs')
const BasicAuthMiddleware = require('mappersmith/middleware/basic-auth')
const FormData = require('form-data')

// 2) Forge your client with your API manifest
const client = forge({
  host: 'https://host.url',
  middlewares: [BasicAuthMiddleware({ username: 'meowmeow', password: 'beenz' })],
  resources: {
    File: {
      upload: { method: 'post', path: '/api/files' },
    },
  },
})

// Read more about Form data @ https://developer.mozilla.org/en-US/docs/Web/API/FormData
const formData = new FormData()

// Append files to the form data. Files can be read from the filesystem or used as buffers.
formData.append('fileFromPath', fs.createReadStream('path-to-file'), 'filename.ext')
formData.append('fileFromBuffer', Buffer.from('file contents'), 'filename.ext')

// Append files as part of a file array
formData.append('files[]', fs.createReadStream('path-to-file'), 'filename.ext')
formData.append('files[]', Buffer.from('file contents'), 'filename.ext')
;(async () => {
  const response = await client.File.upload({
    // 3) Use .getBuffer() and .getHeaders() to set the correct request data.
    body: formData.getBuffer(),
    headers: formData.getHeaders(),
  })

  console.log(`status: ${response.data().body}`)
  console.log(`loaded in ${response.timeElapsed}ms`)
})()
