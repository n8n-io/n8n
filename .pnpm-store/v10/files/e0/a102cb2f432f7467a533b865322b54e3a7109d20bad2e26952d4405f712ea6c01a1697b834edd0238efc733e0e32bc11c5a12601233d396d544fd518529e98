import MethodDescriptor from './method-descriptor'
import { Request } from './request'
import { Response } from './response'
import type { Headers } from './types'

const methodDescriptor = new MethodDescriptor({
  headers: {},
  host: 'host:9000',
  params: {},
  path: '/path',
})

const request = new Request(methodDescriptor)

describe('Response', () => {
  const responseStatus = 204
  const responseHeaders = { 'res-header': 'res-value' }
  const errors = [new Error('A new error')]
  const responseData = 'a lot of data'
  const response = new Response(request, responseStatus, responseData, responseHeaders, errors)

  it('constructs a response from request', async () => {
    expect(response).toEqual({
      errors,
      responseHeaders,
      responseData,
      responseStatus,
      originalRequest: request,
      timeElapsed: null,
    })
  })

  it('masks auth password', async () => {
    const newRequest = request.enhance({ auth: { username: 'not_secret', password: 'secret' } })
    const response = new Response(newRequest, responseStatus, responseData, responseHeaders, errors)
    expect(response).toEqual({
      errors,
      responseHeaders,
      responseData,
      responseStatus,
      originalRequest: {
        ...newRequest,
        requestParams: {
          ...newRequest.requestParams,
          auth: {
            ...newRequest.requestParams.auth,
            password: '***',
          },
        },
      },
      timeElapsed: null,
    })
  })

  it('changing the auth params does not mutate the original request', () => {
    const requestParams = { auth: { username: 'bob', password: 'bob' } }
    const request = new Request(methodDescriptor, requestParams)
    const newResponse = new Response(request, responseStatus, responseData, responseHeaders)
    expect(newResponse.originalRequest.requestParams.auth?.['password']).toEqual('***')
    expect(request.requestParams.auth?.['password']).toEqual('bob')
  })

  describe('#request', () => {
    it('returns the original request', async () => {
      expect(response.request()).toEqual(request)
    })
  })

  describe('#status', () => {
    it('returns the original request', async () => {
      expect(response.request()).toEqual(request)
    })

    describe('when status is 1223 (IE behavior)', () => {
      it('returns 204', () => {
        const response = new Response(request, 1223, responseData, responseHeaders, errors)
        expect(response.status()).toEqual(204)
      })
    })
  })

  describe('#success', () => {
    it('returns true when status is between 200...400', () => {
      expect(new Response(request, 102).success()).toEqual(false)
      expect(new Response(request, 200).success()).toEqual(true)
      expect(new Response(request, 308).success()).toEqual(true)
      expect(new Response(request, 400).success()).toEqual(false)
    })
  })

  describe('#headers', () => {
    it('returns response headers with names in lowercase', () => {
      const responseHeaders = { 'X-SOMETHING': true, 'X-AnOtHeR': 'test' }
      const response = new Response(request, 200, responseData, responseHeaders)
      expect(response.headers()).toEqual({ 'x-something': true, 'x-another': 'test' })
    })
  })

  describe('#header', () => {
    it('returns the value of the given header name', () => {
      const responseHeaders = { 'X-SOMETHING': true, 'X-AnOtHeR': 'test' }
      const response = new Response(request, 200, responseData, responseHeaders)
      expect(response.header('x-something')).toEqual(true)
      expect(response.header('x-another')).toEqual('test')
    })
  })

  describe('#rawData', () => {
    it('returns raw responseData', () => {
      expect(response.rawData()).toEqual(responseData)
    })
  })

  describe('#data', () => {
    it('returns the response data', () => {
      expect(response.data()).toEqual(responseData)
    })

    describe('when responseData is JSON', () => {
      it.each([
        ['application/json;charset=utf-8'],
        ['application/ld+json;charset=utf-8'],
        ['application/problem+json;charset=utf-8'],
        ['application/vnd.spring-boot.actuator.v3+json;charset=utf-8'],
      ])('returns the parsed object given content type %s', (contentType) => {
        const responseData = JSON.stringify({ nice: 'json' })
        const responseHeaders = { 'Content-Type': contentType }
        const response = new Response(request, 200, responseData, responseHeaders)
        expect(response.data()).toEqual({ nice: 'json' })
      })

      describe('when content type is not json', () => {
        it.each([
          ['application/pdf;charset=utf-8'],
          ['text/html;charset=utf-8'],
          [
            'application/vnd.openxmlformats-officedocument.stringwithjsoninit.presentation;charset=utf-8',
          ],
        ])('returns rawData given content type %s', (contentType) => {
          const responseData = JSON.stringify({ nice: 'json' })
          const responseHeaders = { 'Content-Type': contentType }
          const response = new Response(request, 200, responseData, responseHeaders)
          expect(response.data()).toEqual(responseData)
        })
      })

      describe('and the payload is a invalid JSON', () => {
        it('returns rawData', () => {
          const responseData = 'invalid{json}'
          const responseHeaders = { 'Content-Type': 'application/json;charset=utf-8' }
          const response = new Response(request, 200, responseData, responseHeaders)
          expect(response.data()).toEqual('invalid{json}')
        })
      })
    })
  })

  describe('#isContentTypeJSON', () => {
    it('returns true when content-type=application/json', () => {
      let responseHeaders: Headers = { 'Content-Type': 'application/json;charset=utf-8' }
      expect(new Response(request, 200, responseData, responseHeaders).isContentTypeJSON()).toEqual(
        true
      )

      responseHeaders = { 'Content-Type': 'text/plain' }
      expect(new Response(request, 200, responseData, responseHeaders).isContentTypeJSON()).toEqual(
        false
      )

      responseHeaders = {}
      expect(new Response(request, 200, responseData, responseHeaders).isContentTypeJSON()).toEqual(
        false
      )
    })
  })

  describe('#error', () => {
    it('returns null by default', () => {
      const response = new Response(request, 200, responseData, responseHeaders)
      expect(response.error()).toEqual(null)
    })

    it('returns the last error', () => {
      const lastError = new Error('third error')
      const response = new Response(request, 200, responseData, responseHeaders, [
        new Error('first error'),
        new Error('second error'),
        lastError,
      ])

      expect(response.error()).toEqual(lastError)
    })

    describe('when the error is just a string', () => {
      it('returns an instance of error', () => {
        const response = new Response(request, 200, responseData, responseHeaders, ['string error'])
        expect(response.error()).toEqual(new Error('string error'))
      })
    })
  })

  describe('#enhance', () => {
    it('creates a new response based on the current response replacing status', () => {
      const enhancedResponse = response.enhance({ status: 201 })
      expect(enhancedResponse).not.toEqual(response)
      expect(enhancedResponse.status()).toEqual(201)
    })

    it('creates a new response based on the current response replacing rawData', () => {
      const enhancedResponse = response.enhance({ rawData: 'payload' })
      expect(enhancedResponse).not.toEqual(response)
      expect(enhancedResponse.rawData()).toEqual('payload')
    })

    it('creates a new response based on the current response merging the headers', () => {
      const responseHeaders = { 'x-old': 'no' }
      const response = new Response(request, 200, responseData, responseHeaders)
      const enhancedResponse = response.enhance({ headers: { 'x-special': 'yes' } })
      expect(enhancedResponse).not.toEqual(response)
      expect(enhancedResponse.headers()).toEqual({ 'x-old': 'no', 'x-special': 'yes' })
    })

    it('creates a new response based on the current response adding new errors to the stack', () => {
      const originalError = new Error('original error')
      const newError = new Error('new error')
      const response = new Response(request, 200, responseData, responseHeaders, [originalError])
      const enhancedResponse = response.enhance({ error: newError })
      expect(enhancedResponse.error()).toEqual(newError)
      expect(enhancedResponse.errors).toEqual([originalError, newError])
    })

    it('creates a new response without adding undefined errors to the stack', () => {
      const originalError = new Error('original error')
      const response = new Response(request, 200, responseData, responseHeaders, [originalError])
      const enhancedResponse = response.enhance({})

      expect(enhancedResponse.error()).toEqual(originalError)
    })

    it('preserves timeElapsed', () => {
      response.timeElapsed = 123
      const enhancedResponse = response.enhance({})

      expect(enhancedResponse.timeElapsed).toEqual(123)
    })

    it('preserves empty strings in rawData', () => {
      const response = new Response(request, responseStatus, '', responseHeaders, errors)
      const enhancedResponse = response.enhance({})

      expect(enhancedResponse.rawData()).toEqual('')
    })
  })
})
