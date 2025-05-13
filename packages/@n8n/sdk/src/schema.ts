import { z } from 'zod';

/**
 * Schema for the extension configuration.
 */
export const moduleManifestSchema = z.object({
	/**
	 * Allow setting the schema to validate the manifest file.
	 */
	$schema: z.string().optional(),

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
	 * Setup paths for backend and frontend code entry points.
	 */
	entry: z.object({
		/**
		 * Path to the backend entry file.
		 */
		backend: z.string().optional(),
		/**
		 * Path to the frontend entry file.
		 */
		frontend: z.string().optional(),
	}),

	/**
	 * Minimum SDK version required to run the extension.
	 */
	minSDKVersion: z.string().optional(),

	/**
	 * Permissions object specifying allowed access for frontend and backend.
	 */
	permissions: z
		.object({
			/**
			 * List of frontend permissions (array of strings).
			 */
			frontend: z.array(z.string()),
			/**
			 * List of backend permissions (array of strings).
			 */
			backend: z.array(z.string()),
		})
		.optional(),

	/**
	 * List of events that the extension listens to.
	 */
	events: z.array(z.string()).optional(),

	/**
	 * Define extension points for existing functionalities.
	 */
	extends: z
		.object({
			/**
			 * Extends the views configuration.
			 */
			views: z
				.object({
					/**
					 * Extends the workflows view configuration.
					 */
					workflows: z
						.object({
							/**
							 * Header component for the workflows view.
							 */
							header: z.string().optional(),
						})
						.optional(),
				})
				.optional(),
		})
		.optional(),
});

export type ModuleManifest = z.infer<typeof moduleManifestSchema>;
