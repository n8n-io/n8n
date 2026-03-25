import EncodeJsonMiddleware, { CONTENT_TYPE_JSON } from './encode-json'
import type { AbortFn, MiddlewareDescriptor, MiddlewareParams } from './index'
import type { Headers } from '../types'
import { requestFactory } from '../test/index'

const abort: AbortFn = () => ({})

describe('Middleware / EncodeJson', () => {
  let middleware: Partial<MiddlewareDescriptor>
  const params: MiddlewareParams = {
    clientId: 'testClient',
    context: {},
    resourceMethod: 'bar',
    resourceName: 'Foo',
  }
  let body: Record<string, unknown>

  beforeEach(() => {
    body = { nice: 'object' }
    middleware = EncodeJsonMiddleware(params)
  })

  it('exposes name', () => {
    expect(EncodeJsonMiddleware.name).toEqual('EncodeJsonMiddleware')
  })

  it('stringify the body and add "content-type" application/json', async () => {
    const request = requestFactory({ host: 'example.com', path: '/', method: 'get', body })
    const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)
    expect(newRequest?.body()).toEqual(JSON.stringify(body))
    expect(newRequest?.headers()['content-type']).toEqual(CONTENT_TYPE_JSON)
  })

  describe('when the request does not have a body', () => {
    it('returns the original request', async () => {
      const request = requestFactory({ host: 'example.com', path: '/', method: 'get' })
      expect(request.body()).toBeUndefined()

      const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)
      expect(newRequest?.body()).toBeUndefined()
      expect(newRequest?.headers()['content-type']).toBeUndefined()
    })
  })

  describe('when body is an invalid JSON', () => {
    beforeEach(() => {
      const data: Record<string, unknown> = {}
      data['attr'] = data
      body = data
    })

    it('keeps the original request', async () => {
      const request = requestFactory({ host: 'example.com', path: '/', method: 'get', body })
      const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)
      expect(newRequest?.body()).toEqual(body)
      expect(newRequest?.headers()).toEqual({})
    })
  })

  describe('when there is already a content-type header set', () => {
    let headers: Headers

    beforeEach(() => {
      body = { something: 'strange' }
      headers = { 'content-type': 'application/java-archive' }
    })

    it('returns the original request', async () => {
      const request = requestFactory({
        host: 'example.com',
        path: '/',
        method: 'post',
        body,
        headers,
      })
      const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)
      expect(newRequest?.body()).toEqual(body)
      expect(newRequest?.headers()).toEqual(headers)
    })

    describe('when the content-type is application/json', () => {
      let headers: Headers

      beforeEach(() => {
        headers = { 'content-type': 'application/json' }
      })

      describe('and the body is already encoded', () => {
        let body: string

        beforeEach(() => {
          body = JSON.stringify({ foo: 'bar' })
        })

        it('returns the original request', async () => {
          const request = requestFactory({
            host: 'example.com',
            path: '/',
            method: 'post',
            body,
            headers,
          })
          const newRequest = await middleware.prepareRequest?.(
            () => Promise.resolve(request),
            abort
          )
          expect(newRequest?.body()).toEqual(body)
          expect(newRequest?.headers()).toEqual(headers)
        })
      })

      describe('and the body is not encoded', () => {
        beforeEach(() => {
          body = { foo: 'bar' }
        })

        it('encodes the body but keeps the original header', async () => {
          const request = requestFactory({
            host: 'example.com',
            path: '/',
            method: 'post',
            body,
            headers,
          })
          const newRequest = await middleware.prepareRequest?.(
            () => Promise.resolve(request),
            abort
          )
          expect(newRequest?.body()).toEqual(JSON.stringify(body))
          expect(newRequest?.headers()).toEqual(headers)
        })
      })
    })

    describe('when content-type is the application/+json family', () => {
      it.each([
        ['application/json;charset=utf-8'],
        ['application/ld+json;charset=utf-8'],
        ['application/problem+json;charset=utf-8'],
        ['application/vnd.spring-boot.actuator.v3+json;charset=utf-8'],
        ['application/vnd.cars.api.service.specification.v2+json'],
      ])('returns the parsed object given content type %s', async (contentType) => {
        const headers: Headers = { 'content-type': contentType }
        const request = requestFactory({
          host: 'example.com',
          path: '/',
          method: 'post',
          body,
          headers,
        })
        const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)
        expect(newRequest?.body()).toEqual(JSON.stringify(body))
        expect(newRequest?.headers()).toEqual(headers)
      })
    })

    describe('when the content-type is application/json but with a different charset', () => {
      let headers: Headers, body: string

      beforeEach(() => {
        headers = { 'content-type': 'application/json;charset=utf-7' }
        body = 'strange-stuff'
      })

      it('keeps the original request', async () => {
        const request = requestFactory({
          host: 'example.com',
          path: '/',
          method: 'post',
          body,
          headers,
        })
        const newRequest = await middleware.prepareRequest?.(() => Promise.resolve(request), abort)
        expect(newRequest?.body()).toEqual(body)
        expect(newRequest?.headers()).toEqual(headers)
      })
    })
  })
})
