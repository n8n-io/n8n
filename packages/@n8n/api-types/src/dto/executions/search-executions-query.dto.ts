import { z } from 'zod';

import { Z } from '../../zod-class';

export const EXECUTION_SEARCH_TEXT_MIN_LENGTH = 3;
export const EXECUTION_SEARCH_TEXT_MAX_LENGTH = 200;

/**
 * Query of `GET /executions/search`. At least one of `text` and `nodeName` is necessary.
 * The route also reads the `filter`, `limit` and `cursor` params of the executions list.
 */
export class SearchExecutionsQueryDto extends Z.class({
	/** Text to find in the data of the executed nodes, field names included. */
	text: z
		.string()
		.trim()
		.min(EXECUTION_SEARCH_TEXT_MIN_LENGTH)
		.max(EXECUTION_SEARCH_TEXT_MAX_LENGTH)
		.optional(),
	/** Name of a node that ran. With `text`, the text must be in the input or output of this node. */
	nodeName: z.string().min(1).max(255).optional(),
}) {}
