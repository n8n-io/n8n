import { ClientBuilder } from './client-builder'
import { Manifest, GlobalConfigs } from './manifest'
import type { GatewayConfiguration } from './gateway/types'
import { Gateway } from './gateway/index'
import Request from './request'
import Response from './response'
import { getManifest, getManifestWithResourceConf } from '../spec/ts-helper'
import MockGateway from './gateway/mock'
import { configs as defaultConfigs } from './index'
import { mockRequest } from './test/index'

describe('ClientBuilder', () => {
  let GatewayClassFactory: () => typeof Gateway
  let configs: GlobalConfigs
  let gatewayClass: jest.Mock<Gateway>
  const gatewayInstanceMock = jest.fn()
  const gatewayInstance = { call: gatewayInstanceMock }

  beforeEach(() => {
    gatewayClass = jest.fn(() => gatewayInstance as unknown as Gateway)
    GatewayClassFactory = () => gatewayClass
    configs = {
      context: {},
      middleware: [],
      Promise,
      fetch,
      maxMiddlewareStackExecutionAllowed: 2,
      gateway: null,
      gatewayConfigs: {
        Fetch: { config: 'configs' },
      } as unknown as GatewayConfiguration,
    }
  })

  it('creates an object with all resources, methods, and a reference to the manifest', () => {
    const manifest = getManifest()
    const clientBuilder = new ClientBuilder(manifest, GatewayClassFactory, configs)
    const client = clientBuilder.build()
    expect(client.User).toEqual(expect.any(Object))
    expect(client.User.byId).toEqual(expect.any(Function))

    expect(client.Blog).toEqual(expect.any(Object))
    expect(client.Blog.post).toEqual(expect.any(Function))
    expect(client.Blog.addComment).toEqual(expect.any(Function))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((client as any)._manifest instanceof Manifest).toEqual(true)
  })

  it('accepts custom gatewayConfigs', async () => {
    const customGatewayConfigs = { Mock: { custom: 'configs' } }
    const manifest = getManifest([], customGatewayConfigs)
    const clientBuilder = new ClientBuilder(manifest, GatewayClassFactory, configs)
    const client = clientBuilder.build()

    gatewayInstance.call.mockReturnValue(Promise.resolve('value'))
    const response = await client.User.byId({ id: 1 })
    expect(response).toEqual('value')
    expect(gatewayClass).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        Fetch: { config: 'configs' },
        Mock: { custom: 'configs' },
      })
    )

    expect(gatewayInstance.call).toHaveBeenCalled()
  })

  it('accepts manifest level resource configs', async () => {
    const manifest = getManifestWithResourceConf()

    const configs = {
      context: {},
      middleware: [],
      Promise,
      fetch,
      maxMiddlewareStackExecutionAllowed: 2,
      gateway: null,
      gatewayConfigs: {
        Fetch: { config: 'configs' },
      } as unknown as GatewayConfiguration,
    }

    GatewayClassFactory = () => gatewayClass
    const clientBuilder = new ClientBuilder(manifest, GatewayClassFactory, configs)
    const client = clientBuilder.build()

    gatewayInstance.call.mockReturnValue(Promise.resolve('value'))
    const response = await client.Blog.post({ customAttr: 'blog post' })
    expect(response).toEqual('value')
    expect(gatewayClass).toHaveBeenCalledWith(expect.any(Request), configs.gatewayConfigs)
    expect(gatewayInstance.call).toHaveBeenCalled()

    const request = gatewayClass.mock.calls[0][0]
    expect(request).toEqual(expect.any(Request))
    expect(request.method()).toEqual('post')
    expect(request.host()).toEqual('http://example.org')
    expect(request.path()).toEqual('/blogs')
    expect(request.body()).toEqual('blog post')
  })

  it('accepts manifest level timeoutAttr', async () => {
    mockRequest({
      method: 'get',
      url: 'http://example.org/users/1?timeout=123',
      response: {
        status: 200,
        body: {
          name: 'John Doe',
        },
      },
    })

    const GatewayClassFactory = () => MockGateway
    const manifest = { ...getManifest(), timeoutAttr: 'customTimeout' }
    const clientBuilder = new ClientBuilder(manifest, GatewayClassFactory, defaultConfigs)
    const client = clientBuilder.build()
    await expect(client.User.byId({ id: 1, timeout: 123, customTimeout: 456 })).resolves.toEqual(
      expect.any(Response)
    )
  })

  it('accepts manifest level signalAttr', async () => {
    mockRequest({
      method: 'get',
      url: 'http://example.org/users/1?signal=123',
      response: {
        status: 200,
        body: {
          name: 'John Doe',
        },
      },
    })

    const GatewayClassFactory = () => MockGateway
    const manifest = { ...getManifest(), signalAttr: 'customSignal' }
    const clientBuilder = new ClientBuilder(manifest, GatewayClassFactory, defaultConfigs)
    const client = clientBuilder.build()
    const abortController = new AbortController()
    await expect(
      client.User.byId({ id: 1, signal: 123, customSignal: abortController.signal })
    ).resolves.toEqual(expect.any(Response))
  })

  describe('when a resource method is called', () => {
    it('calls the gateway with the correct request', async () => {
      const manifest = getManifest()
      const clientBuilder = new ClientBuilder(manifest, GatewayClassFactory, configs)
      const client = clientBuilder.build()

      gatewayInstance.call.mockReturnValue(Promise.resolve('value'))
      const response = await client.User.byId({ id: 1 })
      expect(response).toEqual('value')
      expect(gatewayClass).toHaveBeenCalledWith(expect.any(Request), configs.gatewayConfigs)
      expect(gatewayInstance.call).toHaveBeenCalled()

      const request = gatewayClass.mock.calls[0][0]
      expect(request).toEqual(expect.any(Request))
      expect(request.method()).toEqual('get')
      expect(request.host()).toEqual('http://example.org')
      expect(request.path()).toEqual('/users/1')
      expect(request.params()).toEqual({ id: 1 })
    })
  })

  describe('when manifest is not defined', () => {
    it('raises error', () => {
      // @ts-expect-error Must override TS warning:
      expect(() => new ClientBuilder()).toThrowError('[Mappersmith] invalid manifest (undefined)')
    })
  })

  describe('when gatewayClass is not defined', () => {
    it('raises error', () => {
      const manifest = getManifest()
      // @ts-expect-error Must override TS warning:
      expect(() => new ClientBuilder(manifest, null)).toThrowError(
        '[Mappersmith] gateway class not configured (configs.gateway)'
      )
    })
  })

  describe('when Promise is not defined', () => {
    it('raises error', () => {
      const manifest = getManifest()
      const badConfig = { ...configs }
      // @ts-expect-error Must override TS warning:
      delete badConfig['Promise']
      expect(() => new ClientBuilder(manifest, GatewayClassFactory, badConfig)).toThrowError(
        '[Mappersmith] Promise not configured (configs.Promise)'
      )
    })
  })

  describe('resource path', () => {
    it('raises error on undefined', () => {
      const manifest = { host: 'host', resources: { User: { all: {} } } }
      expect(() =>
        new ClientBuilder(
          // @ts-expect-error Must override TS warning about path missing:
          manifest,
          gatewayClass as unknown as typeof GatewayClassFactory,
          configs
        ).build()
      ).toThrowError('[Mappersmith] path is undefined for resource "User" method "all"')
    })

    it('does not raise error for empty string', () => {
      const manifest = { host: 'host', resources: { User: { all: { path: '' } } } }
      expect(() =>
        new ClientBuilder(
          manifest,
          gatewayClass as unknown as typeof GatewayClassFactory,
          configs
        ).build()
      ).not.toThrowError()
    })
  })

  describe('request context', () => {
    it('allows specifying the context of a request', async () => {
      const manifest = getManifest()
      const clientBuilder = new ClientBuilder(manifest, GatewayClassFactory, configs)
      const client = clientBuilder.build()
      gatewayInstance.call.mockReturnValue(Promise.resolve('value'))
      const response = await client.User.byId({ id: 1 }, { myContext: 'banana' })
      expect(response).toEqual('value')
      expect(gatewayClass).toHaveBeenCalledWith(expect.any(Request), configs.gatewayConfigs)
      expect(gatewayInstance.call).toHaveBeenCalled()

      const request: Request = gatewayClass.mock.calls[0][0]
      expect(request).toBeInstanceOf(Request)
      // For consumption within Middleware:
      expect(request.context()).toEqual({ myContext: 'banana' })
    })
  })
})
