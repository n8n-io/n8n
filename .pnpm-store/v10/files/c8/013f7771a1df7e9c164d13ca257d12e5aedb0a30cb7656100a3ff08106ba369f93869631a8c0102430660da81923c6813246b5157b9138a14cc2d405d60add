import { client } from '@vitest/browser/client'

function serializeError(unhandledError) {
  const state = globalThis.__vitest_worker__
  const VITEST_TEST_NAME = state && state.current && state.current.type === 'test'
    ? state.current.name
    : undefined
  const VITEST_TEST_PATH = state && state.filepath ? state.filepath : undefined

  if (typeof unhandledError !== 'object' || !unhandledError) {
    return {
      message: String(unhandledError),
      VITEST_TEST_NAME,
      VITEST_TEST_PATH,
    }
  }

  return {
    name: unhandledError.name,
    message: unhandledError.message,
    stack: String(unhandledError.stack),
    VITEST_TEST_NAME,
    VITEST_TEST_PATH,
  }
}

function catchWindowErrors(errorEvent, prop, cb) {
  let userErrorListenerCount = 0
  function throwUnhandlerError(e) {
    if (userErrorListenerCount === 0 && e[prop] != null) {
      cb(e)
    }
    else {
      console.error(e[prop])
    }
  }
  const addEventListener = window.addEventListener.bind(window)
  const removeEventListener = window.removeEventListener.bind(window)
  window.addEventListener(errorEvent, throwUnhandlerError)
  window.addEventListener = function (...args) {
    if (args[0] === errorEvent) {
      userErrorListenerCount++
    }
    return addEventListener.apply(this, args)
  }
  window.removeEventListener = function (...args) {
    if (args[0] === errorEvent && userErrorListenerCount) {
      userErrorListenerCount--
    }
    return removeEventListener.apply(this, args)
  }
  return function clearErrorHandlers() {
    window.removeEventListener(errorEvent, throwUnhandlerError)
  }
}

function registerUnexpectedErrors() {
  const offError = catchWindowErrors('error', 'error', event =>
    reportUnexpectedError('Error', event.error))
  const offRejection = catchWindowErrors('unhandledrejection', 'reason', event =>
    reportUnexpectedError('Unhandled Rejection', event.reason))
  return () => {
    offError()
    offRejection()
  }
}

async function reportUnexpectedError(
  type,
  error,
) {
  const processedError = serializeError(error)
  await client.waitForConnection().then(() => {
    return client.rpc.onUnhandledError(processedError, type)
  }).catch(console.error)
}

globalThis.__vitest_browser_runner__.disposeExceptionTracker = registerUnexpectedErrors()
