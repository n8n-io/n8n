// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../resource';
import { isRequestOptions } from '../../../core';
import * as Core from '../../../core';
import { Page } from '../../../pagination';

export class Permissions extends APIResource {
  /**
   * **NOTE:** Calling this endpoint requires an [admin API key](../admin-api-keys).
   *
   * This enables organization owners to share fine-tuned models with other projects
   * in their organization.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const permissionCreateResponse of client.fineTuning.checkpoints.permissions.create(
   *   'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
   *   { project_ids: ['string'] },
   * )) {
   *   // ...
   * }
   * ```
   */
  create(
    fineTunedModelCheckpoint: string,
    body: PermissionCreateParams,
    options?: Core.RequestOptions,
  ): Core.PagePromise<PermissionCreateResponsesPage, PermissionCreateResponse> {
    return this._client.getAPIList(
      `/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`,
      PermissionCreateResponsesPage,
      { body, method: 'post', ...options },
    );
  }

  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to view all permissions for a
   * fine-tuned model checkpoint.
   *
   * @example
   * ```ts
   * const permission =
   *   await client.fineTuning.checkpoints.permissions.retrieve(
   *     'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   *   );
   * ```
   */
  retrieve(
    fineTunedModelCheckpoint: string,
    query?: PermissionRetrieveParams,
    options?: Core.RequestOptions,
  ): Core.APIPromise<PermissionRetrieveResponse>;
  retrieve(
    fineTunedModelCheckpoint: string,
    options?: Core.RequestOptions,
  ): Core.APIPromise<PermissionRetrieveResponse>;
  retrieve(
    fineTunedModelCheckpoint: string,
    query: PermissionRetrieveParams | Core.RequestOptions = {},
    options?: Core.RequestOptions,
  ): Core.APIPromise<PermissionRetrieveResponse> {
    if (isRequestOptions(query)) {
      return this.retrieve(fineTunedModelCheckpoint, {}, query);
    }
    return this._client.get(`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, {
      query,
      ...options,
    });
  }

  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to delete a permission for a
   * fine-tuned model checkpoint.
   *
   * @example
   * ```ts
   * const permission =
   *   await client.fineTuning.checkpoints.permissions.del(
   *     'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
   *     'cp_zc4Q7MP6XxulcVzj4MZdwsAB',
   *   );
   * ```
   */
  del(
    fineTunedModelCheckpoint: string,
    permissionId: string,
    options?: Core.RequestOptions,
  ): Core.APIPromise<PermissionDeleteResponse> {
    return this._client.delete(
      `/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions/${permissionId}`,
      options,
    );
  }
}

/**
 * Note: no pagination actually occurs yet, this is for forwards-compatibility.
 */
export class PermissionCreateResponsesPage extends Page<PermissionCreateResponse> {}

/**
 * The `checkpoint.permission` object represents a permission for a fine-tuned
 * model checkpoint.
 */
export interface PermissionCreateResponse {
  /**
   * The permission identifier, which can be referenced in the API endpoints.
   */
  id: string;

  /**
   * The Unix timestamp (in seconds) for when the permission was created.
   */
  created_at: number;

  /**
   * The object type, which is always "checkpoint.permission".
   */
  object: 'checkpoint.permission';

  /**
   * The project identifier that the permission is for.
   */
  project_id: string;
}

export interface PermissionRetrieveResponse {
  data: Array<PermissionRetrieveResponse.Data>;

  has_more: boolean;

  object: 'list';

  first_id?: string | null;

  last_id?: string | null;
}

export namespace PermissionRetrieveResponse {
  /**
   * The `checkpoint.permission` object represents a permission for a fine-tuned
   * model checkpoint.
   */
  export interface Data {
    /**
     * The permission identifier, which can be referenced in the API endpoints.
     */
    id: string;

    /**
     * The Unix timestamp (in seconds) for when the permission was created.
     */
    created_at: number;

    /**
     * The object type, which is always "checkpoint.permission".
     */
    object: 'checkpoint.permission';

    /**
     * The project identifier that the permission is for.
     */
    project_id: string;
  }
}

export interface PermissionDeleteResponse {
  /**
   * The ID of the fine-tuned model checkpoint permission that was deleted.
   */
  id: string;

  /**
   * Whether the fine-tuned model checkpoint permission was successfully deleted.
   */
  deleted: boolean;

  /**
   * The object type, which is always "checkpoint.permission".
   */
  object: 'checkpoint.permission';
}

export interface PermissionCreateParams {
  /**
   * The project identifiers to grant access to.
   */
  project_ids: Array<string>;
}

export interface PermissionRetrieveParams {
  /**
   * Identifier for the last permission ID from the previous pagination request.
   */
  after?: string;

  /**
   * Number of permissions to retrieve.
   */
  limit?: number;

  /**
   * The order in which to retrieve permissions.
   */
  order?: 'ascending' | 'descending';

  /**
   * The ID of the project to get permissions for.
   */
  project_id?: string;
}

Permissions.PermissionCreateResponsesPage = PermissionCreateResponsesPage;

export declare namespace Permissions {
  export {
    type PermissionCreateResponse as PermissionCreateResponse,
    type PermissionRetrieveResponse as PermissionRetrieveResponse,
    type PermissionDeleteResponse as PermissionDeleteResponse,
    PermissionCreateResponsesPage as PermissionCreateResponsesPage,
    type PermissionCreateParams as PermissionCreateParams,
    type PermissionRetrieveParams as PermissionRetrieveParams,
  };
}
