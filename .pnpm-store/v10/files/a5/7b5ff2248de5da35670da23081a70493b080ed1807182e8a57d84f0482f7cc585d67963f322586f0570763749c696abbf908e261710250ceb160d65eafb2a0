/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ConfidentialClientApplication, LogLevel, ManagedIdentityApplication, NodeSystemOptions } from '@azure/msal-node'
import axios from 'axios'
import { AuthConfiguration } from './authConfiguration'
import { AuthProvider } from './authProvider'
import { debug } from '@microsoft/agents-activity/logger'
import { v4 } from 'uuid'
import { MemoryCache } from './MemoryCache'
import jwt from 'jsonwebtoken'

import fs from 'fs'
import crypto from 'crypto'

const audience = 'api://AzureADTokenExchange'
const logger = debug('agents:msal')

/**
 * Provides tokens using MSAL.
 */
export class MsalTokenProvider implements AuthProvider {
  private readonly _agenticTokenCache: MemoryCache<string>
  public readonly connectionSettings?: AuthConfiguration

  constructor (connectionSettings?: AuthConfiguration) {
    this._agenticTokenCache = new MemoryCache<string>()
    this.connectionSettings = connectionSettings
  }

  /**
   * Gets an access token using the auth configuration from the MsalTokenProvider instance and the provided scope.
   * @param scope The scope for the token.
   * @returns A promise that resolves to the access token.
   */
  public async getAccessToken (scope: string): Promise<string>
  /**
   * Gets an access token.
   * @param authConfig The authentication configuration.
   * @param scope The scope for the token.
   * @returns A promise that resolves to the access token.
   */
  public async getAccessToken (authConfig: AuthConfiguration, scope: string): Promise<string>

  public async getAccessToken (authConfigOrScope: AuthConfiguration | string, scope?: string): Promise<string> {
    let authConfig: AuthConfiguration
    let actualScope: string

    if (typeof authConfigOrScope === 'string') {
    // Called as getAccessToken(scope)
      if (!this.connectionSettings) {
        throw new Error('Connection settings must be provided to constructor when calling getAccessToken(scope)')
      }
      authConfig = this.connectionSettings
      actualScope = authConfigOrScope
    } else {
    // Called as getAccessToken(authConfig, scope)
      authConfig = authConfigOrScope
      actualScope = scope as string
    }

    if (!authConfig.clientId && process.env.NODE_ENV !== 'production') {
      return ''
    }
    let token
    if (authConfig.WIDAssertionFile !== undefined) {
      token = await this.acquireAccessTokenViaWID(authConfig, actualScope)
    } else if (authConfig.FICClientId !== undefined) {
      token = await this.acquireAccessTokenViaFIC(authConfig, actualScope)
    } else if (authConfig.clientSecret !== undefined) {
      token = await this.acquireAccessTokenViaSecret(authConfig, actualScope)
    } else if (authConfig.certPemFile !== undefined &&
      authConfig.certKeyFile !== undefined) {
      token = await this.acquireTokenWithCertificate(authConfig, actualScope)
    } else if (authConfig.clientSecret === undefined &&
      authConfig.certPemFile === undefined &&
      authConfig.certKeyFile === undefined) {
      token = await this.acquireTokenWithUserAssignedIdentity(authConfig, actualScope)
    } else {
      throw new Error('Invalid authConfig. ')
    }
    if (token === undefined) {
      throw new Error('Failed to acquire token')
    }

    return token
  }

  public async acquireTokenOnBehalfOf (scopes: string[], oboAssertion: string): Promise<string>
  public async acquireTokenOnBehalfOf (authConfig: AuthConfiguration, scopes: string[], oboAssertion: string): Promise<string>

  public async acquireTokenOnBehalfOf (
    authConfigOrScopes: AuthConfiguration | string[],
    scopesOrOboAssertion?: string[] | string,
    oboAssertion?: string
  ): Promise<string> {
    let authConfig: AuthConfiguration
    let actualScopes: string[]
    let actualOboAssertion: string

    if (Array.isArray(authConfigOrScopes)) {
    // Called as acquireTokenOnBehalfOf(scopes, oboAssertion)
      if (!this.connectionSettings) {
        throw new Error('Connection settings must be provided to constructor when calling acquireTokenOnBehalfOf(scopes, oboAssertion)')
      }
      authConfig = this.connectionSettings
      actualScopes = authConfigOrScopes
      actualOboAssertion = scopesOrOboAssertion as string
    } else {
    // Called as acquireTokenOnBehalfOf(authConfig, scopes, oboAssertion)
      authConfig = authConfigOrScopes
      actualScopes = scopesOrOboAssertion as string[]
      actualOboAssertion = oboAssertion!
    }

    const cca = new ConfidentialClientApplication({
      auth: {
        clientId: authConfig.clientId as string,
        authority: `${authConfig.authority}/${authConfig.tenantId || 'botframework.com'}`,
        clientSecret: authConfig.clientSecret
      },
      system: this.sysOptions
    })
    const token = await cca.acquireTokenOnBehalfOf({
      oboAssertion: actualOboAssertion,
      scopes: actualScopes
    })
    return token?.accessToken as string
  }

  public async getAgenticInstanceToken (tenantId: string, agentAppInstanceId: string): Promise<string> {
    logger.debug('Getting agentic instance token')
    if (!this.connectionSettings) {
      throw new Error('Connection settings must be provided when calling getAgenticInstanceToken')
    }
    const appToken = await this.getAgenticApplicationToken(tenantId, agentAppInstanceId)
    const cca = new ConfidentialClientApplication({
      auth: {
        clientId: agentAppInstanceId,
        clientAssertion: appToken,
        authority: this.resolveAuthority(tenantId),
      },
      system: this.sysOptions
    })

    const token = await cca.acquireTokenByClientCredential({
      scopes: ['api://AzureAdTokenExchange/.default'],
      correlationId: v4()
    })

    if (!token?.accessToken) {
      throw new Error(`Failed to acquire instance token for agent instance: ${agentAppInstanceId}`)
    }

    return token.accessToken
  }

  /**
   * This method can optionally accept a tenant ID that overrides the tenant ID in the connection settings, if the connection settings authority contains "common".
   * @param tenantId
   * @returns
   */
  private resolveAuthority (tenantId?: string) : string {
    // if for some reason the agentic tenant ID is not in the message, fall back to the original configured auth settings
    if (!tenantId) {
      return this.connectionSettings?.authority ? `${this.connectionSettings.authority}/${this.connectionSettings?.tenantId}` : `https://login.microsoftonline.com/${this.connectionSettings?.tenantId || 'botframework.com'}`
    }

    if (this.connectionSettings?.tenantId === 'common') {
      return this.connectionSettings?.authority ? `${this.connectionSettings.authority}/${tenantId}` : `https://login.microsoftonline.com/${tenantId}`
    } else {
      return this.connectionSettings?.authority ? `${this.connectionSettings.authority}/${this.connectionSettings?.tenantId}` : `https://login.microsoftonline.com/${this.connectionSettings?.tenantId || 'botframework.com'}`
    }
  }

  /**
   * Does a direct HTTP call to acquire a token for agentic scenarios - do not use this directly!
   * This method will be removed once MSAL is updated with the necessary features.
   * (This is required in order to pass additional parameters into the auth call)
   * @param tenantId
   * @param clientId
   * @param clientAssertion
   * @param scopes
   * @param tokenBodyParameters
   * @returns
   */
  private async acquireTokenForAgenticScenarios (tenantId: string, clientId: string, clientAssertion: string | undefined, scopes: string[], tokenBodyParameters: { [key: string]: any }): Promise<string | null> {
    if (!this.connectionSettings) {
      throw new Error('Connection settings must be provided when calling getAgenticInstanceToken')
    }

    // Check cache first
    const cacheKey = `${clientId}/${Object.keys(tokenBodyParameters).map(key => key !== 'user_federated_identity_credential' ? `${key}=${tokenBodyParameters[key]}` : '').join('&')}/${scopes.join(';')}`
    if (this._agenticTokenCache.get(cacheKey)) {
      return this._agenticTokenCache.get(cacheKey) as string
    }

    const url = `${this.resolveAuthority(tenantId)}/oauth2/v2.0/token`

    const data: { [key: string]: any } = {
      client_id: clientId,
      scope: scopes.join(' '),
      ...tokenBodyParameters
    }

    if (clientAssertion) {
      data.client_assertion_type = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
      data.client_assertion = clientAssertion
    } else {
      data.client_secret = this.connectionSettings.clientSecret
    }

    if (data.grant_type !== 'user_fic') {
      data.client_info = '2'
    }

    const token = await axios.post(
      url,
      data,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        }
      }
    ).catch((error) => {
      logger.error('Error acquiring token: ', error.toJSON())
      throw error
    })

    // capture token, expire local cache 5 minutes early
    this._agenticTokenCache.set(cacheKey, token.data.access_token, token.data.expires_in - 300)
    return token.data.access_token
  }

  public async getAgenticUserToken (tenantId: string, agentAppInstanceId: string, agenticUserId: string, scopes: string[]): Promise<string> {
    logger.debug('Getting agentic user token')
    const agentToken = await this.getAgenticApplicationToken(tenantId, agentAppInstanceId)
    const instanceToken = await this.getAgenticInstanceToken(tenantId, agentAppInstanceId)

    const token = await this.acquireTokenForAgenticScenarios(tenantId, agentAppInstanceId, agentToken, scopes, {
      user_id: agenticUserId,
      user_federated_identity_credential: instanceToken,
      grant_type: 'user_fic',
    })

    if (!token) {
      throw new Error(`Failed to acquire instance token for user token: ${agentAppInstanceId}`)
    }

    return token
  }

  public async getAgenticApplicationToken (tenantId: string, agentAppInstanceId: string): Promise<string> {
    if (!this.connectionSettings?.clientId) {
      throw new Error('Connection settings must be provided when calling getAgenticApplicationToken')
    }
    logger.debug('Getting agentic application token')

    let clientAssertion

    if (this.connectionSettings.WIDAssertionFile !== undefined) {
      clientAssertion = fs.readFileSync(this.connectionSettings.WIDAssertionFile as string, 'utf8')
    } else if (this.connectionSettings.FICClientId !== undefined) {
      clientAssertion = await this.fetchExternalToken(this.connectionSettings.FICClientId as string)
    } else if (this.connectionSettings.certPemFile !== undefined &&
      this.connectionSettings.certKeyFile !== undefined) {
      clientAssertion = this.getAssertionFromCert(this.connectionSettings)
    }

    const token = await this.acquireTokenForAgenticScenarios(tenantId, this.connectionSettings.clientId, clientAssertion, ['api://AzureAdTokenExchange/.default'], {
      grant_type: 'client_credentials',
      fmi_path: agentAppInstanceId,
    })

    if (!token) {
      throw new Error(`Failed to acquire token for agent instance: ${agentAppInstanceId}`)
    }

    return token
  }

  private readonly sysOptions: NodeSystemOptions = {
    loggerOptions: {
      logLevel: LogLevel.Trace,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return
        }
        switch (level) {
          case LogLevel.Error:
            logger.error(message)
            return
          case LogLevel.Info:
            logger.debug(message)
            return
          case LogLevel.Warning:
            if (!message.includes('Warning - No client info in response')) {
              logger.warn(message)
            }
            return
          case LogLevel.Verbose:
            logger.debug(message)
        }
      },
      piiLoggingEnabled: false
    }
  }

  /**
   * Generates the client assertion using the provided certificate.
   * @param authConfig The authentication configuration.
   * @returns The client assertion.
   */
  private getAssertionFromCert (authConfig: AuthConfiguration): string {
    const base64url = (buf: Buffer) =>
      buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

    const privateKeyPem = fs.readFileSync(authConfig.certKeyFile as string)

    const pubKeyObject = new crypto.X509Certificate(fs.readFileSync(authConfig.certPemFile as string))

    const der = pubKeyObject.raw
    const x5tS256 = base64url(crypto.createHash('sha256').update(der).digest())

    let x5c
    if (authConfig.sendX5C) {
      x5c = Buffer.from(authConfig.certPemFile as string, 'base64').toString()
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      aud: `${this.resolveAuthority(authConfig.tenantId)}/oauth2/v2.0/token`,
      iss: authConfig.clientId,
      sub: authConfig.clientId,
      jti: v4(),
      nbf: now,
      iat: now,
      exp: now + 600, // 10 minutes
    }

    return jwt.sign(
      payload,
      privateKeyPem,
      {
        algorithm: 'PS256',
        header: { alg: 'PS256', typ: 'JWT', 'x5t#S256': x5tS256, x5c }
      }
    )
  }

  /**
   * Acquires a token using a user-assigned identity.
   * @param authConfig The authentication configuration.
   * @param scope The scope for the token.
   * @returns A promise that resolves to the access token.
   */
  private async acquireTokenWithUserAssignedIdentity (authConfig: AuthConfiguration, scope: string) {
    const mia = new ManagedIdentityApplication({
      managedIdentityIdParams: {
        userAssignedClientId: authConfig.clientId || ''
      },
      system: this.sysOptions
    })
    const token = await mia.acquireToken({
      resource: scope
    })
    return token?.accessToken
  }

  /**
   * Acquires a token using a certificate.
   * @param authConfig The authentication configuration.
   * @param scope The scope for the token.
   * @returns A promise that resolves to the access token.
   */
  private async acquireTokenWithCertificate (authConfig: AuthConfiguration, scope: string) {
    const privateKeySource = fs.readFileSync(authConfig.certKeyFile as string)

    const privateKeyObject = crypto.createPrivateKey({
      key: privateKeySource,
      format: 'pem'
    })

    const privateKey = privateKeyObject.export({
      format: 'pem',
      type: 'pkcs8'
    })

    const pubKeyObject = new crypto.X509Certificate(fs.readFileSync(authConfig.certPemFile as string))

    const cca = new ConfidentialClientApplication({
      auth: {
        clientId: authConfig.clientId || '',
        authority: `${authConfig.authority}/${authConfig.tenantId || 'botframework.com'}`,
        clientCertificate: {
          privateKey: privateKey as string,
          thumbprint: pubKeyObject.fingerprint.replaceAll(':', ''),
          x5c: Buffer.from(authConfig.certPemFile as string, 'base64').toString()
        }
      },
      system: this.sysOptions
    })
    const token = await cca.acquireTokenByClientCredential({
      scopes: [`${scope}/.default`],
      correlationId: v4()
    })
    return token?.accessToken as string
  }

  /**
   * Acquires a token using a client secret.
   * @param authConfig The authentication configuration.
   * @param scope The scope for the token.
   * @returns A promise that resolves to the access token.
   */
  private async acquireAccessTokenViaSecret (authConfig: AuthConfiguration, scope: string) {
    const cca = new ConfidentialClientApplication({
      auth: {
        clientId: authConfig.clientId as string,
        authority: `${authConfig.authority}/${authConfig.tenantId || 'botframework.com'}`,
        clientSecret: authConfig.clientSecret
      },
      system: this.sysOptions
    })
    const token = await cca.acquireTokenByClientCredential({
      scopes: [`${scope}/.default`],
      correlationId: v4()
    })
    return token?.accessToken as string
  }

  /**
   * Acquires a token using a FIC client assertion.
   * @param authConfig The authentication configuration.
   * @param scope The scope for the token.
   * @returns A promise that resolves to the access token.
   */
  private async acquireAccessTokenViaFIC (authConfig: AuthConfiguration, scope: string) : Promise<string> {
    const scopes = [`${scope}/.default`]
    const clientAssertion = await this.fetchExternalToken(authConfig.FICClientId as string)
    const cca = new ConfidentialClientApplication({
      auth: {
        clientId: authConfig.clientId as string,
        authority: `${authConfig.authority}/${authConfig.tenantId}`,
        clientAssertion
      },
      system: this.sysOptions
    })
    const token = await cca.acquireTokenByClientCredential({ scopes })
    logger.debug('got token using FIC client assertion')
    return token?.accessToken as string
  }

  /**
   * Acquires a token using a Workload Identity client assertion.
   * @param authConfig The authentication configuration.
   * @param scope The scope for the token.
   * @returns A promise that resolves to the access token.
   */
  private async acquireAccessTokenViaWID (authConfig: AuthConfiguration, scope: string) : Promise<string> {
    const scopes = [`${scope}/.default`]
    const clientAssertion = fs.readFileSync(authConfig.WIDAssertionFile as string, 'utf8')
    const cca = new ConfidentialClientApplication({
      auth: {
        clientId: authConfig.clientId as string,
        authority: `https://login.microsoftonline.com/${authConfig.tenantId}`,
        clientAssertion
      },
      system: this.sysOptions
    })
    const token = await cca.acquireTokenByClientCredential({ scopes })
    logger.info('got token using WID client assertion')
    return token?.accessToken as string
  }

  /**
   * Fetches an external token.
   * @param FICClientId The FIC client ID.
   * @returns A promise that resolves to the external token.
   */
  private async fetchExternalToken (FICClientId: string) : Promise<string> {
    const managedIdentityClientAssertion = new ManagedIdentityApplication({
      managedIdentityIdParams: {
        userAssignedClientId: FICClientId
      },
      system: this.sysOptions
    }
    )
    const response = await managedIdentityClientAssertion.acquireToken({
      resource: audience,
      forceRefresh: true
    })
    logger.debug('got token for FIC')
    return response.accessToken
  }
}
