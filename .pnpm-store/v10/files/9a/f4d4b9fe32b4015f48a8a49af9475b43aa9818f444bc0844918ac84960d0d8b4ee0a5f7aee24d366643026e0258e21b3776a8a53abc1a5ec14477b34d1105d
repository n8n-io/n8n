import { WeakPasswordReasons } from './types'
import { ErrorCode } from './error-codes'

export class AuthError extends Error {
  /**
   * Error code associated with the error. Most errors coming from
   * HTTP responses will have a code, though some errors that occur
   * before a response is received will not have one present. In that
   * case {@link #status} will also be undefined.
   */
  code: ErrorCode | (string & {}) | undefined

  /** HTTP status code that caused the error. */
  status: number | undefined

  protected __isAuthError = true

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'AuthError'
    this.status = status
    this.code = code
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return typeof error === 'object' && error !== null && '__isAuthError' in error
}

export class AuthApiError extends AuthError {
  status: number

  constructor(message: string, status: number, code: string | undefined) {
    super(message, status, code)
    this.name = 'AuthApiError'
    this.status = status
    this.code = code
  }
}

export function isAuthApiError(error: unknown): error is AuthApiError {
  return isAuthError(error) && error.name === 'AuthApiError'
}

export class AuthUnknownError extends AuthError {
  originalError: unknown

  constructor(message: string, originalError: unknown) {
    super(message)
    this.name = 'AuthUnknownError'
    this.originalError = originalError
  }
}

export class CustomAuthError extends AuthError {
  name: string
  status: number

  constructor(message: string, name: string, status: number, code: string | undefined) {
    super(message, status, code)
    this.name = name
    this.status = status
  }
}

export class AuthSessionMissingError extends CustomAuthError {
  constructor() {
    super('Auth session missing!', 'AuthSessionMissingError', 400, undefined)
  }
}

export function isAuthSessionMissingError(error: any): error is AuthSessionMissingError {
  return isAuthError(error) && error.name === 'AuthSessionMissingError'
}

export class AuthInvalidTokenResponseError extends CustomAuthError {
  constructor() {
    super('Auth session or user missing', 'AuthInvalidTokenResponseError', 500, undefined)
  }
}

export class AuthInvalidCredentialsError extends CustomAuthError {
  constructor(message: string) {
    super(message, 'AuthInvalidCredentialsError', 400, undefined)
  }
}

export class AuthImplicitGrantRedirectError extends CustomAuthError {
  details: { error: string; code: string } | null = null
  constructor(message: string, details: { error: string; code: string } | null = null) {
    super(message, 'AuthImplicitGrantRedirectError', 500, undefined)
    this.details = details
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      details: this.details,
    }
  }
}

export function isAuthImplicitGrantRedirectError(
  error: any
): error is AuthImplicitGrantRedirectError {
  return isAuthError(error) && error.name === 'AuthImplicitGrantRedirectError'
}

export class AuthPKCEGrantCodeExchangeError extends CustomAuthError {
  details: { error: string; code: string } | null = null

  constructor(message: string, details: { error: string; code: string } | null = null) {
    super(message, 'AuthPKCEGrantCodeExchangeError', 500, undefined)
    this.details = details
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      details: this.details,
    }
  }
}

export class AuthRetryableFetchError extends CustomAuthError {
  constructor(message: string, status: number) {
    super(message, 'AuthRetryableFetchError', status, undefined)
  }
}

export function isAuthRetryableFetchError(error: unknown): error is AuthRetryableFetchError {
  return isAuthError(error) && error.name === 'AuthRetryableFetchError'
}

/**
 * This error is thrown on certain methods when the password used is deemed
 * weak. Inspect the reasons to identify what password strength rules are
 * inadequate.
 */
export class AuthWeakPasswordError extends CustomAuthError {
  /**
   * Reasons why the password is deemed weak.
   */
  reasons: WeakPasswordReasons[]

  constructor(message: string, status: number, reasons: string[]) {
    super(message, 'AuthWeakPasswordError', status, 'weak_password')

    this.reasons = reasons
  }
}

export function isAuthWeakPasswordError(error: unknown): error is AuthWeakPasswordError {
  return isAuthError(error) && error.name === 'AuthWeakPasswordError'
}

export class AuthInvalidJwtError extends CustomAuthError {
  constructor(message: string) {
    super(message, 'AuthInvalidJwtError', 400, 'invalid_jwt')
  }
}
