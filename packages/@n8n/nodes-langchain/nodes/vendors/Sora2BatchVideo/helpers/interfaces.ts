/**
 * Sora2 Batch Video - Type Definitions
 */

export type Provider = 'ttapi' | 'wuyinke';
export type Model = 'sora2' | 'sora2pro';
export type AspectRatio = '9:16' | '16:9';
export type Size = 'small' | 'large';
export type Operation = 'text2video' | 'image2video';
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Video generation request parameters
 */
export interface VideoGenerationRequest {
	prompt: string;
	operation: Operation;
	model: Model;
	duration: number;
	aspectRatio: AspectRatio;
	size?: Size;
	referenceImageUrl?: string;
}

/**
 * Response from submitting a video generation task
 */
export interface SubmitResponse {
	taskId: string;
	provider: Provider;
}

/**
 * Response from checking task status
 */
export interface StatusResponse {
	taskId: string;
	status: TaskStatus;
	videoUrl?: string;
	error?: string;
}

/**
 * Final result of video generation
 */
export interface VideoResult {
	success: boolean;
	taskId: string;
	provider: Provider;
	videoUrl?: string;
	prompt: string;
	duration: number;
	aspectRatio: AspectRatio;
	error?: string;
	itemIndex: number;
}

/**
 * Node options from the UI
 */
export interface NodeOptions {
	parallelRequests?: number;
	waitTimeout?: number;
	pollingInterval?: number;
	binaryPropertyName?: string;
	downloadVideo?: boolean;
	maxRetries?: number;
}

/**
 * ttapi.io API response structures
 */
export interface TtapiSubmitResponse {
	code?: number;
	data?: {
		jobId?: string;
	};
	jobId?: string;
	message?: string;
}

export interface TtapiFetchResponse {
	code?: number;
	data?: {
		status?: string;
		videoUrl?: string;
		error?: string;
		message?: string;
	};
	status?: string;
	videoUrl?: string;
	message?: string;
}

/**
 * wuyinkeji.com API response structures
 */
export interface WuyinkeSubmitResponse {
	code: number;
	msg: string;
	data?:
		| {
				id?: string;
		  }
		| string;
}

export interface WuyinkeDetailResponse {
	code: number;
	msg: string;
	data?: {
		status?: number; // 0=queued, 1=success, 2=failed, 3=processing
		remote_url?: string;
	};
}
