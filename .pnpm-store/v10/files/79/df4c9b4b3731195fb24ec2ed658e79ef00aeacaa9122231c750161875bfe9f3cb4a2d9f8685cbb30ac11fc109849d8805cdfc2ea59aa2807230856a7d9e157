function conventions (convention) {
  const env = process.env.DOTENV_ENV || process.env.NODE_ENV || 'development'

  if (convention === 'nextjs') {
    const canonicalEnv = ['development', 'test', 'production'].includes(env) && env

    return [
      canonicalEnv && { type: 'envFile', value: `.env.${canonicalEnv}.local` },
      canonicalEnv !== 'test' && { type: 'envFile', value: '.env.local' },
      canonicalEnv && { type: 'envFile', value: `.env.${canonicalEnv}` },
      { type: 'envFile', value: '.env' }
    ].filter(Boolean)
  } else if (convention === 'flow') {
    return [
      { type: 'envFile', value: `.env.${env}.local` },
      { type: 'envFile', value: `.env.${env}` },
      { type: 'envFile', value: '.env.local' },
      { type: 'envFile', value: '.env' },
      { type: 'envFile', value: '.env.defaults' }
    ]
  } else {
    throw new Error(`INVALID_CONVENTION: '${convention}'. permitted conventions: ['nextjs', 'flow']`)
  }
}

module.exports = conventions
