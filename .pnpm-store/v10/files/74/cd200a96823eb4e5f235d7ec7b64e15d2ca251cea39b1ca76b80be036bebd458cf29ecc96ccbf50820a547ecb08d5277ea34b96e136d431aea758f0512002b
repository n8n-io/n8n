export class StorageError extends Error {
  protected __isStorageError = true

  constructor(message: string) {
    super(message)
    this.name = 'StorageError'
  }
}

export function isStorageError(error: unknown): error is StorageError {
  return typeof error === 'object' && error !== null && '__isStorageError' in error
}

export class StorageApiError extends StorageError {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'StorageApiError'
    this.status = status
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
    }
  }
}

export class StorageUnknownError extends StorageError {
  originalError: unknown

  constructor(message: string, originalError: unknown) {
    super(message)
    this.name = 'StorageUnknownError'
    this.originalError = originalError
  }
}
