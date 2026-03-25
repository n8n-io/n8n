/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { Attachment, CardAction } from '@microsoft/agents-activity';
import { MediaUrl } from './mediaUrl';
import { AnimationCard } from './animationCard';
import { AudioCard } from './audioCard';
import { HeroCard } from './heroCard';
import { ReceiptCard } from './receiptCard';
import { O365ConnectorCard } from './o365ConnectorCard';
import { ThumbnailCard } from './thumbnailCard';
import { VideoCard } from './videoCard';
import { CardImage } from './cardImage';
import { SignInResource } from '../oauth/userTokenClient.types';
/**
 * Factory class for creating various types of cards.
 */
export declare class CardFactory {
    /**
     * The content types supported by the card factory.
     */
    static contentTypes: any;
    /**
     * Creates an adaptive card attachment.
     * @param card The adaptive card content.
     * @returns The adaptive card attachment.
     */
    static adaptiveCard(card: any): Attachment;
    /**
     * Creates an animation card attachment.
     * @param title The title of the card.
     * @param media The media URLs or objects.
     * @param buttons The optional buttons for the card.
     * @param other Additional properties for the card.
     * @returns The animation card attachment.
     */
    static animationCard(title: string, media: (MediaUrl | string)[], buttons?: (CardAction | string)[], other?: Partial<AnimationCard>): Attachment;
    /**
     * Creates an audio card attachment.
     * @param title The title of the card.
     * @param media The media URLs or objects.
     * @param buttons The optional buttons for the card.
     * @param other Additional properties for the card.
     * @returns The audio card attachment.
     */
    static audioCard(title: string, media: (MediaUrl | string)[], buttons?: (CardAction | string)[], other?: Partial<AudioCard>): Attachment;
    /**
     * Creates a hero card attachment.
     * @param title The title of the card.
     * @param text The optional text for the card.
     * @param images The optional images for the card.
     * @param buttons The optional buttons for the card.
     * @param other Additional properties for the card.
     * @returns The hero card attachment.
     */
    static heroCard(title: string, text?: any, images?: any, buttons?: any, other?: Partial<HeroCard>): Attachment;
    /**
     * Creates a receipt card attachment.
     * @param card The receipt card content.
     * @returns The receipt card attachment.
     */
    static receiptCard(card: ReceiptCard): Attachment;
    /**
     * Creates an O365 connector card attachment.
     * @param card The O365 connector card content.
     * @returns The O365 connector card attachment.
     */
    static o365ConnectorCard(card: O365ConnectorCard): Attachment;
    /**
     * Creates a thumbnail card attachment.
     * @param title The title of the card.
     * @param text The optional text for the card.
     * @param images The optional images for the card.
     * @param buttons The optional buttons for the card.
     * @param other Additional properties for the card.
     * @returns The thumbnail card attachment.
     */
    static thumbnailCard(title: string, text?: any, images?: any, buttons?: any, other?: Partial<ThumbnailCard>): Attachment;
    /**
     * Creates a video card attachment.
     * @param title The title of the card.
     * @param media The media URLs or objects.
     * @param buttons The optional buttons for the card.
     * @param other Additional properties for the card.
     * @returns The video card attachment.
     */
    static videoCard(title: string, media: (MediaUrl | string)[], buttons?: (CardAction | string)[], other?: Partial<VideoCard>): Attachment;
    /**
     * Converts an array of image URLs or objects to an array of CardImage objects.
     * @param images The image URLs or objects.
     * @returns The array of CardImage objects.
     */
    static images(images: (CardImage | string)[] | undefined): CardImage[];
    /**
     * Converts an array of action URLs or objects to an array of CardAction objects.
     * @param actions The action URLs or objects.
     * @returns The array of CardAction objects.
     */
    static actions(actions: (CardAction | string)[] | undefined): CardAction[];
    /**
     * Creates an OAuth card attachment.
     * @param connectionName The connection name.
     * @param title The title of the card.
     * @param text The optional text for the card.
     * @param signingResource The signing resource.
     * @param enableSso The option to enable SSO when authenticating using AAD. Defaults to true.
     * @returns The OAuth card attachment.
     */
    static oauthCard(connectionName: string, title: string, text: string, signingResource: SignInResource, enableSso?: boolean): Attachment;
    /**
     * Creates a sign-in card attachment.
     * @param title The title of the card.
     * @param url The URL for the sign-in button.
     * @param text The optional text for the card.
     * @returns The sign-in card attachment.
     */
    static signinCard(title: string, url: string, text?: string): Attachment;
    /**
     * Converts an array of media URLs or objects to an array of MediaUrl objects.
     * @param links The media URLs or objects.
     * @returns The array of MediaUrl objects.
     */
    static media(links: (MediaUrl | string)[] | undefined): MediaUrl[];
    /**
     * Creates a media card attachment.
     * @param contentType The content type of the card.
     * @param title The title of the card.
     * @param media The media URLs or objects.
     * @param buttons The optional buttons for the card.
     * @param other Additional properties for the card.
     * @returns The media card attachment.
     */
    private static mediaCard;
}
