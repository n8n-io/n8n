import { createHash } from 'rusha'
import { FeatureFlagCondition, FlagProperty, PostHogFeatureFlag, PropertyGroup } from './types'
import { version } from '../package.json'
import { JsonType, PostHogFetchOptions, PostHogFetchResponse } from 'posthog-core/src'
import { safeSetTimeout } from 'posthog-core/src/utils'
import fetch from './fetch'

// eslint-disable-next-line
const LONG_SCALE = 0xfffffffffffffff

class ClientError extends Error {
  constructor(message: string) {
    super()
    Error.captureStackTrace(this, this.constructor)
    this.name = 'ClientError'
    this.message = message
    Object.setPrototypeOf(this, ClientError.prototype)
  }
}

class InconclusiveMatchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
    // instanceof doesn't work in ES3 or ES5
    // https://www.dannyguo.com/blog/how-to-fix-instanceof-not-working-for-custom-errors-in-typescript/
    // this is the workaround
    Object.setPrototypeOf(this, InconclusiveMatchError.prototype)
  }
}

type FeatureFlagsPollerOptions = {
  personalApiKey: string
  projectApiKey: string
  host: string
  pollingInterval: number
  timeout?: number
  fetch?: (url: string, options: PostHogFetchOptions) => Promise<PostHogFetchResponse>
  onError?: (error: Error) => void
}

class FeatureFlagsPoller {
  pollingInterval: number
  personalApiKey: string
  projectApiKey: string
  featureFlags: Array<PostHogFeatureFlag>
  featureFlagsByKey: Record<string, PostHogFeatureFlag>
  groupTypeMapping: Record<string, string>
  cohorts: Record<string, PropertyGroup>
  loadedSuccessfullyOnce: boolean
  timeout?: number
  host: FeatureFlagsPollerOptions['host']
  poller?: NodeJS.Timeout
  fetch: (url: string, options: PostHogFetchOptions) => Promise<PostHogFetchResponse>
  debugMode: boolean = false
  onError?: (error: Error) => void

  constructor({
    pollingInterval,
    personalApiKey,
    projectApiKey,
    timeout,
    host,
    ...options
  }: FeatureFlagsPollerOptions) {
    this.pollingInterval = pollingInterval
    this.personalApiKey = personalApiKey
    this.featureFlags = []
    this.featureFlagsByKey = {}
    this.groupTypeMapping = {}
    this.cohorts = {}
    this.loadedSuccessfullyOnce = false
    this.timeout = timeout
    this.projectApiKey = projectApiKey
    this.host = host
    this.poller = undefined
    // NOTE: as any is required here as the AbortSignal typing is slightly misaligned but works just fine
    this.fetch = options.fetch || fetch
    this.onError = options.onError

    void this.loadFeatureFlags()
  }

  debug(enabled: boolean = true): void {
    this.debugMode = enabled
  }

  async getFeatureFlag(
    key: string,
    distinctId: string,
    groups: Record<string, string> = {},
    personProperties: Record<string, string> = {},
    groupProperties: Record<string, Record<string, string>> = {}
  ): Promise<string | boolean | undefined> {
    await this.loadFeatureFlags()

    let response = undefined
    let featureFlag = undefined

    if (!this.loadedSuccessfullyOnce) {
      return response
    }

    for (const flag of this.featureFlags) {
      if (key === flag.key) {
        featureFlag = flag
        break
      }
    }

    if (featureFlag !== undefined) {
      try {
        response = this.computeFlagLocally(featureFlag, distinctId, groups, personProperties, groupProperties)
        if (this.debugMode) {
          console.debug(`Successfully computed flag locally: ${key} -> ${response}`)
        }
      } catch (e) {
        if (e instanceof InconclusiveMatchError) {
          if (this.debugMode) {
            console.debug(`InconclusiveMatchError when computing flag locally: ${key}: ${e}`)
          }
        } else if (e instanceof Error) {
          console.error(`Error computing flag locally: ${key}: ${e}`)
        }
      }
    }

    return response
  }

  async computeFeatureFlagPayloadLocally(key: string, matchValue: string | boolean): Promise<JsonType | undefined> {
    await this.loadFeatureFlags()

    let response = undefined

    if (!this.loadedSuccessfullyOnce) {
      return undefined
    }

    if (typeof matchValue == 'boolean') {
      response = this.featureFlagsByKey?.[key]?.filters?.payloads?.[matchValue.toString()]
    } else if (typeof matchValue == 'string') {
      response = this.featureFlagsByKey?.[key]?.filters?.payloads?.[matchValue]
    }

    // Undefined means a loading or missing data issue. Null means evaluation happened and there was no match
    if (response === undefined) {
      return null
    }

    return response
  }

  async getAllFlagsAndPayloads(
    distinctId: string,
    groups: Record<string, string> = {},
    personProperties: Record<string, string> = {},
    groupProperties: Record<string, Record<string, string>> = {}
  ): Promise<{
    response: Record<string, string | boolean>
    payloads: Record<string, JsonType>
    fallbackToDecide: boolean
  }> {
    await this.loadFeatureFlags()

    const response: Record<string, string | boolean> = {}
    const payloads: Record<string, JsonType> = {}
    let fallbackToDecide = this.featureFlags.length == 0

    this.featureFlags.map(async (flag) => {
      try {
        const matchValue = this.computeFlagLocally(flag, distinctId, groups, personProperties, groupProperties)
        response[flag.key] = matchValue
        const matchPayload = await this.computeFeatureFlagPayloadLocally(flag.key, matchValue)
        if (matchPayload) {
          payloads[flag.key] = matchPayload
        }
      } catch (e) {
        if (e instanceof InconclusiveMatchError) {
          // do nothing
        } else if (e instanceof Error) {
          this.onError?.(new Error(`Error computing flag locally: ${flag.key}: ${e}`))
        }
        fallbackToDecide = true
      }
    })

    return { response, payloads, fallbackToDecide }
  }

  computeFlagLocally(
    flag: PostHogFeatureFlag,
    distinctId: string,
    groups: Record<string, string> = {},
    personProperties: Record<string, string> = {},
    groupProperties: Record<string, Record<string, string>> = {}
  ): string | boolean {
    if (flag.ensure_experience_continuity) {
      throw new InconclusiveMatchError('Flag has experience continuity enabled')
    }

    if (!flag.active) {
      return false
    }

    const flagFilters = flag.filters || {}
    const aggregation_group_type_index = flagFilters.aggregation_group_type_index

    if (aggregation_group_type_index != undefined) {
      const groupName = this.groupTypeMapping[String(aggregation_group_type_index)]

      if (!groupName) {
        console.warn(
          `[FEATURE FLAGS] Unknown group type index ${aggregation_group_type_index} for feature flag ${flag.key}`
        )
        throw new InconclusiveMatchError('Flag has unknown group type index')
      }

      if (!(groupName in groups)) {
        console.warn(`[FEATURE FLAGS] Can't compute group feature flag: ${flag.key} without group names passed in`)
        return false
      }

      const focusedGroupProperties = groupProperties[groupName]
      return this.matchFeatureFlagProperties(flag, groups[groupName], focusedGroupProperties)
    } else {
      return this.matchFeatureFlagProperties(flag, distinctId, personProperties)
    }
  }

  matchFeatureFlagProperties(
    flag: PostHogFeatureFlag,
    distinctId: string,
    properties: Record<string, string>
  ): string | boolean {
    const flagFilters = flag.filters || {}
    const flagConditions = flagFilters.groups || []
    let isInconclusive = false
    let result = undefined

    // # Stable sort conditions with variant overrides to the top. This ensures that if overrides are present, they are
    // # evaluated first, and the variant override is applied to the first matching condition.
    const sortedFlagConditions = [...flagConditions].sort((conditionA, conditionB) => {
      const AHasVariantOverride = !!conditionA.variant
      const BHasVariantOverride = !!conditionB.variant

      if (AHasVariantOverride && BHasVariantOverride) {
        return 0
      } else if (AHasVariantOverride) {
        return -1
      } else if (BHasVariantOverride) {
        return 1
      } else {
        return 0
      }
    })

    for (const condition of sortedFlagConditions) {
      try {
        if (this.isConditionMatch(flag, distinctId, condition, properties)) {
          const variantOverride = condition.variant
          const flagVariants = flagFilters.multivariate?.variants || []
          if (variantOverride && flagVariants.some((variant) => variant.key === variantOverride)) {
            result = variantOverride
          } else {
            result = this.getMatchingVariant(flag, distinctId) || true
          }
          break
        }
      } catch (e) {
        if (e instanceof InconclusiveMatchError) {
          isInconclusive = true
        } else {
          throw e
        }
      }
    }

    if (result !== undefined) {
      return result
    } else if (isInconclusive) {
      throw new InconclusiveMatchError("Can't determine if feature flag is enabled or not with given properties")
    }

    // We can only return False when all conditions are False
    return false
  }

  isConditionMatch(
    flag: PostHogFeatureFlag,
    distinctId: string,
    condition: FeatureFlagCondition,
    properties: Record<string, string>
  ): boolean {
    const rolloutPercentage = condition.rollout_percentage

    if ((condition.properties || []).length > 0) {
      for (const prop of condition.properties) {
        const propertyType = prop.type
        let matches = false

        if (propertyType === 'cohort') {
          matches = matchCohort(prop, properties, this.cohorts)
        } else {
          matches = matchProperty(prop, properties)
        }

        if (!matches) {
          return false
        }
      }

      if (rolloutPercentage == undefined) {
        return true
      }
    }

    if (rolloutPercentage != undefined && _hash(flag.key, distinctId) > rolloutPercentage / 100.0) {
      return false
    }

    return true
  }

  getMatchingVariant(flag: PostHogFeatureFlag, distinctId: string): string | boolean | undefined {
    const hashValue = _hash(flag.key, distinctId, 'variant')
    const matchingVariant = this.variantLookupTable(flag).find((variant) => {
      return hashValue >= variant.valueMin && hashValue < variant.valueMax
    })

    if (matchingVariant) {
      return matchingVariant.key
    }
    return undefined
  }

  variantLookupTable(flag: PostHogFeatureFlag): { valueMin: number; valueMax: number; key: string }[] {
    const lookupTable: { valueMin: number; valueMax: number; key: string }[] = []
    let valueMin = 0
    let valueMax = 0
    const flagFilters = flag.filters || {}
    const multivariates: {
      key: string
      rollout_percentage: number
    }[] = flagFilters.multivariate?.variants || []

    multivariates.forEach((variant) => {
      valueMax = valueMin + variant.rollout_percentage / 100.0
      lookupTable.push({ valueMin, valueMax, key: variant.key })
      valueMin = valueMax
    })
    return lookupTable
  }

  async loadFeatureFlags(forceReload = false): Promise<void> {
    if (!this.loadedSuccessfullyOnce || forceReload) {
      await this._loadFeatureFlags()
    }
  }

  async _loadFeatureFlags(): Promise<void> {
    if (this.poller) {
      clearTimeout(this.poller)
      this.poller = undefined
    }
    this.poller = setTimeout(() => this._loadFeatureFlags(), this.pollingInterval)

    try {
      const res = await this._requestFeatureFlagDefinitions()

      if (res && res.status === 401) {
        throw new ClientError(
          `Your personalApiKey is invalid. Are you sure you're not using your Project API key? More information: https://posthog.com/docs/api/overview`
        )
      }

      if (res && res.status !== 200) {
        // something else went wrong, or the server is down.
        // In this case, don't override existing flags
        return
      }

      const responseJson = await res.json()
      if (!('flags' in responseJson)) {
        console.error(`Invalid response when getting feature flags: ${JSON.stringify(responseJson)}`)
      }

      this.featureFlags = responseJson.flags || []
      this.featureFlagsByKey = this.featureFlags.reduce(
        (acc, curr) => ((acc[curr.key] = curr), acc),
        <Record<string, PostHogFeatureFlag>>{}
      )
      this.groupTypeMapping = responseJson.group_type_mapping || {}
      this.cohorts = responseJson.cohorts || []
      this.loadedSuccessfullyOnce = true
    } catch (err) {
      // if an error that is not an instance of ClientError is thrown
      // we silently ignore the error when reloading feature flags
      if (err instanceof ClientError) {
        this.onError?.(err)
      }
    }
  }

  async _requestFeatureFlagDefinitions(): Promise<PostHogFetchResponse> {
    const url = `${this.host}/api/feature_flag/local_evaluation?token=${this.projectApiKey}&send_cohorts`

    const options: PostHogFetchOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.personalApiKey}`,
        'user-agent': `posthog-node/${version}`,
      },
    }

    let abortTimeout = null

    if (this.timeout && typeof this.timeout === 'number') {
      const controller = new AbortController()
      abortTimeout = safeSetTimeout(() => {
        controller.abort()
      }, this.timeout)
      options.signal = controller.signal
    }

    try {
      return await this.fetch(url, options)
    } finally {
      clearTimeout(abortTimeout)
    }
  }

  stopPoller(): void {
    clearTimeout(this.poller)
  }
}

// # This function takes a distinct_id and a feature flag key and returns a float between 0 and 1.
// # Given the same distinct_id and key, it'll always return the same float. These floats are
// # uniformly distributed between 0 and 1, so if we want to show this feature to 20% of traffic
// # we can do _hash(key, distinct_id) < 0.2
function _hash(key: string, distinctId: string, salt: string = ''): number {
  // rusha is a fast sha1 implementation in pure javascript
  const sha1Hash = createHash()
  sha1Hash.update(`${key}.${distinctId}${salt}`)
  return parseInt(sha1Hash.digest('hex').slice(0, 15), 16) / LONG_SCALE
}

function matchProperty(
  property: FeatureFlagCondition['properties'][number],
  propertyValues: Record<string, any>
): boolean {
  const key = property.key
  const value = property.value
  const operator = property.operator || 'exact'

  if (!(key in propertyValues)) {
    throw new InconclusiveMatchError(`Property ${key} not found in propertyValues`)
  } else if (operator === 'is_not_set') {
    throw new InconclusiveMatchError(`Operator is_not_set is not supported`)
  }

  const overrideValue = propertyValues[key]

  switch (operator) {
    case 'exact':
      return Array.isArray(value) ? value.indexOf(overrideValue) !== -1 : value === overrideValue
    case 'is_not':
      return Array.isArray(value) ? value.indexOf(overrideValue) === -1 : value !== overrideValue
    case 'is_set':
      return key in propertyValues
    case 'icontains':
      return String(overrideValue).toLowerCase().includes(String(value).toLowerCase())
    case 'not_icontains':
      return !String(overrideValue).toLowerCase().includes(String(value).toLowerCase())
    case 'regex':
      return isValidRegex(String(value)) && String(overrideValue).match(String(value)) !== null
    case 'not_regex':
      return isValidRegex(String(value)) && String(overrideValue).match(String(value)) === null
    case 'gt':
      return typeof overrideValue == typeof value && overrideValue > value
    case 'gte':
      return typeof overrideValue == typeof value && overrideValue >= value
    case 'lt':
      return typeof overrideValue == typeof value && overrideValue < value
    case 'lte':
      return typeof overrideValue == typeof value && overrideValue <= value
    case 'is_date_after':
    case 'is_date_before': {
      const parsedDate = convertToDateTime(value)
      const overrideDate = convertToDateTime(overrideValue)
      if (operator === 'is_date_before') {
        return overrideDate < parsedDate
      }
      return overrideDate > parsedDate
    }
    default:
      console.error(`Unknown operator: ${operator}`)
      return false
  }
}

function matchCohort(
  property: FeatureFlagCondition['properties'][number],
  propertyValues: Record<string, any>,
  cohortProperties: FeatureFlagsPoller['cohorts']
): boolean {
  const cohortId = String(property.value)
  if (!(cohortId in cohortProperties)) {
    throw new InconclusiveMatchError("can't match cohort without a given cohort property value")
  }

  const propertyGroup = cohortProperties[cohortId]
  return matchPropertyGroup(propertyGroup, propertyValues, cohortProperties)
}

function matchPropertyGroup(
  propertyGroup: PropertyGroup,
  propertyValues: Record<string, any>,
  cohortProperties: FeatureFlagsPoller['cohorts']
): boolean {
  if (!propertyGroup) {
    return true
  }

  const propertyGroupType = propertyGroup.type
  const properties = propertyGroup.values

  if (!properties || properties.length === 0) {
    // empty groups are no-ops, always match
    return true
  }

  let errorMatchingLocally = false

  if ('values' in properties[0]) {
    // a nested property group
    for (const prop of properties as PropertyGroup[]) {
      try {
        const matches = matchPropertyGroup(prop, propertyValues, cohortProperties)
        if (propertyGroupType === 'AND') {
          if (!matches) {
            return false
          }
        } else {
          // OR group
          if (matches) {
            return true
          }
        }
      } catch (err) {
        if (err instanceof InconclusiveMatchError) {
          console.debug(`Failed to compute property ${prop} locally: ${err}`)
          errorMatchingLocally = true
        } else {
          throw err
        }
      }
    }

    if (errorMatchingLocally) {
      throw new InconclusiveMatchError("Can't match cohort without a given cohort property value")
    }
    // if we get here, all matched in AND case, or none matched in OR case
    return propertyGroupType === 'AND'
  } else {
    for (const prop of properties as FlagProperty[]) {
      try {
        let matches: boolean
        if (prop.type === 'cohort') {
          matches = matchCohort(prop, propertyValues, cohortProperties)
        } else {
          matches = matchProperty(prop, propertyValues)
        }

        const negation = prop.negation || false

        if (propertyGroupType === 'AND') {
          // if negated property, do the inverse
          if (!matches && !negation) {
            return false
          }
          if (matches && negation) {
            return false
          }
        } else {
          // OR group
          if (matches && !negation) {
            return true
          }
          if (!matches && negation) {
            return true
          }
        }
      } catch (err) {
        if (err instanceof InconclusiveMatchError) {
          console.debug(`Failed to compute property ${prop} locally: ${err}`)
          errorMatchingLocally = true
        } else {
          throw err
        }
      }
    }

    if (errorMatchingLocally) {
      throw new InconclusiveMatchError("can't match cohort without a given cohort property value")
    }

    // if we get here, all matched in AND case, or none matched in OR case
    return propertyGroupType === 'AND'
  }
}

function isValidRegex(regex: string): boolean {
  try {
    new RegExp(regex)
    return true
  } catch (err) {
    return false
  }
}

function convertToDateTime(value: string | number | (string | number)[] | Date): Date {
  if (value instanceof Date) {
    return value
  } else if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!isNaN(date.valueOf())) {
      return date
    }
    throw new InconclusiveMatchError(`${value} is in an invalid date format`)
  } else {
    throw new InconclusiveMatchError(`The date provided ${value} must be a string, number, or date object`)
  }
}

export { FeatureFlagsPoller, matchProperty, InconclusiveMatchError, ClientError }
