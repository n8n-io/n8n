import { Request } from '../request'
import { MethodDescriptor } from '../method-descriptor'
import { requestFactory } from './index'

describe('mappersmith/test', () => {
  const method = 'GET'
  const host = 'http://example.org'
  const path = '/path'
  let methodDescriptor

  beforeEach(() => {
    methodDescriptor = new MethodDescriptor({ method, host, path })
  })

  describe('#requestFactory', () => {
    it('creates a request with a default method descriptor', async () => {
      const request = requestFactory()
      expect(request).toEqual(new Request(methodDescriptor))
    })

    it('accepts params to customize it', async () => {
      const requestParams = {
        auth: {
          'auth-key': 'auth-value',
        },
        body: {
          'body-key': 'body-value',
        },
        headers: {
          'my-header': 'my-header-value',
        },
        params: {
          group: 'general',
        },
        timeout: 20,
        'a key': 'a value',
      }
      const methodDescriptorParams = {
        method: 'POST',
        host: 'http://example.org',
        path: '/users/{group}',
      }
      const context = { foo: 'bar' }

      const request = requestFactory({
        ...methodDescriptorParams,
        ...requestParams,
        context,
      })

      expect(request).toEqual(
        new Request(new MethodDescriptor(methodDescriptorParams), requestParams, { foo: 'bar' })
      )
    })
  })
})
