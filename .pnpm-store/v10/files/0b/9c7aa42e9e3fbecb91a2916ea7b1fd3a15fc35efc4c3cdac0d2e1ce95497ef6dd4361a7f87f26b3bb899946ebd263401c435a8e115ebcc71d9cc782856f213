/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { debug } from '@microsoft/agents-activity/logger'
import { ConnectionMapItem } from './msalConnectionManager'
import objectPath from 'object-path'

const logger = debug('agents:authConfiguration')
const DEFAULT_CONNECTION = 'serviceConnection'

/**
 * Represents the authentication configuration.
 */
export interface AuthConfiguration {
  /**
   * The tenant ID for the authentication configuration.
   */
  tenantId?: string

  /**
   * The client ID for the authentication configuration. Required in production.
   */
  clientId?: string

  /**
   * The client secret for the authentication configuration.
   */
  clientSecret?: string

  /**
   * The path to the certificate PEM file.
   */
  certPemFile?: string

  /**
   * The path to the certificate key file.
   */
  certKeyFile?: string

  /**
   * Indicates whether to send the X5C param or not (for SNI authentication).
   */
  sendX5C?: boolean

  /**
   * A list of valid issuers for the authentication configuration.
   */
  issuers?: string[]

  /**
   * The connection name for the authentication configuration.
   */
  connectionName?: string

  /**
   * The FIC (First-Party Integration Channel) client ID.
   */
  FICClientId?: string,

  /**
   * Entra Authentication Endpoint to use.
   *
   * @remarks
   * If not populated the Entra Public Cloud endpoint is assumed.
   * This example of Public Cloud Endpoint is https://login.microsoftonline.com
   * see also https://learn.microsoft.com/entra/identity-platform/authentication-national-cloud
   */
  authority?: string

  scope?: string

  /**
   * A map of connection names to their respective authentication configurations.
   */
  connections?: Map<string, AuthConfiguration>

  /**
   * A list of connection map items to map service URLs to connection names.
   */
  connectionsMap?: ConnectionMapItem[],

  /**
   * An optional alternative blueprint Connection name used when constructing a connector client.
   */
  altBlueprintConnectionName?: string

  /**
   * The path to K8s provided token.
   */
  WIDAssertionFile?: string
}

/**
 * Loads the authentication configuration from environment variables.
 *
 * @returns The authentication configuration.
 * @throws Will throw an error if clientId is not provided in production.
 *
 * @remarks
 * - `clientId` is required
 *
 * @example
 * ```
 * tenantId=your-tenant-id
 * clientId=your-client-id
 * clientSecret=your-client-secret
 *
 * certPemFile=your-cert-pem-file
 * certKeyFile=your-cert-key-file
 * sendX5C=false
 *
 * FICClientId=your-FIC-client-id
 *
 * connectionName=your-connection-name
 * authority=your-authority-endpoint
 * ```
 *
 */
export const loadAuthConfigFromEnv = (cnxName?: string): AuthConfiguration => {
  const envConnections = loadConnectionsMapFromEnv()
  let authConfig: AuthConfiguration

  if (envConnections.connectionsMap.length === 0) {
    // No connections provided, we need to populate the connections map with the old config settings
    authConfig = buildLegacyAuthConfig(cnxName)
    envConnections.connections.set(DEFAULT_CONNECTION, authConfig)
    envConnections.connectionsMap.push({
      serviceUrl: '*',
      connection: DEFAULT_CONNECTION,
    })
  } else {
    // There are connections provided, use the default or specified connection
    if (cnxName) {
      const entry = envConnections.connections.get(cnxName)
      if (entry) {
        authConfig = entry
      } else {
        throw new Error(`Connection "${cnxName}" not found in environment.`)
      }
    } else {
      const defaultItem = envConnections.connectionsMap.find((item) => item.serviceUrl === '*')
      const defaultConn = defaultItem ? envConnections.connections.get(defaultItem.connection) : undefined
      if (!defaultConn) {
        throw new Error('No default connection found in environment connections.')
      }
      authConfig = defaultConn
    }

    authConfig.authority ??= 'https://login.microsoftonline.com'
    authConfig.issuers ??= getDefaultIssuers(authConfig.tenantId ?? '', authConfig.authority)
  }

  return {
    ...authConfig,
    ...envConnections,
  }
}

/**
 * Loads the agent authentication configuration from previous version environment variables.
 *
 * @returns The agent authentication configuration.
 * @throws Will throw an error if MicrosoftAppId is not provided in production.
 *
 * @example
 * ```
 * MicrosoftAppId=your-client-id
 * MicrosoftAppPassword=your-client-secret
 * MicrosoftAppTenantId=your-tenant-id
 * ```
 *
 */
export const loadPrevAuthConfigFromEnv: () => AuthConfiguration = () => {
  const envConnections = loadConnectionsMapFromEnv()
  let authConfig: AuthConfiguration = {}

  if (envConnections.connectionsMap.length === 0) {
    // No connections provided, we need to populate the connection map with the old config settings
    if (process.env.MicrosoftAppId === undefined && process.env.NODE_ENV === 'production') {
      throw new Error('ClientId required in production')
    }
    const authority = process.env.authorityEndpoint ?? 'https://login.microsoftonline.com'
    authConfig = {
      tenantId: process.env.MicrosoftAppTenantId,
      clientId: process.env.MicrosoftAppId,
      clientSecret: process.env.MicrosoftAppPassword,
      certPemFile: process.env.certPemFile,
      certKeyFile: process.env.certKeyFile,
      sendX5C: process.env.sendX5C === 'true',
      connectionName: process.env.connectionName,
      FICClientId: process.env.MicrosoftAppClientId,
      authority,
      scope: process.env.scope,
      issuers: getDefaultIssuers(process.env.MicrosoftAppTenantId ?? '', authority),
      altBlueprintConnectionName: process.env.altBlueprintConnectionName,
      WIDAssertionFile: process.env.WIDAssertionFile,
    }
    envConnections.connections.set(DEFAULT_CONNECTION, authConfig)
    envConnections.connectionsMap.push({
      serviceUrl: '*',
      connection: DEFAULT_CONNECTION,
    })
  } else {
    // There are connections provided, use the default one.
    const defaultItem = envConnections.connectionsMap.find((item) => item.serviceUrl === '*')
    const defaultConn = defaultItem ? envConnections.connections.get(defaultItem.connection) : undefined
    if (!defaultConn) {
      throw new Error('No default connection found in environment connections.')
    }
    authConfig = defaultConn
  }

  authConfig.authority ??= 'https://login.microsoftonline.com'
  authConfig.issuers ??= getDefaultIssuers(authConfig.tenantId ?? '', authConfig.authority)

  return { ...authConfig, ...envConnections }
}

function loadConnectionsMapFromEnv () {
  const envVars = process.env
  const connectionsObj: Record<string, any> = {}
  const connectionsMap: ConnectionMapItem[] = []
  const CONNECTIONS_PREFIX = 'connections__'
  const CONNECTIONS_MAP_PREFIX = 'connectionsMap__'

  for (const [key, rawValue] of Object.entries(envVars)) {
    if (key.startsWith(CONNECTIONS_PREFIX)) {
      // Convert to dot notation
      let path = key.substring(CONNECTIONS_PREFIX.length).replace(/__/g, '.')
      // Remove ".settings." from the path
      path = path.replace('.settings.', '.')
      // Convert "true"/"false" strings into boolean values
      const value = rawValue === 'true' ? true : rawValue === 'false' ? false : rawValue
      objectPath.set(connectionsObj, path, value)
    } else if (key.startsWith(CONNECTIONS_MAP_PREFIX)) {
      const path = key.substring(CONNECTIONS_MAP_PREFIX.length).replace(/__/g, '.')
      objectPath.set(connectionsMap, path, rawValue)
    }
  }

  // Convert connectionsObj to Map<string, AuthConfiguration>
  const connections: Map<string, AuthConfiguration> = new Map(Object.entries(connectionsObj))

  if (connections.size === 0) {
    logger.warn('No connections found in configuration.')
  }

  if (connectionsMap.length === 0) {
    logger.warn('No connections map found in configuration.')
    if (connections.size > 0) {
      const firstEntry = connections.entries().next().value

      if (firstEntry) {
        const [firstKey] = firstEntry
        // Provide a default connection map if none is specified
        connectionsMap.push({
          serviceUrl: '*',
          connection: firstKey,
        })
      }
    }
  }
  return {
    connections,
    connectionsMap,
  }
}

/**
 * Loads the authentication configuration from the provided config or from the environment variables
 * providing default values for authority and issuers.
 *
 * @returns The authentication configuration.
 * @throws Will throw an error if clientId is not provided in production.
 *
 * @example
 * ```
 * tenantId=your-tenant-id
 * clientId=your-client-id
 * clientSecret=your-client-secret
 *
 * certPemFile=your-cert-pem-file
 * certKeyFile=your-cert-key-file
 * sendX5C=false
 *
 * FICClientId=your-FIC-client-id
 *
 * connectionName=your-connection-name
 * authority=your-authority-endpoint
 * ```
 *
 */
export function getAuthConfigWithDefaults (config?: AuthConfiguration): AuthConfiguration {
  if (!config) return loadAuthConfigFromEnv()

  const providedConnections = config.connections && config.connectionsMap
    ? { connections: config.connections, connectionsMap: config.connectionsMap }
    : undefined

  const connections = providedConnections ?? loadConnectionsMapFromEnv()

  let mergedConfig: AuthConfiguration

  if (connections && connections.connectionsMap?.length === 0) {
    // No connections provided, we need to populate the connections map with the old config settings
    mergedConfig = buildLegacyAuthConfig(undefined, config)
    connections.connections?.set(DEFAULT_CONNECTION, mergedConfig)
    connections.connectionsMap.push({ serviceUrl: '*', connection: DEFAULT_CONNECTION })
  } else {
    // There are connections provided, use the default connection
    const defaultItem = connections.connectionsMap?.find((item) => item.serviceUrl === '*')
    const defaultConn = defaultItem ? connections.connections?.get(defaultItem.connection) : undefined
    if (!defaultConn) {
      throw new Error('No default connection found in environment connections.')
    }
    mergedConfig = buildLegacyAuthConfig(undefined, defaultConn)
  }

  return {
    ...mergedConfig,
    ...connections,
  }
}

function buildLegacyAuthConfig (envPrefix: string = '', customConfig?: AuthConfiguration): AuthConfiguration {
  const prefix = envPrefix ? `${envPrefix}_` : ''
  const authority = customConfig?.authority ?? process.env[`${prefix}authorityEndpoint`] ?? 'https://login.microsoftonline.com'

  const clientId = customConfig?.clientId ?? process.env[`${prefix}clientId`]

  if (!clientId && !envPrefix && process.env.NODE_ENV === 'production') {
    throw new Error('ClientId required in production')
  }
  if (!clientId && envPrefix) {
    throw new Error(`ClientId not found for connection: ${envPrefix}`)
  }

  const tenantId = customConfig?.tenantId ?? process.env[`${prefix}tenantId`]

  return {
    tenantId,
    clientId: clientId!,
    clientSecret: customConfig?.clientSecret ?? process.env[`${prefix}clientSecret`],
    certPemFile: customConfig?.certPemFile ?? process.env[`${prefix}certPemFile`],
    certKeyFile: customConfig?.certKeyFile ?? process.env[`${prefix}certKeyFile`],
    sendX5C: customConfig?.sendX5C ?? (process.env[`${prefix}sendX5C`] === 'true'),
    connectionName: customConfig?.connectionName ?? process.env[`${prefix}connectionName`],
    FICClientId: customConfig?.FICClientId ?? process.env[`${prefix}FICClientId`],
    authority,
    scope: customConfig?.scope ?? process.env[`${prefix}scope`],
    issuers: customConfig?.issuers ?? getDefaultIssuers(tenantId as string, authority),
    altBlueprintConnectionName: customConfig?.altBlueprintConnectionName ?? process.env[`${prefix}altBlueprintConnectionName`],
    WIDAssertionFile: customConfig?.WIDAssertionFile ?? process.env[`${prefix}WIDAssertionFile`]
  }
}

function getDefaultIssuers (tenantId: string, authority: string) : string[] {
  return [
    'https://api.botframework.com',
    `https://sts.windows.net/${tenantId}/`,
    `${authority}/${tenantId}/v2.0`
  ]
}
