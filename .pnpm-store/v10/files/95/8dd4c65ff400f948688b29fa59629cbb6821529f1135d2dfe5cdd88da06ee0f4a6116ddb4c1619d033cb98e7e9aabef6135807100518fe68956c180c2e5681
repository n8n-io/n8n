// declare peer dependencies so RunKit don't throw errors
require('ioredis/package.json')

const Redis = require('ioredis-mock')
const redis = new Redis({
  data: {
    user_next: '3',
    emails: {
      'clark@daily.planet': '1',
      'bruce@wayne.enterprises': '2',
    },
    'user:1': { id: '1', username: 'superman', email: 'clark@daily.planet' },
    'user:2': { id: '2', username: 'batman', email: 'bruce@wayne.enterprises' },
  },
})

async function main() {
  const userNext = await redis.incr('user_next')
  await redis.hmset(
    `user:${userNext}`,
    new Map([
      ['id', userNext],
      ['username', 'wonderwoman'],
      ['email', 'diana@amazon.gr'],
    ])
  )
  console.log(await redis.hgetall(`user:${userNext}`))
}

main()
