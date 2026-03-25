/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Enum representing input hints.
 */
export enum InputHints {
  /**
   * Indicates that the bot is ready to accept input from the user.
   */
  AcceptingInput = 'acceptingInput',

  /**
   * Indicates that the bot is ignoring input from the user.
   */
  IgnoringInput = 'ignoringInput',

  /**
   * Indicates that the bot is expecting input from the user.
   */
  ExpectingInput = 'expectingInput',
}

/**
 * Zod schema for validating an InputHints enum.
 */
export const inputHintsZodSchema = z.enum(['acceptingInput', 'ignoringInput', 'expectingInput'])
