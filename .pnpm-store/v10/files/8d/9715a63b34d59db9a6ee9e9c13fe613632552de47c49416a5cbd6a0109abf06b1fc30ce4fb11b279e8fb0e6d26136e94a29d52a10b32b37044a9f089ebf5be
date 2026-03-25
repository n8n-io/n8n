import { APIResource } from "../core/resource.js";
import { APIPromise } from "../core/api-promise.js";
import { ConversationCursorPage, type ConversationCursorPageParams, PagePromise } from "../core/pagination.js";
import { type Uploadable } from "../core/uploads.js";
import { RequestOptions } from "../internal/request-options.js";
export declare class Videos extends APIResource {
    /**
     * Create a video
     */
    create(body: VideoCreateParams, options?: RequestOptions): APIPromise<Video>;
    /**
     * Retrieve a video
     */
    retrieve(videoID: string, options?: RequestOptions): APIPromise<Video>;
    /**
     * List videos
     */
    list(query?: VideoListParams | null | undefined, options?: RequestOptions): PagePromise<VideosPage, Video>;
    /**
     * Delete a video
     */
    delete(videoID: string, options?: RequestOptions): APIPromise<VideoDeleteResponse>;
    /**
     * Download video content
     */
    downloadContent(videoID: string, query?: VideoDownloadContentParams | null | undefined, options?: RequestOptions): APIPromise<Response>;
    /**
     * Create a video remix
     */
    remix(videoID: string, body: VideoRemixParams, options?: RequestOptions): APIPromise<Video>;
}
export type VideosPage = ConversationCursorPage<Video>;
/**
 * Structured information describing a generated video job.
 */
export interface Video {
    /**
     * Unique identifier for the video job.
     */
    id: string;
    /**
     * Unix timestamp (seconds) for when the job completed, if finished.
     */
    completed_at: number | null;
    /**
     * Unix timestamp (seconds) for when the job was created.
     */
    created_at: number;
    /**
     * Error payload that explains why generation failed, if applicable.
     */
    error: VideoCreateError | null;
    /**
     * Unix timestamp (seconds) for when the downloadable assets expire, if set.
     */
    expires_at: number | null;
    /**
     * The video generation model that produced the job.
     */
    model: VideoModel;
    /**
     * The object type, which is always `video`.
     */
    object: 'video';
    /**
     * Approximate completion percentage for the generation task.
     */
    progress: number;
    /**
     * The prompt that was used to generate the video.
     */
    prompt: string | null;
    /**
     * Identifier of the source video if this video is a remix.
     */
    remixed_from_video_id: string | null;
    /**
     * Duration of the generated clip in seconds.
     */
    seconds: VideoSeconds;
    /**
     * The resolution of the generated video.
     */
    size: VideoSize;
    /**
     * Current lifecycle status of the video job.
     */
    status: 'queued' | 'in_progress' | 'completed' | 'failed';
}
export interface VideoCreateError {
    code: string;
    message: string;
}
export type VideoModel = 'sora-2' | 'sora-2-pro';
export type VideoSeconds = '4' | '8' | '12';
export type VideoSize = '720x1280' | '1280x720' | '1024x1792' | '1792x1024';
/**
 * Confirmation payload returned after deleting a video.
 */
export interface VideoDeleteResponse {
    /**
     * Identifier of the deleted video.
     */
    id: string;
    /**
     * Indicates that the video resource was deleted.
     */
    deleted: boolean;
    /**
     * The object type that signals the deletion response.
     */
    object: 'video.deleted';
}
export interface VideoCreateParams {
    /**
     * Text prompt that describes the video to generate.
     */
    prompt: string;
    /**
     * Optional image reference that guides generation.
     */
    input_reference?: Uploadable;
    /**
     * The video generation model to use. Defaults to `sora-2`.
     */
    model?: VideoModel;
    /**
     * Clip duration in seconds. Defaults to 4 seconds.
     */
    seconds?: VideoSeconds;
    /**
     * Output resolution formatted as width x height. Defaults to 720x1280.
     */
    size?: VideoSize;
}
export interface VideoListParams extends ConversationCursorPageParams {
    /**
     * Sort order of results by timestamp. Use `asc` for ascending order or `desc` for
     * descending order.
     */
    order?: 'asc' | 'desc';
}
export interface VideoDownloadContentParams {
    /**
     * Which downloadable asset to return. Defaults to the MP4 video.
     */
    variant?: 'video' | 'thumbnail' | 'spritesheet';
}
export interface VideoRemixParams {
    /**
     * Updated text prompt that directs the remix generation.
     */
    prompt: string;
}
export declare namespace Videos {
    export { type Video as Video, type VideoCreateError as VideoCreateError, type VideoModel as VideoModel, type VideoSeconds as VideoSeconds, type VideoSize as VideoSize, type VideoDeleteResponse as VideoDeleteResponse, type VideosPage as VideosPage, type VideoCreateParams as VideoCreateParams, type VideoListParams as VideoListParams, type VideoDownloadContentParams as VideoDownloadContentParams, type VideoRemixParams as VideoRemixParams, };
}
//# sourceMappingURL=videos.d.ts.map