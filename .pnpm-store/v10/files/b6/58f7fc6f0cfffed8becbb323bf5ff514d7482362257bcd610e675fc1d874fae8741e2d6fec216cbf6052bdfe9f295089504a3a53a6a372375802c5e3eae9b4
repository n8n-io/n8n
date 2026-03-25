// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';
import * as Core from '../core';

export class Projects extends APIResource {
  /**
   * Project
   */
  retrieve(id: string, options?: Core.RequestOptions): Core.APIPromise<Project> {
    return this._client.get(`/v1/projects/${id}`, options);
  }

  /**
   * List projects
   */
  list(options?: Core.RequestOptions): Core.APIPromise<ProjectListResponse> {
    return this._client.get('/v1/projects', options);
  }

  /**
   * Project Usage
   */
  usage(id: string, options?: Core.RequestOptions): Core.APIPromise<ProjectUsage> {
    return this._client.get(`/v1/projects/${id}/usage`, options);
  }
}

export interface Project {
  id: string;

  /**
   * The maximum number of sessions that this project can run concurrently.
   */
  concurrency: number;

  createdAt: string;

  defaultTimeout: number;

  name: string;

  ownerId: string;

  updatedAt: string;
}

export interface ProjectUsage {
  browserMinutes: number;

  proxyBytes: number;
}

export type ProjectListResponse = Array<Project>;

export declare namespace Projects {
  export {
    type Project as Project,
    type ProjectUsage as ProjectUsage,
    type ProjectListResponse as ProjectListResponse,
  };
}
