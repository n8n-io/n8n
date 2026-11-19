import {
	collectEditImageWarnings,
	EDIT_IMAGE_NODE_TYPE,
	EDIT_IMAGE_TARGET_VERSION,
	migrateEditImageParameters,
} from '../../rules/v3/edit-image-version';
import type { NodeMigration } from '../node-migration';

/**
 * Edit Image 1 / 1.1 to Edit Image 2.
 *
 * Does:
 * - Target: same node type, version 2.
 * - Keeps: every parameter that version 2 still reads.
 * - Maps: legacy `blur` / `sigma` to `blurRadius` on the top-level blur operation
 *   and on each multi-step blur entry. Missing blur uses the version 2 default of 5.
 * - Reports: parameter-specific notes when blur, text, Get Information, ignored
 *   PNG/TIFF quality, or non-positive resize dimensions are present.
 *
 * Refuses when: never. Every Edit Image operation can move to version 2.
 *
 * Accepted changes:
 * - Blur uses a different algorithm, so Sigma is dropped.
 * - PNG and TIFF quality settings are ignored at encode time.
 * - Get Information returns a normalized object instead of the GraphicsMagick shape.
 * - Text placement can change because Canvas draws text differently.
 */
export const editImageToV2: NodeMigration = {
	ruleId: 'edit-image-version-v3',
	migrate: (node) => {
		const parameters = migrateEditImageParameters(node.parameters);
		const notes = collectEditImageWarnings(node.parameters);

		return {
			node: {
				type: EDIT_IMAGE_NODE_TYPE,
				typeVersion: EDIT_IMAGE_TARGET_VERSION,
				parameters,
			},
			notes: notes.length > 0 ? notes : undefined,
		};
	},
};
