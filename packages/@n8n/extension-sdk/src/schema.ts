import { z } from 'zod';

/**
 * Schema for the extension configuration.
 */
export const extensionManifestSchema = z.object({
	/**
	 * Name of the extension package.
	 */
	name: z.string(),

	/**
	 * The display name of the extension.
	 */
	displayName: z.string(),

	/**
	 * Description of the extension package.
	 */
	description: z.string(),

	/**
	 * Publisher of the extension.
	 */
	publisher: z.string(),

	/**
	 * Version of the extension package.
	 */
	version: z.string(),

	/**
	 * Category the extension belongs to.
	 */
	categories: z.array(z.string()),

	/**
	 * Setup paths for backend and frontend code entry points.
	 */
	entry: z.object({
		/**
		 * Path to the backend entry file.
		 */
		backend: z.string(),
		/**
		 * Path to the frontend entry file.
		 */
		frontend: z.string(),
	}),

	/**
	 * Minimum SDK version required to run the extension.
	 */
	minSDKVersion: z.string(),

	/**
	 * Permissions object specifying allowed access for frontend and backend.
	 */
	permissions: z.object({
		/**
		 * List of frontend permissions (array of strings).
		 */
		frontend: z.array(z.string()),
		/**
		 * List of backend permissions (array of strings).
		 */
		backend: z.array(z.string()),
	}),

	/**
	 * List of events that the extension listens to.
	 */
	events: z.array(z.string()),

	/**
	 * Define extension points for existing functionalities.
	 */
	extends: z.object({
		/**
		 * Extends the views configuration.
		 */
		views: z.object({
			/**
			 * Extends the workflows view configuration.
			 */
			workflows: z.object({
				/**
				 * Header component for the workflows view.
				 */
				header: z.string(),
			}),
		}),
	}),
});

export type ExtensionManifest = z.infer<typeof extensionManifestSchema>;
