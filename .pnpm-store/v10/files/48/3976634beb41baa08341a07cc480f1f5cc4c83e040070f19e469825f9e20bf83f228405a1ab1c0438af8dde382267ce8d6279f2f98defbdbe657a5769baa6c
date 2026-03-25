/* eslint-disable @typescript-eslint/no-var-requires */

// 1) Import mappersmith
const forge = require('mappersmith').default

// 2) Configure the fetch gateway
const { configs } = require('mappersmith')
const FetchGateway = require('mappersmith/gateway/fetch').default
configs.gateway = FetchGateway

// 3) Forge your client with your API manifest
const github = forge({
  clientId: 'github',
  host: 'https://www.githubstatus.com',
  resources: {
    Status: {
      current: { path: '/api/v2/status.json' },
    },
  },
})

// Profit!
github.Status.current().then((response) => {
  console.log('status payload:', response.data())
  console.log(`loaded in ${response.timeElapsed}ms`)
})
