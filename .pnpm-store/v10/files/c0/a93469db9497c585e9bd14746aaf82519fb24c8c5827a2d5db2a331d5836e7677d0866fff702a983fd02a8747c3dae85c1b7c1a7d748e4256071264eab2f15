/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ActionTypes, Attachment, CardAction } from '@microsoft/agents-activity'
import { MediaUrl } from './mediaUrl'
import { AnimationCard } from './animationCard'
import { AudioCard } from './audioCard'
import { HeroCard } from './heroCard'
import { ReceiptCard } from './receiptCard'
import { O365ConnectorCard } from './o365ConnectorCard'
import { ThumbnailCard } from './thumbnailCard'
import { VideoCard } from './videoCard'
import { CardImage } from './cardImage'
import { OAuthCard, SignInResource } from '../oauth/userTokenClient.types'
import { SigninCard } from './signinCard'

/**
 * Factory class for creating various types of cards.
 */
export class CardFactory {
  /**
   * The content types supported by the card factory.
   */
  static contentTypes: any = {
    adaptiveCard: 'application/vnd.microsoft.card.adaptive',
    animationCard: 'application/vnd.microsoft.card.animation',
    audioCard: 'application/vnd.microsoft.card.audio',
    heroCard: 'application/vnd.microsoft.card.hero',
    receiptCard: 'application/vnd.microsoft.card.receipt',
    o365ConnectorCard: 'application/vnd.microsoft.teams.card.o365connector',
    thumbnailCard: 'application/vnd.microsoft.card.thumbnail',
    videoCard: 'application/vnd.microsoft.card.video',
    oauthCard: 'application/vnd.microsoft.card.oauth',
    signinCard: 'application/vnd.microsoft.card.signin',
  }

  /**
   * Creates an adaptive card attachment.
   * @param card The adaptive card content.
   * @returns The adaptive card attachment.
   */
  static adaptiveCard (card: any): Attachment {
    return { contentType: CardFactory.contentTypes.adaptiveCard, content: card }
  }

  /**
   * Creates an animation card attachment.
   * @param title The title of the card.
   * @param media The media URLs or objects.
   * @param buttons The optional buttons for the card.
   * @param other Additional properties for the card.
   * @returns The animation card attachment.
   */
  static animationCard (
    title: string,
    media: (MediaUrl | string)[],
    buttons?: (CardAction | string)[],
    other?: Partial<AnimationCard>
  ): Attachment {
    return CardFactory.mediaCard(CardFactory.contentTypes.animationCard, title, media, buttons, other)
  }

  /**
   * Creates an audio card attachment.
   * @param title The title of the card.
   * @param media The media URLs or objects.
   * @param buttons The optional buttons for the card.
   * @param other Additional properties for the card.
   * @returns The audio card attachment.
   */
  static audioCard (
    title: string,
    media: (MediaUrl | string)[],
    buttons?: (CardAction | string)[],
    other?: Partial<AudioCard>
  ): Attachment {
    return CardFactory.mediaCard(CardFactory.contentTypes.audioCard, title, media, buttons, other)
  }

  /**
   * Creates a hero card attachment.
   * @param title The title of the card.
   * @param text The optional text for the card.
   * @param images The optional images for the card.
   * @param buttons The optional buttons for the card.
   * @param other Additional properties for the card.
   * @returns The hero card attachment.
   */
  static heroCard (title: string, text?: any, images?: any, buttons?: any, other?: Partial<HeroCard>): Attachment {
    const a: Attachment = CardFactory.thumbnailCard(title, text, images, buttons, other)
    a.contentType = CardFactory.contentTypes.heroCard
    return a
  }

  /**
   * Creates a receipt card attachment.
   * @param card The receipt card content.
   * @returns The receipt card attachment.
   */
  static receiptCard (card: ReceiptCard): Attachment {
    return { contentType: CardFactory.contentTypes.receiptCard, content: card }
  }

  /**
   * Creates an O365 connector card attachment.
   * @param card The O365 connector card content.
   * @returns The O365 connector card attachment.
   */
  static o365ConnectorCard (card: O365ConnectorCard): Attachment {
    return { contentType: CardFactory.contentTypes.o365ConnectorCard, content: card }
  }

  /**
   * Creates a thumbnail card attachment.
   * @param title The title of the card.
   * @param text The optional text for the card.
   * @param images The optional images for the card.
   * @param buttons The optional buttons for the card.
   * @param other Additional properties for the card.
   * @returns The thumbnail card attachment.
   */
  static thumbnailCard (
    title: string,
    text?: any,
    images?: any,
    buttons?: any,
    other?: Partial<ThumbnailCard>
  ): Attachment {
    if (typeof text !== 'string') {
      other = buttons
      buttons = images
      images = text
      text = undefined
    }
    const card: Partial<ThumbnailCard> = { ...other }
    if (title) {
      card.title = title
    }
    if (text) {
      card.text = text
    }
    if (images) {
      card.images = CardFactory.images(images)
    }
    if (buttons) {
      card.buttons = CardFactory.actions(buttons)
    }

    return { contentType: CardFactory.contentTypes.thumbnailCard, content: card }
  }

  /**
   * Creates a video card attachment.
   * @param title The title of the card.
   * @param media The media URLs or objects.
   * @param buttons The optional buttons for the card.
   * @param other Additional properties for the card.
   * @returns The video card attachment.
   */
  static videoCard (
    title: string,
    media: (MediaUrl | string)[],
    buttons?: (CardAction | string)[],
    other?: Partial<VideoCard>
  ): Attachment {
    return CardFactory.mediaCard(CardFactory.contentTypes.videoCard, title, media, buttons, other)
  }

  /**
   * Converts an array of image URLs or objects to an array of CardImage objects.
   * @param images The image URLs or objects.
   * @returns The array of CardImage objects.
   */
  static images (images: (CardImage | string)[] | undefined): CardImage[] {
    const list: CardImage[] = [];
    (images || []).forEach((img: CardImage | string) => {
      if (typeof img === 'object') {
        list.push(img)
      } else {
        list.push({ url: img })
      }
    })

    return list
  }

  /**
   * Converts an array of action URLs or objects to an array of CardAction objects.
   * @param actions The action URLs or objects.
   * @returns The array of CardAction objects.
   */
  static actions (actions: (CardAction | string)[] | undefined): CardAction[] {
    const list: CardAction[] = [];
    (actions || []).forEach((a: CardAction | string) => {
      if (typeof a === 'object') {
        list.push(a)
      } else {
        list.push({
          type: ActionTypes.ImBack,
          value: a.toString(),
          title: a.toString(),
          channelData: undefined,
        })
      }
    })

    return list
  }

  /**
   * Creates an OAuth card attachment.
   * @param connectionName The connection name.
   * @param title The title of the card.
   * @param text The optional text for the card.
   * @param signingResource The signing resource.
   * @param enableSso The option to enable SSO when authenticating using AAD. Defaults to true.
   * @returns The OAuth card attachment.
   */
  static oauthCard (connectionName: string, title: string, text: string, signingResource: SignInResource, enableSso: boolean = true) : Attachment {
    const card: Partial<OAuthCard> = {
      buttons: [{
        type: ActionTypes.Signin,
        title,
        value: signingResource.signInLink,
        channelData: undefined
      }],
      connectionName,
      tokenExchangeResource: enableSso ? signingResource.tokenExchangeResource : undefined,
      tokenPostResource: signingResource.tokenPostResource,
    }
    if (text) {
      card.text = text
    }

    return { contentType: CardFactory.contentTypes.oauthCard, content: card }
  }

  /**
   * Creates a sign-in card attachment.
   * @param title The title of the card.
   * @param url The URL for the sign-in button.
   * @param text The optional text for the card.
   * @returns The sign-in card attachment.
   */
  static signinCard (title: string, url: string, text?: string): Attachment {
    const card: SigninCard = {
      buttons: [{ type: ActionTypes.Signin, title, value: url, channelData: undefined }],
    }
    if (text) {
      card.text = text
    }

    return { contentType: CardFactory.contentTypes.signinCard, content: card }
  }

  /**
   * Converts an array of media URLs or objects to an array of MediaUrl objects.
   * @param links The media URLs or objects.
   * @returns The array of MediaUrl objects.
   */
  static media (links: (MediaUrl | string)[] | undefined): MediaUrl[] {
    const list: MediaUrl[] = [];
    (links || []).forEach((lnk: MediaUrl | string) => {
      if (typeof lnk === 'object') {
        list.push(lnk)
      } else {
        list.push({ url: lnk })
      }
    })

    return list
  }

  /**
   * Creates a media card attachment.
   * @param contentType The content type of the card.
   * @param title The title of the card.
   * @param media The media URLs or objects.
   * @param buttons The optional buttons for the card.
   * @param other Additional properties for the card.
   * @returns The media card attachment.
   */
  private static mediaCard (
    contentType: string,
    title: string,
    media: (MediaUrl | string)[],
    buttons?: (CardAction | string)[],
    other?: any
  ): Attachment {
    const card: VideoCard = { ...other }
    if (title) {
      card.title = title
    }
    card.media = CardFactory.media(media)
    if (buttons) {
      card.buttons = CardFactory.actions(buttons)
    }

    return { contentType, content: card }
  }
}
