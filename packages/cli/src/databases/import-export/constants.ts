/** Name of the file describing the export. */
export const MANIFEST_FILENAME = 'manifest.json';

/** Default number of rows to retrieve from DB and write to a `.jsonl` file at a time. */
export const BATCH_SIZE = 500;

/** Tables to exclude from the export in lightweight mode. */
export const EXCLUDE_LIST = [
	'execution_annotation_tags',
	'execution_annotations',
	'execution_data',
	'execution_entity',
	'execution_metadata',
	'annotation_tag_entity',
];
