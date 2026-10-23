import {
	PaginationDto,
	MAX_ITEMS_PER_PAGE,
	createTakeValidator,
} from '../pagination/pagination.dto';

export const WORKFLOW_HISTORY_DEFAULT_TAKE = 20;

export class WorkflowPublishTimelineQueryDto extends PaginationDto.extend({
	take: createTakeValidator(MAX_ITEMS_PER_PAGE, false, WORKFLOW_HISTORY_DEFAULT_TAKE),
}) {}
