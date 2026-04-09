import MethodDescriptor from './method-descriptor'
import { Request } from './request'

const methodDescriptorParams = {
  param: 'method-desc-value',
  'method-desc-param': 'method-desc-value',
}

const methodDescriptorArgs = {
  headers: { header: 'method-desc-value', 'Method-Desc-Header': 'method-desc-value' },
  host: 'http://original-host.com/',
  params: methodDescriptorParams,
  path: '/path',
}

const methodDescriptor = new MethodDescriptor(methodDescriptorArgs)

const requestParams = {
  auth: { username: 'peter', password: 'pan' },
  body: { payload: { 'request-payload': 'request-value' }, 'request-payload': 'request-value' },
  headers: { header: 'request-value', 'Request-Header': 'request-value' },
  host: 'http://request-host.com/',
  param: 'request-value',
  'request-param': 'request-value',
  timeout: 450,
}

describe('Request', () => {
  it('requestParams is optional', async () => {
    const request = new Request(methodDescriptor)
    expect(request).toEqual({
      requestContext: {},
      methodDescriptor,
      requestParams: {},
    })
  })

  it('sets requestParams', async () => {
    const request = new Request(methodDescriptor, requestParams)

    expect(request).toEqual({
      requestContext: {},
      methodDescriptor,
      requestParams,
    })
  })

  describe('#params', () => {
    it('merges methodDescriptor params with requestParams', async () => {
      const request = new Request(methodDescriptor, requestParams)
      expect(request.params()).toEqual({
        'method-desc-param': 'method-desc-value',
        param: 'request-value',
        'request-param': 'request-value',
      })
    })

    describe('without "requestParams"', () => {
      it('returns the "params" configured in the method descriptor', () => {
        const request = new Request(methodDescriptor)
        expect(request.params()).toEqual(methodDescriptor.params)
      })
    })

    describe('with "requestParams"', () => {
      it('merges "requestParams" and configured "params"', () => {
        const request = new Request(methodDescriptor, { title: 'test' })
        expect(request.params()).toEqual({ ...methodDescriptor.params, title: 'test' })
      })
    })

    it('does not return the body configured param', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        bodyAttr: 'payload',
        params: { id: 1, payload: 'abc' },
      })
      const request = new Request(methodDescriptor, { title: 'test' })
      expect(request.params()).toEqual({ id: 1, title: 'test' })
    })

    it('does not return the headers configured param', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        headersAttr: 'myHeaders',
        params: { id: 1, myHeaders: { a: 1 } },
      })
      const request = new Request(methodDescriptor, { title: 'test' })
      expect(request.params()).toEqual({ id: 1, title: 'test' })
    })

    it('does not return the host configured param', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        hostAttr: 'myHost',
        params: { id: 1, myHost: 'http://example.org' },
      })
      const request = new Request(methodDescriptor, { title: 'test' })
      expect(request.params()).toEqual({ id: 1, title: 'test' })
    })
  })

  describe('#method', () => {
    it('returns method descriptor method', async () => {
      const request = new Request(methodDescriptor, requestParams)
      expect(request.method()).toEqual(methodDescriptor.method)
    })

    it('returns the http method always in lowercase', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        method: 'GET',
      })
      const request = new Request(methodDescriptor)
      expect(request.method()).toEqual('get')
    })
  })

  describe('#host', () => {
    it('returns host name without trailing slash', async () => {
      const request = new Request(methodDescriptor, requestParams)
      expect(request.host()).toEqual('http://original-host.com')
    })

    it('returns request host name when allow resource host override', async () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        allowResourceHostOverride: true,
      })
      const request = new Request(methodDescriptor, requestParams)
      expect(request.host()).toEqual('http://request-host.com')
    })

    it('has methodDescriptor host as the default host', () => {
      const request = new Request(methodDescriptor, requestParams)
      expect(request.host()).toEqual('http://original-host.com')
    })

    describe('with allowResourceHostOverride', () => {
      it('returns the configured host param from params', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          hostAttr: 'differentHostParam',
          allowResourceHostOverride: true,
        })
        const request = new Request(methodDescriptor, {
          differentHostParam: 'http://different-host-param.org',
        })
        expect(request.host()).toEqual('http://different-host-param.org')
      })

      it('returns the host', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          allowResourceHostOverride: true,
        })
        const request = new Request(methodDescriptor, { host: 'http://host-param.org' })
        expect(request.host()).toEqual('http://host-param.org')
      })
    })

    it('removes trailing "/"', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        host: 'http://example.org/',
      })
      const request = new Request(methodDescriptor)
      expect(request.host()).toEqual('http://example.org')
    })
  })

  describe('#path', () => {
    it('returns path with parameters and leading slash.', async () => {
      const request = new Request(methodDescriptor, requestParams)
      expect(request.path()).toEqual(
        '/path?param=request-value&method-desc-param=method-desc-value&request-param=request-value'
      )
    })

    it('ignores "special" params', async () => {
      const abortController = new AbortController()
      const request = new Request(methodDescriptor, {
        ...requestParams,
        timeout: 123,
        signal: abortController.signal,
      })
      expect(request.path()).toEqual(
        '/path?param=request-value&method-desc-param=method-desc-value&request-param=request-value'
      )
    })

    it('returns result of method descriptor path function', async () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        path: (params) => {
          return Object.keys(params).join('/')
        },
      })
      const request = new Request(methodDescriptor, requestParams)
      expect(request.path()).toEqual(
        '/param/method-desc-param/request-param?param=request-value&method-desc-param=method-desc-value&request-param=request-value'
      )
    })

    it('ensures leading "/"', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: undefined,
        path: 'api/example.json',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json')
    })

    it('appends params as query string', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { id: 1, title: 'test' },
        path: 'api/example.json',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json?id=1&title=test')
    })

    it('encodes query string params', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { email: 'email+test@example.com' },
        path: 'api/example.json',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json?email=email%2Btest%40example.com')
    })

    it('encodes query string params with custom encoding function if passed', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { code: 'my:code-123' },
        parameterEncoder: (arg) => encodeURI(arg.toString()),
        path: 'api/example.json',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json?code=my:code-123')
    })

    it('appends the query string with a leading & if the path has a hard-coded query string', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { title: 'test' },
        path: '/api/example.json?id=1',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json?id=1&title=test')
    })

    it('renames the params according to their queryParamAlias when appending them to the query string', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { userId: 1, transactionId: 2 },
        path: '/api/example.json',
        queryParamAlias: { userId: 'user_id' },
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json?user_id=1&transactionId=2')
    })

    it('encodes aliased query string params', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { userEmail: 'email+test@example.com' },
        path: '/api/example.json',
        queryParamAlias: { userEmail: 'user_email' },
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json?user_email=email%2Btest%40example.com')
    })

    it('encodes arrays in the param[]=value format', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { userTransactionsIds: [2, 3] },
        path: '/api/example.json',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual(
        '/api/example.json?userTransactionsIds%5B%5D=2&userTransactionsIds%5B%5D=3'
      )
    })

    it('encodes arrays with custom encoding function if passed', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { userTransactionsIds: [2, 3] },
        parameterEncoder: (arg) => arg.toString().replace(/(\[|\])/g, ''),
        path: '/api/example.json',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json?userTransactionsIds=2&userTransactionsIds=3')
    })

    it('encodes objects in the param[key]=value format', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { user: { email: 'email+test@example.com' } },
        path: 'api/example.json',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json?user%5Bemail%5D=email%2Btest%40example.com')
    })

    it('interpolates paths with dynamic segments', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { id: 1, title: 'test' },
        path: '/api/example/{id}.json',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example/1.json?title=test')
    })

    it('interpolates paths with optional dynamic segments', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { id: 1, title: 'test' },
        path: '/api/example/{id?}.json',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example/1.json?title=test')
    })

    it('interpolates paths with optional dynamic segments with falsy value', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { id: 0, boolean: false, title: 'test' },
        path: '/api/{boolean}/example/{id?}.json',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/false/example/0.json?title=test')
    })

    it('interpolates paths with multiple occurrence of same dynamic segment', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { id: 1, folder: 'test', title: 'value' },
        path: '/api/{folder?}/{folder}/{id}.json',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/test/test/1.json?title=value')
    })

    it('encodes params in dynamic segments', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { email: 'email+test@example.com' },
        path: '/api/example.json?email={email}',
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example.json?email=email%2Btest%40example.com')
    })

    it('encodes params with the function of the parameterEncoder parameter', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { role: 'mocked:uuid:role' },
        parameterEncoder: (arg) => encodeURI(arg.toString()),
        path: '/api/mock/{role}',
      })

      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/mock/mocked:uuid:role')
    })

    it('encodes params with the default encodeURIComponent if parameterEncoder is not set', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { role: 'mocked:uuid:role' },
        path: '/api/mock/{role}',
      })

      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/mock/mocked%3Auuid%3Arole')
    })

    it('does not apply queryParamAlias to interpolated dynamic segments', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { userId: 1 },
        path: '/api/example/{userId}.json',
        queryParamAlias: { userId: 'user_id' },
      })
      const path = new Request(methodDescriptor).path()
      expect(path).toEqual('/api/example/1.json')
    })

    describe('when dynamic segment is not provided', () => {
      it('removes optional dynamic segments', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          params: {},
          path: '{prefix?}/api/{optional?}/example.json',
        })
        const path = new Request(methodDescriptor).path()
        expect(path).toEqual('/api/example.json')
      })

      it('removes optional dynamic segments with null or undefined value', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          params: { undefined, null: null },
          path: '/api/{null?}/path/{undefined?}/example.json',
        })
        const path = new Request(methodDescriptor).path()
        expect(path).toEqual('/api/path/example.json')
      })

      it('raises an exception', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          path: '/api/example/{id}.json',
        })
        expect(() => new Request(methodDescriptor).path()).toThrow(
          '[Mappersmith] required parameter missing (id), "/api/example/{id}.json" cannot be resolved'
        )
      })
    })

    describe('when path is a function', () => {
      it('calls the function to resolve request path', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          params: undefined,
          path: jest.fn(() => 'dynamic_path'),
        })
        const path = new Request(methodDescriptor).path()
        expect(methodDescriptor.path).toHaveBeenCalled()
        expect(path).toEqual('/dynamic_path')
      })

      it('passes given params to the path function', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          params: { id: '123' },
          path: jest.fn((params) => {
            const idParts = (params['id'] as string).split('')
            delete params['id']
            return `${idParts.join('/')}.json`
          }),
        })
        const path = new Request(methodDescriptor).path()
        expect(path).toEqual('/1/2/3.json')
      })

      it('path function passes unused params in querystring', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          params: { id: '123', q: 'search' },
          path: jest.fn((params) => {
            const idParts = (params['id'] as string).split('')
            delete params['id']
            return `${idParts.join('/')}.htm`
          }),
        })
        const path = new Request(methodDescriptor).path()
        expect(path).toEqual('/1/2/3.htm?q=search')
      })
    })

    it('does not include headers', () => {
      const methodDesc = new MethodDescriptor({
        ...methodDescriptorArgs,
        path: '/api/example.json',
        params: { [methodDescriptor.headersAttr]: { 'Content-Type': 'application/json' } },
      })
      const path = new Request(methodDesc).path()
      expect(path).toEqual('/api/example.json')
    })

    it('does not include body', () => {
      const methodDesc = new MethodDescriptor({
        ...methodDescriptorArgs,
        path: '/api/example.json',
        bodyAttr: 'body',
        params: { [methodDescriptor.bodyAttr]: 'body-payload' },
      })
      const path = new Request(methodDesc).path()
      expect(path).toEqual('/api/example.json')
    })

    it('does not include host', () => {
      const methodDesc = new MethodDescriptor({
        ...methodDescriptorArgs,
        path: '/api/example.json',
        bodyAttr: 'body',
        params: { [methodDescriptor.hostAttr]: 'http://example.com' },
      })
      const path = new Request(methodDesc).path()
      expect(path).toEqual('/api/example.json')
    })

    describe('with empty path', () => {
      it('omits appending a slash', () => {
        const methodDesc = new MethodDescriptor({
          ...methodDescriptorArgs,
          host: 'http://original-host.com/api/v2',
          path: '',
          params: {},
        })
        const path = new Request(methodDesc).path()
        expect(path).toEqual('')

        const methodDesc2 = new MethodDescriptor({
          ...methodDescriptorArgs,
          path: () => '',
          params: {},
        })
        const path2 = new Request(methodDesc2).path()
        expect(path2).toEqual('')
      })

      it('does not omit slash if there are query params', () => {
        const methodDesc = new MethodDescriptor({
          ...methodDescriptorArgs,
          host: 'http://original-host.com/api/v2',
          path: '',
          params: {},
        })
        const path = new Request(methodDesc).path()
        expect(path).toEqual('')

        const methodDesc2 = new MethodDescriptor({
          ...methodDescriptorArgs,
          path: () => '',
          params: {},
        })
        const path2 = new Request(methodDesc2).path()
        expect(path2).toEqual('')
      })
    })
  })

  describe('#pathTemplate', () => {
    it('returns path with parameters and leading slash.', async () => {
      const request = new Request(methodDescriptor, requestParams)
      expect(request.pathTemplate()).toEqual('/path')
    })

    it('adds a slash if none exist', async () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        path: 'without-slash',
      })
      const request = new Request(methodDescriptor, requestParams)
      expect(request.pathTemplate()).toEqual('/without-slash')
    })

    it('returns result of method descriptor path function', async () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        path: (params) => {
          return Object.keys(params).join('/')
        },
      })
      const request = new Request(methodDescriptor, requestParams)
      expect(request.pathTemplate()).toEqual('/param/method-desc-param/request-param')
    })

    it('does not append params as query string', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { id: 1, title: 'test' },
        path: '/api/example.json',
      })
      const path = new Request(methodDescriptor).pathTemplate()
      expect(path).toEqual('/api/example.json')
    })

    it('does not interpolates paths with dynamic segments', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: { id: 1, title: 'test' },
        path: '/api/example/{id}.json',
      })
      const path = new Request(methodDescriptor).pathTemplate()
      expect(path).toEqual('/api/example/{id}.json')
    })
  })

  describe('#url', () => {
    it('joins host and path', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: undefined,
        host: 'http://example.org',
        path: 'api/example.json',
      })
      const url = new Request(methodDescriptor).url()
      expect(url).toEqual('http://example.org/api/example.json')
    })

    it('returns the full URL', async () => {
      const request = new Request(methodDescriptor, requestParams)
      expect(request.url()).toEqual(
        'http://original-host.com/path?param=request-value&method-desc-param=method-desc-value&request-param=request-value'
      )
    })

    describe('with path as function', () => {
      it('throws on non paths that evaluate to non-strings', () => {
        const methodDesc = new MethodDescriptor({
          ...methodDescriptorArgs,
          path: () => ({}) as unknown as string,
        })
        const req = new Request(methodDesc)
        expect(() => req.url()).toThrow(
          '[Mappersmith] method descriptor function did not return a string, params={"param":"method-desc-value","method-desc-param":"method-desc-value"}'
        )

        const methodDesc2 = new MethodDescriptor({
          ...methodDescriptorArgs,
          host: 'http://original-host.com/api/v2',
          path: () => null as unknown as string,
        })
        const req2 = new Request(methodDesc2)
        expect(() => req2.url()).toThrow(
          '[Mappersmith] method descriptor function did not return a string, params={"param":"method-desc-value","method-desc-param":"method-desc-value"}'
        )
      })
    })

    describe('with empty path', () => {
      it('allows empty path without appending a slash', () => {
        const methodDesc = new MethodDescriptor({
          ...methodDescriptorArgs,
          path: '',
          params: {},
        })
        const url = new Request(methodDesc).url()
        expect(url).toEqual('http://original-host.com')

        const methodDesc2 = new MethodDescriptor({
          ...methodDescriptorArgs,
          host: 'http://original-host.com/api/v2',
          path: () => '',
          params: {},
        })
        const url2 = new Request(methodDesc2).url()
        expect(url2).toEqual('http://original-host.com/api/v2')
      })

      it('does not omit slash if there are query params', () => {
        const methodDesc = new MethodDescriptor({
          ...methodDescriptorArgs,
          path: '',
          params: { param: 'bob' },
        })
        const url = new Request(methodDesc).url()
        expect(url).toEqual('http://original-host.com/?param=bob')

        const methodDesc2 = new MethodDescriptor({
          ...methodDescriptorArgs,
          host: 'http://original-host.com/api/v2',
          path: () => '',
          params: { param: 'bob' },
        })
        const url2 = new Request(methodDesc2).url()
        expect(url2).toEqual('http://original-host.com/api/v2/?param=bob')
      })
    })
  })

  describe('#headers', () => {
    it('returns an object with the headers with names converted to lowercase', async () => {
      const request = new Request(methodDescriptor, requestParams)
      expect(request.headers()).toEqual({
        header: 'request-value',
        'method-desc-header': 'method-desc-value',
        'request-header': 'request-value',
      })
    })

    it('returns the configured headers param from params', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        headers: undefined,
        headersAttr: 'differentHeadersParam',
      })
      const request = new Request(methodDescriptor, {
        differentHeadersParam: { Authorization: 'token-123' },
      })
      expect(request.headers()).toEqual({ authorization: 'token-123' })
    })

    describe('with pre-configured headers', () => {
      it('returns available headers', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          headers: { Authorization: 'token-123' },
        })
        const request = new Request(methodDescriptor)
        expect(request.headers()).toEqual({ authorization: 'token-123' })
      })
    })

    describe('with request headers', () => {
      it('returns available headers', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          headers: { Authorization: 'token-123' },
        })
        const request = new Request(methodDescriptor, {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        expect(request.headers()).toEqual({
          authorization: 'token-123',
          'content-type': 'application/json',
        })
      })
    })
  })

  describe('#header', () => {
    it('returns the value of the given header name', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        headers: { Authorization: 'token-123' },
      })
      const request = new Request(methodDescriptor)
      expect(request.header('authorization')).toEqual('token-123')
    })
  })

  describe('#body', () => {
    it('returns requestParams body', async () => {
      const request = new Request(methodDescriptor, requestParams)
      expect(request.body()).toEqual(requestParams.body)
    })

    it('returns the configured body param from params', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        bodyAttr: 'differentParam',
      })
      const request = new Request(methodDescriptor, { differentParam: 'abc123' })
      expect(request.body()).toEqual('abc123')
    })

    it('can return undefined', () => {
      const request = new Request(methodDescriptor, { ...requestParams, body: undefined })
      expect(request.body()).toBeUndefined()
    })
  })

  describe('#auth', () => {
    it('returns requestParams auth', async () => {
      const request = new Request(methodDescriptor, requestParams)
      expect(request.auth()).toEqual(requestParams.auth)
    })

    it('returns the configured auth param from params', () => {
      const authData = { username: 'bob', password: 'bob' }
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        authAttr: 'differentAuthParam',
      })
      const request = new Request(methodDescriptor, { differentAuthParam: authData })
      expect(request.auth()).toEqual(authData)
    })

    it('can return undefined', () => {
      const request = new Request(methodDescriptor, { ...requestParams, auth: undefined })
      expect(request.auth()).toBeUndefined()
    })
  })

  describe('#timeout', () => {
    it('returns requestParams timeout', async () => {
      const request = new Request(methodDescriptor, requestParams)
      expect(request.timeout()).toEqual(requestParams.timeout)
    })

    it('returns the configured timeout param from params', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        timeoutAttr: 'differentTimeoutParam',
      })
      const request = new Request(methodDescriptor, { differentTimeoutParam: 1000 })
      expect(request.timeout()).toEqual(1000)
    })

    it('can return undefined', () => {
      const request = new Request(methodDescriptor, { ...requestParams, timeout: undefined })
      expect(request.timeout()).toBeUndefined()
    })
  })

  describe('#signal', () => {
    it('returns requestParams signal', async () => {
      const abortController = new AbortController()
      const params = { ...requestParams, signal: abortController.signal }
      const request = new Request(methodDescriptor, params)
      expect(request.signal()).toEqual(params.signal)
    })

    it('returns the configured signal param from params', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        signalAttr: 'differentSignalParam',
      })
      const abortController = new AbortController()
      const request = new Request(methodDescriptor, {
        differentSignalParam: abortController.signal,
      })
      expect(request.signal()).toEqual(abortController.signal)
    })

    it('can return undefined', () => {
      const request = new Request(methodDescriptor, requestParams)
      expect(request.signal()).toBeUndefined()
    })
  })

  describe('#isBinary', () => {
    it('returns method descriptor binary value', async () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        binary: true,
      })
      const request = new Request(methodDescriptor, requestParams)
      expect(request.isBinary()).toEqual(true)
    })
  })

  describe('#enhance', () => {
    it('returns a new request enhanced by current request', async () => {
      const abortController = new AbortController()
      const request = new Request(methodDescriptor, requestParams)
      const extras = {
        auth: { 'enhanced-auth': 'enhanced-auth-value' },
        body: 'enhanced-body',
        headers: { 'enhanced-header': 'enhanced-header-value' },
        host: 'http://enhanced-host.com',
        params: { 'enhanced-param': 'enhanced-param-value' },
        timeout: 100,
        signal: abortController.signal,
      }
      expect(request.enhance(extras)).toEqual(
        new Request(methodDescriptor, {
          ...extras.params,
          param: 'request-value',
          'request-param': 'request-value',
          auth: extras.auth,
          body: extras.body,
          host: extras.host,
          headers: { ...extras.headers, ...requestParams.headers },
          timeout: 100,
          signal: abortController.signal,
        })
      )
    })

    it('creates a new request based on the current request merging the params', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        params: undefined,
      })
      const request = new Request(methodDescriptor, { a: 1 })
      const enhancedRequest = request.enhance({ params: { b: 2 } })
      expect(enhancedRequest).not.toEqual(request)
      expect(enhancedRequest.params()).toEqual({ a: 1, b: 2 })
    })

    it('creates a new request based on the current request merging the headers', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        headers: undefined,
      })
      const request = new Request(methodDescriptor, { headers: { 'x-old': 'no' } })
      const enhancedRequest = request.enhance({ headers: { 'x-special': 'yes' } })
      expect(enhancedRequest).not.toEqual(request)
      expect(enhancedRequest.headers()).toEqual({ 'x-old': 'no', 'x-special': 'yes' })
    })

    it('creates a new request based on the current request replacing the body', () => {
      const request = new Request(methodDescriptor, { body: 'payload-1' })
      const enhancedRequest = request.enhance({ body: 'payload-2' })
      expect(enhancedRequest).not.toEqual(request)
      expect(enhancedRequest.body()).toEqual('payload-2')
    })

    it('creates a new request based on the current request replacing the auth', () => {
      const authData1 = { username: 'bob', password: 'bob' }
      const authData2 = { username: 'bob', password: 'bill' }
      const request = new Request(methodDescriptor, { auth: authData1 })
      const enhancedRequest = request.enhance({ auth: authData2 })
      expect(enhancedRequest).not.toEqual(request)
      expect(enhancedRequest.auth()).toEqual(authData2)
    })

    it('creates a new request based on the current request replacing the timeout', () => {
      const request = new Request(methodDescriptor, { timeout: 1000 })
      const enhancedRequest = request.enhance({ timeout: 2000 })
      expect(enhancedRequest).not.toEqual(request)
      expect(enhancedRequest.timeout()).toEqual(2000)
    })

    it('creates a new request based on the current request replacing the signal', () => {
      const abortController = new AbortController()
      const abortController2 = new AbortController()
      const request = new Request(methodDescriptor, { signal: abortController.signal })
      const enhancedRequest = request.enhance({ signal: abortController2.signal })
      expect(enhancedRequest).not.toEqual(request)
      expect(enhancedRequest.signal()).toEqual(abortController2.signal)
      expect(enhancedRequest.signal()).toEqual(abortController.signal)
    })

    it('creates a new request based on the current request replacing the path', () => {
      const request = new Request({ ...methodDescriptor, params: {} })
      const enhancedRequest = request.enhance({ path: '/new-path' })
      expect(enhancedRequest).not.toEqual(request)
      expect(enhancedRequest.path()).toEqual('/new-path')
    })

    it('does not remove the previously assigned "body"', () => {
      const request = new Request(methodDescriptor, { body: 'test' })
      const enhancedRequest = request.enhance({})
      expect(enhancedRequest.body()).toEqual('test')
    })

    it('does not remove the previously assigned "auth"', () => {
      const request = new Request(methodDescriptor, { auth: { username: 'a', password: 'b' } })
      const enhancedRequest = request.enhance({})
      expect(enhancedRequest.auth()).toEqual({ username: 'a', password: 'b' })
    })

    it('does not remove the previously assigned "timeout"', () => {
      const request = new Request(methodDescriptor, { timeout: 1000 })
      const enhancedRequest = request.enhance({})
      expect(enhancedRequest.timeout()).toEqual(1000)
    })

    it('does not remove the previously assigned "signal"', () => {
      const abortController = new AbortController()
      const request = new Request(methodDescriptor, { signal: abortController.signal })
      const enhancedRequest = request.enhance({})
      expect(enhancedRequest.signal()).toEqual(abortController.signal)
    })

    it('does not remove the previously assigned "host" if allowResourceHostOverride=true', () => {
      const methodDescriptor = new MethodDescriptor({
        ...methodDescriptorArgs,
        allowResourceHostOverride: true,
      })
      const request = new Request(methodDescriptor, { host: 'http://example.org' })
      const enhancedRequest = request.enhance({})
      expect(enhancedRequest.host()).toEqual('http://example.org')
    })

    it('does not remove the previously assigned "path"', () => {
      const request = new Request({ ...methodDescriptor, params: {} }, { path: '/the-api' })
      const enhancedRequest = request.enhance({})
      expect(enhancedRequest.path()).toEqual('/the-api')
    })

    describe('for requests with a different "headers" key', () => {
      it('creates a new request based on the current request merging the custom "headers" key', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          headers: undefined,
          headersAttr: 'snowflake',
        })
        const request = new Request(methodDescriptor, { snowflake: { 'x-old': 'no' } })
        const enhancedRequest = request.enhance({ headers: { 'x-special': 'yes' } })
        expect(enhancedRequest).not.toEqual(request)
        expect(enhancedRequest.headers()).toEqual({ 'x-old': 'no', 'x-special': 'yes' })
      })
    })

    describe('for requests with a different "body" key', () => {
      it('creates a new request based on the current request replacing the custom "body"', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          bodyAttr: 'snowflake',
        })
        const request = new Request(methodDescriptor, { snowflake: 'payload-1' })
        const enhancedRequest = request.enhance({ body: 'payload-2' })
        expect(enhancedRequest).not.toEqual(request)
        expect(enhancedRequest.body()).toEqual('payload-2')
      })
    })

    describe('for requests with a different "auth" key', () => {
      it('creates a new request based on the current request replacing the custom "auth"', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          authAttr: 'snowflake',
        })
        const authData1 = { username: 'bob', password: 'bob' }
        const authData2 = { username: 'bob', password: 'bill' }
        const request = new Request(methodDescriptor, { snowflake: authData1 })
        const enhancedRequest = request.enhance({ auth: authData2 })
        expect(enhancedRequest).not.toEqual(request)
        expect(enhancedRequest.auth()).toEqual(authData2)
      })
    })

    describe('for requests with a different "timeout" key', () => {
      it('creates a new request based on the current request replacing the custom "timeout"', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          timeoutAttr: 'snowflake',
        })
        const request = new Request(methodDescriptor, { snowflake: 1000 })
        const enhancedRequest = request.enhance({ timeout: 2000 })
        expect(enhancedRequest).not.toEqual(request)
        expect(enhancedRequest.timeout()).toEqual(2000)
      })
    })

    describe('for requests with a different "signal" key', () => {
      it('creates a new request based on the current request replacing the custom "signal"', () => {
        const abortController = new AbortController()
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          timeoutAttr: 'snowflake',
        })
        const request = new Request(methodDescriptor, { snowflake: 1000 })
        const enhancedRequest = request.enhance({ signal: abortController.signal })
        expect(enhancedRequest).not.toEqual(request)
        expect(enhancedRequest.signal()).toEqual(abortController.signal)
      })
    })

    describe('for requests with a different "host" key', () => {
      it('creates a new request based on the current request replacing the custom "host"', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          hostAttr: 'snowflake',
          allowResourceHostOverride: true,
        })
        const request = new Request(methodDescriptor, { snowflake: 'http://new-api.com' })
        const enhancedRequest = request.enhance({ host: 'http://old-api.com' })
        expect(enhancedRequest).not.toEqual(request)
        expect(enhancedRequest.host()).toEqual('http://old-api.com')
      })
    })

    describe('for requests with a different "path" key', () => {
      it('creates a new request based on the current request replacing the custom "path"', () => {
        const methodDescriptor = new MethodDescriptor({
          ...methodDescriptorArgs,
          pathAttr: '__path',
        })
        const request = new Request(methodDescriptor, { __path: '/new-api' })
        expect(request.path()).toEqual(
          '/new-api?param=method-desc-value&method-desc-param=method-desc-value'
        )
        const enhancedRequest = request.enhance({ path: '/old-api' })
        expect(enhancedRequest).not.toEqual(request)
        expect(enhancedRequest.path()).toEqual(
          '/old-api?param=method-desc-value&method-desc-param=method-desc-value'
        )
      })
    })
  })

  describe('#context', () => {
    const requestContext = {
      myProp: 'myValue',
    }

    it('returns the specified context', async () => {
      const request = new Request(methodDescriptor, requestParams, requestContext)
      expect(request.context()).toEqual({
        myProp: 'myValue',
      })
    })

    describe('when enhancing a request', () => {
      it('extends the specified context', async () => {
        const extendedContext = {
          myProp2: 'myValue2',
        }
        const request = new Request(methodDescriptor, requestParams, requestContext)
        const enhanced = request.enhance({}, extendedContext)
        expect(enhanced.context()).toEqual({
          myProp: 'myValue',
          myProp2: 'myValue2',
        })
      })

      it('overrides any previously set values', async () => {
        const extendedContext = {
          myProp: 'myOverrideValue',
          myProp2: 'myValue2',
        }
        const request = new Request(methodDescriptor, requestParams, requestContext)
        const enhanced = request.enhance({}, extendedContext)
        expect(enhanced.context()).toEqual({
          myProp: 'myOverrideValue',
          myProp2: 'myValue2',
        })
      })
    })
  })
})
