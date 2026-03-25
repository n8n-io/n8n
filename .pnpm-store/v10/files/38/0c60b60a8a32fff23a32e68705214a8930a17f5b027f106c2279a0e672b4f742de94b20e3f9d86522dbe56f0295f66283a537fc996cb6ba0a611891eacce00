import { ClientConfig } from 'pg'

export function parse(connectionString: string, options?: Options): ConnectionOptions

export interface Options {
  // Use libpq semantics when interpreting the connection string
  useLibpqCompat?: boolean
}

interface SSLConfig {
  ca?: string
  cert?: string | null
  key?: string
  rejectUnauthorized?: boolean
}

export interface ConnectionOptions {
  host: string | null
  password?: string
  user?: string
  port?: string | null
  database: string | null | undefined
  client_encoding?: string
  ssl?: boolean | string | SSLConfig

  application_name?: string
  fallback_application_name?: string
  options?: string
  keepalives?: number

  // We allow any other options to be passed through
  [key: string]: unknown
}

export function toClientConfig(config: ConnectionOptions): ClientConfig
export function parseIntoClientConfig(connectionString: string): ClientConfig
