/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthConfiguration } from './authConfiguration'
import { Response, NextFunction } from 'express'
import { Request } from './request'
import jwksRsa, { JwksClient, SigningKey } from 'jwks-rsa'
import jwt, { JwtHeader, JwtPayload, SignCallback, GetPublicKeyOrSecret } from 'jsonwebtoken'
import { debug } from '@microsoft/agents-activity/logger'

const logger = debug('agents:jwt-middleware')

/**
 * Verifies the JWT token.
 * @param raw The raw JWT token.
 * @param config The authentication configuration.
 * @returns A promise that resolves to the JWT payload.
 */
const verifyToken = async (raw: string, config: AuthConfiguration): Promise<JwtPayload> => {
  const payload = jwt.decode(raw) as JwtPayload
  logger.debug('jwt.decode ', JSON.stringify(payload))

  if (!payload) {
    throw new Error('invalid token')
  }
  const audience = payload.aud

  const matchingEntry = config.connections && config.connections.size > 0
    ? [...config.connections.entries()].find(([_, configuration]) => configuration.clientId === audience)
    : undefined

  if (!matchingEntry) {
    const err = new Error('Audience mismatch')
    logger.error(err.message, audience)
    throw err
  }

  const [key, authConfig] = matchingEntry
  logger.debug(`Audience found at key: ${key}`)

  const jwksUri = payload.iss === 'https://api.botframework.com'
    ? 'https://login.botframework.com/v1/.well-known/keys'
    : `${authConfig.authority}/${authConfig.tenantId}/discovery/v2.0/keys`

  logger.debug(`fetching keys from ${jwksUri}`)
  const jwksClient: JwksClient = jwksRsa({ jwksUri })

  const getKey: GetPublicKeyOrSecret = (header: JwtHeader, callback: SignCallback) => {
    jwksClient.getSigningKey(header.kid, (err: Error | null, key: SigningKey | undefined): void => {
      if (err) {
        logger.error('jwksClient.getSigningKey ', JSON.stringify(err))
        logger.error(JSON.stringify(err))
        callback(err, undefined)
        return
      }
      const signingKey = key?.getPublicKey()
      callback(null, signingKey)
    })
  }

  const verifyOptions: jwt.VerifyOptions = {
    issuer: authConfig.issuers as [string, ...string[]],
    audience: [authConfig.clientId!, 'https://api.botframework.com'],
    ignoreExpiration: false,
    algorithms: ['RS256'],
    clockTolerance: 300
  }

  return await new Promise((resolve, reject) => {
    jwt.verify(raw, getKey, verifyOptions, (err, user) => {
      if (err) {
        logger.error('jwt.verify ', JSON.stringify(err))
        reject(err)
        return
      }
      resolve(user as JwtPayload)
    })
  })
}

/**
 * Middleware to authorize JWT tokens.
 * @param authConfig The authentication configuration.
 * @returns An Express middleware function.
 */
export const authorizeJWT = (authConfig: AuthConfiguration) => {
  return async function (req: Request, res: Response, next: NextFunction) {
    let failed = false
    logger.debug('authorizing jwt')
    if (req.method !== 'POST' && req.method !== 'GET') {
      failed = true
      logger.warn('Method not allowed', req.method)
      res.status(405).send({ 'jwt-auth-error': 'Method not allowed' })
    } else {
      const authHeader = req.headers.authorization as string
      if (authHeader) {
        const token: string = authHeader.split(' ')[1] // Extract the token from the Bearer string
        try {
          const user = await verifyToken(token, authConfig)
          logger.debug('token verified for ', user)
          req.user = user
        } catch (err: Error | any) {
          failed = true
          logger.error(err)
          res.status(401).send({ 'jwt-auth-error': err.message })
        }
      } else {
        if (!authConfig.clientId && process.env.NODE_ENV !== 'production') {
          logger.info('using anonymous auth')
          req.user = { name: 'anonymous' }
        } else {
          failed = true
          logger.error('authorization header not found')
          res.status(401).send({ 'jwt-auth-error': 'authorization header not found' })
        }
      }
    }
    if (!failed) {
      next()
    }
  }
}
