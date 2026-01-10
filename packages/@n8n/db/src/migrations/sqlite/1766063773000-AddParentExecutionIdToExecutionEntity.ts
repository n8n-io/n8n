import { AddParentExecutionIdToExecutionEntity1766063773000 as BaseMigration } from '../common/1766063773000-AddParentExecutionIdToExecutionEntity';
/**
 * Add an indexed column `parentExecutionId` to link sub-executions to their parent execution.
 * This replaces the previous LIKE-based search on execution data with a direct foreign key relationship.
 */
export class AddParentExecutionIdToExecutionEntity1766063773000 extends BaseMigration {
	transaction = false as const;
}
