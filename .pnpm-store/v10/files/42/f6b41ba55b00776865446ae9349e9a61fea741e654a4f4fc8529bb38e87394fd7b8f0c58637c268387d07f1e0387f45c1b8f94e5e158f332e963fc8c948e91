export const isTimeoutError = (e: Error) => {
  return e && e.name === 'TimeoutError'
}

export const createTimeoutError = (message: string) => {
  const error = new Error(message)
  error.name = 'TimeoutError'
  return error
}
