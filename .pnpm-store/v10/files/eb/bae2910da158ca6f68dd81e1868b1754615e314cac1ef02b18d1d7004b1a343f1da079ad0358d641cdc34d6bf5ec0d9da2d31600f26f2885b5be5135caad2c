import TimeoutMiddleware from './timeout'
import type { AbortFn, MiddlewareDescriptor, MiddlewareParams } from './index'
import { requestFactory } from '../test/index'

const abort: AbortFn = () => ({})

describe('Middleware / Timeout', () => {
  let middleware: Partial<MiddlewareDescriptor>
  const params: MiddlewareParams = {
    clientId: 'testClient',
    context: {},
    resourceMethod: 'bar',
    resourceName: 'Foo',
  }

  beforeEach(() => {
    middleware = TimeoutMiddleware(100)(params)
  })

  it('exposes name', () => {
    expect(TimeoutMiddleware(100).name).toEqual('TimeoutMiddleware')
  })

  it('configures the timeout', async () => {
    const request = requestFactory()
    const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)
    expect(newRequest?.timeout()).toEqual(100)
  })

  describe('when the timeout property is explicitly defined', () => {
    it('keeps the original timeout value', async () => {
      const request = requestFactory({ timeout: 500 })
      const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)
      expect(newRequest?.timeout()).toEqual(500)
    })
  })
})
