/**
 * One spelling of the module id. It must stay the same as the backend module id
 * (`packages/cli/src/modules/type-availability-policies`): `settings.activeModules` and
 * `/rest/module-settings` are both keyed by this string. GOV-55 renames the module; this is
 * the only literal the frontend half changes.
 */
export const TYPE_AVAILABILITY_POLICIES_MODULE_ID = 'type-availability-policies';

/** Pinia store id. Separate from the module id, because store ids are camelCase. */
export const TYPE_AVAILABILITY_POLICIES_STORE_ID = 'typeAvailabilityPolicies';
