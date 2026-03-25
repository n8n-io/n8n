/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { O365ConnectorCardActionBase } from './o365ConnectorCardActionBase'
import { O365ConnectorCardFact } from './o365ConnectorCardFact'
import { O365ConnectorCardImage } from './o365ConnectorCardImage'

/**
 * Defines the type of activity image to display in an O365 connector card section.
 * - 'avatar': Displays the image as a profile avatar (typically circular or small)
 * - 'article': Displays the image as an article thumbnail (typically rectangular or larger)
 */
export type ActivityImageType = 'avatar' | 'article'

/**
 * Represents a section in an O365 connector card.
 */
export interface O365ConnectorCardSection {
  /**
   * The title of the section.
   */
  title?: string
  /**
   * The text of the section.
   */
  text?: string
  /**
   * The activity title of the section.
   */
  activityTitle?: string
  /**
   * The activity subtitle of the section.
   */
  activitySubtitle?: string
  /**
   * The activity text of the section.
   */
  activityText?: string
  /**
   * The activity image of the section.
   */
  activityImage?: string
  /**
   * The type of the activity image.
   */
  activityImageType?: ActivityImageType
  /**
   * Indicates whether markdown is enabled.
   */
  markdown?: boolean
  /**
   * The facts of the section.
   */
  facts?: O365ConnectorCardFact[]
  /**
   * The images of the section.
   */
  images?: O365ConnectorCardImage[]
  /**
   * The potential actions of the section.
   */
  potentialAction?: O365ConnectorCardActionBase[]
}
