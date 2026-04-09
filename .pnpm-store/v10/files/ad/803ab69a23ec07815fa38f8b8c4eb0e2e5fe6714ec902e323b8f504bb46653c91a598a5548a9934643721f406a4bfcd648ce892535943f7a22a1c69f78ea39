import BasicAuthMiddleware from './basic-auth'
import type { AbortFn, MiddlewareDescriptor, MiddlewareParams } from './index'
import { requestFactory } from '../test/index'
import type { Auth } from '../types'

const abort: AbortFn = () => ({})

describe('Middleware / BasicAuth', () => {
  let middleware: Partial<MiddlewareDescriptor>
  const params: MiddlewareParams = {
    clientId: 'testClient',
    context: {},
    resourceMethod: 'bar',
    resourceName: 'Foo',
  }

  let authData: Auth

  beforeEach(() => {
    authData = { username: 'bob', password: 'bob' }
    middleware = BasicAuthMiddleware(authData)(params)
  })

  it('exposes name', () => {
    expect(BasicAuthMiddleware(authData).name).toEqual('BasicAuthMiddleware')
  })

  it('configures the auth data', async () => {
    const request = requestFactory({ host: 'example.com', path: '/', method: 'get' })
    const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)
    expect(newRequest?.auth()).toEqual(authData)
  })

  it('changing the request params does not mutate the configuration', async () => {
    const request = requestFactory({ host: 'example.com', path: '/', method: 'get' })
    const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)

    newRequest!.requestParams!.auth!.password = 'foo'
    expect(authData.password).toEqual('bob')
  })

  describe('when the auth property is explicitly defined', () => {
    it('keeps the original auth data', async () => {
      const authData2 = { username: 'bob', password: 'bill' }
      const request = requestFactory({
        host: 'example.com',
        path: '/',
        method: 'get',
        auth: authData2,
      })
      const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)
      expect(newRequest?.auth()).toEqual(authData2)
    })
  })
})
