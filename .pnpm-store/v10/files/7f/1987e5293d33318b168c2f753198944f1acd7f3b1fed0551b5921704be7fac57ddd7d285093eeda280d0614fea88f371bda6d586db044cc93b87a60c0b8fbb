import GlobalErrorHandlerMiddleware, { setErrorHandler } from './global-error-handler'
import type { MiddlewareDescriptor, MiddlewareParams } from './index'
import { responseFactory } from '../test/index'

describe('Middleware / GlobalErrorHandlerMiddleware', () => {
  let middleware: Partial<MiddlewareDescriptor>
  const params: MiddlewareParams = {
    clientId: 'testClient',
    context: {},
    resourceMethod: 'bar',
    resourceName: 'Foo',
  }

  beforeEach(() => {
    middleware = GlobalErrorHandlerMiddleware(params)
  })

  it('exposes name', () => {
    expect(GlobalErrorHandlerMiddleware.name).toEqual('GlobalErrorHandlerMiddleware')
  })

  describe('when it succeeds', () => {
    it('allows the promise to proceed with the original response', (done) => {
      const originalResponse = responseFactory({ data: { response: true } })

      middleware
        .response?.(
          () => Promise.resolve(originalResponse),
          () => Promise.resolve(originalResponse),
          originalResponse.request()
        )
        .then((response) => {
          expect(response).toEqual(originalResponse)
          done()
        })
    })
  })

  describe('when the error handler returns false', () => {
    it('allows the promise to follow the error flow ("catch")', (done) => {
      const originalResponse = responseFactory({ errors: [new Error('true')] })
      const errorHandler = jest.fn()
      setErrorHandler(errorHandler)

      middleware
        .response?.(
          () => Promise.reject(originalResponse),
          () => Promise.resolve(originalResponse),
          originalResponse.request()
        )
        .then((response) => {
          done.fail(`Expected this promise to fail: ${response}`)
        })
        .catch((response) => {
          expect(errorHandler).toHaveBeenCalledWith(originalResponse)
          expect(response).toEqual(originalResponse)
          done()
        })
    })
  })

  describe('when the error handler returns true', () => {
    it('skips the promise error flow ("catch")', (done) => {
      const originalResponse = responseFactory({ errors: [new Error('true')] })
      const errorHandler = jest.fn((response) => {
        expect(response).toEqual(originalResponse)
        done()
        return true
      })

      setErrorHandler(errorHandler)

      middleware
        .response?.(
          () => Promise.reject(originalResponse),
          () => Promise.resolve(originalResponse),
          originalResponse.request()
        )
        .then((response) => {
          done.fail(`Expected this promise to fail: ${response}`)
        })
        .catch((response) => {
          done.fail(`Expected this to never be called: ${response}`)
        })
    })
  })
})
