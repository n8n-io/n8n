// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CardAction } from '@microsoft/agents-activity'

/**
 * Represents the response containing OAuth token information.
 * This interface encapsulates all data related to an OAuth token response.
 */
export interface TokenResponse {
  /**
     * The OAuth token string, or undefined if no token is available.
     */
  token: string | undefined;
}

/**
 * Represents a request for exchanging tokens.
 * This interface defines the structure of a token exchange request, including the URI, token, and ID.
 */
export interface TokenExchangeRequest {
  /**
   * The URI for the token exchange request.
   */
  uri?: string;
  /**
   * The token to be exchanged.
   */
  token?: string;
}

/**
 * Represents the response for a token exchange invoke operation.
 */
export interface TokenExchangeInvokeResponse {
  /**
   * The connection name associated with the token exchange response.
   */
  connectionName: string
  /**
   * The ID associated with the token exchange response.
   */
  id?: string
  /**
   * (Optional) Details about any failure that occurred during the token exchange.
   */
  failureDetail?: string
}

/**
 * Represents a resource for exchanging tokens.
 * This interface defines the structure of a token exchange resource, including its ID, URI, and provider ID.
 */
export interface TokenExchangeResource {
  /**
     * The ID of the token exchange resource.
     */
  id?: string;

  /**
     * The URI of the token exchange resource.
     */
  uri?: string;

  /**
     * The provider ID for the token exchange resource.
     */
  providerId?: string;
}

/**
 * Represents a resource for posting tokens.
 * This interface defines the structure of a token post resource, including its SAS URL.
 */
export interface TokenPostResource {
  /**
     * The SAS URL for the token post resource.
     */
  sasUrl?: string;
}

/**
 * Represents a resource for signing in.
 * This interface defines the structure of a sign-in resource, including the sign-in link, token exchange resource, and token post resource.
 */
export interface SignInResource {
  /**
     * The link for signing in.
     */
  signInLink: string;

  /**
     * The resource for token exchange.
     */
  tokenExchangeResource: TokenExchangeResource;

  /**
     * The resource for token post.
     */
  tokenPostResource: TokenPostResource;
}

/**
 * Represents an OAuth card.
 * This interface defines the structure of an OAuth card, including its buttons, connection name, text, and associated resources.
 */
export interface OAuthCard {
  /**
     * The buttons associated with the OAuth card.
     */
  buttons: CardAction[];

  /**
     * The connection name for the OAuth card.
     */
  connectionName: string;

  /**
     * The text content of the OAuth card.
     */
  text: string;

  /**
     * The token exchange resource for the OAuth card.
     */
  tokenExchangeResource: TokenExchangeResource;

  /**
     * The token post resource for the OAuth card.
     */
  tokenPostResource: TokenPostResource;
}

/**
 * Represents a response containing either a token or a sign-in resource.
 * This interface defines the structure of a response that includes a token response and a sign-in resource.
 */
export interface TokenOrSinginResourceResponse {
  /**
     * The token response containing OAuth token information.
     */
  tokenResponse: TokenResponse;

  /**
     * The sign-in resource containing sign-in and token exchange information.
     */
  signInResource: SignInResource;
}

/**
 * Represents the status of a token.
 * This interface defines the structure of a token status, including channel ID, connection name, and other metadata.
 */
export interface TokenStatus {
  /**
     * The ID of the channel associated with the token.
     */
  channelId: string;

  /**
     * The connection name associated with the token.
     */
  connectionName: string;

  /**
     * Indicates whether a token is available.
     */
  hasToken: boolean;

  /**
     * The display name of the service provider.
     */
  serviceProviderDisplayName: string;
}

/**
 * Represents a collection of Azure Active Directory (AAD) resource URLs.
 * This interface defines the structure of a collection of resource URLs.
 */
export interface AadResourceUrls {
  /**
     * An array of resource URLs.
     */
  resourceUrls: string[];
}
