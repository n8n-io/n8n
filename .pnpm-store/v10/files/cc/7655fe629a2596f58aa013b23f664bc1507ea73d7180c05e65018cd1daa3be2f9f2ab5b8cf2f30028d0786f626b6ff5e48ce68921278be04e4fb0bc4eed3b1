import { JsonType } from '../../posthog-core/src'

export interface IdentifyMessageV1 {
  distinctId: string
  properties?: Record<string | number, any>
  disableGeoip?: boolean
}

export interface EventMessageV1 extends IdentifyMessageV1 {
  event: string
  groups?: Record<string, string | number> // Mapping of group type to group id
  sendFeatureFlags?: boolean
  timestamp?: Date
}

export interface GroupIdentifyMessage {
  groupType: string
  groupKey: string // Unique identifier for the group
  properties?: Record<string | number, any>
  distinctId?: string // optional distinctId to associate message with a person
  disableGeoip?: boolean
}

export type PropertyGroup = {
  type: 'AND' | 'OR'
  values: PropertyGroup[] | FlagProperty[]
}

export type FlagProperty = {
  key: string
  type?: string
  value: string | number | (string | number)[]
  operator?: string
  negation?: boolean
}

export type FeatureFlagCondition = {
  properties: FlagProperty[]
  rollout_percentage?: number
  variant?: string
}

export type PostHogFeatureFlag = {
  id: number
  name: string
  key: string
  filters?: {
    aggregation_group_type_index?: number
    groups?: FeatureFlagCondition[]
    multivariate?: {
      variants: {
        key: string
        rollout_percentage: number
      }[]
    }
    payloads?: Record<string, JsonType>
  }
  deleted: boolean
  active: boolean
  is_simple_flag: boolean
  rollout_percentage: null | number
  ensure_experience_continuity: boolean
  experiment_set: number[]
}

export type PostHogNodeV1 = {
  /**
   * @description Capture allows you to capture anything a user does within your system,
   * which you can later use in PostHog to find patterns in usage,
   * work out which features to improve or where people are giving up.
   * A capture call requires:
   * @param distinctId which uniquely identifies your user
   * @param event We recommend using [verb] [noun], like movie played or movie updated to easily identify what your events mean later on.
   * @param properties OPTIONAL | which can be a object with any information you'd like to add
   * @param groups OPTIONAL | object of what groups are related to this event, example: { company: 'id:5' }. Can be used to analyze companies instead of users.
   * @param sendFeatureFlags OPTIONAL | Used with experiments. Determines whether to send feature flag values with the event.
   */
  capture({ distinctId, event, properties, groups, sendFeatureFlags }: EventMessageV1): void

  /**
   * @description Identify lets you add metadata on your users so you can more easily identify who they are in PostHog,
   * and even do things like segment users by these properties.
   * An identify call requires:
   * @param distinctId which uniquely identifies your user
   * @param properties with a dict with any key: value pairs
   */
  identify({ distinctId, properties }: IdentifyMessageV1): void

  /**
   * @description To marry up whatever a user does before they sign up or log in with what they do after you need to make an alias call.
   * This will allow you to answer questions like "Which marketing channels leads to users churning after a month?"
   * or "What do users do on our website before signing up?"
   * In a purely back-end implementation, this means whenever an anonymous user does something, you'll want to send a session ID with the capture call.
   * Then, when that users signs up, you want to do an alias call with the session ID and the newly created user ID.
   * The same concept applies for when a user logs in. If you're using PostHog in the front-end and back-end,
   *  doing the identify call in the frontend will be enough.:
   * @param distinctId the current unique id
   * @param alias the unique ID of the user before
   */
  alias(data: { distinctId: string; alias: string }): void

  /**
   * @description PostHog feature flags (https://posthog.com/docs/features/feature-flags)
   * allow you to safely deploy and roll back new features. Once you've created a feature flag in PostHog,
   * you can use this method to check if the flag is on for a given user, allowing you to create logic to turn
   * features on and off for different user groups or individual users.
   * @param key the unique key of your feature flag
   * @param distinctId the current unique id
   * @param options: dict with optional parameters below
   * @param groups optional - what groups are currently active (group analytics). Required if the flag depends on groups.
   * @param personProperties optional - what person properties are known. Used to compute flags locally, if personalApiKey is present.
   * @param groupProperties optional - what group properties are known. Used to compute flags locally, if personalApiKey is present.
   * @param onlyEvaluateLocally optional - whether to only evaluate the flag locally. Defaults to false.
   * @param sendFeatureFlagEvents optional - whether to send feature flag events. Used for Experiments. Defaults to true.
   *
   * @returns true if the flag is on, false if the flag is off, undefined if there was an error.
   */
  isFeatureEnabled(
    key: string,
    distinctId: string,
    options?: {
      groups?: Record<string, string>
      personProperties?: Record<string, string>
      groupProperties?: Record<string, Record<string, string>>
      onlyEvaluateLocally?: boolean
      sendFeatureFlagEvents?: boolean
    }
  ): Promise<boolean | undefined>

  /**
   * @description PostHog feature flags (https://posthog.com/docs/features/feature-flags)
   * allow you to safely deploy and roll back new features. Once you've created a feature flag in PostHog,
   * you can use this method to check if the flag is on for a given user, allowing you to create logic to turn
   * features on and off for different user groups or individual users.
   * @param key the unique key of your feature flag
   * @param distinctId the current unique id
   * @param options: dict with optional parameters below
   * @param groups optional - what groups are currently active (group analytics). Required if the flag depends on groups.
   * @param personProperties optional - what person properties are known. Used to compute flags locally, if personalApiKey is present.
   * @param groupProperties optional - what group properties are known. Used to compute flags locally, if personalApiKey is present.
   * @param onlyEvaluateLocally optional - whether to only evaluate the flag locally. Defaults to false.
   * @param sendFeatureFlagEvents optional - whether to send feature flag events. Used for Experiments. Defaults to true.
   *
   * @returns true or string(for multivariates) if the flag is on, false if the flag is off, undefined if there was an error.
   */
  getFeatureFlag(
    key: string,
    distinctId: string,
    options?: {
      groups?: Record<string, string>
      personProperties?: Record<string, string>
      groupProperties?: Record<string, Record<string, string>>
      onlyEvaluateLocally?: boolean
      sendFeatureFlagEvents?: boolean
    }
  ): Promise<string | boolean | undefined>

  /**
   * @description Retrieves payload associated with the specified flag and matched value that is passed in.
   * (Expected to be used in conjuction with getFeatureFlag but allows for manual lookup).
   * If matchValue isn't passed, getFeatureFlag is called implicitly.
   * Will try to evaluate for payload locally first otherwise default to network call if allowed
   *
   * @param key the unique key of your feature flag
   * @param distinctId the current unique id
   * @param matchValue optional- the matched flag string or boolean
   * @param options: dict with optional parameters below
   * @param onlyEvaluateLocally optional - whether to only evaluate the flag locally. Defaults to false.
   *
   * @returns payload of a json type object
   */
  getFeatureFlagPayload(
    key: string,
    distinctId: string,
    matchValue?: string | boolean,
    options?: {
      onlyEvaluateLocally?: boolean
    }
  ): Promise<JsonType | undefined>

  /**
   * @description Sets a groups properties, which allows asking questions like "Who are the most active companies"
   * using my product in PostHog.
   *
   * @param groupType Type of group (ex: 'company'). Limited to 5 per project
   * @param groupKey Unique identifier for that type of group (ex: 'id:5')
   * @param properties OPTIONAL | which can be a object with any information you'd like to add
   */
  groupIdentify({ groupType, groupKey, properties }: GroupIdentifyMessage): void

  /**
   * @description Force an immediate reload of the polled feature flags. Please note that they are
   * already polled automatically at a regular interval.
   */
  reloadFeatureFlags(): Promise<void>

  /**
   * @description Flushes the events still in the queue and clears the feature flags poller to allow for
   * a clean shutdown.
   */
  shutdown(): void
}
