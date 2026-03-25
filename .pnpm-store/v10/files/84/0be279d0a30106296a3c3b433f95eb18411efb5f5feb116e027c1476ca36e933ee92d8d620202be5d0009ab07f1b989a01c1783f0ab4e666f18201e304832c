import CsrfMiddleware from './csrf'
import type { AbortFn, MiddlewareDescriptor, MiddlewareParams } from './index'
import { requestFactory } from '../test/index'

const abort: AbortFn = () => ({})

describe('Middleware / CSRF', () => {
  let middleware: Partial<MiddlewareDescriptor>
  const params: MiddlewareParams = {
    clientId: 'testClient',
    context: {},
    resourceMethod: 'bar',
    resourceName: 'Foo',
  }

  beforeEach(() => {
    middleware = CsrfMiddleware()(params)
  })

  it('exposes name', () => {
    expect(CsrfMiddleware().name).toEqual('CsrfMiddleware')
  })

  it('adds a header if cookie is set in document.cookie', async () => {
    const request = requestFactory({ host: 'example.com', path: '/', method: 'get' })
    const token = 'eacb7710-3a75-49ab-a26a-cdffc5250f1c'
    document.cookie = 'csrfToken=eacb7710-3a75-49ab-a26a-cdffc5250f1c; _ga=GAxx'
    const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)
    expect(newRequest?.headers()['x-csrf-token']).toEqual(token)
  })

  describe('when csrfToken is missing from document.cookie', () => {
    beforeEach(() => {
      const data: Record<string, unknown> = {}
      data['attr'] = data
      middleware = CsrfMiddleware('csrfToken', 'x-csrf-token')(params)
    })

    it('does not add "x-csrf-token"', async () => {
      const request = requestFactory({ host: 'example.com', path: '/', method: 'get' })
      document.cookie = 'csrfToken='
      const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)
      expect(newRequest?.headers()).toEqual({})
    })
  })
})
