// import { PostHog, PostHogOptions } from '../'
// Uncomment below line while developing to not compile code everytime
import { PostHog as PostHog, PostHogOptions } from '../src/posthog-node'
import { matchProperty, InconclusiveMatchError } from '../src/feature-flags'
jest.mock('../src/fetch')
import fetch from '../src/fetch'

jest.spyOn(console, 'debug').mockImplementation()

const mockedFetch = jest.mocked(fetch, true)

const posthogImmediateResolveOptions: PostHogOptions = {
  fetchRetryCount: 0,
}

export const apiImplementation = ({
  localFlags,
  decideFlags,
  decideFlagPayloads,
  decideStatus = 200,
}: {
  localFlags?: any
  decideFlags?: any
  decideFlagPayloads?: any
  decideStatus?: number
}) => {
  return (url: any): Promise<any> => {
    if ((url as any).includes('/decide/')) {
      return Promise.resolve({
        status: decideStatus,
        text: () => Promise.resolve('ok'),
        json: () => {
          if (decideStatus !== 200) {
            return Promise.resolve(decideFlags)
          } else {
            return Promise.resolve({
              featureFlags: decideFlags,
              featureFlagPayloads: decideFlagPayloads,
            })
          }
        },
      }) as any
    }

    if ((url as any).includes('api/feature_flag/local_evaluation?token=TEST_API_KEY&send_cohorts')) {
      return Promise.resolve({
        status: 200,
        text: () => Promise.resolve('ok'),
        json: () => Promise.resolve(localFlags),
      }) as any
    }

    return Promise.resolve({
      status: 400,
      text: () => Promise.resolve('ok'),
      json: () =>
        Promise.resolve({
          status: 'ok',
        }),
    }) as any
  }
}

export const anyLocalEvalCall = [
  'http://example.com/api/feature_flag/local_evaluation?token=TEST_API_KEY&send_cohorts',
  expect.any(Object),
]
export const anyDecideCall = ['http://example.com/decide/?v=3', expect.any(Object)]

describe('local evaluation', () => {
  let posthog: PostHog

  jest.useFakeTimers()

  afterEach(async () => {
    // ensure clean shutdown & no test interdependencies
    await posthog.shutdownAsync()
  })

  it('evaluates person properties', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'person-flag',
          is_simple_flag: true,
          active: true,
          filters: {
            groups: [
              {
                properties: [
                  {
                    key: 'region',
                    operator: 'exact',
                    value: ['USA'],
                    type: 'person',
                  },
                ],
                rollout_percentage: null,
              },
            ],
          },
        },
      ],
    }
    mockedFetch.mockImplementation(apiImplementation({ localFlags: flags }))

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(
      await posthog.getFeatureFlag('person-flag', 'some-distinct-id', { personProperties: { region: 'USA' } })
    ).toEqual(true)
    expect(
      await posthog.getFeatureFlag('person-flag', 'some-distinct-id', { personProperties: { region: 'Canada' } })
    ).toEqual(false)
    expect(mockedFetch).toHaveBeenCalledWith(...anyLocalEvalCall)
  })

  it('evaluates group properties', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'group-flag',
          is_simple_flag: true,
          active: true,
          filters: {
            aggregation_group_type_index: 0,
            groups: [
              {
                properties: [
                  {
                    group_type_index: 0,
                    key: 'name',
                    operator: 'exact',
                    value: ['Project Name 1'],
                    type: 'group',
                  },
                ],
                rollout_percentage: 35,
              },
            ],
          },
        },
      ],
      group_type_mapping: { '0': 'company', '1': 'project' },
    }
    mockedFetch.mockImplementation(apiImplementation({ localFlags: flags }))

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    // # groups not passed in, hence false
    expect(
      await posthog.getFeatureFlag('group-flag', 'some-distinct-id', {
        groupProperties: { company: { name: 'Project Name 1' } },
      })
    ).toEqual(false)
    expect(
      await posthog.getFeatureFlag('group-flag', 'some-distinct-2', {
        groupProperties: { company: { name: 'Project Name 2' } },
      })
    ).toEqual(false)

    // # this is good
    expect(
      await posthog.getFeatureFlag('group-flag', 'some-distinct-2', {
        groups: { company: 'amazon_without_rollout' },
        groupProperties: { company: { name: 'Project Name 1' } },
      })
    ).toEqual(true)

    // # rollout % not met
    expect(
      await posthog.getFeatureFlag('group-flag', 'some-distinct-2', {
        groups: { company: 'amazon' },
        groupProperties: { company: { name: 'Project Name 1' } },
      })
    ).toEqual(false)

    // # property mismatch
    expect(
      await posthog.getFeatureFlag('group-flag', 'some-distinct-2', {
        groups: { company: 'amazon_without_rollout' },
        groupProperties: { company: { name: 'Project Name 2' } },
      })
    ).toEqual(false)

    expect(mockedFetch).toHaveBeenCalledWith(...anyLocalEvalCall)
    // decide not called
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('evaluates group properties and falls back to decide when group_type_mappings not present', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'group-flag',
          is_simple_flag: true,
          active: true,
          filters: {
            aggregation_group_type_index: 0,
            groups: [
              {
                properties: [
                  {
                    group_type_index: 0,
                    key: 'name',
                    operator: 'exact',
                    value: ['Project Name 1'],
                    type: 'group',
                  },
                ],
                rollout_percentage: 35,
              },
            ],
          },
        },
      ],
      //   "group_type_mapping": {"0": "company", "1": "project"}
    }
    mockedFetch.mockImplementation(
      apiImplementation({ localFlags: flags, decideFlags: { 'group-flag': 'decide-fallback-value' } })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })
    // # group_type_mappings not present, so fallback to `/decide`
    expect(
      await posthog.getFeatureFlag('group-flag', 'some-distinct-2', {
        groupProperties: {
          company: { name: 'Project Name 1' },
        },
      })
    ).toEqual('decide-fallback-value')
  })

  it('evaluates flag with complex definition', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'complex-flag',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [
              {
                properties: [
                  {
                    key: 'region',
                    operator: 'exact',
                    value: ['USA'],
                    type: 'person',
                  },
                  {
                    key: 'name',
                    operator: 'exact',
                    value: ['Aloha'],
                    type: 'person',
                  },
                ],
                rollout_percentage: undefined,
              },
              {
                properties: [
                  {
                    key: 'email',
                    operator: 'exact',
                    value: ['a@b.com', 'b@c.com'],
                    type: 'person',
                  },
                ],
                rollout_percentage: 30,
              },
              {
                properties: [
                  {
                    key: 'doesnt_matter',
                    operator: 'exact',
                    value: ['1', '2'],
                    type: 'person',
                  },
                ],
                rollout_percentage: 0,
              },
            ],
          },
        },
      ],
    }
    mockedFetch.mockImplementation(
      apiImplementation({ localFlags: flags, decideFlags: { 'complex-flag': 'decide-fallback-value' } })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(
      await posthog.getFeatureFlag('complex-flag', 'some-distinct-id', {
        personProperties: { region: 'USA', name: 'Aloha' },
      })
    ).toEqual(true)
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)

    // # this distinctIDs hash is < rollout %
    expect(
      await posthog.getFeatureFlag('complex-flag', 'some-distinct-id_within_rollout?', {
        personProperties: { region: 'USA', email: 'a@b.com' },
      })
    ).toEqual(true)
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)

    // # will fall back on `/decide`, as all properties present for second group, but that group resolves to false
    expect(
      await posthog.getFeatureFlag('complex-flag', 'some-distinct-id_outside_rollout?', {
        personProperties: { region: 'USA', email: 'a@b.com' },
      })
    ).toEqual('decide-fallback-value')
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://example.com/decide/?v=3',
      expect.objectContaining({
        body: JSON.stringify({
          token: 'TEST_API_KEY',
          distinct_id: 'some-distinct-id_outside_rollout?',
          groups: {},
          person_properties: { region: 'USA', email: 'a@b.com' },
          group_properties: {},
          geoip_disable: true,
        }),
      })
    )
    mockedFetch.mockClear()

    // # same as above
    expect(
      await posthog.getFeatureFlag('complex-flag', 'some-distinct-id', { personProperties: { doesnt_matter: '1' } })
    ).toEqual('decide-fallback-value')
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://example.com/decide/?v=3',
      expect.objectContaining({
        body: JSON.stringify({
          token: 'TEST_API_KEY',
          distinct_id: 'some-distinct-id',
          groups: {},
          person_properties: { doesnt_matter: '1' },
          group_properties: {},
          geoip_disable: true,
        }),
      })
    )
    mockedFetch.mockClear()

    expect(
      await posthog.getFeatureFlag('complex-flag', 'some-distinct-id', { personProperties: { region: 'USA' } })
    ).toEqual('decide-fallback-value')
    expect(mockedFetch).toHaveBeenCalledTimes(1) // TODO: Check this
    mockedFetch.mockClear()

    // # won't need to fallback when all values are present, and resolves to False
    expect(
      await posthog.getFeatureFlag('complex-flag', 'some-distinct-id_outside_rollout?', {
        personProperties: { region: 'USA', email: 'a@b.com', name: 'X', doesnt_matter: '1' },
      })
    ).toEqual(false)
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('falls back to decide', async () => {
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
                properties: [{ key: 'id', value: 98, operator: undefined, type: 'cohort' }],
                rollout_percentage: 100,
              },
            ],
          },
        },
        {
          id: 2,
          name: 'Beta Feature',
          key: 'beta-feature2',
          active: true,
          filters: {
            groups: [
              {
                properties: [
                  {
                    key: 'region',
                    operator: 'exact',
                    value: ['USA'],
                    type: 'person',
                  },
                ],
                rollout_percentage: 100,
              },
            ],
          },
        },
      ],
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: { 'beta-feature': 'alakazam', 'beta-feature2': 'alakazam2' },
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    // # beta-feature fallbacks to decide because property type is unknown
    expect(await posthog.getFeatureFlag('beta-feature', 'some-distinct-id')).toEqual('alakazam')
    expect(mockedFetch).toHaveBeenCalledWith(...anyDecideCall)
    mockedFetch.mockClear()

    // # beta-feature2 fallbacks to decide because region property not given with call
    expect(await posthog.getFeatureFlag('beta-feature2', 'some-distinct-id')).toEqual('alakazam2')
    expect(mockedFetch).toHaveBeenCalledWith(...anyDecideCall)
  })

  it('dont fall back to decide when local evaluation is set', async () => {
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
                properties: [{ key: 'id', value: 98, operator: undefined, type: 'cohort' }],
                rollout_percentage: 100,
              },
            ],
          },
        },
        {
          id: 2,
          name: 'Beta Feature',
          key: 'beta-feature2',
          active: true,
          filters: {
            groups: [
              {
                properties: [
                  {
                    key: 'region',
                    operator: 'exact',
                    value: ['USA'],
                    type: 'person',
                  },
                ],
                rollout_percentage: 100,
              },
            ],
          },
        },
      ],
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: { 'beta-feature': 'alakazam', 'beta-feature2': 'alakazam2' },
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    // # beta-feature should fallback to decide because property type is unknown
    // # but doesn't because only_evaluate_locally is true
    expect(await posthog.getFeatureFlag('beta-feature', 'some-distinct-id', { onlyEvaluateLocally: true })).toEqual(
      undefined
    )
    expect(await posthog.isFeatureEnabled('beta-feature', 'some-distinct-id', { onlyEvaluateLocally: true })).toEqual(
      undefined
    )
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)

    // # beta-feature2 should fallback to decide because region property not given with call
    // # but doesn't because only_evaluate_locally is true
    expect(await posthog.getFeatureFlag('beta-feature2', 'some-distinct-id', { onlyEvaluateLocally: true })).toEqual(
      undefined
    )
    expect(await posthog.isFeatureEnabled('beta-feature2', 'some-distinct-id', { onlyEvaluateLocally: true })).toEqual(
      undefined
    )
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it("doesn't return undefined when flag is evaluated successfully", async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: true,
          active: true,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 0,
              },
            ],
          },
        },
      ],
    }
    mockedFetch.mockImplementation(apiImplementation({ localFlags: flags, decideFlags: {} }))

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    // # beta-feature resolves to False
    expect(await posthog.getFeatureFlag('beta-feature', 'some-distinct-id')).toEqual(false)
    expect(await posthog.isFeatureEnabled('beta-feature', 'some-distinct-id')).toEqual(false)
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)

    // # beta-feature2 falls back to decide, and whatever decide returns is the value
    expect(await posthog.getFeatureFlag('beta-feature2', 'some-distinct-id')).toEqual(false)
    expect(await posthog.isFeatureEnabled('beta-feature2', 'some-distinct-id')).toEqual(false)
    expect(mockedFetch).toHaveBeenCalledWith(...anyDecideCall)
  })

  it('returns undefined when decide errors out', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: true,
          active: true,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 0,
              },
            ],
          },
        },
      ],
    }
    mockedFetch.mockImplementation(
      apiImplementation({ localFlags: flags, decideFlags: { error: 'went wrong' }, decideStatus: 400 })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    let err: any = null
    posthog.on('error', (e) => {
      err = e
    })

    // # beta-feature2 falls back to decide, which on error returns undefined
    expect(await posthog.getFeatureFlag('beta-feature2', 'some-distinct-id')).toEqual(undefined)
    expect(await posthog.isFeatureEnabled('beta-feature2', 'some-distinct-id')).toEqual(undefined)
    expect(mockedFetch).toHaveBeenCalledWith(...anyDecideCall)
    await posthog.shutdownAsync()
    expect(err).toHaveProperty('name', 'PostHogFetchHttpError')
  })

  it('experience continuity flags are not evaluated locally', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: true,
          active: true,
          ensure_experience_continuity: true,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 0,
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
      ...posthogImmediateResolveOptions,
    })

    // # beta-feature2 falls back to decide, which on error returns default
    expect(await posthog.getFeatureFlag('beta-feature', 'some-distinct-id')).toEqual('decide-fallback-value')
    expect(mockedFetch).toHaveBeenCalledWith(...anyDecideCall)
  })

  it('get all flags with fallback', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: false,
          active: true,
          rollout_percentage: 100,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 100,
              },
            ],
          },
        },
        {
          id: 2,
          name: 'Beta Feature',
          key: 'disabled-feature',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 0,
              },
            ],
          },
        },
        {
          id: 3,
          name: 'Beta Feature',
          key: 'beta-feature2',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [
              {
                properties: [{ key: 'country', value: 'US' }],
                rollout_percentage: 0,
              },
            ],
          },
        },
      ],
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: { 'beta-feature': 'variant-1', 'beta-feature2': 'variant-2' },
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    // # beta-feature value overridden by /decide
    expect(await posthog.getAllFlags('distinct-id')).toEqual({
      'beta-feature': 'variant-1',
      'beta-feature2': 'variant-2',
      'disabled-feature': false,
    })
    expect(mockedFetch).toHaveBeenCalledWith(...anyDecideCall)
    mockedFetch.mockClear()
  })

  it('get all payloads with fallback', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: false,
          active: true,
          rollout_percentage: 100,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 100,
              },
            ],
            payloads: {
              true: 'some-payload',
            },
          },
        },
        {
          id: 2,
          name: 'Beta Feature',
          key: 'disabled-feature',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 0,
              },
            ],
            payloads: {
              true: 'another-payload',
            },
          },
        },
        {
          id: 3,
          name: 'Beta Feature',
          key: 'beta-feature2',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [
              {
                properties: [{ key: 'country', value: 'US' }],
                rollout_percentage: 0,
              },
            ],
            payloads: {
              true: 'payload-3',
            },
          },
        },
      ],
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: { 'beta-feature': 'variant-1', 'beta-feature2': 'variant-2' },
        decideFlagPayloads: { 'beta-feature': 100, 'beta-feature2': 300 },
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    // # beta-feature value overridden by /decide
    expect((await posthog.getAllFlagsAndPayloads('distinct-id')).featureFlagPayloads).toEqual({
      'beta-feature': 100,
      'beta-feature2': 300,
    })
    expect(mockedFetch).toHaveBeenCalledWith(...anyDecideCall)
    mockedFetch.mockClear()
  })

  it('get all flags with fallback but only_locally_evaluated set', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: false,
          active: true,
          rollout_percentage: 100,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 100,
              },
            ],
          },
        },
        {
          id: 2,
          name: 'Beta Feature',
          key: 'disabled-feature',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 0,
              },
            ],
          },
        },
        {
          id: 3,
          name: 'Beta Feature',
          key: 'beta-feature2',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [
              {
                properties: [{ key: 'country', value: 'US' }],
                rollout_percentage: 0,
              },
            ],
          },
        },
      ],
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: { 'beta-feature': 'variant-1', 'beta-feature2': 'variant-2' },
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    // # beta-feature2 has no value
    expect(await posthog.getAllFlags('distinct-id', { onlyEvaluateLocally: true })).toEqual({
      'beta-feature': true,
      'disabled-feature': false,
    })
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('get all payloads with fallback but only_evaluate_locally set', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: false,
          active: true,
          rollout_percentage: 100,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 100,
              },
            ],
            payloads: {
              true: 'some-payload',
            },
          },
        },
        {
          id: 2,
          name: 'Beta Feature',
          key: 'disabled-feature',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 0,
              },
            ],
            payloads: {
              true: 'another-payload',
            },
          },
        },
        {
          id: 3,
          name: 'Beta Feature',
          key: 'beta-feature2',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [
              {
                properties: [{ key: 'country', value: 'US' }],
                rollout_percentage: 0,
              },
            ],
            payloads: {
              true: 'payload-3',
            },
          },
        },
      ],
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: { 'beta-feature': 'variant-1', 'beta-feature2': 'variant-2' },
        decideFlagPayloads: { 'beta-feature': 100, 'beta-feature2': 300 },
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(
      (await posthog.getAllFlagsAndPayloads('distinct-id', { onlyEvaluateLocally: true })).featureFlagPayloads
    ).toEqual({
      'beta-feature': 'some-payload',
    })
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('get all flags with fallback, with no local flags', async () => {
    const flags = {
      flags: [],
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: { 'beta-feature': 'variant-1', 'beta-feature2': 'variant-2' },
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(await posthog.getAllFlags('distinct-id')).toEqual({
      'beta-feature': 'variant-1',
      'beta-feature2': 'variant-2',
    })
    expect(mockedFetch).toHaveBeenCalledWith(...anyDecideCall)
    mockedFetch.mockClear()
  })

  it('get all payloads with fallback, with no local payloads', async () => {
    const flags = {
      flags: [],
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: { 'beta-feature': 'variant-1', 'beta-feature2': 'variant-2' },
        decideFlagPayloads: { 'beta-feature': 100, 'beta-feature2': 300 },
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect((await posthog.getAllFlagsAndPayloads('distinct-id')).featureFlagPayloads).toEqual({
      'beta-feature': 100,
      'beta-feature2': 300,
    })
    expect(mockedFetch).toHaveBeenCalledWith(...anyDecideCall)
    mockedFetch.mockClear()
  })

  it('get all flags with no fallback', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: false,
          active: true,
          rollout_percentage: 100,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 100,
              },
            ],
          },
        },
        {
          id: 2,
          name: 'Beta Feature',
          key: 'disabled-feature',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 0,
              },
            ],
          },
        },
      ],
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: { 'beta-feature': 'variant-1', 'beta-feature2': 'variant-2' },
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(await posthog.getAllFlags('distinct-id')).toEqual({ 'beta-feature': true, 'disabled-feature': false })
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('get all payloads with no fallback', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: false,
          active: true,
          rollout_percentage: 100,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 100,
              },
            ],
            payloads: {
              true: 'new',
            },
          },
        },
        {
          id: 2,
          name: 'Beta Feature',
          key: 'disabled-feature',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 0,
              },
            ],
            payloads: {
              true: 'some-payload',
            },
          },
        },
      ],
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: { 'beta-feature': 'variant-1', 'beta-feature2': 'variant-2' },
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect((await posthog.getAllFlagsAndPayloads('distinct-id')).featureFlagPayloads).toEqual({ 'beta-feature': 'new' })
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('computes inactive flags locally as well', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: false,
          active: true,
          rollout_percentage: 100,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 100,
              },
            ],
          },
        },
        {
          id: 2,
          name: 'Beta Feature',
          key: 'disabled-feature',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 0,
              },
            ],
          },
        },
      ],
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: { 'beta-feature': 'variant-1', 'beta-feature2': 'variant-2' },
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(await posthog.getAllFlags('distinct-id')).toEqual({ 'beta-feature': true, 'disabled-feature': false })
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)

    //   # Now, after a poll interval, flag 1 is inactive, and flag 2 rollout is set to 100%.
    const flags2 = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: false,
          active: false,
          rollout_percentage: 100,
          filters: {
            groups: [
              {
                properties: [],
                rollout_percentage: 100,
              },
            ],
          },
        },
        {
          id: 2,
          name: 'Beta Feature',
          key: 'disabled-feature',
          is_simple_flag: false,
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
    mockedFetch.mockImplementation(apiImplementation({ localFlags: flags2 }))

    // # force reload to simulate poll interval
    await posthog.reloadFeatureFlags()

    expect(await posthog.getAllFlags('distinct-id')).toEqual({ 'beta-feature': false, 'disabled-feature': true })
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('computes complex cohorts locally', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: false,
          active: true,
          rollout_percentage: 100,
          filters: {
            groups: [
              {
                properties: [
                  {
                    key: 'region',
                    operator: 'exact',
                    value: ['USA'],
                    type: 'person',
                  },
                  { key: 'id', value: 98, type: 'cohort' },
                ],
                rollout_percentage: 100,
              },
            ],
          },
        },
      ],
      cohorts: {
        '98': {
          type: 'OR',
          values: [
            { key: 'id', value: 1, type: 'cohort' },
            {
              key: 'nation',
              operator: 'exact',
              value: ['UK'],
              type: 'person',
            },
          ],
        },
        '1': {
          type: 'AND',
          values: [{ key: 'other', operator: 'exact', value: ['thing'], type: 'person' }],
        },
      },
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: {},
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(
      await posthog.getFeatureFlag('beta-feature', 'some-distinct-id', { personProperties: { region: 'UK' } })
    ).toEqual(false)
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)

    // # even though 'other' property is not present, the cohort should still match since it's an OR condition
    expect(
      await posthog.getFeatureFlag('beta-feature', 'some-distinct-id', {
        personProperties: { region: 'USA', nation: 'UK' },
      })
    ).toEqual(true)
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)

    // # even though 'other' property is not present, the cohort should still match since it's an OR condition
    expect(
      await posthog.getFeatureFlag('beta-feature', 'some-distinct-id', {
        personProperties: { region: 'USA', other: 'thing' },
      })
    ).toEqual(true)
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('computes complex cohorts with negation locally', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: false,
          active: true,
          rollout_percentage: 100,
          filters: {
            groups: [
              {
                properties: [
                  {
                    key: 'region',
                    operator: 'exact',
                    value: ['USA'],
                    type: 'person',
                  },
                  { key: 'id', value: 98, type: 'cohort' },
                ],
                rollout_percentage: 100,
              },
            ],
          },
        },
      ],
      cohorts: {
        '98': {
          type: 'OR',
          values: [
            { key: 'id', value: 1, type: 'cohort' },
            {
              key: 'nation',
              operator: 'exact',
              value: ['UK'],
              type: 'person',
            },
          ],
        },
        '1': {
          type: 'AND',
          values: [{ key: 'other', operator: 'exact', value: ['thing'], type: 'person', negation: true }],
        },
      },
    }
    mockedFetch.mockImplementation(
      apiImplementation({
        localFlags: flags,
        decideFlags: {},
      })
    )

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(
      await posthog.getFeatureFlag('beta-feature', 'some-distinct-id', { personProperties: { region: 'UK' } })
    ).toEqual(false)
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)

    // # even though 'other' property is not present, the cohort should still match since it's an OR condition
    expect(
      await posthog.getFeatureFlag('beta-feature', 'some-distinct-id', {
        personProperties: { region: 'USA', nation: 'UK' },
      })
    ).toEqual(true)
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)

    // # since 'other' is negated, we return False. Since 'nation' is not present, we can't tell whether the flag should be true or false, so go to decide
    expect(
      await posthog.getFeatureFlag('beta-feature', 'some-distinct-id', {
        personProperties: { region: 'USA', other: 'thing' },
      })
    ).toEqual(false)
    expect(mockedFetch).toHaveBeenCalledWith(...anyDecideCall)

    mockedFetch.mockClear()

    expect(
      await posthog.getFeatureFlag('beta-feature', 'some-distinct-id', {
        personProperties: { region: 'USA', other: 'thing2' },
      })
    ).toEqual(true)
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('gets feature flag with variant overrides', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: true,
          active: true,
          filters: {
            groups: [
              {
                properties: [
                  {
                    key: 'email',
                    operator: 'exact',
                    value: 'test@posthog.com',
                    type: 'person',
                  },
                ],
                rollout_percentage: 100,
                variant: 'second-variant',
              },
              {
                rollout_percentage: 50,
                variant: 'first-variant',
              },
            ],
            multivariate: {
              variants: [
                {
                  key: 'first-variant',
                  name: 'First Variant',
                  rollout_percentage: 50,
                },
                {
                  key: 'second-variant',
                  name: 'Second Variant',
                  rollout_percentage: 25,
                },
                {
                  key: 'third-variant',
                  name: 'Third Variant',
                  rollout_percentage: 25,
                },
              ],
            },
          },
        },
      ],
    }
    mockedFetch.mockImplementation(apiImplementation({ localFlags: flags }))

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(
      await posthog.getFeatureFlag('beta-feature', 'test_id', { personProperties: { email: 'test@posthog.com' } })
    ).toEqual('second-variant')
    expect(await posthog.getFeatureFlag('beta-feature', 'example_id')).toEqual('first-variant')

    expect(mockedFetch).toHaveBeenCalledWith(...anyLocalEvalCall)
    // decide not called
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('gets feature flag with clashing variant overrides', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: true,
          active: true,
          filters: {
            groups: [
              {
                properties: [
                  {
                    key: 'email',
                    operator: 'exact',
                    value: 'test@posthog.com',
                    type: 'person',
                  },
                ],
                rollout_percentage: 100,
                variant: 'second-variant',
              },
              // # since second-variant comes first in the list, it will be the one that gets picked
              {
                properties: [
                  {
                    key: 'email',
                    operator: 'exact',
                    value: 'test@posthog.com',
                    type: 'person',
                  },
                ],
                rollout_percentage: 100,
                variant: 'first-variant',
              },
              {
                rollout_percentage: 50,
                variant: 'first-variant',
              },
            ],
            multivariate: {
              variants: [
                {
                  key: 'first-variant',
                  name: 'First Variant',
                  rollout_percentage: 50,
                },
                {
                  key: 'second-variant',
                  name: 'Second Variant',
                  rollout_percentage: 25,
                },
                {
                  key: 'third-variant',
                  name: 'Third Variant',
                  rollout_percentage: 25,
                },
              ],
            },
          },
        },
      ],
    }
    mockedFetch.mockImplementation(apiImplementation({ localFlags: flags }))

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(
      await posthog.getFeatureFlag('beta-feature', 'test_id', { personProperties: { email: 'test@posthog.com' } })
    ).toEqual('second-variant')
    expect(
      await posthog.getFeatureFlag('beta-feature', 'example_id', { personProperties: { email: 'test@posthog.com' } })
    ).toEqual('second-variant')
    expect(await posthog.getFeatureFlag('beta-feature', 'example_id')).toEqual('first-variant')

    expect(mockedFetch).toHaveBeenCalledWith(...anyLocalEvalCall)
    // decide not called
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('gets feature flag with invalid variant overrides', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: true,
          active: true,
          filters: {
            groups: [
              {
                properties: [
                  {
                    key: 'email',
                    operator: 'exact',
                    value: 'test@posthog.com',
                    type: 'person',
                  },
                ],
                rollout_percentage: 100,
                variant: 'second???',
              },
              {
                rollout_percentage: 50,
                variant: 'first???',
              },
            ],
            multivariate: {
              variants: [
                {
                  key: 'first-variant',
                  name: 'First Variant',
                  rollout_percentage: 50,
                },
                {
                  key: 'second-variant',
                  name: 'Second Variant',
                  rollout_percentage: 25,
                },
                {
                  key: 'third-variant',
                  name: 'Third Variant',
                  rollout_percentage: 25,
                },
              ],
            },
          },
        },
      ],
    }
    mockedFetch.mockImplementation(apiImplementation({ localFlags: flags }))

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(
      await posthog.getFeatureFlag('beta-feature', 'test_id', { personProperties: { email: 'test@posthog.com' } })
    ).toEqual('third-variant')
    expect(await posthog.getFeatureFlag('beta-feature', 'example_id')).toEqual('second-variant')

    expect(mockedFetch).toHaveBeenCalledWith(...anyLocalEvalCall)
    // decide not called
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('gets feature flag with multiple variant overrides', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: true,
          active: true,
          filters: {
            groups: [
              {
                rollout_percentage: 100,
                // # The override applies even if the first condition matches all and gives everyone their default group
              },
              {
                properties: [
                  {
                    key: 'email',
                    operator: 'exact',
                    value: 'test@posthog.com',
                    type: 'person',
                  },
                ],
                rollout_percentage: 100,
                variant: 'second-variant',
              },
              {
                rollout_percentage: 50,
                variant: 'third-variant',
              },
            ],
            multivariate: {
              variants: [
                {
                  key: 'first-variant',
                  name: 'First Variant',
                  rollout_percentage: 50,
                },
                {
                  key: 'second-variant',
                  name: 'Second Variant',
                  rollout_percentage: 25,
                },
                {
                  key: 'third-variant',
                  name: 'Third Variant',
                  rollout_percentage: 25,
                },
              ],
            },
          },
        },
      ],
    }
    mockedFetch.mockImplementation(apiImplementation({ localFlags: flags }))

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(
      await posthog.getFeatureFlag('beta-feature', 'test_id', { personProperties: { email: 'test@posthog.com' } })
    ).toEqual('second-variant')
    expect(await posthog.getFeatureFlag('beta-feature', 'example_id')).toEqual('third-variant')
    expect(await posthog.getFeatureFlag('beta-feature', 'another_id')).toEqual('second-variant')

    expect(mockedFetch).toHaveBeenCalledWith(...anyLocalEvalCall)
    // decide not called
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('get feature flag payload based on boolean flag', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'person-flag',
          is_simple_flag: true,
          active: true,
          filters: {
            groups: [
              {
                properties: [
                  {
                    key: 'region',
                    operator: 'exact',
                    value: ['USA'],
                    type: 'person',
                  },
                ],
                rollout_percentage: null,
              },
            ],
            payloads: {
              true: {
                log: 'all',
              },
            },
          },
        },
      ],
    }
    mockedFetch.mockImplementation(apiImplementation({ localFlags: flags }))

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(
      await posthog.getFeatureFlagPayload('person-flag', 'some-distinct-id', true, {
        personProperties: { region: 'USA' },
      })
    ).toEqual({
      log: 'all',
    })
    expect(
      await posthog.getFeatureFlagPayload('person-flag', 'some-distinct-id', undefined, {
        personProperties: { region: 'USA' },
      })
    ).toEqual({
      log: 'all',
    })
    expect(mockedFetch).toHaveBeenCalledWith(...anyLocalEvalCall)
    // decide not called
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })

  it('get feature flag payload on a multivariate', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'beta-feature',
          is_simple_flag: true,
          active: true,
          filters: {
            groups: [
              {
                properties: [
                  {
                    key: 'email',
                    operator: 'exact',
                    value: 'test@posthog.com',
                    type: 'person',
                  },
                ],
                rollout_percentage: 100,
                variant: 'second-variant',
              },
              {
                rollout_percentage: 50,
                variant: 'first-variant',
              },
            ],
            multivariate: {
              variants: [
                {
                  key: 'first-variant',
                  name: 'First Variant',
                  rollout_percentage: 50,
                },
                {
                  key: 'second-variant',
                  name: 'Second Variant',
                  rollout_percentage: 25,
                },
                {
                  key: 'third-variant',
                  name: 'Third Variant',
                  rollout_percentage: 25,
                },
              ],
            },
            payloads: {
              'second-variant': 2500,
            },
          },
        },
      ],
    }
    mockedFetch.mockImplementation(apiImplementation({ localFlags: flags }))

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    expect(
      await posthog.getFeatureFlagPayload('beta-feature', 'test_id', 'second-variant', {
        personProperties: { email: 'test@posthog.com' },
      })
    ).toEqual(2500)

    expect(mockedFetch).toHaveBeenCalledWith(...anyLocalEvalCall)
    // decide not called
    expect(mockedFetch).not.toHaveBeenCalledWith(...anyDecideCall)
  })
})

describe('match properties', () => {
  it('with operator exact', () => {
    const property_a = { key: 'key', value: 'value' }

    expect(matchProperty(property_a, { key: 'value' })).toBe(true)

    expect(matchProperty(property_a, { key: 'value2' })).toBe(false)
    expect(matchProperty(property_a, { key: '' })).toBe(false)
    expect(matchProperty(property_a, { key: undefined })).toBe(false)

    expect(() => matchProperty(property_a, { key2: 'value' })).toThrow(InconclusiveMatchError)
    expect(() => matchProperty(property_a, {})).toThrow(InconclusiveMatchError)

    const property_b = { key: 'key', value: 'value', operator: 'exact' }

    expect(matchProperty(property_b, { key: 'value' })).toBe(true)
    expect(matchProperty(property_b, { key: 'value2' })).toBe(false)

    const property_c = { key: 'key', value: ['value1', 'value2', 'value3'], operator: 'exact' }
    expect(matchProperty(property_c, { key: 'value1' })).toBe(true)
    expect(matchProperty(property_c, { key: 'value2' })).toBe(true)
    expect(matchProperty(property_c, { key: 'value3' })).toBe(true)

    expect(matchProperty(property_c, { key: 'value4' })).toBe(false)

    expect(() => matchProperty(property_c, { key2: 'value' })).toThrow(InconclusiveMatchError)
  })

  it('with operator is_not', () => {
    const property_a = { key: 'key', value: 'value', operator: 'is_not' }

    expect(matchProperty(property_a, { key: 'value' })).toBe(false)
    expect(matchProperty(property_a, { key: 'value2' })).toBe(true)
    expect(matchProperty(property_a, { key: '' })).toBe(true)
    expect(matchProperty(property_a, { key: undefined })).toBe(true)

    expect(() => matchProperty(property_a, { key2: 'value' })).toThrow(InconclusiveMatchError)
    expect(() => matchProperty(property_a, {})).toThrow(InconclusiveMatchError)

    const property_c = { key: 'key', value: ['value1', 'value2', 'value3'], operator: 'is_not' }
    expect(matchProperty(property_c, { key: 'value1' })).toBe(false)
    expect(matchProperty(property_c, { key: 'value2' })).toBe(false)
    expect(matchProperty(property_c, { key: 'value3' })).toBe(false)

    expect(matchProperty(property_c, { key: 'value4' })).toBe(true)
    expect(matchProperty(property_c, { key: 'value5' })).toBe(true)
    expect(matchProperty(property_c, { key: '' })).toBe(true)
    expect(matchProperty(property_c, { key: undefined })).toBe(true)

    expect(() => matchProperty(property_c, { key2: 'value' })).toThrow(InconclusiveMatchError)
  })

  it('with operator is_set', () => {
    const property_a = { key: 'key', value: 'is_set', operator: 'is_set' }

    expect(matchProperty(property_a, { key: 'value' })).toBe(true)
    expect(matchProperty(property_a, { key: 'value2' })).toBe(true)
    expect(matchProperty(property_a, { key: '' })).toBe(true)
    expect(matchProperty(property_a, { key: undefined })).toBe(true)

    expect(() => matchProperty(property_a, { key2: 'value' })).toThrow(InconclusiveMatchError)
    expect(() => matchProperty(property_a, {})).toThrow(InconclusiveMatchError)
  })

  it('with operator icontains', () => {
    const property_a = { key: 'key', value: 'vaLuE', operator: 'icontains' }

    expect(matchProperty(property_a, { key: 'value' })).toBe(true)
    expect(matchProperty(property_a, { key: 'value2' })).toBe(true)
    expect(matchProperty(property_a, { key: 'vaLue3' })).toBe(true)
    expect(matchProperty(property_a, { key: '343tfvalUe5' })).toBe(true)

    expect(matchProperty(property_a, { key: '' })).toBe(false)
    expect(matchProperty(property_a, { key: undefined })).toBe(false)
    expect(matchProperty(property_a, { key: 1234 })).toBe(false)
    expect(matchProperty(property_a, { key: '1234' })).toBe(false)

    expect(() => matchProperty(property_a, { key2: 'value' })).toThrow(InconclusiveMatchError)
    expect(() => matchProperty(property_a, {})).toThrow(InconclusiveMatchError)

    const property_b = { key: 'key', value: '3', operator: 'icontains' }

    expect(matchProperty(property_b, { key: '3' })).toBe(true)
    expect(matchProperty(property_b, { key: 323 })).toBe(true)
    expect(matchProperty(property_b, { key: 'val3' })).toBe(true)

    expect(matchProperty(property_b, { key: 'three' })).toBe(false)
  })

  it('with operator regex', () => {
    const property_a = { key: 'key', value: '\\.com$', operator: 'regex' }

    expect(matchProperty(property_a, { key: 'value.com' })).toBe(true)
    expect(matchProperty(property_a, { key: 'value2.com' })).toBe(true)

    expect(matchProperty(property_a, { key: 'valuecom' })).toBe(false)
    expect(matchProperty(property_a, { key: 'valuecom' })).toBe(false)
    expect(matchProperty(property_a, { key: '.com343tfvalue5' })).toBe(false)
    expect(matchProperty(property_a, { key: undefined })).toBe(false)
    expect(matchProperty(property_a, { key: '' })).toBe(false)

    expect(() => matchProperty(property_a, { key2: 'value' })).toThrow(InconclusiveMatchError)
    expect(() => matchProperty(property_a, {})).toThrow(InconclusiveMatchError)

    const property_b = { key: 'key', value: '3', operator: 'regex' }

    expect(matchProperty(property_b, { key: '3' })).toBe(true)
    expect(matchProperty(property_b, { key: 323 })).toBe(true)
    expect(matchProperty(property_b, { key: 'val3' })).toBe(true)

    expect(matchProperty(property_b, { key: 'three' })).toBe(false)

    // # invalid regex
    const property_c = { key: 'key', value: '?*', operator: 'regex' }
    expect(matchProperty(property_c, { key: 'value.com' })).toBe(false)
    expect(matchProperty(property_c, { key: 'value2' })).toBe(false)

    // # non string value
    const property_d = { key: 'key', value: 4, operator: 'regex' }
    expect(matchProperty(property_d, { key: '4' })).toBe(true)
    expect(matchProperty(property_d, { key: 4 })).toBe(true)

    expect(matchProperty(property_d, { key: 'value' })).toBe(false)

    // # non string value - not_regex
    const property_e = { key: 'key', value: 4, operator: 'not_regex' }
    expect(matchProperty(property_e, { key: '4' })).toBe(false)
    expect(matchProperty(property_e, { key: 4 })).toBe(false)

    expect(matchProperty(property_e, { key: 'value' })).toBe(true)
  })

  it('with math operators', () => {
    const property_a = { key: 'key', value: 1, operator: 'gt' }

    expect(matchProperty(property_a, { key: 2 })).toBe(true)
    expect(matchProperty(property_a, { key: 3 })).toBe(true)

    expect(matchProperty(property_a, { key: 0 })).toBe(false)
    expect(matchProperty(property_a, { key: -1 })).toBe(false)
    expect(matchProperty(property_a, { key: '23' })).toBe(false)

    const property_b = { key: 'key', value: 1, operator: 'lt' }
    expect(matchProperty(property_b, { key: 0 })).toBe(true)
    expect(matchProperty(property_b, { key: -1 })).toBe(true)
    expect(matchProperty(property_b, { key: -3 })).toBe(true)

    expect(matchProperty(property_b, { key: '3' })).toBe(false)
    expect(matchProperty(property_b, { key: '1' })).toBe(false)
    expect(matchProperty(property_b, { key: 1 })).toBe(false)

    const property_c = { key: 'key', value: 1, operator: 'gte' }
    expect(matchProperty(property_c, { key: 2 })).toBe(true)
    expect(matchProperty(property_c, { key: 1 })).toBe(true)

    expect(matchProperty(property_c, { key: 0 })).toBe(false)
    expect(matchProperty(property_c, { key: -1 })).toBe(false)
    expect(matchProperty(property_c, { key: -3 })).toBe(false)
    expect(matchProperty(property_c, { key: '3' })).toBe(false)

    const property_d = { key: 'key', value: '43', operator: 'lte' }
    expect(matchProperty(property_d, { key: '43' })).toBe(true)
    expect(matchProperty(property_d, { key: '42' })).toBe(true)

    expect(matchProperty(property_d, { key: '44' })).toBe(false)
    expect(matchProperty(property_d, { key: 44 })).toBe(false)
  })

  it('with date operators', () => {
    // is date before
    const property_a = { key: 'key', value: '2022-05-01', operator: 'is_date_before' }
    expect(matchProperty(property_a, { key: '2022-03-01' })).toBe(true)
    expect(matchProperty(property_a, { key: '2022-04-30' })).toBe(true)
    expect(matchProperty(property_a, { key: new Date(2022, 3, 30) })).toBe(true)
    expect(matchProperty(property_a, { key: new Date(2022, 3, 30, 1, 2, 3) })).toBe(true)
    expect(matchProperty(property_a, { key: new Date('2022-04-30T00:00:00+02:00') })).toBe(true) // europe/madrid
    expect(matchProperty(property_a, { key: new Date('2022-04-30') })).toBe(true)
    expect(matchProperty(property_a, { key: '2022-05-30' })).toBe(false)

    // is date after
    const property_b = { key: 'key', value: '2022-05-01', operator: 'is_date_after' }
    expect(matchProperty(property_b, { key: '2022-05-02' })).toBe(true)
    expect(matchProperty(property_b, { key: '2022-05-30' })).toBe(true)
    expect(matchProperty(property_b, { key: new Date(2022, 4, 30) })).toBe(true)
    expect(matchProperty(property_b, { key: new Date('2022-05-30') })).toBe(true)
    expect(matchProperty(property_b, { key: '2022-04-30' })).toBe(false)

    // can't be an invalid number or invalid string
    expect(() => matchProperty(property_a, { key: parseInt('62802180000012345') })).toThrow(InconclusiveMatchError)
    expect(() => matchProperty(property_a, { key: 'abcdef' })).toThrow(InconclusiveMatchError)
    // invalid flag property
    const property_c = { key: 'key', value: 'abcd123', operator: 'is_date_before' }
    expect(() => matchProperty(property_c, { key: '2022-05-30' })).toThrow(InconclusiveMatchError)

    // Timezone
    const property_d = { key: 'key', value: '2022-04-05 12:34:12 +01:00', operator: 'is_date_before' }
    expect(matchProperty(property_d, { key: '2022-05-30' })).toBe(false)

    expect(matchProperty(property_d, { key: '2022-03-30' })).toBe(true)
    expect(matchProperty(property_d, { key: '2022-04-05 12:34:11+01:00' })).toBe(true)
    expect(matchProperty(property_d, { key: '2022-04-05 11:34:11 +00:00' })).toBe(true)
    expect(matchProperty(property_d, { key: '2022-04-05 11:34:13 +00:00' })).toBe(false)
  })
})

describe('consistency tests', () => {
  // # These tests are the same across all libraries
  // # See https://github.com/PostHog/posthog/blob/master/posthog/test/test_feature_flag.py#L627
  // # where this test has directly been copied from.
  // # They ensure that the server and library hash calculations are in sync.

  let posthog: PostHog
  jest.useFakeTimers()

  it('is consistent for simple flags', () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: '',
          key: 'simple-flag',
          active: true,
          is_simple_flag: false,
          filters: {
            groups: [{ properties: [], rollout_percentage: 45 }],
          },
        },
      ],
    }

    mockedFetch.mockImplementation(apiImplementation({ localFlags: flags, decideFlags: {}, decideStatus: 400 }))

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    const results = [
      false,
      true,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      true,
      false,
      false,
      false,
      true,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      false,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      false,
      true,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      true,
      true,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      true,
      true,
      false,
      true,
      false,
      false,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
      true,
      false,
      false,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
      false,
      true,
      true,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
      true,
      true,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      true,
      true,
      true,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
      true,
    ]

    results.forEach(async (result, index) => {
      const distinctId = `distinct_id_${index}`
      const value = await posthog.isFeatureEnabled('simple-flag', distinctId)
      expect(value).toBe(result)
    })
  })

  it('is consistent for multivariate flags', async () => {
    const flags = {
      flags: [
        {
          id: 1,
          name: 'Beta Feature',
          key: 'multivariate-flag',
          is_simple_flag: false,
          active: true,
          filters: {
            groups: [{ properties: [], rollout_percentage: 55 }],
            multivariate: {
              variants: [
                { key: 'first-variant', name: 'First Variant', rollout_percentage: 50 },
                { key: 'second-variant', name: 'Second Variant', rollout_percentage: 20 },
                { key: 'third-variant', name: 'Third Variant', rollout_percentage: 20 },
                { key: 'fourth-variant', name: 'Fourth Variant', rollout_percentage: 5 },
                { key: 'fifth-variant', name: 'Fifth Variant', rollout_percentage: 5 },
              ],
            },
          },
        },
      ],
    }

    mockedFetch.mockImplementation(apiImplementation({ localFlags: flags, decideFlags: {}, decideStatus: 400 }))

    posthog = new PostHog('TEST_API_KEY', {
      host: 'http://example.com',
      personalApiKey: 'TEST_PERSONAL_API_KEY',
      ...posthogImmediateResolveOptions,
    })

    const results = [
      'second-variant',
      'second-variant',
      'first-variant',
      false,
      false,
      'second-variant',
      'first-variant',
      false,
      false,
      false,
      'first-variant',
      'third-variant',
      false,
      'first-variant',
      'second-variant',
      'first-variant',
      false,
      false,
      'fourth-variant',
      'first-variant',
      false,
      'third-variant',
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      'third-variant',
      false,
      'third-variant',
      'second-variant',
      'first-variant',
      false,
      'third-variant',
      false,
      false,
      'first-variant',
      'second-variant',
      false,
      'first-variant',
      'first-variant',
      'second-variant',
      false,
      'first-variant',
      false,
      false,
      'first-variant',
      'first-variant',
      'first-variant',
      'second-variant',
      'first-variant',
      false,
      'second-variant',
      'second-variant',
      'third-variant',
      'second-variant',
      'first-variant',
      false,
      'first-variant',
      'second-variant',
      'fourth-variant',
      false,
      'first-variant',
      'first-variant',
      'first-variant',
      false,
      'first-variant',
      'second-variant',
      false,
      'third-variant',
      false,
      false,
      false,
      false,
      false,
      false,
      'first-variant',
      'fifth-variant',
      false,
      'second-variant',
      'first-variant',
      'second-variant',
      false,
      'third-variant',
      'third-variant',
      false,
      false,
      false,
      false,
      'third-variant',
      false,
      false,
      'first-variant',
      'first-variant',
      false,
      'third-variant',
      'third-variant',
      false,
      'third-variant',
      'second-variant',
      'third-variant',
      false,
      false,
      'second-variant',
      'first-variant',
      false,
      false,
      'first-variant',
      false,
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      'first-variant',
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      false,
      'first-variant',
      'first-variant',
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      'second-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      'second-variant',
      false,
      'second-variant',
      'first-variant',
      'second-variant',
      'first-variant',
      false,
      'second-variant',
      'second-variant',
      false,
      'first-variant',
      false,
      false,
      false,
      'third-variant',
      'first-variant',
      false,
      false,
      'first-variant',
      false,
      false,
      false,
      false,
      'first-variant',
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      'third-variant',
      'first-variant',
      'first-variant',
      false,
      false,
      'first-variant',
      false,
      false,
      'fifth-variant',
      'second-variant',
      false,
      'second-variant',
      false,
      'first-variant',
      'third-variant',
      'first-variant',
      'fifth-variant',
      'third-variant',
      false,
      false,
      'fourth-variant',
      false,
      false,
      false,
      false,
      'third-variant',
      false,
      false,
      'third-variant',
      false,
      'first-variant',
      'second-variant',
      'second-variant',
      'second-variant',
      false,
      'first-variant',
      'third-variant',
      'first-variant',
      'first-variant',
      false,
      false,
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      'first-variant',
      'second-variant',
      false,
      false,
      false,
      'second-variant',
      false,
      false,
      'first-variant',
      false,
      'first-variant',
      false,
      false,
      'first-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      'third-variant',
      'first-variant',
      'third-variant',
      'first-variant',
      'first-variant',
      'second-variant',
      'third-variant',
      'third-variant',
      false,
      'second-variant',
      'first-variant',
      false,
      'second-variant',
      'first-variant',
      false,
      'first-variant',
      false,
      false,
      'first-variant',
      'fifth-variant',
      'first-variant',
      false,
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      'second-variant',
      false,
      'second-variant',
      'third-variant',
      'third-variant',
      false,
      'first-variant',
      'third-variant',
      false,
      false,
      'first-variant',
      false,
      'third-variant',
      'first-variant',
      false,
      'third-variant',
      'first-variant',
      'first-variant',
      false,
      'first-variant',
      'second-variant',
      'second-variant',
      'first-variant',
      false,
      false,
      false,
      'second-variant',
      false,
      false,
      'first-variant',
      'first-variant',
      false,
      'third-variant',
      false,
      'first-variant',
      false,
      'third-variant',
      false,
      'third-variant',
      'second-variant',
      'first-variant',
      false,
      false,
      'first-variant',
      'third-variant',
      'first-variant',
      'second-variant',
      'fifth-variant',
      false,
      false,
      'first-variant',
      false,
      false,
      false,
      'third-variant',
      false,
      'second-variant',
      'first-variant',
      false,
      false,
      false,
      false,
      'third-variant',
      false,
      false,
      'third-variant',
      false,
      false,
      'first-variant',
      'third-variant',
      false,
      false,
      'first-variant',
      false,
      false,
      'fourth-variant',
      'fourth-variant',
      'third-variant',
      'second-variant',
      'first-variant',
      'third-variant',
      'fifth-variant',
      false,
      'first-variant',
      'fifth-variant',
      false,
      'first-variant',
      'first-variant',
      'first-variant',
      false,
      false,
      false,
      'second-variant',
      'fifth-variant',
      'second-variant',
      'first-variant',
      'first-variant',
      'second-variant',
      false,
      false,
      'third-variant',
      false,
      'second-variant',
      'fifth-variant',
      false,
      'third-variant',
      'first-variant',
      false,
      false,
      'fourth-variant',
      false,
      false,
      'second-variant',
      false,
      false,
      'first-variant',
      'fourth-variant',
      'first-variant',
      'second-variant',
      false,
      false,
      false,
      'first-variant',
      'third-variant',
      'third-variant',
      false,
      'first-variant',
      'first-variant',
      'first-variant',
      false,
      'first-variant',
      false,
      'first-variant',
      'third-variant',
      'third-variant',
      false,
      false,
      'first-variant',
      false,
      false,
      'second-variant',
      'second-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      false,
      'fifth-variant',
      'first-variant',
      false,
      false,
      false,
      'second-variant',
      'third-variant',
      'first-variant',
      'fourth-variant',
      'first-variant',
      'third-variant',
      false,
      'first-variant',
      'first-variant',
      false,
      'third-variant',
      'first-variant',
      'first-variant',
      'third-variant',
      false,
      'fourth-variant',
      'fifth-variant',
      'first-variant',
      'first-variant',
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      'first-variant',
      false,
      'first-variant',
      'first-variant',
      'second-variant',
      'first-variant',
      false,
      'first-variant',
      'second-variant',
      'first-variant',
      false,
      'first-variant',
      'second-variant',
      false,
      'first-variant',
      'first-variant',
      false,
      'first-variant',
      false,
      'first-variant',
      false,
      'first-variant',
      false,
      false,
      false,
      'third-variant',
      'third-variant',
      'first-variant',
      false,
      false,
      'second-variant',
      'third-variant',
      'first-variant',
      'first-variant',
      false,
      false,
      false,
      'second-variant',
      'first-variant',
      false,
      'first-variant',
      'third-variant',
      false,
      'first-variant',
      false,
      false,
      false,
      'first-variant',
      'third-variant',
      'third-variant',
      false,
      false,
      false,
      false,
      'third-variant',
      'fourth-variant',
      'fourth-variant',
      'first-variant',
      'second-variant',
      false,
      'first-variant',
      false,
      'second-variant',
      'first-variant',
      'third-variant',
      false,
      'third-variant',
      false,
      'first-variant',
      'first-variant',
      'third-variant',
      false,
      false,
      false,
      'fourth-variant',
      'second-variant',
      'first-variant',
      false,
      false,
      'first-variant',
      'fourth-variant',
      false,
      'first-variant',
      'third-variant',
      'first-variant',
      false,
      false,
      'third-variant',
      false,
      'first-variant',
      false,
      'first-variant',
      'first-variant',
      'third-variant',
      'second-variant',
      'fourth-variant',
      false,
      'first-variant',
      false,
      false,
      false,
      false,
      'second-variant',
      'first-variant',
      'second-variant',
      false,
      'first-variant',
      false,
      'first-variant',
      'first-variant',
      false,
      'first-variant',
      'first-variant',
      'second-variant',
      'third-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      false,
      false,
      false,
      'third-variant',
      false,
      'first-variant',
      'first-variant',
      'first-variant',
      'third-variant',
      'first-variant',
      'first-variant',
      'second-variant',
      'first-variant',
      'fifth-variant',
      'fourth-variant',
      'first-variant',
      'second-variant',
      false,
      'fourth-variant',
      false,
      false,
      false,
      'fourth-variant',
      false,
      false,
      'third-variant',
      false,
      false,
      false,
      'first-variant',
      'third-variant',
      'third-variant',
      'second-variant',
      'first-variant',
      'second-variant',
      'first-variant',
      false,
      'first-variant',
      false,
      false,
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      false,
      'second-variant',
      false,
      false,
      'first-variant',
      false,
      'second-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      'third-variant',
      'second-variant',
      false,
      false,
      'fifth-variant',
      'third-variant',
      false,
      false,
      'first-variant',
      false,
      false,
      false,
      'first-variant',
      'second-variant',
      'third-variant',
      'third-variant',
      false,
      false,
      'first-variant',
      false,
      'third-variant',
      'first-variant',
      false,
      false,
      false,
      false,
      'fourth-variant',
      'first-variant',
      false,
      false,
      false,
      'third-variant',
      false,
      false,
      'second-variant',
      'first-variant',
      false,
      false,
      'second-variant',
      'third-variant',
      'first-variant',
      'first-variant',
      false,
      'first-variant',
      'first-variant',
      false,
      false,
      'second-variant',
      'third-variant',
      'second-variant',
      'third-variant',
      false,
      false,
      'first-variant',
      false,
      false,
      'first-variant',
      false,
      'second-variant',
      false,
      false,
      false,
      false,
      'first-variant',
      false,
      'third-variant',
      false,
      'first-variant',
      false,
      false,
      'second-variant',
      'third-variant',
      'second-variant',
      'fourth-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      false,
      'first-variant',
      false,
      'second-variant',
      false,
      false,
      false,
      false,
      false,
      'first-variant',
      false,
      false,
      false,
      false,
      false,
      'first-variant',
      false,
      'second-variant',
      false,
      false,
      false,
      false,
      'second-variant',
      false,
      'first-variant',
      false,
      'third-variant',
      false,
      false,
      'first-variant',
      'third-variant',
      false,
      'third-variant',
      false,
      false,
      'second-variant',
      false,
      'first-variant',
      'second-variant',
      'first-variant',
      false,
      false,
      false,
      false,
      false,
      'second-variant',
      false,
      false,
      'first-variant',
      'third-variant',
      false,
      'first-variant',
      false,
      false,
      false,
      false,
      false,
      'first-variant',
      'second-variant',
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      'fifth-variant',
      false,
      false,
      false,
      'first-variant',
      false,
      'third-variant',
      false,
      false,
      'second-variant',
      false,
      false,
      false,
      false,
      false,
      'fourth-variant',
      'second-variant',
      'first-variant',
      'second-variant',
      false,
      'second-variant',
      false,
      'second-variant',
      false,
      'first-variant',
      false,
      'first-variant',
      'first-variant',
      false,
      'second-variant',
      false,
      'first-variant',
      false,
      'fifth-variant',
      false,
      'first-variant',
      'first-variant',
      false,
      false,
      false,
      'first-variant',
      false,
      'first-variant',
      'third-variant',
      false,
      false,
      'first-variant',
      'first-variant',
      false,
      false,
      'fifth-variant',
      false,
      false,
      'third-variant',
      false,
      'third-variant',
      'first-variant',
      'first-variant',
      'third-variant',
      'third-variant',
      false,
      'first-variant',
      false,
      false,
      false,
      false,
      false,
      'first-variant',
      false,
      false,
      false,
      false,
      'second-variant',
      'first-variant',
      'second-variant',
      'first-variant',
      false,
      'fifth-variant',
      'first-variant',
      false,
      false,
      'fourth-variant',
      'first-variant',
      'first-variant',
      false,
      false,
      'fourth-variant',
      'first-variant',
      false,
      'second-variant',
      'third-variant',
      'third-variant',
      'first-variant',
      'first-variant',
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      'first-variant',
      false,
      'third-variant',
      'third-variant',
      'third-variant',
      false,
      false,
      'first-variant',
      'first-variant',
      false,
      'second-variant',
      false,
      false,
      'second-variant',
      false,
      'third-variant',
      'first-variant',
      'second-variant',
      'fifth-variant',
      'first-variant',
      'first-variant',
      false,
      'first-variant',
      'fifth-variant',
      false,
      false,
      false,
      'third-variant',
      'first-variant',
      'first-variant',
      'second-variant',
      'fourth-variant',
      'first-variant',
      'second-variant',
      'first-variant',
      false,
      false,
      false,
      'second-variant',
      'third-variant',
      false,
      false,
      'first-variant',
      false,
      false,
      false,
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      false,
      'third-variant',
      false,
      'first-variant',
      false,
      'third-variant',
      'third-variant',
      'first-variant',
      'first-variant',
      false,
      'second-variant',
      false,
      'second-variant',
      'first-variant',
      false,
      false,
      false,
      'second-variant',
      false,
      'third-variant',
      false,
      'first-variant',
      'fifth-variant',
      'first-variant',
      'first-variant',
      false,
      false,
      'first-variant',
      false,
      false,
      false,
      'first-variant',
      'fourth-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      'fifth-variant',
      false,
      false,
      false,
      'second-variant',
      false,
      false,
      false,
      'first-variant',
      'first-variant',
      false,
      false,
      'first-variant',
      'first-variant',
      'second-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      'third-variant',
      'first-variant',
      false,
      'second-variant',
      false,
      false,
      'third-variant',
      'second-variant',
      'third-variant',
      false,
      'first-variant',
      'third-variant',
      'second-variant',
      'first-variant',
      'third-variant',
      false,
      false,
      'first-variant',
      'first-variant',
      false,
      false,
      false,
      'first-variant',
      'third-variant',
      'second-variant',
      'first-variant',
      'first-variant',
      'first-variant',
      false,
      'third-variant',
      'second-variant',
      'third-variant',
      false,
      false,
      'third-variant',
      'first-variant',
      false,
      'first-variant',
    ]

    results.forEach(async (result, index) => {
      const distinctId = `distinct_id_${index}`
      const value = await posthog.getFeatureFlag('multivariate-flag', distinctId)
      expect(value).toBe(result)
    })
  })
})
