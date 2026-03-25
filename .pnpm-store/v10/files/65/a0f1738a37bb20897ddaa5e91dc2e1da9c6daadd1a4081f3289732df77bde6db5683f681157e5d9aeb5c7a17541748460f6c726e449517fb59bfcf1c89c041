import { APIResource } from "../resource.js";
import * as Core from "../core.js";
export declare class Projects extends APIResource {
    /**
     * Project
     */
    retrieve(id: string, options?: Core.RequestOptions): Core.APIPromise<Project>;
    /**
     * List projects
     */
    list(options?: Core.RequestOptions): Core.APIPromise<ProjectListResponse>;
    /**
     * Project Usage
     */
    usage(id: string, options?: Core.RequestOptions): Core.APIPromise<ProjectUsage>;
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
    export { type Project as Project, type ProjectUsage as ProjectUsage, type ProjectListResponse as ProjectListResponse, };
}
//# sourceMappingURL=projects.d.ts.map