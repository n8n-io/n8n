/**
 * Spotify Node Types
 *
 * Access public song data via the Spotify API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/spotify/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get an album by URI or ID */
export type SpotifyV1AlbumGetConfig = {
	resource: 'album';
	operation: 'get';
	/**
	 * The album's Spotify URI or ID
	 */
	id: string | Expression<string>;
};

/** Get a list of new album releases */
export type SpotifyV1AlbumGetNewReleasesConfig = {
	resource: 'album';
	operation: 'getNewReleases';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get an album's tracks by URI or ID */
export type SpotifyV1AlbumGetTracksConfig = {
	resource: 'album';
	operation: 'getTracks';
	/**
	 * The album's Spotify URI or ID
	 */
	id: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
};

/** Search albums by keyword */
export type SpotifyV1AlbumSearchConfig = {
	resource: 'album';
	operation: 'search';
	/**
	 * The keyword term to search for
	 */
	query: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get an album by URI or ID */
export type SpotifyV1ArtistGetConfig = {
	resource: 'artist';
	operation: 'get';
	/**
	 * The artist's Spotify URI or ID
	 */
	id: string | Expression<string>;
};

/** Get an artist's albums by URI or ID */
export type SpotifyV1ArtistGetAlbumsConfig = {
	resource: 'artist';
	operation: 'getAlbums';
	/**
	 * The artist's Spotify URI or ID
	 */
	id: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
};

/** Get an artist's related artists by URI or ID */
export type SpotifyV1ArtistGetRelatedArtistsConfig = {
	resource: 'artist';
	operation: 'getRelatedArtists';
	/**
	 * The artist's Spotify URI or ID
	 */
	id: string | Expression<string>;
};

/** Get an artist's top tracks by URI or ID */
export type SpotifyV1ArtistGetTopTracksConfig = {
	resource: 'artist';
	operation: 'getTopTracks';
	/**
	 * The artist's Spotify URI or ID
	 */
	id: string | Expression<string>;
	/**
	 * Top tracks in which country? Enter the postal abbreviation
	 * @default US
	 */
	country: string | Expression<string>;
};

/** Search albums by keyword */
export type SpotifyV1ArtistSearchConfig = {
	resource: 'artist';
	operation: 'search';
	/**
	 * The artist's Spotify URI or ID
	 */
	id: string | Expression<string>;
	/**
	 * The keyword term to search for
	 */
	query: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get the user's liked tracks */
export type SpotifyV1LibraryGetLikedTracksConfig = {
	resource: 'library';
	operation: 'getLikedTracks';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
};

/** Get your followed artists */
export type SpotifyV1MyDataGetFollowingArtistsConfig = {
	resource: 'myData';
	operation: 'getFollowingArtists';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
};

/** Add a song to your queue */
export type SpotifyV1PlayerAddSongToQueueConfig = {
	resource: 'player';
	operation: 'addSongToQueue';
	/**
	 * Enter a track URI or ID
	 */
	id: string | Expression<string>;
};

/** Get your currently playing track */
export type SpotifyV1PlayerCurrentlyPlayingConfig = {
	resource: 'player';
	operation: 'currentlyPlaying';
};

/** Skip to your next track */
export type SpotifyV1PlayerNextSongConfig = {
	resource: 'player';
	operation: 'nextSong';
};

/** Pause your music */
export type SpotifyV1PlayerPauseConfig = {
	resource: 'player';
	operation: 'pause';
};

/** Skip to your previous song */
export type SpotifyV1PlayerPreviousSongConfig = {
	resource: 'player';
	operation: 'previousSong';
};

/** Get your recently played tracks */
export type SpotifyV1PlayerRecentlyPlayedConfig = {
	resource: 'player';
	operation: 'recentlyPlayed';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
};

/** Resume playback on the current active device */
export type SpotifyV1PlayerResumeConfig = {
	resource: 'player';
	operation: 'resume';
};

/** Set volume on the current active device */
export type SpotifyV1PlayerVolumeConfig = {
	resource: 'player';
	operation: 'volume';
	/**
	 * The volume percentage to set
	 * @default 50
	 */
	volumePercent: number | Expression<number>;
};

/** Start playing a playlist, artist, or album */
export type SpotifyV1PlayerStartMusicConfig = {
	resource: 'player';
	operation: 'startMusic';
	/**
	 * Enter a playlist, artist, or album URI or ID
	 */
	id: string | Expression<string>;
};

/** Add tracks to a playlist by track and playlist URI or ID */
export type SpotifyV1PlaylistAddConfig = {
	resource: 'playlist';
	operation: 'add';
	/**
	 * The playlist's Spotify URI or its ID
	 */
	id: string | Expression<string>;
	/**
	 * The track's Spotify URI or its ID. The track to add/delete from the playlist.
	 */
	trackID: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new playlist */
export type SpotifyV1PlaylistCreateConfig = {
	resource: 'playlist';
	operation: 'create';
	/**
	 * Name of the playlist to create
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get an album by URI or ID */
export type SpotifyV1PlaylistGetConfig = {
	resource: 'playlist';
	operation: 'get';
	/**
	 * The playlist's Spotify URI or its ID
	 */
	id: string | Expression<string>;
};

/** Get a user's playlists */
export type SpotifyV1PlaylistGetUserPlaylistsConfig = {
	resource: 'playlist';
	operation: 'getUserPlaylists';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
};

/** Get an album's tracks by URI or ID */
export type SpotifyV1PlaylistGetTracksConfig = {
	resource: 'playlist';
	operation: 'getTracks';
	/**
	 * The playlist's Spotify URI or its ID
	 */
	id: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
};

/** Remove tracks from a playlist by track and playlist URI or ID */
export type SpotifyV1PlaylistDeleteConfig = {
	resource: 'playlist';
	operation: 'delete';
	/**
	 * The playlist's Spotify URI or its ID
	 */
	id: string | Expression<string>;
	/**
	 * The track's Spotify URI or its ID. The track to add/delete from the playlist.
	 */
	trackID: string | Expression<string>;
};

/** Search albums by keyword */
export type SpotifyV1PlaylistSearchConfig = {
	resource: 'playlist';
	operation: 'search';
	/**
	 * The keyword term to search for
	 */
	query: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get an album by URI or ID */
export type SpotifyV1TrackGetConfig = {
	resource: 'track';
	operation: 'get';
	/**
	 * The track's Spotify URI or ID
	 */
	id: string | Expression<string>;
};

/** Get audio features for a track by URI or ID */
export type SpotifyV1TrackGetAudioFeaturesConfig = {
	resource: 'track';
	operation: 'getAudioFeatures';
	/**
	 * The track's Spotify URI or ID
	 */
	id: string | Expression<string>;
};

/** Search albums by keyword */
export type SpotifyV1TrackSearchConfig = {
	resource: 'track';
	operation: 'search';
	/**
	 * The track's Spotify URI or ID
	 */
	id: string | Expression<string>;
	/**
	 * The keyword term to search for
	 */
	query: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type SpotifyV1Params =
	| SpotifyV1AlbumGetConfig
	| SpotifyV1AlbumGetNewReleasesConfig
	| SpotifyV1AlbumGetTracksConfig
	| SpotifyV1AlbumSearchConfig
	| SpotifyV1ArtistGetConfig
	| SpotifyV1ArtistGetAlbumsConfig
	| SpotifyV1ArtistGetRelatedArtistsConfig
	| SpotifyV1ArtistGetTopTracksConfig
	| SpotifyV1ArtistSearchConfig
	| SpotifyV1LibraryGetLikedTracksConfig
	| SpotifyV1MyDataGetFollowingArtistsConfig
	| SpotifyV1PlayerAddSongToQueueConfig
	| SpotifyV1PlayerCurrentlyPlayingConfig
	| SpotifyV1PlayerNextSongConfig
	| SpotifyV1PlayerPauseConfig
	| SpotifyV1PlayerPreviousSongConfig
	| SpotifyV1PlayerRecentlyPlayedConfig
	| SpotifyV1PlayerResumeConfig
	| SpotifyV1PlayerVolumeConfig
	| SpotifyV1PlayerStartMusicConfig
	| SpotifyV1PlaylistAddConfig
	| SpotifyV1PlaylistCreateConfig
	| SpotifyV1PlaylistGetConfig
	| SpotifyV1PlaylistGetUserPlaylistsConfig
	| SpotifyV1PlaylistGetTracksConfig
	| SpotifyV1PlaylistDeleteConfig
	| SpotifyV1PlaylistSearchConfig
	| SpotifyV1TrackGetConfig
	| SpotifyV1TrackGetAudioFeaturesConfig
	| SpotifyV1TrackSearchConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SpotifyV1Credentials {
	spotifyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type SpotifyV1Node = {
	type: 'n8n-nodes-base.spotify';
	version: 1;
	config: NodeConfig<SpotifyV1Params>;
	credentials?: SpotifyV1Credentials;
};

export type SpotifyNode = SpotifyV1Node;
