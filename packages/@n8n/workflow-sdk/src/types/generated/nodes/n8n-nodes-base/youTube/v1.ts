/**
 * YouTube Node - Version 1
 * Consume YouTube API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Retrieve a channel */
export type YouTubeV1ChannelGetConfig = {
	resource: 'channel';
	operation: 'get';
/**
 * ID of the channel
 * @displayOptions.show { operation: ["get"], resource: ["channel"] }
 */
		channelId: string | Expression<string>;
/**
 * The fields parameter specifies a comma-separated list of one or more channel resource properties that the API response will include
 * @displayOptions.show { operation: ["get"], resource: ["channel"] }
 * @default ["*"]
 */
		part: Array<'*' | 'brandingSettings' | 'contentDetails' | 'contentOwnerDetails' | 'id' | 'localizations' | 'snippet' | 'statistics' | 'status' | 'topicDetails'>;
};

/** Retrieve many channels */
export type YouTubeV1ChannelGetAllConfig = {
	resource: 'channel';
	operation: 'getAll';
/**
 * The fields parameter specifies a comma-separated list of one or more channel resource properties that the API response will include
 * @displayOptions.show { operation: ["getAll"], resource: ["channel"] }
 * @default ["*"]
 */
		part: Array<'*' | 'brandingSettings' | 'contentDetails' | 'contentOwnerDetails' | 'id' | 'localizations' | 'snippet' | 'statistics' | 'status' | 'topicDetails'>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["channel"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["channel"], returnAll: [false] }
 * @default 25
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Update a channel */
export type YouTubeV1ChannelUpdateConfig = {
	resource: 'channel';
	operation: 'update';
	channelId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Upload a channel banner */
export type YouTubeV1ChannelUploadBannerConfig = {
	resource: 'channel';
	operation: 'uploadBanner';
/**
 * ID of the channel
 * @displayOptions.show { operation: ["uploadBanner"], resource: ["channel"] }
 */
		channelId: string | Expression<string>;
	binaryProperty: string | Expression<string>;
};

/** Create a playlist */
export type YouTubeV1PlaylistCreateConfig = {
	resource: 'playlist';
	operation: 'create';
/**
 * The playlist's title
 * @displayOptions.show { operation: ["create"], resource: ["playlist"] }
 */
		title: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a playlist */
export type YouTubeV1PlaylistDeleteConfig = {
	resource: 'playlist';
	operation: 'delete';
	playlistId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve a channel */
export type YouTubeV1PlaylistGetConfig = {
	resource: 'playlist';
	operation: 'get';
	playlistId: string | Expression<string>;
/**
 * The fields parameter specifies a comma-separated list of one or more playlist resource properties that the API response will include
 * @displayOptions.show { operation: ["get"], resource: ["playlist"] }
 * @default ["*"]
 */
		part: Array<'*' | 'contentDetails' | 'id' | 'localizations' | 'player' | 'snippet' | 'status'>;
	options?: Record<string, unknown>;
};

/** Retrieve many channels */
export type YouTubeV1PlaylistGetAllConfig = {
	resource: 'playlist';
	operation: 'getAll';
/**
 * The fields parameter specifies a comma-separated list of one or more playlist resource properties that the API response will include
 * @displayOptions.show { operation: ["getAll"], resource: ["playlist"] }
 * @default ["*"]
 */
		part: Array<'*' | 'contentDetails' | 'id' | 'localizations' | 'player' | 'snippet' | 'status'>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["playlist"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["playlist"], returnAll: [false] }
 * @default 25
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Update a channel */
export type YouTubeV1PlaylistUpdateConfig = {
	resource: 'playlist';
	operation: 'update';
/**
 * The playlist's title
 * @displayOptions.show { operation: ["update"], resource: ["playlist"] }
 */
		playlistId: string | Expression<string>;
/**
 * The playlist's title
 * @displayOptions.show { operation: ["update"], resource: ["playlist"] }
 */
		title: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Add an item to a playlist */
export type YouTubeV1PlaylistItemAddConfig = {
	resource: 'playlistItem';
	operation: 'add';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["add"], resource: ["playlistItem"] }
 */
		playlistId: string | Expression<string>;
	videoId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a playlist */
export type YouTubeV1PlaylistItemDeleteConfig = {
	resource: 'playlistItem';
	operation: 'delete';
	playlistItemId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve a channel */
export type YouTubeV1PlaylistItemGetConfig = {
	resource: 'playlistItem';
	operation: 'get';
	playlistItemId: string | Expression<string>;
/**
 * The fields parameter specifies a comma-separated list of one or more playlistItem resource properties that the API response will include
 * @displayOptions.show { operation: ["get"], resource: ["playlistItem"] }
 * @default ["*"]
 */
		part: Array<'*' | 'contentDetails' | 'id' | 'snippet' | 'status'>;
	options?: Record<string, unknown>;
};

/** Retrieve many channels */
export type YouTubeV1PlaylistItemGetAllConfig = {
	resource: 'playlistItem';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getAll"], resource: ["playlistItem"] }
 */
		playlistId: string | Expression<string>;
/**
 * The fields parameter specifies a comma-separated list of one or more playlistItem resource properties that the API response will include
 * @displayOptions.show { operation: ["getAll"], resource: ["playlistItem"] }
 * @default ["*"]
 */
		part: Array<'*' | 'contentDetails' | 'id' | 'snippet' | 'status'>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["playlistItem"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["playlistItem"], returnAll: [false] }
 * @default 25
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Delete a playlist */
export type YouTubeV1VideoDeleteConfig = {
	resource: 'video';
	operation: 'delete';
/**
 * ID of the video
 * @displayOptions.show { operation: ["delete"], resource: ["video"] }
 */
		videoId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve a channel */
export type YouTubeV1VideoGetConfig = {
	resource: 'video';
	operation: 'get';
	videoId: string | Expression<string>;
/**
 * The fields parameter specifies a comma-separated list of one or more video resource properties that the API response will include
 * @displayOptions.show { operation: ["get"], resource: ["video"] }
 * @default ["*"]
 */
		part: Array<'*' | 'contentDetails' | 'id' | 'liveStreamingDetails' | 'localizations' | 'player' | 'recordingDetails' | 'snippet' | 'statistics' | 'status' | 'topicDetails'>;
	options?: Record<string, unknown>;
};

/** Retrieve many channels */
export type YouTubeV1VideoGetAllConfig = {
	resource: 'video';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["video"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["video"], returnAll: [false] }
 * @default 25
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Rate a video */
export type YouTubeV1VideoRateConfig = {
	resource: 'video';
	operation: 'rate';
	videoId: string | Expression<string>;
	rating?: 'dislike' | 'like' | 'none' | Expression<string>;
};

/** Update a channel */
export type YouTubeV1VideoUpdateConfig = {
	resource: 'video';
	operation: 'update';
	videoId: string | Expression<string>;
	title: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["update"], resource: ["video"] }
 */
		regionCode?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["update"], resource: ["video"] }
 */
		categoryId?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Upload a video */
export type YouTubeV1VideoUploadConfig = {
	resource: 'video';
	operation: 'upload';
	title: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["upload"], resource: ["video"] }
 */
		regionCode?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["upload"], resource: ["video"] }
 */
		categoryId?: string | Expression<string>;
	binaryProperty: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve many channels */
export type YouTubeV1VideoCategoryGetAllConfig = {
	resource: 'videoCategory';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getAll"], resource: ["videoCategory"] }
 */
		regionCode: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["videoCategory"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["videoCategory"], returnAll: [false] }
 * @default 25
 */
		limit?: number | Expression<number>;
};

export type YouTubeV1Params =
	| YouTubeV1ChannelGetConfig
	| YouTubeV1ChannelGetAllConfig
	| YouTubeV1ChannelUpdateConfig
	| YouTubeV1ChannelUploadBannerConfig
	| YouTubeV1PlaylistCreateConfig
	| YouTubeV1PlaylistDeleteConfig
	| YouTubeV1PlaylistGetConfig
	| YouTubeV1PlaylistGetAllConfig
	| YouTubeV1PlaylistUpdateConfig
	| YouTubeV1PlaylistItemAddConfig
	| YouTubeV1PlaylistItemDeleteConfig
	| YouTubeV1PlaylistItemGetConfig
	| YouTubeV1PlaylistItemGetAllConfig
	| YouTubeV1VideoDeleteConfig
	| YouTubeV1VideoGetConfig
	| YouTubeV1VideoGetAllConfig
	| YouTubeV1VideoRateConfig
	| YouTubeV1VideoUpdateConfig
	| YouTubeV1VideoUploadConfig
	| YouTubeV1VideoCategoryGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface YouTubeV1Credentials {
	youTubeOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface YouTubeV1NodeBase {
	type: 'n8n-nodes-base.youTube';
	version: 1;
	credentials?: YouTubeV1Credentials;
}

export type YouTubeV1ChannelGetNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1ChannelGetConfig>;
};

export type YouTubeV1ChannelGetAllNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1ChannelGetAllConfig>;
};

export type YouTubeV1ChannelUpdateNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1ChannelUpdateConfig>;
};

export type YouTubeV1ChannelUploadBannerNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1ChannelUploadBannerConfig>;
};

export type YouTubeV1PlaylistCreateNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1PlaylistCreateConfig>;
};

export type YouTubeV1PlaylistDeleteNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1PlaylistDeleteConfig>;
};

export type YouTubeV1PlaylistGetNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1PlaylistGetConfig>;
};

export type YouTubeV1PlaylistGetAllNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1PlaylistGetAllConfig>;
};

export type YouTubeV1PlaylistUpdateNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1PlaylistUpdateConfig>;
};

export type YouTubeV1PlaylistItemAddNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1PlaylistItemAddConfig>;
};

export type YouTubeV1PlaylistItemDeleteNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1PlaylistItemDeleteConfig>;
};

export type YouTubeV1PlaylistItemGetNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1PlaylistItemGetConfig>;
};

export type YouTubeV1PlaylistItemGetAllNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1PlaylistItemGetAllConfig>;
};

export type YouTubeV1VideoDeleteNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1VideoDeleteConfig>;
};

export type YouTubeV1VideoGetNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1VideoGetConfig>;
};

export type YouTubeV1VideoGetAllNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1VideoGetAllConfig>;
};

export type YouTubeV1VideoRateNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1VideoRateConfig>;
};

export type YouTubeV1VideoUpdateNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1VideoUpdateConfig>;
};

export type YouTubeV1VideoUploadNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1VideoUploadConfig>;
};

export type YouTubeV1VideoCategoryGetAllNode = YouTubeV1NodeBase & {
	config: NodeConfig<YouTubeV1VideoCategoryGetAllConfig>;
};

export type YouTubeV1Node =
	| YouTubeV1ChannelGetNode
	| YouTubeV1ChannelGetAllNode
	| YouTubeV1ChannelUpdateNode
	| YouTubeV1ChannelUploadBannerNode
	| YouTubeV1PlaylistCreateNode
	| YouTubeV1PlaylistDeleteNode
	| YouTubeV1PlaylistGetNode
	| YouTubeV1PlaylistGetAllNode
	| YouTubeV1PlaylistUpdateNode
	| YouTubeV1PlaylistItemAddNode
	| YouTubeV1PlaylistItemDeleteNode
	| YouTubeV1PlaylistItemGetNode
	| YouTubeV1PlaylistItemGetAllNode
	| YouTubeV1VideoDeleteNode
	| YouTubeV1VideoGetNode
	| YouTubeV1VideoGetAllNode
	| YouTubeV1VideoRateNode
	| YouTubeV1VideoUpdateNode
	| YouTubeV1VideoUploadNode
	| YouTubeV1VideoCategoryGetAllNode
	;