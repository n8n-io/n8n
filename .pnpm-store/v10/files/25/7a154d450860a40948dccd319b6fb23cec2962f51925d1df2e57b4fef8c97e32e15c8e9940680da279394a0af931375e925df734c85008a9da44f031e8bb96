/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Enum representing treatment types for the activity.
 */
export enum ActivityTreatments {
  /**
   * Indicates that only the recipient should be able to see the message even if the activity
   * is being sent to a group of people.
   */
  Targeted = 'targeted',
}

/**
 * Zod schema for validating an ActivityTreatments enum.
 */
export const activityTreatments = z.nativeEnum(ActivityTreatments)
