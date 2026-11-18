import { z } from 'zod';

/**
 * Plain backdrops shown behind a picture with transparent pixels. Named rather
 * than hex so the frontend can map them onto theme-aware colors.
 */
export const USER_AVATAR_BACKGROUNDS = [
	'pink',
	'pink-light',
	'gray-light',
	'gray',
	'gray-dark',
] as const;
export const userAvatarBackgroundSchema = z.enum(USER_AVATAR_BACKGROUNDS);
export type UserAvatarBackground = z.infer<typeof userAvatarBackgroundSchema>;

/** Shapes the generator can draw; mirrors the variants of `vue-boring-avatars`. */
export const USER_AVATAR_VARIANTS = [
	'marble',
	'beam',
	'bauhaus',
	'ring',
	'sunset',
	'pixel',
] as const;
export const userAvatarVariantSchema = z.enum(USER_AVATAR_VARIANTS);
export type UserAvatarVariant = z.infer<typeof userAvatarVariantSchema>;

export const GENERATED_AVATAR_COLOR_COUNT = 5;
export const GENERATED_AVATAR_SEED_MAX_LENGTH = 64;

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Colors must be 6-digit hex values');

/**
 * Where the user left the color picker, kept so the editor can pick up where
 * they left off. Purely informational: `colors` is what gets drawn.
 */
export const generatedAvatarRecipeSchema = z.object({
	/** Degrees on the color wheel. */
	hue: z.number().int().min(0).max(360),
	/** 0 is deep and dark, 100 is light and pale. */
	tone: z.number().int().min(0).max(100),
});
export type GeneratedAvatarRecipe = z.infer<typeof generatedAvatarRecipeSchema>;

/** A generated avatar is fully described by its shape, a seed and a palette. */
export const generatedAvatarSchema = z.object({
	variant: userAvatarVariantSchema,
	seed: z.string().min(1).max(GENERATED_AVATAR_SEED_MAX_LENGTH),
	colors: z.array(hexColorSchema).length(GENERATED_AVATAR_COLOR_COUNT),
	recipe: generatedAvatarRecipeSchema.optional(),
});
export type GeneratedAvatar = z.infer<typeof generatedAvatarSchema>;

export const USER_AVATAR_SOURCES = ['upload', 'sso', 'generated'] as const;
export const userAvatarSourceSchema = z.enum(USER_AVATAR_SOURCES);
export type UserAvatarSource = z.infer<typeof userAvatarSourceSchema>;

/**
 * What the API tells clients about a user's picture. `source` is the one that
 * is shown; the optional members describe every picture the user can switch
 * back to. Image URLs are relative to the REST endpoint and carry a cache
 * buster, so clients can cache them indefinitely.
 */
export const userAvatarSchema = z.object({
	source: userAvatarSourceSchema,
	background: userAvatarBackgroundSchema,
	upload: z.object({ url: z.string() }).optional(),
	sso: z
		.object({
			url: z.string(),
			/** Host of the identity provider the picture came from, e.g. `accounts.google.com`. */
			provider: z.string().optional(),
		})
		.optional(),
	generated: generatedAvatarSchema.optional(),
});
export type UserAvatar = z.infer<typeof userAvatarSchema>;

/** Still images only. GIF is excluded on purpose; animated WebP is flattened on upload. */
export const USER_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type UserAvatarMimeType = (typeof USER_AVATAR_MIME_TYPES)[number];

/**
 * Uploads are refused above this. Clients crop, downscale and re-encode before
 * uploading, so a picture that fits the pixel limit is tens of kilobytes; the
 * cap is only there to bound what a client that skips that step can store.
 */
export const USER_AVATAR_MAX_FILE_SIZE_BYTES = 1024 * 1024;

/**
 * Longest edge, in pixels, of an uploaded picture. Clients downscale to it and
 * the server refuses anything larger, so every stored picture is small to
 * serve and cheap for every browser that shows it to decode.
 */
export const USER_AVATAR_IMAGE_SIZE = 512;
