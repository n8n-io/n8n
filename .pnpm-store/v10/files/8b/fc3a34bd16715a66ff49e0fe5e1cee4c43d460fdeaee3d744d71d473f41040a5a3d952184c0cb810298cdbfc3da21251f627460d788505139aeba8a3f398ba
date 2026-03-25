/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Defines the possible types of actions in an O365 connector card.
 *
 * - `ViewAction`: Represents an action to view content.
 * - `OpenUri`: Represents an action to open a URI.
 * - `HttpPOST`: Represents an action to make an HTTP POST request.
 * - `ActionCard`: Represents an action that opens a card with additional actions or inputs.
 */
export type O365ConnectorCardActionType = 'ViewAction' | 'OpenUri' | 'HttpPOST' | 'ActionCard';
/**
 * Represents a base action in an O365 connector card.
 */
export interface O365ConnectorCardActionBase {
    /**
     * The type of the action.
     */
    '@type'?: O365ConnectorCardActionType;
    /**
     * The name of the action.
     */
    name?: string;
    /**
     * The ID of the action.
     */
    '@id'?: string;
}
