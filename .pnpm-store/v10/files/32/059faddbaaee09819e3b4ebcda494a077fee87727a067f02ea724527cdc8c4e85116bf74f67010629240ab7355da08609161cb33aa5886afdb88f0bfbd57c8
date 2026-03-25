// import { PostHog } from '../'
import { PostHog as PostHog } from '../src/posthog-node'
jest.mock('../src/fetch')
import fetch from '../src/fetch'
import { anyDecideCall, anyLocalEvalCall, apiImplementation } from './feature-flags.spec'
import { waitForPromises, wait } from '../../posthog-core/test/test-utils/test-utils'

jest.mock('../package.json', () => ({ version: '1.2.3' }))

const mockedFetch = jest.mocked(fetch, true)

const getLastBatchEvents = (): any[] | undefined => {
  expect(mockedFetch).toHaveBeenCalledWith('http://example.com/batch/', expect.objectContaining({ method: 'POST' }))

  // reverse mock calls array to get the last call
  const call = mockedFetch.mock.calls.reverse().find((x) => (x[0] as string).includes('/batch/'))
  if (!call) {
    return undefined
  }
  return JSON.parse((call[1] as any).body as any).batch
}

describe('PostHog Node.js', () => {
  let posthog: PostHog

  jest.useFakeTimers()

  beforeEach(() => {
    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      fetchRetryCount: 0,
    })

    mockedFetch.mockResolvedValue({
      status: 200,
      text: () => Promise.resolve('ok'),
      json: () =>
        Promise.resolve({
          status: 'ok',
        }),
    } as any)
  })

  afterEach(async () => {
    // ensure clean shutdown & no test interdependencies
    await posthog.shutdownAsync()
  })

  describe('core methods', () => {
    it('should capture an event to shared queue', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      posthog.capture({ distinctId: '123', event: 'test-event', properties: { foo: 'bar' }, groups: { org: 123 } })

      jest.runOnlyPendingTimers()
      const batchEvents = getLastBatchEvents()
      expect(batchEvents).toEqual([
        {
          distinct_id: '123',
          event: 'test-event',
          properties: {
            $groups: { org: 123 },
            foo: 'bar',
            $geoip_disable: true,
            $lib: 'posthog-node',
            $lib_version: '1.2.3',
          },
          timestamp: expect.any(String),
          type: 'capture',
          library: 'posthog-node',
          library_version: '1.2.3',
        },
      ])
    })

    it('shouldnt muddy subsequent capture calls', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      posthog.capture({ distinctId: '123', event: 'test-event', properties: { foo: 'bar' }, groups: { org: 123 } })

      jest.runOnlyPendingTimers()
      expect(getLastBatchEvents()?.[0]).toEqual(
        expect.objectContaining({
          distinct_id: '123',
          event: 'test-event',
          properties: expect.objectContaining({
            $groups: { org: 123 },
            foo: 'bar',
          }),
          library: 'posthog-node',
          library_version: '1.2.3',
        })
      )
      mockedFetch.mockClear()

      posthog.capture({
        distinctId: '123',
        event: 'test-event',
        properties: { foo: 'bar' },
        groups: { other_group: 'x' },
      })

      jest.runOnlyPendingTimers()
      expect(getLastBatchEvents()?.[0]).toEqual(
        expect.objectContaining({
          distinct_id: '123',
          event: 'test-event',
          properties: expect.objectContaining({
            $groups: { other_group: 'x' },
            foo: 'bar',
            $geoip_disable: true,
          }),
          library: 'posthog-node',
          library_version: '1.2.3',
        })
      )
    })

    it('should capture identify events on shared queue', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      posthog.identify({ distinctId: '123', properties: { foo: 'bar' } })
      jest.runOnlyPendingTimers()
      const batchEvents = getLastBatchEvents()
      expect(batchEvents).toMatchObject([
        {
          distinct_id: '123',
          event: '$identify',
          properties: {
            $set: {
              foo: 'bar',
            },
            $geoip_disable: true,
          },
        },
      ])
    })

    it('should handle identify mistakenly using $set', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      posthog.identify({ distinctId: '123', properties: { foo: 'bar', $set: { foo: 'other' } } })
      jest.runOnlyPendingTimers()
      const batchEvents = getLastBatchEvents()
      expect(batchEvents).toMatchObject([
        {
          distinct_id: '123',
          event: '$identify',
          properties: {
            $set: {
              foo: 'other',
            },
            $geoip_disable: true,
          },
        },
      ])
    })

    it('should capture alias events on shared queue', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      posthog.alias({ distinctId: '123', alias: '1234' })
      jest.runOnlyPendingTimers()
      const batchEvents = getLastBatchEvents()
      expect(batchEvents).toMatchObject([
        {
          distinct_id: '123',
          event: '$create_alias',
          properties: {
            distinct_id: '123',
            alias: '1234',
            $geoip_disable: true,
          },
        },
      ])
    })

    it('should allow overriding timestamp', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      posthog.capture({ event: 'custom-time', distinctId: '123', timestamp: new Date('2021-02-03') })
      jest.runOnlyPendingTimers()
      const batchEvents = getLastBatchEvents()
      expect(batchEvents).toMatchObject([
        {
          distinct_id: '123',
          timestamp: '2021-02-03T00:00:00.000Z',
          event: 'custom-time',
        },
      ])
    })

    it('should respect disableGeoip setting if passed in', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      posthog.capture({
        distinctId: '123',
        event: 'test-event',
        properties: { foo: 'bar' },
        groups: { org: 123 },
        disableGeoip: false,
      })

      jest.runOnlyPendingTimers()
      const batchEvents = getLastBatchEvents()
      expect(batchEvents?.[0].properties).toEqual({
        $groups: { org: 123 },
        foo: 'bar',
        $lib: 'posthog-node',
        $lib_version: '1.2.3',
      })
    })

    it('should use default is set, and override on specific disableGeoip calls', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      const client = new PostHog('TEST_API_KEY', {
        host: 'http://example.com',
        disableGeoip: false,
      })
      client.capture({ distinctId: '123', event: 'test-event', properties: { foo: 'bar' }, groups: { org: 123 } })

      jest.runOnlyPendingTimers()
      let batchEvents = getLastBatchEvents()
      expect(batchEvents?.[0].properties).toEqual({
        $groups: { org: 123 },
        foo: 'bar',
        $lib: 'posthog-node',
        $lib_version: '1.2.3',
      })

      client.capture({
        distinctId: '123',
        event: 'test-event',
        properties: { foo: 'bar' },
        groups: { org: 123 },
        disableGeoip: true,
      })

      jest.runOnlyPendingTimers()
      batchEvents = getLastBatchEvents()
      console.warn(batchEvents)
      expect(batchEvents?.[0].properties).toEqual({
        $groups: { org: 123 },
        foo: 'bar',
        $lib: 'posthog-node',
        $lib_version: '1.2.3',
        $geoip_disable: true,
      })

      client.capture({
        distinctId: '123',
        event: 'test-event',
        properties: { foo: 'bar' },
        groups: { org: 123 },
        disableGeoip: false,
      })

      jest.runOnlyPendingTimers()
      batchEvents = getLastBatchEvents()
      expect(batchEvents?.[0].properties).toEqual({
        $groups: { org: 123 },
        foo: 'bar',
        $lib: 'posthog-node',
        $lib_version: '1.2.3',
      })

      await client.shutdownAsync()
    })
  })

  describe('shutdown', () => {
    beforeEach(() => {
      // a serverless posthog configuration
      posthog = new PostHog('TEST_API_KEY', {
        host: 'http://example.com',
        fetchRetryCount: 0,
      })

      mockedFetch.mockImplementation(async () => {
        // simulate network delay
        await wait(500)

        return Promise.resolve({
          status: 200,
          text: () => Promise.resolve('ok'),
          json: () =>
            Promise.resolve({
              status: 'ok',
            }),
        } as any)
      })
    })

    afterEach(() => {
      posthog.debug(false)
    })

    it('should shutdown cleanly', async () => {
      posthog = new PostHog('TEST_API_KEY', {
        host: 'http://example.com',
        fetchRetryCount: 0,
        flushAt: 1,
      })

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      jest.useRealTimers()
      // using debug mode to check console.log output
      // which tells us when the flush is complete
      posthog.debug(true)
      for (let i = 0; i < 10; i++) {
        posthog.capture({ event: 'test-event', distinctId: '123' })
        // requests come 100ms apart
        await wait(100)
      }

      // 10 capture calls to debug log
      // 6 flush calls to debug log
      expect(logSpy).toHaveBeenCalledTimes(16)
      expect(10).toEqual(logSpy.mock.calls.filter((call) => call[1].includes('capture')).length)
      expect(6).toEqual(logSpy.mock.calls.filter((call) => call[1].includes('flush')).length)

      logSpy.mockClear()

      await posthog.shutdownAsync()
      // remaining 4 flush calls to debug log
      // happen during shutdown
      expect(4).toEqual(logSpy.mock.calls.filter((call) => call[1].includes('flush')).length)
      jest.useFakeTimers()
      logSpy.mockRestore()
    })
  })

  describe('groupIdentify', () => {
    it('should identify group with unique id', async () => {
      posthog.groupIdentify({ groupType: 'posthog', groupKey: 'team-1', properties: { analytics: true } })
      jest.runOnlyPendingTimers()
      await posthog.flushAsync()
      const batchEvents = getLastBatchEvents()
      expect(batchEvents).toMatchObject([
        {
          distinct_id: '$posthog_team-1',
          event: '$groupidentify',
          properties: {
            $group_type: 'posthog',
            $group_key: 'team-1',
            $group_set: { analytics: true },
            $lib: 'posthog-node',
            $geoip_disable: true,
          },
        },
      ])
    })

    it('should allow passing optional distinctID to identify group', async () => {
      posthog.groupIdentify({
        groupType: 'posthog',
        groupKey: 'team-1',
        properties: { analytics: true },
        distinctId: '123',
      })
      jest.runOnlyPendingTimers()
      await posthog.flushAsync()
      const batchEvents = getLastBatchEvents()
      expect(batchEvents).toMatchObject([
        {
          distinct_id: '123',
          event: '$groupidentify',
          properties: {
            $group_type: 'posthog',
            $group_key: 'team-1',
            $group_set: { analytics: true },
            $lib: 'posthog-node',
            $geoip_disable: true,
          },
        },
      ])
    })
  })

  describe('feature flags', () => {
    beforeEach(() => {
      const mockFeatureFlags = {
        'feature-1': true,
        'feature-2': true,
        'feature-variant': 'variant',
        'disabled-flag': false,
      }

      const mockFeatureFlagPayloads = {
        'feature-1': { color: 'blue' },
        'feature-variant': 2,
      }

      mockedFetch.mockImplementation(
        apiImplementation({ decideFlags: mockFeatureFlags, decideFlagPayloads: mockFeatureFlagPayloads })
      )

      posthog = new PostHog('TEST_API_KEY', {
        host: 'http://example.com',
        fetchRetryCount: 0,
      })
    })

    it('should do getFeatureFlag', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      await expect(posthog.getFeatureFlag('feature-variant', '123', { groups: { org: '123' } })).resolves.toEqual(
        'variant'
      )
      expect(mockedFetch).toHaveBeenCalledTimes(1)
      expect(mockedFetch).toHaveBeenCalledWith(
        'http://example.com/decide/?v=3',
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('"geoip_disable":true') })
      )
    })

    it('should do isFeatureEnabled', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      await expect(posthog.isFeatureEnabled('feature-1', '123', { groups: { org: '123' } })).resolves.toEqual(true)
      await expect(posthog.isFeatureEnabled('feature-4', '123', { groups: { org: '123' } })).resolves.toEqual(false)
      expect(mockedFetch).toHaveBeenCalledTimes(2)
    })

    it('captures feature flags when no personal API key is present', async () => {
      mockedFetch.mockClear()
      mockedFetch.mockClear()
      expect(mockedFetch).toHaveBeenCalledTimes(0)

      posthog = new PostHog('TEST_API_KEY', {
        host: 'http://example.com',
        flushAt: 1,
        fetchRetryCount: 0,
      })

      posthog.capture({
        distinctId: 'distinct_id',
        event: 'node test event',
        sendFeatureFlags: true,
      })

      expect(mockedFetch).toHaveBeenCalledWith(
        'http://example.com/decide/?v=3',
        expect.objectContaining({ method: 'POST' })
      )

      jest.runOnlyPendingTimers()

      await waitForPromises()

      expect(getLastBatchEvents()?.[0]).toEqual(
        expect.objectContaining({
          distinct_id: 'distinct_id',
          event: 'node test event',
          properties: expect.objectContaining({
            $active_feature_flags: ['feature-1', 'feature-2', 'feature-variant'],
            '$feature/feature-1': true,
            '$feature/feature-2': true,
            '$feature/feature-variant': 'variant',
            $lib: 'posthog-node',
            $lib_version: '1.2.3',
            $geoip_disable: true,
          }),
        })
      )

      // no calls to `/local_evaluation`

      expect(mockedFetch).not.toHaveBeenCalledWith(...anyLocalEvalCall)
      expect(mockedFetch).toHaveBeenCalledWith(
        'http://example.com/decide/?v=3',
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('"geoip_disable":true') })
      )
    })

    it('captures feature flags with same geoip setting as capture', async () => {
      mockedFetch.mockClear()
      mockedFetch.mockClear()
      expect(mockedFetch).toHaveBeenCalledTimes(0)

      posthog = new PostHog('TEST_API_KEY', {
        host: 'http://example.com',
        flushAt: 1,
        fetchRetryCount: 0,
      })

      posthog.capture({
        distinctId: 'distinct_id',
        event: 'node test event',
        sendFeatureFlags: true,
        disableGeoip: false,
      })

      expect(mockedFetch).toHaveBeenCalledWith(
        'http://example.com/decide/?v=3',
        expect.objectContaining({ method: 'POST', body: expect.not.stringContaining('geoip_disable') })
      )

      jest.runOnlyPendingTimers()

      await waitForPromises()

      expect(getLastBatchEvents()?.[0].properties).toEqual({
        $active_feature_flags: ['feature-1', 'feature-2', 'feature-variant'],
        '$feature/feature-1': true,
        '$feature/feature-2': true,
        '$feature/feature-variant': 'variant',
        $lib: 'posthog-node',
        $lib_version: '1.2.3',
      })

      // no calls to `/local_evaluation`

      expect(mockedFetch).not.toHaveBeenCalledWith(...anyLocalEvalCall)
    })

    it('manages memory well when sending feature flags', async () => {
      const flags = {
        flags: [
          {
            id: 1,
            name: 'Beta Feature',
            key: 'beta-feature',
            active: true,
            filters: {
              groups: [
                {
                  properties: [],
                  rollout_percentage: 100,
                },
              ],
            },
          },
        ],
      }

      mockedFetch.mockImplementation(
        apiImplementation({ localFlags: flags, decideFlags: { 'beta-feature': 'decide-fallback-value' } })
      )

      posthog = new PostHog('TEST_API_KEY', {
        host: 'http://example.com',
        personalApiKey: 'TEST_PERSONAL_API_KEY',
        maxCacheSize: 10,
        fetchRetryCount: 0,
      })

      expect(Object.keys(posthog.distinctIdHasSentFlagCalls).length).toEqual(0)

      for (let i = 0; i < 1000; i++) {
        const distinctId = `some-distinct-id${i}`
        await posthog.getFeatureFlag('beta-feature', distinctId)

        jest.runOnlyPendingTimers()

        const batchEvents = getLastBatchEvents()
        expect(batchEvents).toMatchObject([
          {
            distinct_id: distinctId,
            event: '$feature_flag_called',
            properties: expect.objectContaining({
              $feature_flag: 'beta-feature',
              $feature_flag_response: true,
              $lib: 'posthog-node',
              $lib_version: '1.2.3',
              locally_evaluated: true,
              '$feature/beta-feature': true,
            }),
          },
        ])
        mockedFetch.mockClear()

        expect(Object.keys(posthog.distinctIdHasSentFlagCalls).length <= 10).toEqual(true)
      }
    })

    it('$feature_flag_called is called appropriately when querying flags', async () => {
      const flags = {
        flags: [
          {
            id: 1,
            name: 'Beta Feature',
            key: 'beta-feature',
            active: true,
            filters: {
              groups: [
                {
                  properties: [{ key: 'region', value: 'USA' }],
                  rollout_percentage: 100,
                },
              ],
            },
          },
        ],
      }

      mockedFetch.mockImplementation(
        apiImplementation({ localFlags: flags, decideFlags: { 'decide-flag': 'decide-value' } })
      )

      posthog = new PostHog('TEST_API_KEY', {
        host: 'http://example.com',
        personalApiKey: 'TEST_PERSONAL_API_KEY',
        maxCacheSize: 10,
        fetchRetryCount: 0,
      })

      expect(
        await posthog.getFeatureFlag('beta-feature', 'some-distinct-id', {
          personProperties: { region: 'USA', name: 'Aloha' },
        })
      ).toEqual(true)
      jest.runOnlyPendingTimers()
      expect(mockedFetch).toHaveBeenCalledWith('http://example.com/batch/', expect.any(Object))

      expect(getLastBatchEvents()?.[0]).toEqual(
        expect.objectContaining({
          distinct_id: 'some-distinct-id',
          event: '$feature_flag_called',
          properties: expect.objectContaining({
            $feature_flag: 'beta-feature',
            $feature_flag_response: true,
            '$feature/beta-feature': true,
            $lib: 'posthog-node',
            $lib_version: '1.2.3',
            locally_evaluated: true,
            $geoip_disable: true,
          }),
        })
      )
      mockedFetch.mockClear()

      // # called again for same user, shouldn't call capture again
      expect(
        await posthog.getFeatureFlag('beta-feature', 'some-distinct-id', {
          personProperties: { region: 'USA', name: 'Aloha' },
        })
      ).toEqual(true)
      jest.runOnlyPendingTimers()

      expect(mockedFetch).not.toHaveBeenCalledWith('http://example.com/batch/', expect.any(Object))

      // # called for different user, should call capture again
      expect(
        await posthog.getFeatureFlag('beta-feature', 'some-distinct-id2', {
          groups: { x: 'y' },
          personProperties: { region: 'USA', name: 'Aloha' },
          disableGeoip: false,
        })
      ).toEqual(true)
      jest.runOnlyPendingTimers()
      expect(mockedFetch).toHaveBeenCalledWith('http://example.com/batch/', expect.any(Object))

      expect(getLastBatchEvents()?.[0]).toEqual(
        expect.objectContaining({
          distinct_id: 'some-distinct-id2',
          event: '$feature_flag_called',
        })
      )
      expect(getLastBatchEvents()?.[0].properties).toEqual({
        $feature_flag: 'beta-feature',
        $feature_flag_response: true,
        $lib: 'posthog-node',
        $lib_version: '1.2.3',
        locally_evaluated: true,
        '$feature/beta-feature': true,
        $groups: { x: 'y' },
      })
      mockedFetch.mockClear()

      // # called for different user, but send configuration is false, so should NOT call capture again
      expect(
        await posthog.getFeatureFlag('beta-feature', 'some-distinct-id23', {
          personProperties: { region: 'USA', name: 'Aloha' },
          sendFeatureFlagEvents: false,
        })
      ).toEqual(true)
      jest.runOnlyPendingTimers()
      expect(mockedFetch).not.toHaveBeenCalledWith('http://example.com/batch/', expect.any(Object))

      // # called for different flag, falls back to decide, should call capture again
      expect(
        await posthog.getFeatureFlag('decide-flag', 'some-distinct-id2345', {
          groups: { organization: 'org1' },
          personProperties: { region: 'USA', name: 'Aloha' },
        })
      ).toEqual('decide-value')
      jest.runOnlyPendingTimers()
      // one to decide, one to batch
      expect(mockedFetch).toHaveBeenCalledWith(...anyDecideCall)
      expect(mockedFetch).toHaveBeenCalledWith('http://example.com/batch/', expect.any(Object))

      expect(getLastBatchEvents()?.[0]).toEqual(
        expect.objectContaining({
          distinct_id: 'some-distinct-id2345',
          event: '$feature_flag_called',
          properties: expect.objectContaining({
            $feature_flag: 'decide-flag',
            $feature_flag_response: 'decide-value',
            $lib: 'posthog-node',
            $lib_version: '1.2.3',
            locally_evaluated: false,
            '$feature/decide-flag': 'decide-value',
            $groups: { organization: 'org1' },
          }),
        })
      )
      mockedFetch.mockClear()

      expect(
        await posthog.isFeatureEnabled('decide-flag', 'some-distinct-id2345', {
          groups: { organization: 'org1' },
          personProperties: { region: 'USA', name: 'Aloha' },
        })
      ).toEqual(true)
      jest.runOnlyPendingTimers()
      // call decide, but not batch
      expect(mockedFetch).toHaveBeenCalledWith(...anyDecideCall)
      expect(mockedFetch).not.toHaveBeenCalledWith('http://example.com/batch/', expect.any(Object))
    })

    it('should do getFeatureFlagPayloads', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      await expect(
        posthog.getFeatureFlagPayload('feature-variant', '123', 'variant', { groups: { org: '123' } })
      ).resolves.toEqual(2)
      expect(mockedFetch).toHaveBeenCalledTimes(1)
      expect(mockedFetch).toHaveBeenCalledWith(
        'http://example.com/decide/?v=3',
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('"geoip_disable":true') })
      )
    })

    it('should do getFeatureFlagPayloads without matchValue', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      await expect(
        posthog.getFeatureFlagPayload('feature-variant', '123', undefined, { groups: { org: '123' } })
      ).resolves.toEqual(2)
      expect(mockedFetch).toHaveBeenCalledTimes(1)
    })

    it('should do getFeatureFlags with geoip disabled and enabled', async () => {
      expect(mockedFetch).toHaveBeenCalledTimes(0)
      await expect(
        posthog.getFeatureFlagPayload('feature-variant', '123', 'variant', { groups: { org: '123' } })
      ).resolves.toEqual(2)
      expect(mockedFetch).toHaveBeenCalledTimes(1)
      expect(mockedFetch).toHaveBeenCalledWith(
        'http://example.com/decide/?v=3',
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('"geoip_disable":true') })
      )

      mockedFetch.mockClear()

      await expect(posthog.isFeatureEnabled('feature-variant', '123', { disableGeoip: false })).resolves.toEqual(true)
      expect(mockedFetch).toHaveBeenCalledTimes(1)
      expect(mockedFetch).toHaveBeenCalledWith(
        'http://example.com/decide/?v=3',
        expect.objectContaining({ method: 'POST', body: expect.not.stringContaining('geoip_disable') })
      )
    })
  })
})
