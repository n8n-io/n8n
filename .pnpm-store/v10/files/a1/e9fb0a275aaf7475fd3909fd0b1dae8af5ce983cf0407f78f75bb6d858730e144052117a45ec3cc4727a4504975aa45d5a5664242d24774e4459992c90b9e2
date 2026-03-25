import { version } from './version'

/** Current session will be checked for refresh at this interval. */
export const AUTO_REFRESH_TICK_DURATION_MS = 30 * 1000

/**
 * A token refresh will be attempted this many ticks before the current session expires. */
export const AUTO_REFRESH_TICK_THRESHOLD = 3

/*
 * Earliest time before an access token expires that the session should be refreshed.
 */
export const EXPIRY_MARGIN_MS = AUTO_REFRESH_TICK_THRESHOLD * AUTO_REFRESH_TICK_DURATION_MS

export const GOTRUE_URL = 'http://localhost:9999'
export const STORAGE_KEY = 'supabase.auth.token'
export const AUDIENCE = ''
export const DEFAULT_HEADERS = { 'X-Client-Info': `gotrue-js/${version}` }
export const NETWORK_FAILURE = {
  MAX_RETRIES: 10,
  RETRY_INTERVAL: 2, // in deciseconds
}

export const API_VERSION_HEADER_NAME = 'X-Supabase-Api-Version'
export const API_VERSIONS = {
  '2024-01-01': {
    timestamp: Date.parse('2024-01-01T00:00:00.0Z'),
    name: '2024-01-01',
  },
}

export const BASE64URL_REGEX = /^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}$|[a-z0-9_-]{2}$)$/i

export const JWKS_TTL = 600000 // 10 minutes
