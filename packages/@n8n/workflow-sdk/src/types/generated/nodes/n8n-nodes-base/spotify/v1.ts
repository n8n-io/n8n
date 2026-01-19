/**
 * Spotify Node - Version 1
 * Access public song data via the Spotify API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get an album by URI or ID */
export type SpotifyV1AlbumGetConfig = {
	resource: 'album';
	operation: 'get';
/**
 * The album's Spotify URI or ID
 * @displayOptions.show { resource: ["album"], operation: ["get", "getTracks"] }
 * @displayOptions.hide { operation: ["search"] }
 */
		id: string | Expression<string>;
};

/** Get a list of new album releases */
export type SpotifyV1AlbumGetNewReleasesConfig = {
	resource: 'album';
	operation: 'getNewReleases';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["album", "artist", "library", "myData", "playlist", "track", "player"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "getFollowingArtists", "search", "recentlyPlayed"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["album", "artist", "library", "playlist", "track"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "search"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["album"], operation: ["get", "getTracks"] }
 * @displayOptions.hide { operation: ["search"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["album", "artist", "library", "myData", "playlist", "track", "player"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "getFollowingArtists", "search", "recentlyPlayed"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["album", "artist", "library", "playlist", "track"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "search"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["album"], operation: ["search"] }
 */
		query: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["album", "artist", "library", "myData", "playlist", "track", "player"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "getFollowingArtists", "search", "recentlyPlayed"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["album", "artist", "library", "playlist", "track"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "search"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["artist"] }
 * @displayOptions.hide { operation: ["search"] }
 */
		id: string | Expression<string>;
};

/** Get an artist's albums by URI or ID */
export type SpotifyV1ArtistGetAlbumsConfig = {
	resource: 'artist';
	operation: 'getAlbums';
/**
 * The artist's Spotify URI or ID
 * @displayOptions.show { resource: ["artist"] }
 * @displayOptions.hide { operation: ["search"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["album", "artist", "library", "myData", "playlist", "track", "player"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "getFollowingArtists", "search", "recentlyPlayed"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["album", "artist", "library", "playlist", "track"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "search"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["artist"] }
 * @displayOptions.hide { operation: ["search"] }
 */
		id: string | Expression<string>;
};

/** Get an artist's top tracks by URI or ID */
export type SpotifyV1ArtistGetTopTracksConfig = {
	resource: 'artist';
	operation: 'getTopTracks';
/**
 * The artist's Spotify URI or ID
 * @displayOptions.show { resource: ["artist"] }
 * @displayOptions.hide { operation: ["search"] }
 */
		id: string | Expression<string>;
/**
 * Top tracks in which country? Enter the postal abbreviation
 * @displayOptions.show { resource: ["artist"], operation: ["getTopTracks"] }
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
 * @displayOptions.show { resource: ["artist"] }
 * @displayOptions.hide { operation: ["search"] }
 */
		id: string | Expression<string>;
/**
 * The keyword term to search for
 * @displayOptions.show { resource: ["artist"], operation: ["search"] }
 */
		query: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["album", "artist", "library", "myData", "playlist", "track", "player"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "getFollowingArtists", "search", "recentlyPlayed"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["album", "artist", "library", "playlist", "track"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "search"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["album", "artist", "library", "myData", "playlist", "track", "player"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "getFollowingArtists", "search", "recentlyPlayed"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["album", "artist", "library", "playlist", "track"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "search"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["album", "artist", "library", "myData", "playlist", "track", "player"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "getFollowingArtists", "search", "recentlyPlayed"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["myData", "player"], operation: ["getFollowingArtists", "recentlyPlayed"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["player"], operation: ["addSongToQueue"] }
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
 * @displayOptions.show { resource: ["album", "artist", "library", "myData", "playlist", "track", "player"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "getFollowingArtists", "search", "recentlyPlayed"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["myData", "player"], operation: ["getFollowingArtists", "recentlyPlayed"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["player"], operation: ["volume"] }
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
 * @displayOptions.show { resource: ["player"], operation: ["startMusic"] }
 */
		id: string | Expression<string>;
};

/** Add tracks to a playlist by track and playlist URI or ID */
export type SpotifyV1PlaylistAddConfig = {
	resource: 'playlist';
	operation: 'add';
/**
 * The playlist's Spotify URI or its ID
 * @displayOptions.show { resource: ["playlist"], operation: ["add", "delete", "get", "getTracks"] }
 */
		id: string | Expression<string>;
/**
 * The track's Spotify URI or its ID. The track to add/delete from the playlist.
 * @displayOptions.show { resource: ["playlist"], operation: ["add", "delete"] }
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
 * @displayOptions.show { resource: ["playlist"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["playlist"], operation: ["add", "delete", "get", "getTracks"] }
 */
		id: string | Expression<string>;
};

/** Get a user's playlists */
export type SpotifyV1PlaylistGetUserPlaylistsConfig = {
	resource: 'playlist';
	operation: 'getUserPlaylists';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["album", "artist", "library", "myData", "playlist", "track", "player"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "getFollowingArtists", "search", "recentlyPlayed"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["album", "artist", "library", "playlist", "track"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "search"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["playlist"], operation: ["add", "delete", "get", "getTracks"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["album", "artist", "library", "myData", "playlist", "track", "player"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "getFollowingArtists", "search", "recentlyPlayed"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["album", "artist", "library", "playlist", "track"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "search"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["playlist"], operation: ["add", "delete", "get", "getTracks"] }
 */
		id: string | Expression<string>;
/**
 * The track's Spotify URI or its ID. The track to add/delete from the playlist.
 * @displayOptions.show { resource: ["playlist"], operation: ["add", "delete"] }
 */
		trackID: string | Expression<string>;
};

/** Search albums by keyword */
export type SpotifyV1PlaylistSearchConfig = {
	resource: 'playlist';
	operation: 'search';
/**
 * The keyword term to search for
 * @displayOptions.show { resource: ["playlist"], operation: ["search"] }
 */
		query: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["album", "artist", "library", "myData", "playlist", "track", "player"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "getFollowingArtists", "search", "recentlyPlayed"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["album", "artist", "library", "playlist", "track"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "search"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["track"] }
 * @displayOptions.hide { operation: ["search"] }
 */
		id: string | Expression<string>;
};

/** Get audio features for a track by URI or ID */
export type SpotifyV1TrackGetAudioFeaturesConfig = {
	resource: 'track';
	operation: 'getAudioFeatures';
/**
 * The track's Spotify URI or ID
 * @displayOptions.show { resource: ["track"] }
 * @displayOptions.hide { operation: ["search"] }
 */
		id: string | Expression<string>;
};

/** Search albums by keyword */
export type SpotifyV1TrackSearchConfig = {
	resource: 'track';
	operation: 'search';
/**
 * The track's Spotify URI or ID
 * @displayOptions.show { resource: ["track"] }
 * @displayOptions.hide { operation: ["search"] }
 */
		id: string | Expression<string>;
/**
 * The keyword term to search for
 * @displayOptions.show { resource: ["track"], operation: ["search"] }
 */
		query: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["album", "artist", "library", "myData", "playlist", "track", "player"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "getFollowingArtists", "search", "recentlyPlayed"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["album", "artist", "library", "playlist", "track"], operation: ["getTracks", "getAlbums", "getUserPlaylists", "getNewReleases", "getLikedTracks", "search"], returnAll: [false] }
 * @default 50
 */
		limit: number | Expression<number>;
	filters?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type SpotifyV1AlbumSearchOutput = {
	album_type?: string;
	artists?: Array<{
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		name?: string;
		type?: string;
		uri?: string;
	}>;
	available_markets?: Array<string>;
	external_urls?: {
		spotify?: string;
	};
	href?: string;
	id?: string;
	images?: Array<{
		height?: number;
		url?: string;
		width?: number;
	}>;
	name?: string;
	release_date?: string;
	release_date_precision?: string;
	total_tracks?: number;
	type?: string;
	uri?: string;
};

export type SpotifyV1ArtistGetOutput = {
	external_urls?: {
		spotify?: string;
	};
	followers?: {
		href?: null;
		total?: number;
	};
	genres?: Array<string>;
	href?: string;
	id?: string;
	images?: Array<{
		height?: number;
		url?: string;
		width?: number;
	}>;
	name?: string;
	popularity?: number;
	type?: string;
	uri?: string;
};

export type SpotifyV1ArtistGetAlbumsOutput = {
	album_group?: string;
	album_type?: string;
	artists?: Array<{
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		name?: string;
		type?: string;
		uri?: string;
	}>;
	available_markets?: Array<string>;
	external_urls?: {
		spotify?: string;
	};
	href?: string;
	id?: string;
	images?: Array<{
		height?: number;
		url?: string;
		width?: number;
	}>;
	name?: string;
	release_date?: string;
	release_date_precision?: string;
	total_tracks?: number;
	type?: string;
	uri?: string;
};

export type SpotifyV1ArtistGetTopTracksOutput = {
	album?: {
		album_type?: string;
		artists?: Array<{
			external_urls?: {
				spotify?: string;
			};
			href?: string;
			id?: string;
			name?: string;
			type?: string;
			uri?: string;
		}>;
		available_markets?: Array<string>;
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		images?: Array<{
			height?: number;
			url?: string;
			width?: number;
		}>;
		is_playable?: boolean;
		name?: string;
		release_date?: string;
		release_date_precision?: string;
		total_tracks?: number;
		type?: string;
		uri?: string;
	};
	artists?: Array<{
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		name?: string;
		type?: string;
		uri?: string;
	}>;
	available_markets?: Array<string>;
	disc_number?: number;
	duration_ms?: number;
	explicit?: boolean;
	external_ids?: {
		isrc?: string;
	};
	external_urls?: {
		spotify?: string;
	};
	href?: string;
	id?: string;
	is_local?: boolean;
	is_playable?: boolean;
	name?: string;
	popularity?: number;
	track_number?: number;
	type?: string;
	uri?: string;
};

export type SpotifyV1ArtistSearchOutput = {
	external_urls?: {
		spotify?: string;
	};
	followers?: {
		href?: null;
		total?: number;
	};
	genres?: Array<string>;
	href?: string;
	id?: string;
	images?: Array<{
		height?: number;
		url?: string;
		width?: number;
	}>;
	name?: string;
	popularity?: number;
	type?: string;
	uri?: string;
};

export type SpotifyV1LibraryGetLikedTracksOutput = {
	added_at?: string;
	track?: {
		album?: {
			album_type?: string;
			artists?: Array<{
				external_urls?: {
					spotify?: string;
				};
				href?: string;
				id?: string;
				name?: string;
				type?: string;
				uri?: string;
			}>;
			available_markets?: Array<string>;
			external_urls?: {
				spotify?: string;
			};
			href?: string;
			id?: string;
			images?: Array<{
				height?: number;
				url?: string;
				width?: number;
			}>;
			is_playable?: boolean;
			name?: string;
			release_date?: string;
			release_date_precision?: string;
			total_tracks?: number;
			type?: string;
			uri?: string;
		};
		artists?: Array<{
			external_urls?: {
				spotify?: string;
			};
			href?: string;
			id?: string;
			name?: string;
			type?: string;
			uri?: string;
		}>;
		available_markets?: Array<string>;
		disc_number?: number;
		duration_ms?: number;
		explicit?: boolean;
		external_ids?: {
			isrc?: string;
		};
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		is_local?: boolean;
		is_playable?: boolean;
		name?: string;
		popularity?: number;
		track_number?: number;
		type?: string;
		uri?: string;
	};
};

export type SpotifyV1MyDataGetFollowingArtistsOutput = {
	external_urls?: {
		spotify?: string;
	};
	followers?: {
		href?: null;
		total?: number;
	};
	genres?: Array<string>;
	href?: string;
	id?: string;
	images?: Array<{
		height?: number;
		url?: string;
		width?: number;
	}>;
	name?: string;
	popularity?: number;
	type?: string;
	uri?: string;
};

export type SpotifyV1PlayerAddSongToQueueOutput = {
	success?: boolean;
};

export type SpotifyV1PlayerCurrentlyPlayingOutput = {
	actions?: {
		disallows?: {
			resuming?: boolean;
		};
	};
	currently_playing_type?: string;
	is_playing?: boolean;
	item?: {
		album?: {
			artists?: Array<{
				external_urls?: {
					spotify?: string;
				};
				href?: string;
				id?: string;
				name?: string;
				type?: string;
				uri?: string;
			}>;
			available_markets?: Array<string>;
			external_urls?: {
				spotify?: string;
			};
			images?: Array<{
				height?: number;
				url?: string;
				width?: number;
			}>;
			name?: string;
			total_tracks?: number;
			type?: string;
		};
		artists?: Array<{
			external_urls?: {
				spotify?: string;
			};
			name?: string;
			type?: string;
		}>;
		available_markets?: Array<string>;
		disc_number?: number;
		duration_ms?: number;
		explicit?: boolean;
		external_ids?: {
			isrc?: string;
		};
		external_urls?: {
			spotify?: string;
		};
		is_local?: boolean;
		name?: string;
		popularity?: number;
		track_number?: number;
		type?: string;
		uri?: string;
	};
	progress_ms?: number;
	timestamp?: number;
};

export type SpotifyV1PlayerNextSongOutput = {
	success?: boolean;
};

export type SpotifyV1PlayerPauseOutput = {
	success?: boolean;
};

export type SpotifyV1PlayerRecentlyPlayedOutput = {
	played_at?: string;
	track?: {
		album?: {
			album_type?: string;
			artists?: Array<{
				external_urls?: {
					spotify?: string;
				};
				href?: string;
				id?: string;
				name?: string;
				type?: string;
				uri?: string;
			}>;
			available_markets?: Array<string>;
			external_urls?: {
				spotify?: string;
			};
			href?: string;
			id?: string;
			images?: Array<{
				height?: number;
				url?: string;
				width?: number;
			}>;
			name?: string;
			release_date?: string;
			release_date_precision?: string;
			total_tracks?: number;
			type?: string;
			uri?: string;
		};
		artists?: Array<{
			external_urls?: {
				spotify?: string;
			};
			href?: string;
			id?: string;
			name?: string;
			type?: string;
			uri?: string;
		}>;
		available_markets?: Array<string>;
		disc_number?: number;
		duration_ms?: number;
		explicit?: boolean;
		external_ids?: {
			isrc?: string;
		};
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		is_local?: boolean;
		name?: string;
		popularity?: number;
		track_number?: number;
		type?: string;
		uri?: string;
	};
};

export type SpotifyV1PlayerResumeOutput = {
	success?: boolean;
};

export type SpotifyV1PlayerVolumeOutput = {
	success?: boolean;
};

export type SpotifyV1PlayerStartMusicOutput = {
	success?: boolean;
};

export type SpotifyV1PlaylistAddOutput = {
	snapshot_id?: string;
};

export type SpotifyV1PlaylistCreateOutput = {
	collaborative?: boolean;
	description?: string;
	external_urls?: {
		spotify?: string;
	};
	followers?: {
		href?: null;
		total?: number;
	};
	href?: string;
	id?: string;
	name?: string;
	owner?: {
		display_name?: null;
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		type?: string;
		uri?: string;
	};
	primary_color?: null;
	public?: boolean;
	snapshot_id?: string;
	tracks?: {
		href?: string;
		limit?: number;
		next?: null;
		offset?: number;
		previous?: null;
		total?: number;
	};
	type?: string;
	uri?: string;
};

export type SpotifyV1PlaylistGetOutput = {
	collaborative?: boolean;
	description?: string;
	external_urls?: {
		spotify?: string;
	};
	followers?: {
		href?: null;
		total?: number;
	};
	href?: string;
	id?: string;
	name?: string;
	owner?: {
		display_name?: string;
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		type?: string;
		uri?: string;
	};
	public?: boolean;
	snapshot_id?: string;
	tracks?: {
		href?: string;
		items?: Array<{
			added_at?: string;
			added_by?: {
				external_urls?: {
					spotify?: string;
				};
				href?: string;
				id?: string;
				type?: string;
				uri?: string;
			};
			is_local?: boolean;
			primary_color?: null;
			track?: {
				album?: {
					artists?: Array<{
						external_urls?: {
							spotify?: string;
						};
						href?: string;
						id?: string;
						type?: string;
						uri?: string;
					}>;
					available_markets?: Array<string>;
					external_urls?: {
						spotify?: string;
					};
					images?: Array<{
						height?: number;
						url?: string;
						width?: number;
					}>;
					name?: string;
					total_tracks?: number;
					type?: string;
				};
				artists?: Array<{
					external_urls?: {
						spotify?: string;
					};
					type?: string;
				}>;
				available_markets?: Array<string>;
				disc_number?: number;
				duration_ms?: number;
				episode?: boolean;
				explicit?: boolean;
				external_ids?: {
					isrc?: string;
				};
				external_urls?: {
					spotify?: string;
				};
				is_local?: boolean;
				name?: string;
				popularity?: number;
				track?: boolean;
				track_number?: number;
				type?: string;
				uri?: string;
			};
			video_thumbnail?: {
				url?: null;
			};
		}>;
		limit?: number;
		offset?: number;
		previous?: null;
		total?: number;
	};
	type?: string;
	uri?: string;
};

export type SpotifyV1PlaylistGetUserPlaylistsOutput = {
	collaborative?: boolean;
	description?: string;
	external_urls?: {
		spotify?: string;
	};
	href?: string;
	id?: string;
	name?: string;
	owner?: {
		display_name?: string;
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		type?: string;
		uri?: string;
	};
	public?: boolean;
	snapshot_id?: string;
	tracks?: {
		href?: string;
		total?: number;
	};
	type?: string;
	uri?: string;
};

export type SpotifyV1PlaylistGetTracksOutput = {
	added_at?: string;
	added_by?: {
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		type?: string;
	};
	is_local?: boolean;
	primary_color?: null;
	track?: {
		album?: {
			album_type?: string;
			artists?: Array<{
				external_urls?: {
					spotify?: string;
				};
				href?: string;
				id?: string;
				name?: string;
				type?: string;
				uri?: string;
			}>;
			available_markets?: Array<string>;
			external_urls?: {
				spotify?: string;
			};
			href?: string;
			id?: string;
			images?: Array<{
				height?: number;
				url?: string;
				width?: number;
			}>;
			name?: string;
			release_date?: string;
			release_date_precision?: string;
			total_tracks?: number;
			type?: string;
			uri?: string;
		};
		artists?: Array<{
			external_urls?: {
				spotify?: string;
			};
			href?: string;
			id?: string;
			name?: string;
			type?: string;
			uri?: string;
		}>;
		available_markets?: Array<string>;
		disc_number?: number;
		duration_ms?: number;
		episode?: boolean;
		explicit?: boolean;
		external_ids?: {
			isrc?: string;
		};
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		is_local?: boolean;
		name?: string;
		popularity?: number;
		track?: boolean;
		track_number?: number;
		type?: string;
		uri?: string;
	};
	video_thumbnail?: {
		url?: null;
	};
};

export type SpotifyV1PlaylistSearchOutput = {
	collaborative?: boolean;
	description?: string;
	external_urls?: {
		spotify?: string;
	};
	href?: string;
	id?: string;
	images?: Array<{
		url?: string;
	}>;
	name?: string;
	owner?: {
		display_name?: string;
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		type?: string;
		uri?: string;
	};
	snapshot_id?: string;
	tracks?: {
		href?: string;
		total?: number;
	};
	type?: string;
	uri?: string;
};

export type SpotifyV1TrackGetOutput = {
	album?: {
		album_type?: string;
		artists?: Array<{
			external_urls?: {
				spotify?: string;
			};
			href?: string;
			id?: string;
			name?: string;
			type?: string;
			uri?: string;
		}>;
		available_markets?: Array<string>;
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		images?: Array<{
			height?: number;
			url?: string;
			width?: number;
		}>;
		name?: string;
		release_date?: string;
		release_date_precision?: string;
		total_tracks?: number;
		type?: string;
		uri?: string;
	};
	artists?: Array<{
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		name?: string;
		type?: string;
		uri?: string;
	}>;
	available_markets?: Array<string>;
	disc_number?: number;
	duration_ms?: number;
	explicit?: boolean;
	external_ids?: {
		isrc?: string;
	};
	external_urls?: {
		spotify?: string;
	};
	href?: string;
	id?: string;
	is_local?: boolean;
	name?: string;
	popularity?: number;
	track_number?: number;
	type?: string;
	uri?: string;
};

export type SpotifyV1TrackGetAudioFeaturesOutput = {
	acousticness?: number;
	analysis_url?: string;
	danceability?: number;
	duration_ms?: number;
	energy?: number;
	id?: string;
	key?: number;
	liveness?: number;
	loudness?: number;
	mode?: number;
	speechiness?: number;
	tempo?: number;
	time_signature?: number;
	track_href?: string;
	type?: string;
	uri?: string;
	valence?: number;
};

export type SpotifyV1TrackSearchOutput = {
	album?: {
		album_type?: string;
		artists?: Array<{
			external_urls?: {
				spotify?: string;
			};
			href?: string;
			id?: string;
			name?: string;
			type?: string;
			uri?: string;
		}>;
		available_markets?: Array<string>;
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		images?: Array<{
			height?: number;
			url?: string;
			width?: number;
		}>;
		is_playable?: boolean;
		name?: string;
		release_date?: string;
		release_date_precision?: string;
		total_tracks?: number;
		type?: string;
		uri?: string;
	};
	artists?: Array<{
		external_urls?: {
			spotify?: string;
		};
		href?: string;
		id?: string;
		name?: string;
		type?: string;
		uri?: string;
	}>;
	available_markets?: Array<string>;
	disc_number?: number;
	duration_ms?: number;
	explicit?: boolean;
	external_ids?: {
		isrc?: string;
	};
	external_urls?: {
		spotify?: string;
	};
	href?: string;
	id?: string;
	is_local?: boolean;
	is_playable?: boolean;
	name?: string;
	popularity?: number;
	track_number?: number;
	type?: string;
	uri?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface SpotifyV1Credentials {
	spotifyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SpotifyV1NodeBase {
	type: 'n8n-nodes-base.spotify';
	version: 1;
	credentials?: SpotifyV1Credentials;
}

export type SpotifyV1AlbumGetNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1AlbumGetConfig>;
};

export type SpotifyV1AlbumGetNewReleasesNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1AlbumGetNewReleasesConfig>;
};

export type SpotifyV1AlbumGetTracksNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1AlbumGetTracksConfig>;
};

export type SpotifyV1AlbumSearchNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1AlbumSearchConfig>;
	output?: SpotifyV1AlbumSearchOutput;
};

export type SpotifyV1ArtistGetNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1ArtistGetConfig>;
	output?: SpotifyV1ArtistGetOutput;
};

export type SpotifyV1ArtistGetAlbumsNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1ArtistGetAlbumsConfig>;
	output?: SpotifyV1ArtistGetAlbumsOutput;
};

export type SpotifyV1ArtistGetRelatedArtistsNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1ArtistGetRelatedArtistsConfig>;
};

export type SpotifyV1ArtistGetTopTracksNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1ArtistGetTopTracksConfig>;
	output?: SpotifyV1ArtistGetTopTracksOutput;
};

export type SpotifyV1ArtistSearchNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1ArtistSearchConfig>;
	output?: SpotifyV1ArtistSearchOutput;
};

export type SpotifyV1LibraryGetLikedTracksNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1LibraryGetLikedTracksConfig>;
	output?: SpotifyV1LibraryGetLikedTracksOutput;
};

export type SpotifyV1MyDataGetFollowingArtistsNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1MyDataGetFollowingArtistsConfig>;
	output?: SpotifyV1MyDataGetFollowingArtistsOutput;
};

export type SpotifyV1PlayerAddSongToQueueNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlayerAddSongToQueueConfig>;
	output?: SpotifyV1PlayerAddSongToQueueOutput;
};

export type SpotifyV1PlayerCurrentlyPlayingNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlayerCurrentlyPlayingConfig>;
	output?: SpotifyV1PlayerCurrentlyPlayingOutput;
};

export type SpotifyV1PlayerNextSongNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlayerNextSongConfig>;
	output?: SpotifyV1PlayerNextSongOutput;
};

export type SpotifyV1PlayerPauseNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlayerPauseConfig>;
	output?: SpotifyV1PlayerPauseOutput;
};

export type SpotifyV1PlayerPreviousSongNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlayerPreviousSongConfig>;
};

export type SpotifyV1PlayerRecentlyPlayedNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlayerRecentlyPlayedConfig>;
	output?: SpotifyV1PlayerRecentlyPlayedOutput;
};

export type SpotifyV1PlayerResumeNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlayerResumeConfig>;
	output?: SpotifyV1PlayerResumeOutput;
};

export type SpotifyV1PlayerVolumeNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlayerVolumeConfig>;
	output?: SpotifyV1PlayerVolumeOutput;
};

export type SpotifyV1PlayerStartMusicNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlayerStartMusicConfig>;
	output?: SpotifyV1PlayerStartMusicOutput;
};

export type SpotifyV1PlaylistAddNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlaylistAddConfig>;
	output?: SpotifyV1PlaylistAddOutput;
};

export type SpotifyV1PlaylistCreateNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlaylistCreateConfig>;
	output?: SpotifyV1PlaylistCreateOutput;
};

export type SpotifyV1PlaylistGetNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlaylistGetConfig>;
	output?: SpotifyV1PlaylistGetOutput;
};

export type SpotifyV1PlaylistGetUserPlaylistsNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlaylistGetUserPlaylistsConfig>;
	output?: SpotifyV1PlaylistGetUserPlaylistsOutput;
};

export type SpotifyV1PlaylistGetTracksNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlaylistGetTracksConfig>;
	output?: SpotifyV1PlaylistGetTracksOutput;
};

export type SpotifyV1PlaylistDeleteNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlaylistDeleteConfig>;
};

export type SpotifyV1PlaylistSearchNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1PlaylistSearchConfig>;
	output?: SpotifyV1PlaylistSearchOutput;
};

export type SpotifyV1TrackGetNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1TrackGetConfig>;
	output?: SpotifyV1TrackGetOutput;
};

export type SpotifyV1TrackGetAudioFeaturesNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1TrackGetAudioFeaturesConfig>;
	output?: SpotifyV1TrackGetAudioFeaturesOutput;
};

export type SpotifyV1TrackSearchNode = SpotifyV1NodeBase & {
	config: NodeConfig<SpotifyV1TrackSearchConfig>;
	output?: SpotifyV1TrackSearchOutput;
};

export type SpotifyV1Node =
	| SpotifyV1AlbumGetNode
	| SpotifyV1AlbumGetNewReleasesNode
	| SpotifyV1AlbumGetTracksNode
	| SpotifyV1AlbumSearchNode
	| SpotifyV1ArtistGetNode
	| SpotifyV1ArtistGetAlbumsNode
	| SpotifyV1ArtistGetRelatedArtistsNode
	| SpotifyV1ArtistGetTopTracksNode
	| SpotifyV1ArtistSearchNode
	| SpotifyV1LibraryGetLikedTracksNode
	| SpotifyV1MyDataGetFollowingArtistsNode
	| SpotifyV1PlayerAddSongToQueueNode
	| SpotifyV1PlayerCurrentlyPlayingNode
	| SpotifyV1PlayerNextSongNode
	| SpotifyV1PlayerPauseNode
	| SpotifyV1PlayerPreviousSongNode
	| SpotifyV1PlayerRecentlyPlayedNode
	| SpotifyV1PlayerResumeNode
	| SpotifyV1PlayerVolumeNode
	| SpotifyV1PlayerStartMusicNode
	| SpotifyV1PlaylistAddNode
	| SpotifyV1PlaylistCreateNode
	| SpotifyV1PlaylistGetNode
	| SpotifyV1PlaylistGetUserPlaylistsNode
	| SpotifyV1PlaylistGetTracksNode
	| SpotifyV1PlaylistDeleteNode
	| SpotifyV1PlaylistSearchNode
	| SpotifyV1TrackGetNode
	| SpotifyV1TrackGetAudioFeaturesNode
	| SpotifyV1TrackSearchNode
	;