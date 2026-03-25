/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import { CardAction } from '@microsoft/agents-activity';
import { MediaUrl } from './mediaUrl';
import { ThumbnailUrl } from './thumbnailUrl';
/**
 * Represents an Animation Card.
 */
export interface AnimationCard {
    /** The title of the card. */
    title: string;
    /** The subtitle of the card. */
    subtitle: string;
    /** The text content of the card. */
    text: string;
    /** The image to be displayed on the card. */
    image: ThumbnailUrl;
    /** The media URLs or objects. */
    media: MediaUrl[];
    /** The buttons to be displayed on the card. */
    buttons: CardAction[];
    /** Indicates whether the card is shareable. */
    shareable: boolean;
    /** Indicates whether the card should auto-loop. */
    autoloop: boolean;
    /** Indicates whether the card should auto-start. */
    autostart: boolean;
    /** The aspect ratio of the card. */
    aspect: string;
    /** The duration of the animation. */
    duration: string;
    /** Additional value for the card. */
    value: any;
}
