/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import { CardAction } from '@microsoft/agents-activity';
import { MediaUrl } from './mediaUrl';
import { ThumbnailUrl } from './thumbnailUrl';
/**
 * Represents a video card.
 */
export interface VideoCard {
    /**
     * The title of the video card.
     */
    title: string;
    /**
     * The subtitle of the video card.
     */
    subtitle: string;
    /**
     * The text of the video card.
     */
    text: string;
    /**
     * The image thumbnail of the video card.
     */
    image: ThumbnailUrl;
    /**
     * The media URLs of the video card.
     */
    media: MediaUrl[];
    /**
     * The buttons of the video card.
     */
    buttons: CardAction[];
    /**
     * Indicates whether the video card is shareable.
     */
    shareable: boolean;
    /**
     * Indicates whether the video card should auto-loop.
     */
    autoloop: boolean;
    /**
     * Indicates whether the video card should auto-start.
     */
    autostart: boolean;
    /**
     * The aspect ratio of the video card.
     */
    aspect: string;
    /**
     * The duration of the video card.
     */
    duration: string;
    /**
     * The value of the video card.
     */
    value: any;
}
